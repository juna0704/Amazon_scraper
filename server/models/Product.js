import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    asin: { type: String, required: true },
    title: String,
    price: String,
    originalPrice: String,
    rating: String,
    reviewCount: String,
    imageUrl: String,
    productUrl: String,
    bestSeller: String,
    deliveryInfo: String,
    pageNumber: Number,
    jobId: String,
    productName: String,
    scrapedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", ProductSchema);

export default Product;
