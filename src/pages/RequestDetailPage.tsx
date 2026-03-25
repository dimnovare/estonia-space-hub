import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function RequestDetailPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/account?tab=bookings", { replace: true });
  }, [navigate]);
  return null;
}
