import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Send, User } from "lucide-react";
import { toast } from "sonner";
import {
  adminLeadService,
  type AdminLead,
  type LeadMessage,
  type ProviderOutreachRow,
} from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";

/**
 * Write to the people on this request — the customer, or a provider we already
 * contacted — without leaving the workspace.
 *
 * WHY THIS PANEL EXISTS. The concierge loop is a conversation, but the product
 * could only ever send the letters it composed itself. Everything else an
 * operator actually needs to ask ("what is the exact pickup address?", "is that
 * price per hour or for the whole job?") had no path at all, so it got sent from
 * a personal mailbox instead — which meant the replies came back somewhere this
 * workspace cannot see, and the next person to open the lead had no idea the
 * question had already been asked.
 *
 * So the history list below is not decoration. It is the half that was missing:
 * a record, on the lead, of what was asked and to whom.
 *
 * THE RECIPIENT IS A CHOICE FROM A LIST, NEVER A TYPED ADDRESS — matching the
 * endpoint, which resolves the address server-side from the lead's own data and
 * refuses a provider who was not contacted for this request. There is nowhere
 * here to type an arbitrary email, on purpose.
 */
export function LeadMessages({ lead, outreachRows }: {
  lead: AdminLead;
  outreachRows: ProviderOutreachRow[];
}) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  // "" = the customer. Otherwise a supplier id.
  const [target, setTarget] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const { data: messages = [], isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.adminLeads.messages(lead.id),
    queryFn: () => adminLeadService.messages(lead.id),
    staleTime: 30_000,
  });

  /** One entry per provider actually written to about this lead, deduped by
   *  supplier — a provider re-contacted twice is still one person to write to. */
  const providers = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of outreachRows) {
      if (!row.supplierId || seen.has(row.supplierId)) continue;
      seen.set(row.supplierId, row.supplierName ?? row.sentTo);
    }
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [outreachRows]);

  const sendMutation = useMutation({
    mutationFn: () => adminLeadService.sendMessage(lead.id, {
      subject: subject.trim(),
      body: body.trim(),
      supplierId: target || null,
    }),
    onSuccess: () => {
      toast.success(t("admin.leads.message.sent"));
      setSubject("");
      setBody("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.adminLeads.messages(lead.id) });
    },
    onError: (error: Error) => toast.error(error.message || t("toast.error")),
  });

  const canSend = subject.trim().length > 0 && body.trim().length > 0 && !sendMutation.isPending;

  /** Who a stored message went to, resolved for display. Falls back to the
   *  snapshotted address when the supplier is no longer among the contacted
   *  rows — the history has to stay readable even after the directory moves on. */
  const recipientLabel = (message: LeadMessage) => {
    if (!message.supplierId) return t("admin.leads.message.toCustomer");
    return providers.find((p) => p.id === message.supplierId)?.name ?? message.sentTo;
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-sm font-bold text-navy-ink">
          <Mail className="h-4 w-4 text-teal-deep" aria-hidden />
          {t("admin.leads.message.title")}
        </h3>
        <Button
          type="button"
          size="sm"
          variant={open ? "ghost" : "outline"}
          className="h-8 text-xs"
          onClick={() => setOpen((previous) => !previous)}
        >
          {open ? t("common.cancel") : t("admin.leads.message.compose")}
        </Button>
      </div>

      {/* Sent from Ruumly, not from whoever is logged in — said plainly, because
          the whole reason this panel exists is that it once was not true. */}
      <p className="mt-1 text-xs text-muted-foreground">{t("admin.leads.message.fromNote")}</p>

      {open && (
        <form
          className="mt-3 space-y-2.5"
          onSubmit={(event) => { event.preventDefault(); if (canSend) sendMutation.mutate(); }}
        >
          <label className="block text-xs font-medium text-muted-foreground">
            {t("admin.leads.message.to")}
            <select
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm"
            >
              <option value="">
                {t("admin.leads.message.toCustomer")}{lead.email ? ` — ${lead.email}` : ""}
              </option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>{provider.name}</option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-muted-foreground">
            {t("admin.leads.message.subject")}
            <input
              value={subject}
              maxLength={300}
              onChange={(event) => setSubject(event.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm"
            />
          </label>

          <label className="block text-xs font-medium text-muted-foreground">
            {t("admin.leads.message.body")}
            <textarea
              value={body}
              rows={5}
              maxLength={10000}
              onChange={(event) => setBody(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm"
            />
          </label>

          <Button type="submit" size="sm" className="h-9 gap-1.5" disabled={!canSend}>
            {sendMutation.isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              : <Send className="h-3.5 w-3.5" aria-hidden />}
            {t("admin.leads.message.send")}
          </Button>
        </form>
      )}

      {/* History. An empty list after a FAILED fetch would read as "nothing was
          ever asked", which is exactly the wrong thing to tell someone deciding
          whether to ask again. */}
      <div className="mt-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">{t("common.pleaseWait")}</p>
        ) : isError ? (
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs font-medium text-destructive-text underline underline-offset-2"
          >
            {t("admin.leads.message.loadError")}
          </button>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("admin.leads.message.none")}</p>
        ) : (
          <ul className="space-y-2">
            {messages.map((message) => (
              <li key={message.id} className="rounded-lg border border-border bg-secondary/30 p-2.5">
                <p className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-foreground">
                  {message.supplierId
                    ? <Mail className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                    : <User className="h-3 w-3 shrink-0 text-teal-deep" aria-hidden />}
                  {recipientLabel(message)}
                  <span className="font-normal text-muted-foreground">
                    · {new Date(message.sentAt).toLocaleString()}
                  </span>
                </p>
                <p className="mt-1 text-xs font-medium text-navy-ink">{message.subject}</p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                  {message.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
