import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { initializeMockData } from "./app/lib/mock-data";
import { useAuthStore } from "./app/store/auth-store";
import "./styles/index.css";

// Run these ONCE at module load, before React mounts:
//   1. Mock-data migration so every page (not just /login) sees the current schema.
//   2. Auth initialization — hydrate from localStorage without a DashboardLayout effect
//      (avoids re-running under StrictMode double-invoke).
initializeMockData();
useAuthStore.getState().initialize();

createRoot(document.getElementById("root")!).render(<App />);
