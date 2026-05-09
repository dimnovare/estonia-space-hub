import { SEO } from "@/components/SEO";
import { Navigate } from "@/i18n/routing";

export default function BookingRedirect() {
  return (
    <>
      <SEO title="Redirecting…" description="Please wait while we redirect you." noindex />
      <Navigate to="/account?tab=bookings" replace />
    </>
  );
}
