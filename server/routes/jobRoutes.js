import express from "express";
import {
  getAllJobs,
  getJobById,
  startJob,
} from "../controllers/jobController.js";

const router = express.Router();

router.get("/", getAllJobs);
router.get("/:jobId", getJobById);
router.post("/start", startJob);

export default router;
