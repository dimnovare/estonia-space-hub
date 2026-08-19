import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleHelp, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { adminLeadService, type ProviderOutreachRow } from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

/**
 * "This provider cannot price the request yet, and here is what they asked for."
 *
 * WHY IT EXISTS. The outreach row already carried the fact — its status is
 * `needsinfo` — and a status word alone is unactionable: the operator can see
 * that somebody is blocked and not what would unblock them, which is the exact
 * position the ops inbox was already in before any of this shipped. The reasons
 * and the note travel on the same payload as the status (see MapOutreach) so the
 * two can never disagree.
 *
 * AMBER, NOT RED. The provider has not refused the job — they asked a question,
 * and most of these convert once answered. Red is reserved here for a dead
 * address or a lost lead. Same distinction the ProviderOutreachStatus.NeedsInfo
 * comment draws, kept visible in the UI so the operator reads urgency, not
 * failure. The icon and the heading carry the meaning as well as the tint
 * (design §C: never colour alone).
 *
 * NO CONFIRM DIALOG on resolve. It is idempotent server-side, it destroys
 * nothing, and the provider can raise the same ask again from their link — a
 * modal on an action the founder performs several times a day would be friction
 * bought with nothing. The hint under the button says what it does instead.
 */
export function LeadInfoRequest({ row }: { row: ProviderOutreachRow }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const ask = row.infoRequest;

  const resolveMutation = useMutation({
    mutationFn: (id: string) => adminLeadService.resolveInfoRequest(id),
    onSuccess: () => {
      // Refetching the outreach list is what makes the panel disappear and the
      // status chip fall back to "sent" — the row re-renders from the server's
      // verdict rather than from an optimistic guess about what resolve did.
      qc.invalidateQueries({ queryKey: queryKeys.adminLeads.outreach(row.demandLeadId) });
      toast.success(t("admin.leads.infoRequestResolved"));
    },
    onError: (error: Error) => toast.error(error.message || t("toast.error")),
  });

  if (!ask) return null;

  /**
   * The backend owns this vocabulary and may add a seventh slug before the
   * frontend knows the word — the reasons are stored as slugs in a JSON array
   * precisely so that adding one costs no migration. t() returns the key itself
   * when it has no translation, so fall back to the raw slug: ugly, but it names
   * the real thing, which "admin.leads.infoReason.something_new" does not. Same
   * fallback, same reason, as skipLabel in LeadProviderStage.
   */
  const reasonLabel = (reason: string) => {
    const key = `admin.leads.infoReason.${reason}`;
    const label = t(key);
    return label === key ? reason : label;
  };

  const provider = row.supplierName ?? row.sentTo;

  return (
    <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 p-2.5">
      <p className="flex flex-wrap items-center gap-x-1.5 text-xs font-semibold text-warning-text">
        <CircleHelp className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {t("admin.leads.infoRequestTitle")}
        {/* Named here because the panel no longer sits under the outreach row
            that identified them — it leads the workspace, where "which provider
            asked this?" is otherwise unanswerable without scrolling back down. */}
        <span className="text-navy-ink">{provider}</span>
        <span className="font-normal text-muted-foreground">
          · {t("admin.leads.infoRequestAsked").replace("{date}", formatDateTime(ask.askedAt))}
        </span>
      </p>

      {ask.reasons.length > 0 ? (
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {ask.reasons.map((reason) => (
            <li
              key={reason}
              className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-foreground"
            >
              {reasonLabel(reason)}
            </li>
          ))}
        </ul>
      ) : (
        /* A provider who ticked nothing but wrote the question out has still told
           us everything — the backend accepts that deliberately, so the panel
           must not read as empty. */
        <p className="mt-1.5 text-xs text-muted-foreground">{t("admin.leads.infoRequestNoReasons")}</p>
      )}

      {ask.note && (
        /* Their own words, and in practice the field that actually closes the
           loop. Rendered as text (React escapes it — never dangerouslySetInnerHTML)
           with the line breaks they typed preserved; break-words so a pasted URL
           cannot push the workspace sideways. */
        <p className="mt-2 whitespace-pre-wrap break-words rounded-md bg-background px-2.5 py-2 text-sm text-foreground">
          {ask.note}
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        {/* The answer goes out by email, and until now the address was three
            sections away, on the outreach row this panel used to live under.
            Hunting for it is the step between reading the question and answering
            it, so the reply opens from here, pre-addressed and pre-subjected. */}
        <a
          href={`mailto:${encodeURIComponent(row.sentTo)}?subject=${encodeURIComponent(t("admin.leads.infoRequestReplySubject"))}`}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-teal-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Mail className="h-3.5 w-3.5" aria-hidden />
          {t("admin.leads.infoRequestReply")}
        </a>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 bg-card"
          disabled={resolveMutation.isPending}
          aria-label={`${provider} — ${t("admin.leads.infoRequestResolve")}`}
          onClick={() => resolveMutation.mutate(ask.id)}
        >
          {resolveMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {t("admin.leads.infoRequestResolve")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("admin.leads.infoRequestResolveHint")}</p>
      </div>
    </div>
  );
}
