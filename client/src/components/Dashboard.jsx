import { useEffect, useContext, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  Activity,
  Package,
  Play,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

// Mock context for demo purposes
const ScraperContext = {
  stats: {
    totalJobs: 1247,
    totalProducts: 5832,
    runningJobs: 12,
    completedJobs: 1235,
    failedJobs: 8,
    recentActivity: {
      jobs: 45,
      products: 234,
    },
    topProducts: [
      { _id: "iPhone 15 Pro", count: 156, lastScraped: new Date("2024-12-01") },
      {
        _id: "Samsung Galaxy S24",
        count: 134,
        lastScraped: new Date("2024-11-30"),
      },
      { _id: "MacBook Air M2", count: 98, lastScraped: new Date("2024-12-01") },
      {
        _id: "Sony WH-1000XM4",
        count: 87,
        lastScraped: new Date("2024-11-29"),
      },
      {
        _id: "Nintendo Switch OLED",
        count: 76,
        lastScraped: new Date("2024-11-28"),
      },
    ],
    weeklyData: [
      { day: "Mon", jobs: 23, products: 156 },
      { day: "Tue", jobs: 31, products: 198 },
      { day: "Wed", jobs: 28, products: 167 },
      { day: "Thu", jobs: 42, products: 234 },
      { day: "Fri", jobs: 35, products: 201 },
      { day: "Sat", jobs: 19, products: 123 },
      { day: "Sun", jobs: 26, products: 145 },
    ],
  },
  fetchStats: () => {},
  isLoading: false,
};

const Dashboard = () => {
  const { stats, fetchStats, isLoading } = ScraperContext;
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const StatCard = ({ title, value, icon: Icon, color, trend, trendValue }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
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

  const jobStatusData = [
    { name: "Completed", value: stats?.completedJobs || 0, color: "#10B981" },
    { name: "Running", value: stats?.runningJobs || 0, color: "#3B82F6" },
    { name: "Failed", value: stats?.failedJobs || 0, color: "#EF4444" },
  ];

  if (isLoading) {
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
          />
          <StatCard
            title="Total Products"
            value={stats?.totalProducts}
            icon={Package}
            color="bg-green-500"
            trend="up"
            trendValue={8}
          />
          <StatCard
            title="Running Jobs"
            value={stats?.runningJobs}
            icon={Play}
            color="bg-orange-500"
          />
          <StatCard
            title="Completed Jobs"
            value={stats?.completedJobs}
            icon={CheckCircle}
            color="bg-purple-500"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Weekly Activity Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Weekly Activity
              </h2>
              <div className="flex space-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Jobs</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Products</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats?.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
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

          {/* Job Status Pie Chart */}
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
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {jobStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity & Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Recent Activity (Last 7 Days)
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <Activity className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="font-medium text-gray-900">New Jobs</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {stats?.recentActivity?.jobs || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <Package className="h-5 w-5 text-green-600 mr-3" />
                  <span className="font-medium text-gray-900">
                    New Products
                  </span>
                </div>
                <span className="text-2xl font-bold text-green-600">
                  {stats?.recentActivity?.products || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Top Scraped Products
            </h2>
            <div className="space-y-3">
              {stats?.topProducts?.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {product._id}
                    </p>
                    <p className="text-sm text-gray-500">
                      Last scraped:{" "}
                      {new Date(product.lastScraped).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="font-semibold text-gray-900">
                      {product.count}
                    </p>
                    <p className="text-xs text-gray-500">times</p>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No products data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
