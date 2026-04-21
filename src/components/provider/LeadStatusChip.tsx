import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { LeadStatus } from "@/services/types";
import { useLanguage } from "@/i18n/LanguageContext";
import { useUpdateLead } from "@/hooks/useOrders";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "bg-accent/15 text-accent border-accent/30",
  contacted: "bg-warning/15 text-warning border-warning/30",
  won: "bg-success/15 text-success border-success/30",
  lost: "bg-destructive/10 text-destructive/80 border-destructive/20",
};

const ORDER: LeadStatus[] = ["new", "contacted", "won", "lost"];

export function LeadStatusChip({ orderId, current, lastContactAt }: { orderId: string; current?: LeadStatus | null; lastContactAt?: string | null }) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const updateLead = useUpdateLead();
  const status: LeadStatus = (current as LeadStatus) || "new";

  const handleSelect = async (next: LeadStatus) => {
    setOpen(false);
    if (next === status) return;
    const payload: { id: string; status: LeadStatus; lastContactAt?: string } = { id: orderId, status: next };
    if (status === "new" && next === "contacted") {
      payload.lastContactAt = new Date().toISOString();
    }
    try {
      await updateLead.mutateAsync(payload);
    } catch {
      toast.error("Error");
    }
  };

  const daysAgo = (() => {
    if (!lastContactAt) return null;
    const ms = Date.now() - new Date(lastContactAt).getTime();
    const d = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
    return d;
  })();

  const button = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${STATUS_STYLES[status]}`}
    >
      {t(`crm.status.${status}`)}
      <ChevronDown className="h-3 w-3" />
    </button>
  );

  return (
    <span className="inline-flex items-center gap-2">
      {button}
      {daysAgo !== null && (
        <span className="text-[11px] text-muted-foreground">
          {t("crm.lastContact.daysAgo").replace("{n}", String(daysAgo))}
        </span>
      )}
      {open && isMobile && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>{t("crm.status.new")} / {t("crm.status.contacted")} / {t("crm.status.won")} / {t("crm.status.lost")}</SheetTitle>
            </SheetHeader>
            <div className="mt-4 grid gap-2">
              {ORDER.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSelect(s)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium ${STATUS_STYLES[s]}`}
                >
                  {t(`crm.status.${s}`)}
                  {s === status && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      )}
      {open && !isMobile && (
        <span className="relative inline-block">
          <span className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-6 z-40 w-44 rounded-xl border border-border bg-card p-1 shadow-xl">
            {ORDER.map((s) => (
              <button
                key={s}
                onClick={() => handleSelect(s)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-secondary ${s === status ? "bg-secondary" : ""}`}
              >
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${STATUS_STYLES[s]}`}>
                  {t(`crm.status.${s}`)}
                </span>
                {s === status && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
            ))}
          </div>
        </span>
      )}
    </span>
  );
}

export default LeadStatusChip;