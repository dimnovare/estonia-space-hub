import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface Props {
  createdAt?: string;
  reservedUntil?: string;
  /** Visual size; "lg" used on success screen, "sm" on dialog */
  size?: "sm" | "lg";
}

function formatRemaining(ms: number, lang: string): string {
  if (ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function ReservationCountdown({ createdAt, reservedUntil, size = "lg" }: Props) {
  const { t, language } = useLanguage();
  const expiresAt = reservedUntil
    ? new Date(reservedUntil).getTime()
    : createdAt
      ? new Date(createdAt).getTime() + 24 * 60 * 60 * 1000
      : 0;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!expiresAt) return null;

  const remaining = expiresAt - now;
  const expired = remaining <= 0;

  const localeMap: Record<string, string> = {
    et: "et-EE", en: "en-GB", ru: "ru-RU", lv: "lv-LV", lt: "lt-LT",
  };
  const locale = localeMap[language] || "en-GB";
  const expiryStr = new Date(expiresAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });

  const padding = size === "lg" ? "p-4" : "p-3";
  const titleClass = size === "lg" ? "text-base" : "text-sm";
  const iconSize = size === "lg" ? "h-6 w-6" : "h-4 w-4";

  return (
    <div className={`rounded-xl border-2 border-warning/40 bg-warning/10 ${padding}`}>
      <div className="flex items-start gap-3">
        <Clock className={`${iconSize} text-warning-text shrink-0 mt-0.5`} />
        <div className="flex-1">
          <p className={`font-display ${titleClass} font-bold text-foreground`}>
            {expired ? t("booking.reservation.cancelled") : t("booking.payLater")}
          </p>
          {!expired ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("booking.reservation.cancelsIn")}{" "}
                <span className="font-mono font-bold text-warning-text tabular-nums">
                  {formatRemaining(remaining, language)}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("booking.reservation.expires")}: <span className="font-medium text-foreground">{expiryStr}</span>
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("booking.payLaterWarning")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReservationCountdown;
