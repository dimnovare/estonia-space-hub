import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ShieldAlert, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { disputeService, type AdminDispute, type DisputeStatus } from "@/services";

const STATUS_FILTERS: { value: DisputeStatus | "all"; labelKey:
  "admin.disputes.all" | "admin.disputes.open" | "admin.disputes.inreview" | "admin.disputes.resolved" | "admin.disputes.rejected" }[] = [
  { value: "all", labelKey: "admin.disputes.all" },
  { value: "open", labelKey: "admin.disputes.open" },
  { value: "inreview", labelKey: "admin.disputes.inreview" },
  { value: "resolved", labelKey: "admin.disputes.resolved" },
  { value: "rejected", labelKey: "admin.disputes.rejected" },
];

const STATUS_COLORS: Record<DisputeStatus, string> = {
  open: "bg-warning/10 text-warning-text",
  inreview: "bg-info/10 text-info",
  resolved: "bg-success/10 text-success",
  rejected: "bg-secondary text-muted-foreground",
};

const TYPE_KEYS: Record<string, "dispute.type.damage" | "dispute.type.noshow" | "dispute.type.deposit" | "dispute.type.other"> = {
  damage: "dispute.type.damage",
  noshow: "dispute.type.noshow",
  deposit: "dispute.type.deposit",
  other: "dispute.type.other",
};

export default function AdminDisputes() {
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | "all">("open");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "disputes", statusFilter],
    queryFn: () => disputeService.adminList(statusFilter),
  });
  const items = data?.items ?? [];

  return (
    <div>
      <header className="mb-5 flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-navy-ink" />
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-ink">{t("admin.disputes.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("admin.disputes.desc")}</p>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            aria-pressed={statusFilter === opt.value}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === opt.value ? "bg-navy-ink text-white" : "border border-line-2 text-muted-foreground hover:text-navy-ink"
            }`}
          >
            {t(opt.labelKey)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          {t("admin.disputes.empty")}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((d) => <DisputeCard key={d.id} dispute={d} typeLabel={(ty) => t(TYPE_KEYS[ty] ?? "dispute.type.other")} />)}
        </ul>
      )}
    </div>
  );
}

function DisputeCard({ dispute, typeLabel }: { dispute: AdminDispute; typeLabel: (t: string) => string }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [notes, setNotes] = useState(dispute.adminNotes ?? "");
  const [resolution, setResolution] = useState(dispute.resolution ?? "");
  const terminal = dispute.status === "resolved" || dispute.status === "rejected";

  const update = useMutation({
    mutationFn: (body: { status?: string; adminNotes?: string; resolution?: string }) =>
      disputeService.adminUpdate(dispute.id, body),
    onSuccess: () => { toast.success(t("admin.disputes.saved")); qc.invalidateQueries({ queryKey: ["admin", "disputes"] }); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : t("toast.error")),
  });

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-semibold uppercase text-muted-foreground">{typeLabel(dispute.type)}</span>
            <p className="font-semibold text-foreground">{dispute.subject}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {dispute.contactEmail} · {dispute.raisedByRole}
            {dispute.supplierName && ` · ${dispute.supplierName}`}
            {dispute.listingTitle && ` · ${dispute.listingTitle}`}
          </p>
        </div>
        <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[dispute.status]}`}>
          {t(STATUS_FILTERS.find((s) => s.value === dispute.status)?.labelKey ?? "admin.disputes.open")}
        </span>
      </div>

      {dispute.description && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-secondary/40 p-3 text-sm text-foreground/90">{dispute.description}</p>}

      <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
        {dispute.amountClaimed != null && <span>{t("admin.disputes.amount")}: <strong className="text-foreground">{dispute.amountClaimed.toFixed(2)} €</strong></span>}
        <span>{new Date(dispute.createdAt).toLocaleString()}</span>
        {dispute.evidence && dispute.evidence.length > 0 && <span>{t("admin.disputes.evidence")}: {dispute.evidence.join(", ")}</span>}
      </div>

      {!terminal ? (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={`resolution-${dispute.id}`} className="text-xs font-semibold text-muted-foreground">{t("admin.disputes.resolutionLabel")}</label>
            <input
              id={`resolution-${dispute.id}`}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder={t("admin.disputes.resolutionPlaceholder")}
              className="h-10 w-full rounded-lg border border-input bg-card px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`notes-${dispute.id}`} className="text-xs font-semibold text-muted-foreground">{t("admin.disputes.notesLabel")}</label>
            <input
              id={`notes-${dispute.id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("admin.disputes.notesPlaceholder")}
              className="h-10 w-full rounded-lg border border-input bg-card px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {dispute.status === "open" && (
              <Button size="sm" variant="outline" className="h-10" disabled={update.isPending}
                onClick={() => update.mutate({ status: "inreview", adminNotes: notes.trim() || undefined })}>
                {t("admin.disputes.startReview")}
              </Button>
            )}
            <Button size="sm" className="h-10 gap-1" disabled={update.isPending}
              onClick={() => update.mutate({ status: "resolved", resolution: resolution.trim() || undefined, adminNotes: notes.trim() || undefined })}>
              <Check className="h-3.5 w-3.5" /> {t("admin.disputes.resolve")}
            </Button>
            <Button size="sm" variant="outline" className="h-10 gap-1" disabled={update.isPending}
              onClick={() => update.mutate({ status: "rejected", resolution: resolution.trim() || undefined, adminNotes: notes.trim() || undefined })}>
              <X className="h-3.5 w-3.5" /> {t("admin.disputes.reject")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          {dispute.resolution && <p><strong className="text-foreground">{t("admin.disputes.resolutionLabel")}:</strong> {dispute.resolution}</p>}
          {dispute.resolvedAt && <p className="mt-0.5">{new Date(dispute.resolvedAt).toLocaleString()}</p>}
        </div>
      )}
    </li>
  );
}
