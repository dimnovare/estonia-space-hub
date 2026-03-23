import { useState } from "react";
import { Calendar as CalendarIcon, X, Lock, Unlock, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { useBookings } from "@/hooks/useBookings";
import { useLanguage } from "@/i18n/LanguageContext";

export default function ProviderCalendar() {
  const { t } = useLanguage();
  const { data: bookings = [] } = useBookings();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);

  const bookedDates = bookings
    .filter(b => b.status === "confirmed" || b.status === "active")
    .map(b => new Date(b.startDate));

  const isBlocked = (d: Date) => blockedDates.some(bd => bd.toDateString() === d.toDateString());
  const isBooked = (d: Date) => bookedDates.some(bd => bd.toDateString() === d.toDateString());

  const toggleBlock = () => {
    if (!date) return;
    if (isBooked(date)) return;
    if (isBlocked(date)) {
      setBlockedDates(prev => prev.filter(bd => bd.toDateString() !== date.toDateString()));
    } else {
      setBlockedDates(prev => [...prev, new Date(date)]);
    }
  };

  const selectedBookings = bookings.filter(b => {
    if (!date) return false;
    const bd = new Date(b.startDate);
    return bd.toDateString() === date.toDateString();
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("provider.calendar.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("provider.calendar.desc")}</p>
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
            {date ? date.toLocaleDateString("et-EE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : t("provider.calendar.selectDate")}
          </h3>

          {date && (
            <div className="mt-3 flex items-center gap-2">
              {isBlocked(date) ? (
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
                    <p className="text-xs text-muted-foreground">{b.listingTitle} · {(b as any).duration ?? ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${b.status === "confirmed" ? "bg-success/10 text-success" : b.status === "pending" ? "bg-warning/10 text-warning" : "bg-accent/10 text-accent"}`}>
                      {b.status === "confirmed" ? t("provider.bookings.confirmed") : b.status === "pending" ? t("provider.bookings.pending") : t("provider.bookings.active")}
                    </span>
                    <span className="text-sm font-semibold">€{(b as any).total ?? (b as any).basePrice ?? 0}</span>
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
              <p className="text-sm text-muted-foreground">{t("provider.calendar.noBlocked")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {blockedDates.sort((a, b) => a.getTime() - b.getTime()).map((bd, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs text-destructive">
                    {bd.toLocaleDateString("et-EE", { day: "numeric", month: "short" })}
                    <button onClick={() => setBlockedDates(prev => prev.filter(d => d.toDateString() !== bd.toDateString()))} className="hover:text-destructive/80">
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
              {bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Broneeringuid pole.</p>
              ) : bookings.map(b => (
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
