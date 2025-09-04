import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Serve static HTML from "public" folder
app.use(express.static(path.join(__dirname, "public")));

import connectDB from "./config/db.js";
import jobRoutes from "./routes/jobRoutes.js";
// import errorHandler from  "./middleware/errorHandler"

// Connect DB
connectDB();

// Middleware
app.use(cors({ origin: "http://localhost:5000" }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/jobs", jobRoutes);
// app.use("/api/products", productRoutes);   <-- similar
// app.use("/api/stats", statsRoutes);        <-- similar

// Error handler
// app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
