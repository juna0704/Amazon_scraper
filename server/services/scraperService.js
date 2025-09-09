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

/**
 * Start scraping process by spawning Python script
 */
const startScrapingProcess = async (
  jobId,
  productName,
  maxProducts,
  maxPages,
  headless = false
) => {
  try {
    console.log(`🚀 Starting scraping job: ${jobId}`);

    await ScrapingJob.findOneAndUpdate(
      { jobId },
      {
        status: "running",
        $push: { logs: `Job started for "${productName}"` },
      }
    );

    // Build args for Python script
    const args = [
      path.join(__dirname, "../scripts/scraper.py"),
      "--job-id",
      jobId,
      "--product-name",
      productName,
      "--max-products",
      maxProducts.toString(),
      "--max-pages",
      maxPages.toString(),
    ];

    if (headless) args.push("--headless");

    const pythonEnv = {
      ...process.env,
      API_BASE_URL:
        process.env.API_BASE_URL ||
        `http://localhost:${process.env.PORT || 5000}/api`,
    };

    const pythonProcess = spawn("python3", args, { env: pythonEnv });
    activeJobs.set(jobId, pythonProcess);

    // Capture stdout
    pythonProcess.stdout.on("data", async (data) => {
      const output = data.toString().trim();
      console.log(`📊 [${jobId}] ${output}`);
      await ScrapingJob.findOneAndUpdate(
        { jobId },
        { $push: { logs: `[PYOUT] ${output}` } }
      );
    });

    // Capture stderr
    pythonProcess.stderr.on("data", async (data) => {
      const error = data.toString().trim();
      console.error(`❌ [${jobId}] ${error}`);
      await ScrapingJob.findOneAndUpdate(
        { jobId },
        { $push: { logs: `[PYERR] ${error}` } }
      );
    });

    // When process ends
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

/**
 * Parse CSV/JSON results and save to MongoDB
 */
const processScrapingResults = async (jobId, productName) => {
  try {
    console.log(`🔍 Processing results for job ${jobId}...`);

    const safeName = productName.replace(/\s+/g, "_").toLowerCase();
    const csvFile = path.join(
      __dirname,
      "../output_files/csv",
      `${safeName}.csv`
    );
    const jsonFile = path.join(
      __dirname,
      "../output_files/json",
      `${safeName}.json`
    );

    console.log(`📁 Looking for CSV file: ${csvFile}`);
    console.log(`📁 CSV file exists: ${fs.existsSync(csvFile)}`);

    let totalScraped = 0;
    let pagesProcessed = 0;
    let totalRowsInCSV = 0;

    if (fs.existsSync(csvFile)) {
      const products = [];

      await new Promise((resolve, reject) => {
        fs.createReadStream(csvFile)
          .pipe(csv())
          .on("data", (row) => {
            totalRowsInCSV++;
            console.log(`📋 Row ${totalRowsInCSV}:`, {
              asin: row.asin,
              scraped_successfully: row.scraped_successfully,
              title: row.title?.substring(0, 50) + "...",
            });

            // Check for scraped_successfully column (case insensitive)
            const scrapedSuccess =
              row.scraped_successfully ||
              row["Scraped Successfully"] ||
              row["scraped successfully"] ||
              row.success;

            if (
              scrapedSuccess?.toUpperCase() === "YES" ||
              scrapedSuccess === "1" ||
              scrapedSuccess === true
            ) {
              try {
                const product = {
                  asin: row.asin || row.ASIN,
                  title: row.title || row.Title,
                  price: (row.price || row.Price || "0")
                    .toString()
                    .replace(/[^\d.]/g, ""),
                  originalPrice: (
                    row.original_price ||
                    row["Original Price"] ||
                    row.originalPrice ||
                    "0"
                  )
                    .toString()
                    .replace(/[^\d.]/g, ""),
                  rating: parseFloat(row.rating || row.Rating || 0),
                  reviewCount: parseInt(
                    (
                      row.review_count ||
                      row["Review Count"] ||
                      row.reviewCount ||
                      "0"
                    )
                      .toString()
                      .replace(/,/g, "")
                  ),
                  imageUrl: row.image_url || row["Image URL"] || row.imageUrl,
                  productUrl:
                    row.product_url || row["Product URL"] || row.productUrl,
                  bestSeller:
                    (row.best_seller ||
                      row["Best Seller"] ||
                      row.bestSeller) === "YES",
                  deliveryInfo:
                    row.delivery_info ||
                    row["Delivery Info"] ||
                    row.deliveryInfo,
                  pageNumber: parseInt(
                    row.page_number || row["Page Number"] || row.pageNumber || 1
                  ),
                  jobId,
                  productName,
                  scrapedAt: row.timestamp
                    ? new Date(row.timestamp)
                    : new Date(),
                };

                // Validate required fields
                if (product.asin && product.title) {
                  products.push(product);
                  totalScraped++;
                  pagesProcessed = Math.max(pagesProcessed, product.pageNumber);
                } else {
                  console.log(
                    `⚠️ Skipping product due to missing required fields:`,
                    {
                      asin: product.asin,
                      title: product.title?.substring(0, 30),
                    }
                  );
                }
              } catch (parseError) {
                console.error(`❌ Error parsing product row:`, parseError);
              }
            } else {
              console.log(
                `❌ Skipping row - scraped_successfully: ${scrapedSuccess}`
              );
            }
          })
          .on("end", () => {
            console.log(
              `📊 CSV parsing completed. Total rows: ${totalRowsInCSV}, Valid products: ${products.length}`
            );
            resolve();
          })
          .on("error", (error) => {
            console.error(`❌ Error reading CSV:`, error);
            reject(error);
          });
      });

      if (products.length > 0) {
        console.log(
          `💾 Inserting ${products.length} products into database...`
        );

        try {
          // Use insertMany with ordered: false to continue on duplicate key errors
          const result = await Product.insertMany(products, {
            ordered: false,
            // Add validation options if needed
          });
          console.log(`✅ Successfully inserted ${result.length} products`);
        } catch (insertError) {
          // Handle bulk insert errors (like duplicate keys)
          if (insertError.code === 11000) {
            console.log(
              `⚠️ Some products were duplicates, inserted what we could`
            );
            // Count how many were actually inserted
            const insertedCount = insertError.result?.result?.nInserted || 0;
            console.log(`📊 Actually inserted: ${insertedCount} products`);
          } else {
            console.error(`❌ Error inserting products:`, insertError);
            throw insertError;
          }
        }

        // Verify products were actually saved
        const savedProductsCount = await Product.countDocuments({ jobId });
        console.log(
          `🔢 Products in database for job ${jobId}: ${savedProductsCount}`
        );
      } else {
        console.log(
          `⚠️ No valid products found in CSV. Total rows processed: ${totalRowsInCSV}`
        );

        // Let's also log a sample of what we found in the CSV
        if (totalRowsInCSV > 0) {
          console.log(
            "📋 Let's check the first few rows of the CSV for debugging:"
          );
          const sampleRows = [];
          fs.createReadStream(csvFile)
            .pipe(csv())
            .on("data", (row) => {
              if (sampleRows.length < 3) {
                sampleRows.push(row);
              }
            })
            .on("end", () => {
              console.log(
                "🔍 Sample CSV rows:",
                JSON.stringify(sampleRows, null, 2)
              );
            });
        }
      }
    } else {
      console.log(`❌ CSV file not found: ${csvFile}`);

      // Check what files do exist in the directory
      const parentDir = path.dirname(csvFile);
      const files = fs.readdirSync(parentDir);
      console.log(`📂 Files in directory ${parentDir}:`, files);
    }

    // Update job status
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

    // Final verification
    const finalCount = await Product.countDocuments({ jobId });
    console.log(`🎯 Final verification - Products in database: ${finalCount}`);
  } catch (error) {
    console.error(`❌ Error processing results for ${jobId}:`, error);
    await ScrapingJob.findOneAndUpdate(
      { jobId },
      {
        status: "failed",
        error: `Failed to process results: ${error.message}`,
        completedAt: new Date(),
        $push: { logs: `Error processing results: ${error.message}` },
      }
    );
  }
};

export { startScrapingProcess, processScrapingResults };
