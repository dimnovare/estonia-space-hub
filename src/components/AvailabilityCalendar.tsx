import { useMemo } from "react";
import { CalendarCheck2, CalendarX2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useLanguage } from "@/i18n/LanguageContext";
import { useListingBlockedDates } from "@/hooks/queries";

const localeMap: Record<string, string> = {
  et: "et-EE",
  en: "en-GB",
  ru: "ru-RU",
  lv: "lv-LV",
  lt: "lt-LT",
};

/** Parse a yyyy-MM-dd string into a local-midnight Date (no timezone drift). */
function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

/**
 * Read-only customer-facing availability calendar for a listing.
 *
 * Marks unavailable days (provider blackouts + fully-booked days) and surfaces an
 * "available now" / "next available" hint. Purely informational — booking happens
 * in the booking flow, not here. Fed by the public, PII-free
 * `GET /listings/{id}/blocked-dates` endpoint.
 *
 * Gating: only render this when availability is meaningful (e.g. partner has
 * bookingEnabled). The parent decides whether to show this or a "contact partner"
 * line; an empty DB renders gracefully as fully available.
 */
export default function AvailabilityCalendar({ listingId }: { listingId: string }) {
  const { t, language } = useLanguage();
  const locale = localeMap[language] || "en-GB";
  const { data, isLoading, isError } = useListingBlockedDates(listingId);

  const today = useMemo(startOfToday, []);

  const unavailableDates = useMemo(
    () => (data?.blockedDates ?? []).map(parseLocalDate),
    [data?.blockedDates],
  );

  // "Available now" = today is not in the blocked set. Otherwise find the first
  // upcoming day in the window that is NOT blocked → "next available".
  const { availableNow, nextAvailable } = useMemo(() => {
    const blockedSet = new Set(data?.blockedDates ?? []);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const todayBlocked = blockedSet.has(fmt(today));
    if (!todayBlocked) return { availableNow: true, nextAvailable: null as Date | null };
    // Scan forward up to ~120 days for the first open day.
    for (let i = 1; i <= 120; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      if (!blockedSet.has(fmt(d))) return { availableNow: false, nextAvailable: d };
    }
    return { availableNow: false, nextAvailable: null };
  }, [data?.blockedDates, today]);

  if (isLoading) {
    return (
      <div className="rounded-[14px] border border-border bg-card p-4">
        <div className="h-[260px] animate-pulse rounded-[10px] bg-secondary/40" />
      </div>
    );
  }

  // On error, stay silent rather than break the page — the parent's fallback line
  // ("contact partner for availability") still covers the customer.
  if (isError || !data) return null;

  const statusLine = availableNow
    ? t("detail.availability.availableNow")
    : nextAvailable
      ? t("detail.availability.nextAvailable").replace(
          "{date}",
          nextAvailable.toLocaleDateString(locale, { day: "numeric", month: "long" }),
        )
      : t("detail.availability.contactPartner");

  return (
    <div className="rounded-[14px] border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2">
        {availableNow ? (
          <CalendarCheck2 className="h-4 w-4 shrink-0 text-success" />
        ) : (
          <CalendarX2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className={`text-sm font-semibold ${availableNow ? "text-success" : "text-foreground"}`}>
          {statusLine}
        </span>
      </div>

      <Calendar
        mode="default"
        fromDate={today}
        disabled={[{ before: today }, ...unavailableDates]}
        modifiers={{ unavailable: unavailableDates }}
        modifiersClassNames={{
          unavailable: "bg-destructive/10 font-semibold text-destructive line-through opacity-100",
        }}
        className="mt-2 p-0"
      />

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 px-1">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-success" /> {t("detail.availability.legendAvailable")}
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-destructive" /> {t("detail.availability.legendUnavailable")}
        </span>
      </div>
      <p className="mt-2 px-1 text-[11px] text-muted-foreground">{t("detail.availability.readOnlyNote")}</p>
    </div>
  );
}
