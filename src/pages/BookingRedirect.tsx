import { Navigate } from "@/i18n/routing";

export default function BookingRedirect() {
  return <Navigate to="/account?tab=bookings" replace />;
}
