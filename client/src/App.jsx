import React, { useContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthContext, AuthProvider } from "./context/AuthContext";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import StartJobPage from "./pages/StartJobPage";
import Navbar from "./components/Navbar";

// PrivateRoute component
function PrivateRoute({ children }) {
  const { token } = useContext(AuthContext);
  return token ? children : <Navigate to="/login" />;
}

// App content with conditional Navbar
function AppContent() {
  const { token } = useContext(AuthContext);

  return (
    <>
      {token && <Navbar />} {/* Show navbar only when logged in */}
      <Routes>
        {/* Public routes */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* Private routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/scrape"
          element={
            <PrivateRoute>
              <StartJobPage />
            </PrivateRoute>
          }
        />

        {/* Redirect unknown routes */}
        <Route
          path="*"
          element={<Navigate to={token ? "/dashboard" : "/login"} />}
        />
      </Routes>
    </>
  );
}

// Main App
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
