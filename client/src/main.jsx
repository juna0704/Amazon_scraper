import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ScraperProvider } from "./context/ScraperContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <ScraperProvider>
        <App />
      </ScraperProvider>
    </AuthProvider>
  </StrictMode>
);
