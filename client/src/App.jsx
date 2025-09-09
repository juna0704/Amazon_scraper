// App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import StartJobPage from "./pages/StartJobPage";
import "./index.css";

function App() {
  return (
    <Router>
      <Navbar />
      <main className="p-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/start-job" element={<StartJobPage />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
