import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/db.js";
// import jobRoutes from "./routes/jobRoutes"
// import errorHandler from  "./middleware/errorHandler"

const app = express();
const PORT = process.env.PORT || 5000;

// Connect DB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Routes
// app.use("/api/jobs", jobRoutes);
// app.use("/api/products", productRoutes);   <-- similar
// app.use("/api/stats", statsRoutes);        <-- similar

// Error handler
// app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
