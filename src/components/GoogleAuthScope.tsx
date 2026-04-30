import type { ReactNode } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";

/**
 * Lazy GIS scope.
 *
 * Wraps children in `<GoogleOAuthProvider>` ONLY on sign-in surfaces
 * (LoginPage, BookingInlineAuth). Mounting the provider injects the
 * `accounts.google.com/gsi/client` script — doing it at the app root
 * loads it on every page (sets ~25 third-party cookies, hurts Lighthouse
 * Best Practices). Scoping it here defers the load until the user
 * actually reaches a login surface.
 *
 * If `VITE_GOOGLE_CLIENT_ID` is missing or empty, renders children
 * without the provider so callers can still hide their Google buttons.
 */
export default function GoogleAuthScope({ children }: { children: ReactNode }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
  if (!clientId) return <>{children}</>;
  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}