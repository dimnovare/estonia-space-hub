import { useState } from "react";
import { Mail, X } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { apiClient } from "@/services/apiClient";
import { Button } from "@/components/ui/button";

interface EmailVerificationGateProps {
  onDismiss?: () => void;
  className?: string;
}

export function EmailVerificationGate({ onDismiss, className }: EmailVerificationGateProps) {
  const { t } = useLanguage();
  const [sending, setSending] = useState(false);

  async function handleResend() {
    setSending(true);
    try {
      await apiClient.post("/auth/resend-verification", {});
      toast.success(t("emailVerification.resendSuccess"));
    } catch {
      toast.error(t("emailVerification.resendError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className={`relative flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200 ${className ?? ""}`}
    >
      <Mail className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{t("emailVerification.title")}</p>
        <p className="mt-0.5 text-sm opacity-90">{t("emailVerification.desc")}</p>
        <Button
          size="sm"
          variant="outline"
          className="mt-3 border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200 dark:border-amber-600 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-900"
          disabled={sending}
          onClick={handleResend}
        >
          {t("emailVerification.resend")}
        </Button>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 rounded p-0.5 opacity-60 hover:opacity-100"
          aria-label={t("common.close")}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
