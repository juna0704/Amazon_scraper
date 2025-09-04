import mongoose, { Schema } from "mongoose";

const ScrapingJobSchema = new mongoose.Schema(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    productName: { type: String, required: true },
    maxProduct: { type: Number, default: 5 },
    maxPages: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed", "stopped"],
      default: "pending",
      index: true,
    },
    progress: {
      currentProduct: { type: Number, default: 0 },
      totalProducts: { type: Number, default: 0 },
      currentPage: { type: Number, default: 1 },
      percentage: { type: Number, default: 0 },
    },
    results: {
      totalScraped: { type: Number, default: 0 },
      pagesProcessed: { type: Number, default: 0 },
      csvFile: String,
      jsonFile: String,
    },
    logs: [String],
    error: String,
    completedAt: { type: Date, index: true },
  },
  { timeStamps: true }
);

const ScrapingJob = new mongoose.model("ScrapingJob", ScrapingJobSchema);

export default ScrapingJob;
