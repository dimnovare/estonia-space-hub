import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { disputeService, type DisputeType } from "@/services";

const TYPE_KEYS: { value: DisputeType; labelKey: "dispute.type.damage" | "dispute.type.noshow" | "dispute.type.deposit" | "dispute.type.other" }[] = [
  { value: "deposit", labelKey: "dispute.type.deposit" },
  { value: "damage", labelKey: "dispute.type.damage" },
  { value: "noshow", labelKey: "dispute.type.noshow" },
  { value: "other", labelKey: "dispute.type.other" },
];

/**
 * Customer-facing "report an issue" trigger + modal for a single booking.
 * Self-contained so it can drop into a booking card with one line.
 */
export default function RaiseDisputeModal({
  bookingId,
  defaultType = "other",
}: {
  bookingId: string;
  defaultType?: DisputeType;
}) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<DisputeType>(defaultType);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const raise = useMutation({
    mutationFn: () =>
      disputeService.raise({
        bookingId,
        type,
        subject: subject.trim(),
        description: description.trim() || undefined,
        amountClaimed: amount.trim() ? Number(amount.replace(",", ".")) : undefined,
      }),
    onSuccess: () => {
      toast.success(t("dispute.submitted"));
      setOpen(false);
      setSubject(""); setDescription(""); setAmount("");
      qc.invalidateQueries({ queryKey: ["disputes", "mine"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : t("error.generic")),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) { toast.error(t("dispute.subjectRequired")); return; }
    raise.mutate();
  };

  const inputCls = "h-10 rounded-[10px] border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";
  const showAmount = type === "deposit" || type === "damage";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <ShieldAlert className="h-3.5 w-3.5" /> {t("dispute.report")}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-[14px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold">{t("dispute.title")}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">{t("dispute.intro")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="dispute-type" className="text-[13px] font-semibold text-ink-2">{t("dispute.typeLabel")}</label>
              <select id="dispute-type" value={type} onChange={(e) => setType(e.target.value as DisputeType)} className={inputCls}>
                {TYPE_KEYS.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="dispute-subject" className="text-[13px] font-semibold text-ink-2">{t("dispute.subjectLabel")}</label>
              <input id="dispute-subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} required maxLength={150} />
            </div>
            {showAmount && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="dispute-amount" className="text-[13px] font-semibold text-ink-2">{t("dispute.amountLabel")}</label>
                <div className="flex items-center gap-1.5">
                  <input id="dispute-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={`${inputCls} w-32`} />
                  <span className="text-sm text-muted-foreground">€</span>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="dispute-desc" className="text-[13px] font-semibold text-ink-2">{t("dispute.descLabel")}</label>
              <textarea id="dispute-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={4000}
                className="rounded-[10px] border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={raise.isPending} className="gap-1.5">
                {raise.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("dispute.submit")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
