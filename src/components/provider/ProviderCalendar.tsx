import { useState } from "react";
import { Calendar as CalendarIcon, X, Lock, Unlock, Ban, MapPin, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBookings } from "@/hooks/useBookings";
import { useLocations } from "@/hooks/queries";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, tokenStore } from "@/services/apiClient";
import { toast } from "sonner";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { withSupplier } from "@/lib/withSupplier";
import { queryKeys } from "@/services/queryKeys";

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
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  const { data: blockedDatesRaw = [] } = useQuery({
    queryKey: queryKeys.blockedDates.byLocation(selectedLocationId),
    queryFn: () => apiClient.get<any[]>(`/locations/${selectedLocationId}/blocked-dates`),
    enabled: !!selectedLocationId,
  });
  const { data: supplierProfile } = useQuery({
    queryKey: queryKeys.supplierProfile.byId(supplierId),
    queryFn: () => apiClient.get<any>(withSupplier("/supplier/profile", supplierId)),
    enabled: !supplierId,
  });
  const hasCalendarSync = supplierId ? true : (supplierProfile?.hasCalendarSync ?? false);
  const formatLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const blockedDateStrings = blockedDatesRaw.map((b: any) => b.date?.split("T")[0]);
  const blockedDates = blockedDatesRaw.map((b: any) => {
    const parts = (b.date?.split("T")[0] || "").split("-");
    return new Date(+parts[0], +parts[1] - 1, +parts[2]);
  });

  const filteredBookings = selectedLocationId
    ? bookings.filter(b => b.locationId === selectedLocationId)
    : bookings;

  const bookedDates = filteredBookings
    .filter(b => b.status === "confirmed" || b.status === "active")
    .map(b => new Date(b.startDate));

  const isBlocked = (d: Date) => blockedDateStrings.includes(formatLocal(d));
  const isBooked = (d: Date) => bookedDates.some(bd => bd.toDateString() === d.toDateString());

  const toggleBlock = async () => {
    if (!date || !selectedLocationId) return;
    if (isBooked(date)) return;
    const dateStr = formatLocal(date);
    try {
      if (isBlocked(date)) {
        const existing = blockedDatesRaw.find((b: any) => b.date === dateStr);
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

  const selectedBookings = filteredBookings.filter(b => {
    if (!date) return false;
    const bd = new Date(b.startDate);
    return bd.toDateString() === date.toDateString();
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("provider.calendar.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("provider.calendar.desc")}</p>

      <div className="mt-4">
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          <MapPin className="inline h-3.5 w-3.5 mr-1" />
          {t("provider.calendar.selectLocation")}
        </label>
        <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder={t("provider.calendar.allLocations")} />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>{loc.name} · {loc.city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 mt-4">
        {!supplierId && hasCalendarSync && (
        <a
          href={`${import.meta.env.VITE_API_URL || ""}/api/supplier/calendar.ics`}
          download="ruumly-bookings.ics"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
          onClick={(e) => {
            e.preventDefault();
            const token = tokenStore.getAccess();
            if (!token) { toast.error(t("toast.error")); return; }
            fetch(`${import.meta.env.VITE_API_URL || ""}/api/supplier/calendar.ics`, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then(res => res.blob())
              .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "ruumly-bookings.ics";
                a.click();
                URL.revokeObjectURL(url);
              })
              .catch(() => toast.error(t("toast.error")));
          }}
        >
          <Download className="h-3.5 w-3.5" />
          {t("provider.calendar.export") || "Export .ics"}
        </a>
        )}
        {!supplierId && !hasCalendarSync && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="h-3.5 w-3.5" />
            {t("provider.calendar.upgradeForExport")}
          </p>
        )}

        <button
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors text-muted-foreground cursor-not-allowed opacity-50"
          disabled
          title={t("provider.calendar.importComingSoon") || "Coming soon"}
        >
          <Upload className="h-3.5 w-3.5" />
          {t("provider.calendar.import") || "Import .ics"}
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[auto_1fr]">
        <div className="card-elevated p-4">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="pointer-events-auto"
            modifiers={{ booked: bookedDates, blocked: blockedDates }}
            modifiersClassNames={{
              booked: "bg-accent/20 text-accent font-bold",
              blocked: "bg-destructive/15 text-destructive line-through",
            }}
          />
          <div className="mt-3 space-y-1 px-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-3 w-3 rounded-sm bg-accent/20" /> {t("provider.calendar.booked")}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-3 w-3 rounded-sm bg-destructive/15" /> {t("provider.calendar.blocked")}
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold">
            {date ? date.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : t("provider.calendar.selectDate")}
          </h3>

          {date && (
            <div className="mt-3 flex items-center gap-2">
              {!selectedLocationId ? (
                <Badge variant="secondary" className="gap-1 text-muted-foreground">
                  {t("provider.calendar.selectLocationFirst")}
                </Badge>
              ) : isBlocked(date) ? (
                <Button size="sm" variant="outline" className="gap-1" onClick={toggleBlock}>
                  <Unlock className="h-3.5 w-3.5" /> {t("provider.calendar.openDate")}
                </Button>
              ) : isBooked(date) ? (
                <Badge variant="secondary" className="gap-1"><CalendarIcon className="h-3 w-3" /> {t("provider.calendar.bookedCantBlock")}</Badge>
              ) : (
                <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={toggleBlock}>
                  <Lock className="h-3.5 w-3.5" /> {t("provider.calendar.blockDate")}
                </Button>
              )}
            </div>
          )}

          {selectedBookings.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("provider.calendar.bookings")}</h4>
              {selectedBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div>
                    <p className="text-sm font-medium">{b.provider}</p>
                    <p className="text-xs text-muted-foreground">{b.listingTitle} · {b.duration ?? ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${b.status === "confirmed" ? "bg-success/10 text-success" : b.status === "pending" ? "bg-warning/10 text-warning" : "bg-accent/10 text-accent"}`}>
                      {b.status === "confirmed" ? t("provider.bookings.confirmed") : b.status === "pending" ? t("provider.bookings.pending") : t("provider.bookings.active")}
                    </span>
                    <span className="text-sm font-semibold">€{b.total ?? b.basePrice ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {date && isBlocked(date) && (
            <div className="mt-4 rounded-lg bg-destructive/5 border border-destructive/20 p-3">
              <p className="text-xs text-destructive font-medium flex items-center gap-1">
                <Ban className="h-3 w-3" /> {t("provider.calendar.blockedWarning")}
              </p>
            </div>
          )}

          <div className="mt-6">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t("provider.calendar.blockedDates")}</h4>
            {blockedDates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {!selectedLocationId ? t("provider.calendar.selectLocationFirst") : t("provider.calendar.noBlocked")}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {[...blockedDates].sort((a, b) => a.getTime() - b.getTime()).map((bd, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs text-destructive">
                    {bd.toLocaleDateString(locale, { day: "numeric", month: "short" })}
                    <button onClick={async () => {
                      const dateStr = formatLocal(bd);
                      const existing = blockedDatesRaw.find((b: any) => b.date === dateStr);
                      if (existing) {
                        try {
                          await apiClient.delete(`/locations/${selectedLocationId}/blocked-dates/${existing.id}`);
                          queryClient.invalidateQueries({ queryKey: queryKeys.blockedDates.byLocation(selectedLocationId) });
                        } catch (err: any) {
                          toast.error(err?.message || t("provider.listings.deleteFailed"));
                        }
                      }
                    }} className="hover:text-destructive/80">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t("provider.calendar.upcomingBookings")}</h4>
            <div className="space-y-2">
              {filteredBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("provider.calendar.noBookingsYet")}</p>
              ) : filteredBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <div>
                    <span className="font-medium">{b.provider}</span>
                    <span className="text-muted-foreground"> · {b.listingTitle}</span>
                  </div>
                  <span className="text-muted-foreground">{b.startDate}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
