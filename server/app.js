import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import jobRoutes from "./routes/jobRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import authMiddleware from "./middlewares/authMiddleware.js";
import errorHandler from "./middlewares/errorHandler.js";
import statsRoutes from "./routes/statsRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import jobsWebhookRoutes from "./routes/jobsWebhookRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve static HTML from "public" folder
app.use(express.static(path.join(__dirname, "public")));

// Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true })); // frontend origin
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/jobs", authMiddleware, jobRoutes);
app.use("/api/jobs/webhook", jobsWebhookRoutes);
app.use("/api/products", authMiddleware, productRoutes);
app.use("/api/stats", authMiddleware, statsRoutes);

// Error handler
app.use(errorHandler);

export default app;
