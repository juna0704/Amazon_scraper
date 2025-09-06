import Product from "../models/Product.js";

// Get products for a specific job
const getProductsByJob = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const { jobId } = req.params;

    const query = { jobId };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { asin: { $regex: search, $options: "i" } },
      ];
    }

    const products = await Product.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ scrapedAt: -1 });

    const total = await Product.countDocuments(query);

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all products with filtering
const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      productName = "",
      sortBy = "scrapedAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { asin: { $regex: search, $options: "i" } },
      ];
    }
    if (productName) {
      query.productName = productName;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const products = await Product.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sortOptions);

    const total = await Product.countDocuments(query);
    const productNames = await Product.distinct("productName");

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      productNames,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export { getAllProducts, getProductsByJob };
