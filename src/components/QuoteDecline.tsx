import { useEffect, useId, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Ban, Check, Loader2 } from "lucide-react";
import { readQuoteFailure } from "@/components/quoteFailure";
import { useLanguage } from "@/i18n/LanguageContext";
import { quoteService, type QuoteDeclineInput } from "@/services";

/**
 * "No, I can't take this one" — the provider's third honest answer, and the one
 * the outreach email has invited since 2026-08-18 ("a short 'not possible' is a
 * perfectly good answer") while giving it nowhere to land. Until this shipped,
 * the only way to say no was a free-text reply into a shared inbox that nothing
 * parsed, so every real decline was recorded as SILENCE: it kept feeding the
 * provider-silence metric as if the outreach had failed, and the same provider
 * kept receiving the next lead in range.
 *
 * SUBORDINATE, and quieter than need-info. A price is what we want most, a
 * question is the next-best thing, and "no" is the last — so this sits below
 * both, is a plain text trigger, and its confirm is an OUTLINE danger button,
 * never a filled CTA competing with Send.
 *
 * A BARE NO IS COMPLETE. Unlike need-info (where an empty payload says nothing),
 * a decline needs neither a reason nor a note to be a real answer — the reason
 * chips exist only because two of them (wrong area, wrong service) tell ops the
 * DIRECTORY ROW is mis-filed, which is worth a great deal more than this one lead.
 */

/**
 * The five reasons, in the order DeclineReasons.All lists them on the backend —
 * that order is the contract. Labels are translation KEYS held explicitly, not
 * composed as `t(`...${slug}`)`, because t() returns the key it was handed on a
 * miss: a slug the backend adds before this build knows it must never print our
 * internals at a provider. See labelFor.
 */
const REASONS = [
  { slug: "wrong_area", labelKey: "quote.decline.reason.wrongArea" },
  { slug: "no_capacity", labelKey: "quote.decline.reason.noCapacity" },
  { slug: "not_our_service", labelKey: "quote.decline.reason.notOurService" },
  { slug: "too_small", labelKey: "quote.decline.reason.tooSmall" },
  { slug: "other", labelKey: "quote.decline.reason.other" },
] as const;

const NOTE_MAX = 2000;

export function QuoteDecline({
  token,
  declined,
  onDeclined,
  onLeadClosed,
  onAlreadyQuoted,
}: {
  token: string;
  /** GET reported this provider already declined — show the recorded state. */
  declined: boolean;
  /** A fresh decline just landed — the page switches to its declined screen. */
  onDeclined: () => void;
  /** 409 lead_closed — a closed request is the PAGE's state, hoisted. */
  onLeadClosed: () => void;
  /** 409 already_quoted — a price is live; withdrawing it is a conversation. */
  onAlreadyQuoted: () => void;
}) {
  const { t } = useLanguage();
  const panelId = useId();
  const errorId = useId();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open]);

  const mutation = useMutation({
    mutationFn: (body: QuoteDeclineInput) => quoteService.decline(token, body),
    onSuccess: () => {
      setError(null);
      setOpen(false);
      onDeclined();
    },
    onError: (err: Error & { status?: number; body?: unknown; retryAfter?: number }) => {
      const failure = readQuoteFailure(err, t, t("quote.decline.submitError"));
      if (failure.kind === "closed") { onLeadClosed(); return; }
      // The one decline-specific conflict: a price already went in. The backend
      // refuses to let a button silently retract a live offer option.
      const body = err.body as { reason?: string } | undefined;
      if (err.status === 409 && body?.reason === "already_quoted") {
        onAlreadyQuoted();
        return;
      }
      setError(failure.message);
    },
  });

  const labelFor = (slug: string) => {
    const known = REASONS.find((r) => r.slug === slug);
    return known ? t(known.labelKey) : slug;
  };

  const closePanel = () => {
    setOpen(false);
    setError(null);
    triggerRef.current?.focus();
  };

  // A recorded decline is terminal for this control: state the fact, offer no
  // way to un-say it here (that is a conversation), and never re-open the panel.
  if (declined) {
    return (
      <div className="mt-3" role="status">
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-secondary/40 p-4">
          <Ban className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <h2 className="font-display text-sm font-bold text-navy-ink">{t("quote.decline.doneTitle")}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("quote.decline.doneBody")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => { if (open) closePanel(); else setOpen(true); }}
        className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Ban className="h-4 w-4 shrink-0" aria-hidden />
        {t("quote.decline.cta")}
      </button>

      {open && (
        <form
          id={panelId}
          className="mt-2 rounded-xl border border-border bg-secondary/30 p-4"
          onSubmit={(e) => { e.preventDefault(); mutation.mutate({ reason, note: note.trim() || null }); }}
        >
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-base font-bold text-navy-ink focus:outline-none"
          >
            {t("quote.decline.title")}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("quote.decline.intro")}</p>

          {/* Single-choice: a decline is one decision. radiogroup, so a screen
              reader hears one question rather than five toggles, and a second
              pick replaces the first. Optional throughout — a bare no submits. */}
          <fieldset className="mt-4 min-w-0 border-0 p-0" aria-describedby={error ? errorId : undefined}>
            <legend className="text-xs font-medium text-muted-foreground">{t("quote.decline.legend")}</legend>
            <div className="mt-2 space-y-1.5" role="radiogroup" aria-label={t("quote.decline.legend")}>
              {REASONS.map((r) => {
                const checked = reason === r.slug;
                return (
                  <label
                    key={r.slug}
                    className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2 transition-colors ${
                      checked ? "border-destructive" : "border-border hover:border-destructive/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`decline-reason-${panelId}`}
                      checked={checked}
                      // A second click on the chosen reason clears it — back to a
                      // bare no, which is still a complete answer.
                      onClick={() => setReason((prev) => (prev === r.slug ? null : r.slug))}
                      onChange={() => setReason(r.slug)}
                      className="h-5 w-5 shrink-0 cursor-pointer accent-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <span className="text-sm leading-snug text-foreground">{labelFor(r.slug)}</span>
                    {checked && <Check className="ml-auto h-4 w-4 shrink-0 text-destructive" aria-hidden />}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label className="mt-4 block text-xs font-medium text-muted-foreground">
            {t("quote.decline.noteLabel")}
            <textarea
              value={note}
              rows={2}
              maxLength={NOTE_MAX}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("quote.decline.notePlaceholder")}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
            />
          </label>

          {error && (
            <p id={errorId} role="alert" className="mt-3 flex items-center gap-2 text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-destructive px-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:opacity-60"
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Ban className="h-4 w-4" aria-hidden />}
              {t("quote.decline.confirmCta")}
            </button>
            <button
              type="button"
              onClick={closePanel}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("quote.decline.cancelCta")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
