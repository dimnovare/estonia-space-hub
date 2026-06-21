import { Clock, CheckCircle, Play, XCircle } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import type { BookingStatus } from "@/services/types";

export function useStatusConfig() {
  const { t } = useLanguage();
  return {
    pending: { label: t("status.pending"), color: "bg-warning/10 text-warning-text", icon: Clock },
    confirmed: { label: t("status.confirmed"), color: "bg-success/10 text-success", icon: CheckCircle },
    awaitingconfirmation: { label: t("status.awaitingConfirmation"), color: "bg-info/10 text-info", icon: Clock },
    active: { label: t("status.active"), color: "bg-accent/10 text-accent", icon: Play },
    completed: { label: t("status.completed"), color: "bg-muted text-muted-foreground", icon: CheckCircle },
    cancelled: { label: t("status.cancelled"), color: "bg-destructive/10 text-destructive", icon: XCircle },
  } as Record<BookingStatus, { label: string; color: string; icon: typeof Clock }>;
}
