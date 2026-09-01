import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { startDataAuthorityRuntime } from "@shared/persistence";
import { projectLegacyShopFromStorage } from "./application/shop/legacyMirror";

void startDataAuthorityRuntime()
  .then(() => projectLegacyShopFromStorage())
  .catch((error) => {
    console.error("[T2] data authority runtime failed to start", error);
  });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
