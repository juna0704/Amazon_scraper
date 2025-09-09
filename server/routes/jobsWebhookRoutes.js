import express from "express";
import {
  updateJobStatus,
  updateJobProgress,
  addJobLog,
} from "../controllers/jobsWebhookController.js";

const router = express.Router();

const SCRAPER_SECRET = process.env.SCRAPER_SECRET || "";

function verifyScraperSecret(req, res, next) {
  const secret = req.headers["x-scraper-secret"];
  if (SCRAPER_SECRET && secret !== SCRAPER_SECRET) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  next();
}

router.post("/:jobId/status", verifyScraperSecret, updateJobStatus);
router.post("/:jobId/progress", verifyScraperSecret, updateJobProgress);
router.post("/:jobId/logs", verifyScraperSecret, addJobLog);

export default router;
