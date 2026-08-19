import { useEffect, useId, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Check, HelpCircle, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readQuoteFailure } from "@/components/quoteFailure";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  quoteService,
  type PublicQuoteInfoRequest,
  type QuoteNeedInfoInput,
} from "@/services";

/**
 * "I can't quote this yet" — the provider's second honest answer.
 *
 * WHY IT EXISTS. On 2026-08-17 Adduco, a real Estonian mover, answered a live
 * Haapsalu job with "selle info pealt adekvaatset pakkumist paraku ei saa teha"
 * and then named exactly what they were missing: whether the two ends were the
 * same address, and photos. That answer arrived in a shared ops inbox as free
 * text with nothing on it saying WHICH request it was about, and it cost a full
 * round trip on a move the customer needed that same week. The page they were
 * standing on offered exactly one action, and it asked for the one thing they
 * could not give.
 *
 * NOT A DECLINE, and the layout has to keep saying so. A provider who presses
 * this is still in the running: the price form above stays mounted, untouched
 * and submittable, because the entire point is that they get their answer and
 * come back to quote. Nothing here is worded as "no thanks", and nothing here
 * removes their way to say yes.
 *
 * SUBORDINATE BY CONSTRUCTION. A price is still what we want most, so this is a
 * text trigger under the price card, and the panel it opens is a sunken surface
 * with an outline submit — never a second filled CTA competing with the first.
 */

/**
 * The six things a provider can be blocked on, in the order the backend's
 * `InfoRequestReasons.All` lists them. That order is part of the contract (the
 * form renders it, the stored rows name it), and the first two are the two
 * Adduco actually asked for.
 *
 * The label is a translation KEY held explicitly rather than composed as
 * `t(`quote.needInfo.reason.${slug}`)`: `t()` returns the key it was handed
 * when a string is missing, so a slug the backend adds before this build knows
 * about it would print our own internals into a provider's face. See labelFor.
 */
const REASONS = [
  { slug: "photos", labelKey: "quote.needInfo.reason.photos" },
  { slug: "address", labelKey: "quote.needInfo.reason.address" },
  { slug: "access", labelKey: "quote.needInfo.reason.access" },
  { slug: "date", labelKey: "quote.needInfo.reason.date" },
  { slug: "items", labelKey: "quote.needInfo.reason.items" },
  { slug: "other", labelKey: "quote.needInfo.reason.other" },
] as const;

/** The server clamps (truncates) the note at this length rather than refusing
 *  it, so the input stops there too — a silent truncation would eat the end of
 *  a question the provider believed they had asked. */
const NOTE_MAX = 2000;

/**
 * What Ruumly currently HOLDS for this provider — never what they last typed.
 * `createdAt` is optional because a fresh ask learns its own timestamp only on
 * the next page load: the POST echo does not carry one, and stamping "now"
 * ourselves would misdate an UPDATE as if the question were new.
 */
type StoredAsk = {
  reasons: readonly string[];
  note: string | null;
  createdAt?: string;
};

