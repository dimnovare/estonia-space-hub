import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { initGA } from "./lib/analytics";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
// GA4 is initialized only after cookie consent — see CookieConsent.tsx
// If consent was already given in a previous session, init immediately
if (localStorage.getItem("ruumly-cookie-consent") === "true") {
  const gaId = import.meta.env.VITE_GA_ID;
  if (gaId) initGA(gaId);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  </HelmetProvider>
);
