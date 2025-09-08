import express from "express";
import {
  getProductsByJob,
  getAllProducts,
} from "../controllers/productController.js";

const router = express.Router();

// All products (optional, if needed)
router.get("/", getAllProducts);

// Products by jobId
router.get("/:jobId/products", getProductsByJob);

export default router;
