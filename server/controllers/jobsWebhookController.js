import ScrapingJob from "../models/ScrapingJob.js";

// POST /api/jobs/:jobId/status
export const updateJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status, message, timestamp, error } = req.body;

    const logLine = `${
      timestamp || new Date().toISOString()
    } STATUS: ${status} - ${message || ""} ${error ? "ERROR: " + error : ""}`;

    await ScrapingJob.findOneAndUpdate(
      { jobId },
      {
        status,
        $push: { logs: logLine },
        updatedAt: new Date(),
      },
      { new: true }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/jobs/:jobId/progress
export const updateJobProgress = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { progress, timestamp } = req.body;

    const logLine = `${
      timestamp || new Date().toISOString()
    } PROGRESS: ${JSON.stringify(progress)}`;

    await ScrapingJob.findOneAndUpdate(
      { jobId },
      {
        $set: { "results.progress": progress },
        $push: { logs: logLine },
        updatedAt: new Date(),
      },
      { new: true }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/jobs/:jobId/logs
export const addJobLog = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { log, timestamp } = req.body;

    const logLine = `${timestamp || new Date().toISOString()} LOG: ${log}`;

    await ScrapingJob.findOneAndUpdate(
      { jobId },
      { $push: { logs: logLine }, updatedAt: new Date() },
      { new: true }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
