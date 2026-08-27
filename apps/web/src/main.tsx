import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { bootstrapOfflineFoundation } from "./offline/bootstrap";

void bootstrapOfflineFoundation();

// Service-worker registration (fail-safe: the app never depends on it).
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => undefined);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
