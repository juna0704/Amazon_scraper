import { spawn } from "child_process";
import fs from "fs";
import path, { dirname } from "path";
import csv from "csv-parser";

import ScrapingJob from "../models/ScrapingJob.js";
import Product from "../models/Product.js";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Active job processes in memory
const activeJobs = new Map();

// Start scraping process
const startScrapingProcess = async (
  jobId,
  productName,
  maxProducts,
  maxPages
) => {
  try {
    console.log(`🚀 Starting scraping job: ${jobId}`);

    await ScrapingJob.findOneAndUpdate(
      { jobId },
      {
        status: "running",
        $push: { logs: `Starting scraping for "${productName}"` },
      }
    );

    const pythonProcess = spawn("python3", [
      path.join(__dirname, "../scripts/scraper.py"),
      "--job-id",
      jobId,
      "--product-name",
      productName,
      "--max-products",
      maxProducts.toString(),
      "--max-pages",
      maxPages.toString(),
    ]);

    activeJobs.set(jobId, pythonProcess);

    pythonProcess.stdout.on("data", async (data) => {
      const output = data.toString();
      console.log(`📊 [${jobId}] ${output}`);
      await ScrapingJob.findOneAndUpdate(
        { jobId },
        { $push: { logs: output.trim() } }
      );
    });

    pythonProcess.stderr.on("data", async (data) => {
      const error = data.toString();
      console.error(`❌ [${jobId}] ${error}`);
      await ScrapingJob.findOneAndUpdate(
        { jobId },
        { $push: { logs: `ERROR: ${error.trim()}` } }
      );
    });

    pythonProcess.on("close", async (code) => {
      console.log(`🏁 [${jobId}] Process exited with code ${code}`);
      activeJobs.delete(jobId);

      if (code === 0) {
        await processScrapingResults(jobId, productName);
      } else {
        await ScrapingJob.findOneAndUpdate(
          { jobId },
          {
            status: "failed",
            completedAt: new Date(),
            error: `Exit code ${code}`,
            $push: { logs: `Failed with exit code ${code}` },
          }
        );
      }
    });
  } catch (error) {
    console.error(`❌ Error starting scraping process: ${error}`);
    await ScrapingJob.findOneAndUpdate(
      { jobId },
      { status: "failed", error: error.message, completedAt: new Date() }
    );
  }
};

// Process results from CSV/JSON
const processScrapingResults = async (jobId, productName) => {
  try {
    const safeName = productName.replace(/\s+/g, "_").toLowerCase();
    const csvFile = path.join(__dirname, `../${safeName}.csv`);
    const jsonFile = path.join(__dirname, `../${safeName}.json`);

    let totalScraped = 0;
    let pagesProcessed = 0;

    if (fs.existsSync(csvFile)) {
      const products = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(csvFile)
          .pipe(csv())
          .on("data", (row) => {
            if (row.scraped_successfully === "YES") {
              products.push({
                asin: row.asin,
                title: row.title,
                price: row.price,
                originalPrice: row.original_price,
                rating: row.rating,
                reviewCount: row.review_count,
                imageUrl: row.image_url,
                productUrl: row.product_url,
                bestSeller: row.best_seller,
                deliveryInfo: row.delivery_info,
                pageNumber: parseInt(row.page_number) || 1,
                jobId,
                productName,
                scrapedAt: new Date(row.timestamp),
              });
              totalScraped++;
              pagesProcessed = Math.max(
                pagesProcessed,
                parseInt(row.page_number) || 1
              );
            }
          })
          .on("end", resolve)
          .on("error", reject);
      });

      if (products.length > 0) {
        await Product.insertMany(products, { ordered: false });
      }
    }

    await ScrapingJob.findOneAndUpdate(
      { jobId },
      {
        status: "completed",
        completedAt: new Date(),
        "results.totalScraped": totalScraped,
        "results.pagesProcessed": pagesProcessed,
        "results.csvFile": fs.existsSync(csvFile) ? csvFile : null,
        "results.jsonFile": fs.existsSync(jsonFile) ? jsonFile : null,
        $push: {
          logs: `Scraping completed: ${totalScraped} products from ${pagesProcessed} pages`,
        },
      }
    );

    console.log(`✅ Job ${jobId} completed: ${totalScraped} products scraped`);
  } catch (error) {
    console.error(`❌ Error processing results for ${jobId}:`, error);
    await ScrapingJob.findOneAndUpdate(
      { jobId },
      {
        status: "failed",
        error: `Failed to process results: ${error.message}`,
        completedAt: new Date(),
      }
    );
  }
};

export { startScrapingProcess, processScrapingResults };
