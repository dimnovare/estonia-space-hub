import { useMemo, useState } from "react";
import { Calendar as CalendarIcon, Lock, Unlock, ChevronLeft, ChevronRight, Upload, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBookings } from "@/hooks/useBookings";
import { useLocations } from "@/hooks/queries";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { queryKeys } from "@/services/queryKeys";
import { Link } from "@/i18n/routing";

const localeMap: Record<string, string> = {
  et: "et-EE",
  en: "en-GB",
  ru: "ru-RU",
  lv: "lv-LV",
  lt: "lt-LT",
};

export default function ProviderCalendar() {
  const { t, language } = useLanguage();
  const locale = localeMap[language] || "en-GB";
  const queryClient = useQueryClient();
  const supplierId = useImpersonatedSupplierId();
  const { data: bookings = [] } = useBookings(supplierId);
  const { data: locations = [] } = useLocations(supplierId ? { supplierId } : undefined);

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  const { data: blockedDatesRaw = [] } = useQuery({
    queryKey: queryKeys.blockedDates.byLocation(selectedLocationId),
    queryFn: () => apiClient.get<any[]>(`/locations/${selectedLocationId}/blocked-dates`),
    enabled: !!selectedLocationId,
  });

  const formatLocal = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const blockedDateStrings = blockedDatesRaw.map((b: any) => b.date?.split("T")[0]);

  const filteredBookings = selectedLocationId
    ? bookings.filter((b) => b.locationId === selectedLocationId)
    : bookings;

  const bookedDateStrings = useMemo(
    () =>
      new Set(
        filteredBookings
          .filter((b) => b.status === "confirmed" || b.status === "active")
          .map((b) => formatLocal(new Date(b.startDate)))
      ),
    [filteredBookings]
  );

  const isBlocked = (d: Date) => blockedDateStrings.includes(formatLocal(d));
  const isBooked = (d: Date) => bookedDateStrings.has(formatLocal(d));
  const sameDay = (a: Date, b: Date) => formatLocal(a) === formatLocal(b);

  // Build the 6-row month grid (leading + trailing padding cells).
  const cells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(new Date(year, month, d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [viewMonth]);

  const monthLabel = viewMonth.toLocaleDateString(locale, { month: "long", year: "numeric" });
  const weekdays = useMemo(() => {
    // Sunday-first short weekday labels, localized.
    const ref = new Date(2024, 11, 1); // a Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ref);
      d.setDate(ref.getDate() + i);
      return d.toLocaleDateString(locale, { weekday: "short" }).slice(0, 2);
    });
  }, [locale]);

  const changeMonth = (delta: number) =>
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const toggleBlock = async () => {
    if (!selectedLocationId) {
      toast.error(t("provider.calendar.selectLocationFirst"));
      return;
    }
    if (isBooked(selectedDate)) return;
    const dateStr = formatLocal(selectedDate);
    try {
      if (isBlocked(selectedDate)) {
        const existing = blockedDatesRaw.find((b: any) => b.date?.split("T")[0] === dateStr);
        if (existing) {
          await apiClient.delete(`/locations/${selectedLocationId}/blocked-dates/${existing.id}`);
        }
      } else {
        await apiClient.post(`/locations/${selectedLocationId}/blocked-dates`, { date: dateStr });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.blockedDates.byLocation(selectedLocationId) });
    } catch (err: any) {
      toast.error(err?.message || t("provider.listings.deleteFailed"));
    }
  };

  const upcoming = [...filteredBookings]
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-ink md:text-[28px]">{t("provider.calendar.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("provider.calendar.desc")}</p>

      {/* Notice bar — calendar sync is an optional tool */}
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="h-4 w-4 text-teal-deep" />
          {t("provider.calendar.syncOptional")}
        </span>
        <Link
          to={`/provider/dashboard?ptab=boosts${supplierId ? `&supplierId=${supplierId}` : ""}`}
          className="text-sm font-semibold text-teal-deep hover:underline"
        >
          {t("provider.calendar.requestSync")}
        </Link>
        <button
          className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-[10px] bg-secondary px-3.5 text-[13px] font-medium text-muted-foreground opacity-60"
          disabled
          title={t("provider.calendar.importComingSoon")}
        >
          <Upload className="h-3.5 w-3.5" />
          {t("provider.calendar.import")}
        </button>
      </div>

      {locations.length > 1 && (
        <div className="mt-4">
          <label className="mb-1.5 block text-[13px] font-semibold text-ink-2">
            <MapPin className="mr-1 inline h-3.5 w-3.5 text-teal-deep" />
            {t("provider.calendar.selectLocation")}
          </label>
          <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
            <SelectTrigger className="h-11 w-full max-w-xs rounded-[10px] border-input">
              <SelectValue placeholder={t("provider.calendar.allLocations")} />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name} · {loc.city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Month card */}
        <div className="rounded-[14px] border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => changeMonth(-1)}
              aria-label={t("provider.calendar.prevMonth")}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-secondary hover:text-navy-ink"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <strong className="font-display text-sm font-semibold text-navy-ink">{monthLabel}</strong>
            <button
              onClick={() => changeMonth(1)}
              aria-label={t("provider.calendar.nextMonth")}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-secondary hover:text-navy-ink"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekdays.map((d, i) => (
              <div key={i} className="py-1 text-[11px] font-semibold text-muted-foreground">{d}</div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const booked = isBooked(d);
              const blocked = isBlocked(d);
              const selected = sameDay(d, selectedDate);
              const base = "flex aspect-square items-center justify-center rounded-[8px] text-[13px] transition-colors";
              let cls = "text-ink hover:bg-secondary";
              if (selected) cls = "bg-navy-ink font-semibold text-white";
              else if (blocked) cls = "bg-destructive/10 font-bold text-destructive";
              else if (booked) cls = "bg-[#E6F6EF] font-bold text-success";
              return (
                <button key={i} onClick={() => setSelectedDate(d)} className={`${base} ${cls}`}>
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-1">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-success" /> {t("provider.calendar.booked")}
            </span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-destructive" /> {t("provider.calendar.blocked")}
            </span>
          </div>
        </div>

        {/* Day card */}
        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-base font-semibold text-navy-ink">
              {selectedDate.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </h3>
            {selectedLocationId && !isBooked(selectedDate) && (
              isBlocked(selectedDate) ? (
                <Button size="sm" variant="outline" className="gap-1" onClick={toggleBlock}>
                  <Unlock className="h-3.5 w-3.5" /> {t("provider.calendar.openDate")}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={toggleBlock}
                >
                  <Lock className="h-3.5 w-3.5" /> {t("provider.calendar.blockDate")}
                </Button>
              )
            )}
          </div>

          {/* Empty / blocked state */}
          <div className="mt-4 flex flex-col items-center rounded-[12px] bg-secondary/30 px-6 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-secondary text-muted-foreground">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {isBlocked(selectedDate)
                ? t("provider.calendar.blockedWarning")
                : t("provider.calendar.noBlockedSelect")}
            </p>
          </div>

          {/* Upcoming bookings */}
          <div className="mt-6">
            <h4 className="mb-3 font-mono-label text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              {t("provider.calendar.upcomingBookings")}
            </h4>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("provider.calendar.noBookingsYet")}</p>
            ) : (
              <div className="divide-y divide-border">
                {upcoming.map((b) => (
                  <div key={b.id} className="flex items-center justify-between py-3 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="font-semibold text-navy-ink">{b.provider}</span>
                      <span className="text-muted-foreground"> · {b.listingTitle}</span>
                    </span>
                    <span className="shrink-0 text-muted-foreground">{b.startDate}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
