import ScrapingJob from "../models/ScrapingJob.js";
import Product from "../models/Product.js";

const getStats = async (req, res) => {
  try {
    const totalJobs = await ScrapingJob.countDocuments();
    const totalProducts = await Product.countDocuments();
    const runningJobs = await ScrapingJob.countDocuments({ status: "running" });
    const completedJobs = await ScrapingJob.countDocuments({
      status: "completed",
    });

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentJobs = await ScrapingJob.countDocuments({
      createdAt: { $gte: weekAgo },
    });
    const recentProducts = await Product.countDocuments({
      scrapedAt: { $gte: weekAgo },
    });

    const topProducts = await Product.aggregate([
      {
        $group: {
          _id: "$productName",
          count: { $sum: 1 },
          lastScraped: { $max: "$scrapedAt" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      totalJobs,
      totalProducts,
      runningJobs,
      completedJobs,
      recentActivity: {
        jobs: recentJobs,
        products: recentProducts,
      },
      topProducts,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default getStats;
