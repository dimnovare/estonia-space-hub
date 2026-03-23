import { Navigate } from "react-router-dom";

export default function BookingRedirect() {
  return <Navigate to="/account?tab=bookings" replace />;
}
