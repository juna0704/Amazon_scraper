import ScrapingJob from "../models/ScrapingJob.js";
import { startScrapingProcess } from "../services/scraperService.js";

// Get all jobs
const getAllJobs = async (req, res) => {
  try {
    const jobs = await ScrapingJob.find().sort({ createdAt: -1 });
    console.log(jobs);
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get specific job
const getJobById = async (req, res) => {
  try {
    const job = await ScrapingJob.findOne({ jobId: req.params.JobId });
    if (!job)
      return res.status(404).json({ success: false, message: "job not found" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Start scraping job
const startJob = async (req, res) => {
  try {
    const { productName, maxProducts = 5, maxPages = 1 } = req.body;
    if (!productName) {
      return res
        .status(400)
        .json({ success: false, message: "Product name is required" });
    }

    // generate unique jobId
    const jobId = `job_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // create job in DB
    const job = new ScrapingJob({
      jobId,
      productName,
      maxProducts,
      maxPages,
      status: "pending",
    });

    await job.save();

    startScrapingProcess(jobId, productName, maxProducts, maxPages);

    res.status(200).json({
      success: true,
      message: "Scraping job started",
      jobId,
      status: "pending",
    });
  } catch (error) {
    console.error("Error in startJob:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export { getAllJobs, getJobById, startJob };
