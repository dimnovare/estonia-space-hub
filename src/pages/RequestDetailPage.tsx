import { useEffect } from "react";
import { SEO } from "@/components/SEO";
import { useNavigate } from "@/i18n/routing";

export default function RequestDetailPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/account?tab=bookings", { replace: true });
  }, [navigate]);
  return (
    <>
      <SEO title="Request details" description="Booking request details." noindex />
    </>
  );
}
