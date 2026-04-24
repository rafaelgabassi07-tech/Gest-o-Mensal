import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Register Service Worker for PWA
const updateSW = registerSW({
  onNeedRefresh() {
    // We could show a prompt here, but with autoUpdate it usually updates on next navigation
    // or we can auto reload
    updateSW();
  },
  onOfflineReady() {
    console.log('App is ready to work offline');
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
