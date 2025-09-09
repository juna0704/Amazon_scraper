import { useState, useContext, useEffect, useRef } from "react";
import { ScraperContext } from "../context/ScraperContext";

export default function StartJobPage() {
  const { startJob, fetchJobById } = useContext(ScraperContext);

  const [productName, setProductName] = useState("");
  const [maxProducts, setMaxProducts] = useState(5);
  const [maxPages, setMaxPages] = useState(1);
  const [currentJob, setCurrentJob] = useState(null);
  const [logs, setLogs] = useState([]);
  const pollingRef = useRef(null);

  const handleStart = async (e) => {
    e.preventDefault();
    try {
      const resp = await startJob(
        productName,
        Number(maxProducts),
        Number(maxPages)
      );
      const jobId = resp.jobId;
      setCurrentJob({ jobId, productName });
      setLogs((prev) => [...prev, `Job ${jobId} started`]);

      // begin polling
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        const job = await fetchJobById(jobId);
        // fetchJobById should return job (adjust it to return the data)
        setCurrentJob(job);
        if (job.logs && job.logs.length) {
          setLogs(job.logs.slice(-200)); // keep last 200 logs
        }
        if (job.status === "completed" || job.status === "failed") {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }, 2000);
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        `Failed to start job: ${err.message || err}`,
      ]);
    }
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Start Scraping Job</h1>
      <form onSubmit={handleStart} className="space-y-4">
        <input
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          required
          placeholder="Product name"
          className="w-full p-2 border rounded"
        />
        <input
          type="number"
          value={maxProducts}
          onChange={(e) => setMaxProducts(e.target.value)}
          min={1}
          className="w-full p-2 border rounded"
        />
        <input
          type="number"
          value={maxPages}
          onChange={(e) => setMaxPages(e.target.value)}
          min={1}
          className="w-full p-2 border rounded"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Start Job
        </button>
      </form>

      {currentJob && (
        <div className="mt-4 p-4 border rounded bg-gray-50">
          <h2 className="font-semibold">Job: {currentJob.jobId}</h2>
          <p>Status: {currentJob.status}</p>
        </div>
      )}

      <div className="mt-4 p-4 border rounded bg-black text-white max-h-64 overflow-auto">
        <pre>{logs.join("\n")}</pre>
      </div>
    </div>
  );
}