export function QuoteNeedInfo({
  token,
  asked,
  initial,
  onLeadClosed,
}: {
  token: string;
  /** There is an unresolved ask on record (GET's `infoRequested`). */
  asked: boolean;
  /** That ask's detail (GET's `infoRequest`), when the payload carried it. */
  initial: PublicQuoteInfoRequest | null;
  /** 409 lead_closed — hoisted, because a closed request is the PAGE's state. */
  onLeadClosed: () => void;
}) {
  const { t } = useLanguage();
  const panelId = useId();
  const errorId = useId();

  const [open, setOpen] = useState(false);
  // Seeded once, from the GET. Deliberately not re-synced from props: after a
  // submit this holds the POST echo, which is newer than the cached query that
  // would otherwise overwrite it.
  const [stored, setStored] = useState<StoredAsk | null>(() => {
    if (initial) return { reasons: initial.reasons, note: initial.note, createdAt: initial.createdAt };
    // Flag with no payload: still a question on the record. Show it as one
    // rather than inviting the provider to ask the same thing twice.
    return asked ? { reasons: [], note: null } : null;
  });

  // Opening the form starts from what is stored, so "update" edits the real ask
  // instead of a blank one.
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set(initial?.reasons ?? []));
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  // True while `error` is OUR rule rather than the server's. Only that one is
  // safe to retract as they type: a 429's "try again in 40 s" must not vanish
  // the moment a box is ticked, or they resubmit straight back into it.
  const [errorIsLocal, setErrorIsLocal] = useState(false);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const firstBoxRef = useRef<HTMLInputElement | null>(null);

  const hasAnswer = picked.size > 0 || note.trim().length > 0;

  useEffect(() => {
    if (errorIsLocal && hasAnswer) {
      setError(null);
      setErrorIsLocal(false);
    }
  }, [errorIsLocal, hasAnswer]);

  // A disclosure that reveals a form has to move focus into it, or a screen
  // reader user is left on a trigger while the page changed below them. The
  // heading and not the first checkbox: the group's purpose should be announced
  // before its first option.
  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open]);

  const mutation = useMutation({
    mutationFn: (body: QuoteNeedInfoInput) => quoteService.needInfo(token, body),
    onSuccess: (res) => {
      setError(null);
      setErrorIsLocal(false);
      // Render what is STORED, not what was sent. Reasons come back normalised
      // and MERGED with any earlier ask — an empty set does not erase what was
      // there before — so the echo is the only honest account of what Ruumly
      // now holds. Re-seeding the form from it means reopening shows that
      // truth rather than a local guess that quietly disagrees.
      const reasons = res?.reasons ?? [];
      const storedNote = res?.note ?? null;
      setStored((prev) => ({ reasons, note: storedNote, createdAt: prev?.createdAt }));
      setPicked(new Set(reasons));
      setNote(storedNote ?? "");
      setOpen(false);
    },
    onError: (err: Error & { status?: number; body?: unknown; retryAfter?: number }) => {
      // `picked` and `note` are never cleared here. A provider on a phone, on a
      // site, must not have to retype their question because of a 429 or a
      // dropped connection — the same care the price field already gets.
      const failure = readQuoteFailure(err, t, t("quote.needInfo.submitError"));
      if (failure.kind === "closed") { onLeadClosed(); return; }
      setError(failure.message);
      setErrorIsLocal(false);
    },
  });

  const toggleReason = (slug: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(slug)) next.add(slug);
      return next;
    });

  /** A slug this build does not know renders AS the slug. The backend
   *  normalises on the way out so this should be unreachable — it exists for
   *  the deploy where the two are briefly out of step. */
  const labelFor = (slug: string) => {
    const known = REASONS.find((r) => r.slug === slug);
    return known ? t(known.labelKey) : slug;
  };

  const submit = () => {
    // Canonical order, taken from REASONS rather than from click order, so what
    // we send matches what the server stores and echoes back.
    const reasons = REASONS.filter((r) => picked.has(r.slug)).map((r) => r.slug);
    const trimmed = note.trim();
    // The server's rule, word for word: at least one recognised reason OR a
    // note. Not a stricter one — a client rule the API does not share is how
    // the partner contact form ended up refusing submissions the backend would
    // have accepted — and not a looser one either, because an empty ask is a
    // 400 the provider would otherwise meet as a bare failure at the end of a
    // form they had already finished filling in.
    if (reasons.length === 0 && trimmed.length === 0) {
      setError(t("quote.needInfo.required"));
      setErrorIsLocal(true);
      // Focus the first control the rule is about, not the panel: the provider
      // lands where the fix is.
      firstBoxRef.current?.focus();
      return;
    }
    setError(null);
    setErrorIsLocal(false);
    mutation.mutate({ reasons, note: trimmed || null });
  };

  const closePanel = () => {
    setOpen(false);
    setError(null);
    setErrorIsLocal(false);
    // The trigger stays mounted, so returning focus to it is one line and
    // leaves the keyboard exactly where the panel was opened from.
    triggerRef.current?.focus();
  };

  return (
    <div className="mt-4">
      {/* What is already on the record. Mirrors the price form's
          alreadySubmitted banner: state the fact, then keep the way to change
          it in reach.

          The live region is mounted even while it is EMPTY, and the panel goes
          inside it. A screen reader announces changes within a region that
          already existed — create the region and its content in one commit, as
          `{stored && <div role="status">}` would, and the confirmation this
          exists to give is silently dropped. */}
      <div role="status">
        {stored && (
          <div className="rounded-xl border border-info/25 bg-info/5 p-4">
            <div className="flex items-start gap-2.5">
              <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
              <div className="min-w-0">
                <h2 className="font-display text-sm font-bold text-navy-ink">{t("quote.needInfo.askedTitle")}</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("quote.needInfo.askedBody")}</p>

                {stored.reasons.length > 0 && (
                  <>
                    <p className="mt-2.5 text-xs font-medium text-foreground">{t("quote.needInfo.askedReasons")}</p>
                    <ul className="mt-1 space-y-1">
                      {stored.reasons.map((slug) => (
                        <li key={slug} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" aria-hidden />
                          {labelFor(slug)}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {stored.note && (
                  <p className="mt-2.5 whitespace-pre-wrap break-words rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground">
                    {stored.note}
                  </p>
                )}

                {stored.createdAt && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {t("quote.needInfo.askedAt").replace("{date}", new Date(stored.createdAt).toLocaleDateString())}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subordinate on purpose: a text trigger, not a button that could be
          mistaken for a second way to submit the quote. Full width and 44px
          tall regardless, because it is pressed with a thumb on a job site. */}
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (open) { closePanel(); return; }
          setOpen(true);
        }}
        className="mt-1 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium text-teal-text underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <HelpCircle className="h-4 w-4 shrink-0" aria-hidden />
        {stored ? t("quote.needInfo.editCta") : t("quote.needInfo.cta")}
      </button>

      {open && (
        <form
          id={panelId}
          className="mt-2 rounded-xl border border-border bg-secondary/30 p-4"
          onSubmit={(e) => { e.preventDefault(); submit(); }}
        >
          {/* tabIndex -1 exists only as a focus target for the disclosure — it
              is never in the tab order. */}
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-base font-bold text-navy-ink focus:outline-none"
          >
            {t("quote.needInfo.title")}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("quote.needInfo.intro")}</p>

          {/* A real fieldset/legend, not a styled div: this is one question with
              six answers, and a screen reader has to hear that before the first
              checkbox rather than six unrelated toggles. */}
          <fieldset
            className="mt-4 min-w-0 border-0 p-0"
            aria-describedby={error ? errorId : undefined}
          >
            <legend className="text-xs font-medium text-muted-foreground">{t("quote.needInfo.legend")}</legend>
            <div className="mt-2 space-y-1.5">
              {REASONS.map((reason, index) => {
                const checked = picked.has(reason.slug);
                return (
                  <label
                    key={reason.slug}
                    className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2 transition-colors ${
                      checked ? "border-teal-deep" : "border-border hover:border-teal-deep/50"
                    }`}
                  >
                    <input
                      ref={index === 0 ? firstBoxRef : undefined}
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleReason(reason.slug)}
                      className="h-5 w-5 shrink-0 cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <span className="text-sm leading-snug text-foreground">{t(reason.labelKey)}</span>
                  </label>
                );
              })}
            </div>

            {/* A nudge, never a rule. The server accepts "other" on its own, so
                requiring a note here would be exactly the client/server
                mismatch this form is trying not to repeat. */}
            {picked.has("other") && (
              <p className="mt-2 text-xs text-muted-foreground">{t("quote.needInfo.otherHint")}</p>
            )}
          </fieldset>

          <label className="mt-4 block text-xs font-medium text-muted-foreground">
            {t("quote.needInfo.noteLabel")}
            <textarea
              value={note}
              rows={3}
              maxLength={NOTE_MAX}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("quote.needInfo.notePlaceholder")}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-base sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          {error && (
            <p id={errorId} role="alert" className="mt-3 flex items-start gap-2 text-sm font-medium text-destructive-text">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              className="h-12 text-muted-foreground sm:h-11"
              onClick={closePanel}
            >
              {t("quote.needInfo.cancel")}
            </Button>
            {/* Outline, not filled: the filled navy button on this page means
                "here is my price", and there must only ever be one of those.
                The label stays put while pending so the accessible name does
                not change out from under a screen reader mid-submit. */}
            <Button
              type="submit"
              variant="outline"
              className="h-12 gap-2 border-teal-deep/40 font-display text-navy-ink sm:h-11"
              disabled={mutation.isPending}
              aria-busy={mutation.isPending}
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
              {stored ? t("quote.needInfo.updateCta") : t("quote.needInfo.submitCta")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
