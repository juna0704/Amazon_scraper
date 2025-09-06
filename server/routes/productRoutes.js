import express from "express";
import {
  getProductsByJob,
  getAllProducts,
} from "../controllers/productController.js";

const router = express.Router();

router.get("/:jobId/products", getProductsByJob);
router.get("/", getAllProducts);

export default router;
