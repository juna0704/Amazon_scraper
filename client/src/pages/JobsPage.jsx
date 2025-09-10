import { useEffect, useContext } from "react";
import { ScraperContext } from "../context/ScraperContext";

const JobsPage = () => {
  const { jobs, fetchJobs, isLoading } = useContext(ScraperContext);

  // Fetch jobs on mount
  useEffect(() => {
    fetchJobs();
  }, []);

  // Helper function to format dates safely
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    try {
      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }

      return date.toLocaleString();
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return "Invalid Date";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Loading jobs...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">All Jobs</h1>

      {jobs.length === 0 ? (
        <p className="text-gray-500">No jobs found.</p>
      ) : (
        <div className="space-y-6">
          {jobs.map((job) => (
            <div
              key={job._id}
              className="bg-white rounded-lg shadow-md border p-6"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Scraping Job: {job.productName}
                  </h3>
                  <p className="text-sm text-gray-500 font-mono">{job.jobId}</p>
                </div>
                <span
                  className={`px-3 py-1 text-sm rounded-full font-medium ${
                    job.status === "completed"
                      ? "bg-green-100 text-green-600"
                      : job.status === "running" || job.status === "processing"
                      ? "bg-blue-100 text-blue-600"
                      : job.status === "failed" || job.status === "error"
                      ? "bg-red-100 text-red-600"
                      : job.status === "pending" || job.status === "queued"
                      ? "bg-yellow-100 text-yellow-600"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {job.status}
                </span>
              </div>

              {/* Job Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs font-medium text-gray-500">Max Pages</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {job.maxPages || "N/A"}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs font-medium text-gray-500">
                    Max Products
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {job.maxProduct || "N/A"}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs font-medium text-gray-500">
                    Products Scraped
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {job.results?.totalScraped || "0"}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs font-medium text-gray-500">
                    Pages Processed
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {job.results?.pagesProcessed || "0"}
                  </p>
                </div>
              </div>

              {/* Progress */}
              {job.progress && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progress</span>
                    <span>{job.progress.percentage || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${job.progress.percentage || 0}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Page {job.progress.currentPage || 0}</span>
                    <span>
                      Product {job.progress.currentProduct || 0} of{" "}
                      {job.progress.totalProducts || 0}
                    </span>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                <div>
                  <span className="font-medium">Started:</span>{" "}
                  {formatDate(job.createdAt)}
                </div>
                {job.completedAt && (
                  <div>
                    <span className="font-medium">Completed:</span>{" "}
                    {formatDate(job.completedAt)}
                  </div>
                )}
                <div>
                  <span className="font-medium">Updated:</span>{" "}
                  {formatDate(job.updatedAt)}
                </div>
              </div>

              {/* Files */}
              {job.results && (job.results.csvFile || job.results.jsonFile) && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Output Files:
                  </p>
                  <div className="flex gap-2">
                    {job.results.csvFile && (
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                        📄 CSV Available
                      </span>
                    )}
                    {job.results.jsonFile && (
                      <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                        📝 JSON Available
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Logs (collapsed by default) */}
              {job.logs && job.logs.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    View Logs ({job.logs.length} entries)
                  </summary>
                  <div className="mt-2 max-h-40 overflow-y-auto bg-gray-900 text-green-400 text-xs p-3 rounded font-mono">
                    {job.logs.slice(-10).map((log, index) => (
                      <div key={index} className="mb-1">
                        {log}
                      </div>
                    ))}
                    {job.logs.length > 10 && (
                      <div className="text-gray-500 mt-2">
                        ... and {job.logs.length - 10} more entries
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobsPage;
