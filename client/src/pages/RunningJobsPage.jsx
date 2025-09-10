import { useContext, useEffect, useState, useRef } from "react";
import { ScraperContext } from "../context/ScraperContext";

const RunningPage = () => {
  const { jobs, fetchJobs, isLoading } = useContext(ScraperContext);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(3000); // 3 seconds
  const logRefs = useRef({});

  // Filter only running/pending jobs
  const runningJobs = jobs.filter(
    (job) =>
      job.status === "running" ||
      job.status === "pending" ||
      job.status === "processing"
  );

  // Auto-refresh functionality
  useEffect(() => {
    let interval;
    if (autoRefresh && runningJobs.length > 0) {
      interval = setInterval(() => {
        fetchJobs();
      }, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval, runningJobs.length]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    Object.values(logRefs.current).forEach((ref) => {
      if (ref) {
        ref.scrollTop = ref.scrollHeight;
      }
    });
  }, [jobs]);

  // Initial fetch
  useEffect(() => {
    fetchJobs();
  }, []);

  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleTimeString();
    } catch {
      return "Invalid Time";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "running":
        return "bg-blue-500";
      case "pending":
        return "bg-yellow-500";
      case "processing":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getLogTypeStyle = (log) => {
    if (log.includes("[ERROR]") || log.includes("ERROR")) {
      return "text-red-400";
    }
    if (log.includes("[WARN]") || log.includes("WARNING")) {
      return "text-yellow-400";
    }
    if (log.includes("[INFO]") || log.includes("INFO")) {
      return "text-blue-400";
    }
    if (log.includes("✓") || log.includes("SUCCESS")) {
      return "text-green-400";
    }
    if (log.includes("🚀") || log.includes("Starting")) {
      return "text-cyan-400";
    }
    return "text-gray-300";
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Running Jobs</h1>
          <p className="text-gray-600 mt-1">
            Live monitoring of active scraping jobs
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Auto Refresh:</label>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                autoRefresh
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {autoRefresh ? "ON" : "OFF"}
            </button>
          </div>

          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="text-sm border rounded px-2 py-1"
            disabled={!autoRefresh}
          >
            <option value={1000}>1s</option>
            <option value={3000}>3s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
          </select>

          <button
            onClick={fetchJobs}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
            <span className="text-gray-600">Running Jobs</span>
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {jobs.filter((j) => j.status === "running").length}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span className="text-gray-600">Pending Jobs</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {jobs.filter((j) => j.status === "pending").length}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-gray-600">Total Products Scraped</span>
          </div>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {runningJobs.reduce(
              (sum, job) => sum + (job.results?.totalScraped || 0),
              0
            )}
          </p>
        </div>
      </div>

      {/* Running Jobs */}
      {runningJobs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            No Running Jobs
          </h3>
          <p className="text-gray-500">
            All scraping jobs have completed or are waiting to start.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {runningJobs.map((job) => (
            <div
              key={job._id}
              className="bg-white rounded-lg shadow-lg overflow-hidden"
            >
              {/* Job Header */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold mb-1">
                      🔍 {job.productName}
                    </h2>
                    <p className="text-blue-100 text-sm font-mono">
                      {job.jobId}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 ${getStatusColor(
                        job.status
                      )} rounded-full animate-pulse`}
                    ></div>
                    <span className="bg-white bg-opacity-20 px-2 py-1 rounded text-sm font-medium">
                      {job.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                {job.progress && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress: {job.progress.percentage || 0}%</span>
                      <span>
                        Page {job.progress.currentPage || 0} | Product{" "}
                        {job.progress.currentProduct || 0}/
                        {job.progress.totalProducts || 0}
                      </span>
                    </div>
                    <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
                      <div
                        className="bg-white h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${job.progress.percentage || 0}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Job Stats */}
              <div className="p-4 border-b bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {job.results?.totalScraped || 0}
                    </p>
                    <p className="text-xs text-gray-500">Products Scraped</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {job.results?.pagesProcessed || 0}
                    </p>
                    <p className="text-xs text-gray-500">Pages Processed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {job.maxProduct || 0}
                    </p>
                    <p className="text-xs text-gray-500">Target Products</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">
                      {job.maxPages || 0}
                    </p>
                    <p className="text-xs text-gray-500">Max Pages</p>
                  </div>
                </div>
              </div>

              {/* Live Logs */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    Live Logs ({job.logs?.length || 0} entries)
                  </h3>
                  <span className="text-xs text-gray-500">
                    Last updated: {formatTime(job.updatedAt)}
                  </span>
                </div>

                <div
                  ref={(el) => (logRefs.current[job._id] = el)}
                  className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs"
                >
                  {job.logs && job.logs.length > 0 ? (
                    job.logs.slice(-50).map((log, index) => (
                      <div
                        key={index}
                        className={`mb-1 ${getLogTypeStyle(log)}`}
                      >
                        <span className="text-gray-500 mr-2">
                          {String(job.logs.length - 50 + index + 1).padStart(
                            3,
                            "0"
                          )}
                          :
                        </span>
                        {log}
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-center py-8">
                      <div className="text-4xl mb-2">📝</div>
                      <p>No logs available yet...</p>
                      <p className="text-xs mt-1">
                        Logs will appear as the job progresses
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RunningPage;
