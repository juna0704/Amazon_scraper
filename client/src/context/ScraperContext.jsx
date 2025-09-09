import { createContext, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";

export const ScraperContext = createContext();

export function ScraperProvider({ children }) {
  const { token } = useContext(AuthContext); // ✅ get token from AuthContext
  const [jobs, setJobs] = useState([]);
  const [currentJob, setCurrentJob] = useState(null);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Create an axios instance that attaches token automatically
  const axiosInstance = axios.create({
    baseURL: "http://localhost:5000/api",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  // Fetch all jobs
  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const res = await axiosInstance.get("/jobs");
      setJobs(res.data);
    } catch (error) {
      console.log("Error fetching jobs: ", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch single job by ID
  const fetchJobById = async (jobId) => {
    try {
      setIsLoading(true);
      const res = await axiosInstance.get(`/jobs/${jobId}`);
      setCurrentJob(res.data);
    } catch (error) {
      console.log("Error fetching job: ", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Start a new job
  const startJob = async (productName, maxProducts = 5, maxPages = 1) => {
    try {
      setIsLoading(true);
      const res = await axiosInstance.post("/jobs/start", {
        productName,
        maxProducts,
        maxPages,
      });
      // refresh jobs after start
      await fetchJobs();
      return res.data;
    } catch (err) {
      console.error("Error starting job:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch products for a job
  const fetchProductsByJobId = async (jobId) => {
    try {
      setIsLoading(true);
      const res = await axiosInstance.get(`/products/${jobId}/products`);
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch scraper stats
  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const res = await axiosInstance.get("/stats");
      console.log("Fetched stats:", res.data);
      setStats(res.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScraperContext.Provider
      value={{
        jobs,
        currentJob,
        products,
        stats,
        isLoading,
        fetchJobs,
        fetchJobById,
        startJob,
        fetchProductsByJobId,
        fetchStats,
      }}
    >
      {children}
    </ScraperContext.Provider>
  );
}

export default ScraperProvider;
