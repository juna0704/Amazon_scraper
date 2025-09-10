import { useEffect, useState, useContext } from "react";
import axios from "axios";
import {
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  Activity,
  Package,
  Play,
  CheckCircle,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { token } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("http://localhost:5000/api/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error.response?.data || error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchStats();
  }, [token]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    trend,
    trendValue,
    onClick,
  }) => (
    <div
      onClick={onClick}
      className="cursor-pointer bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">
            {value?.toLocaleString() || 0}
          </p>
          {trend && (
            <div
              className={`flex items-center mt-2 text-sm ${
                trend === "up" ? "text-green-600" : "text-red-600"
              }`}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              {trendValue}% this week
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600 font-medium">
            Loading dashboard...
          </span>
        </div>
      </div>
    );
  }

  const jobStatusData = [
    { name: "Completed", value: stats?.completedJobs || 0, color: "#10B981" },
    { name: "Running", value: stats?.runningJobs || 0, color: "#3B82F6" },
    { name: "Failed", value: stats?.failedJobs || 0, color: "#EF4444" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Amazon Scraper Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor your scraping operations and analytics
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Jobs"
            value={stats?.totalJobs}
            icon={Activity}
            color="bg-blue-500"
            trend="up"
            trendValue={12}
            onClick={() => navigate("/jobs")}
          />
          <StatCard
            title="Total Products"
            value={stats?.totalProducts}
            icon={Package}
            color="bg-green-500"
            trend="up"
            trendValue={8}
            onClick={() => navigate("/products")}
          />
          <StatCard
            title="Running Jobs"
            value={stats?.runningJobs}
            icon={Play}
            color="bg-orange-500"
            onClick={() => navigate("/running-jobs")}
          />
          <StatCard
            title="Completed Jobs"
            value={stats?.completedJobs}
            icon={CheckCircle}
            color="bg-purple-500"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Weekly Activity */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Weekly Activity
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats?.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="jobs"
                  stackId="1"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.1}
                />
                <Area
                  type="monotone"
                  dataKey="products"
                  stackId="1"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Job Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Job Status
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={jobStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  labelLine={false}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {jobStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
