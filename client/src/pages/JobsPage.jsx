import { useEffect, useContext } from "react";
import { ScraperContext } from "../context/ScraperContext";

const JobsPage = () => {
  const { jobs, fetchJobs, isLoading } = useContext(ScraperContext);

  // Fetch jobs on mount
  useEffect(() => {
    fetchJobs();
  }, []);

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
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full text-left text-sm text-gray-700">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Job ID</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Created At</th>
                <th className="px-6 py-3">Updated At</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job._id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">{job._id}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        job.status === "completed"
                          ? "bg-green-100 text-green-600"
                          : job.status === "running"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {new Date(job.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {new Date(job.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default JobsPage;
