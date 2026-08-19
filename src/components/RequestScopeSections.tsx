import { useEffect, useRef } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { SERVICE_TYPE_ICONS } from "@/lib/serviceTypes";
import type { ConciergeCategory } from "@/services";

/** One chip group. `options` is how many chips; the LAST one always means
 *  "not sure", which is why every one of these can be required without ever
 *  hard-blocking anybody. */
export interface ScopeQuestion {
  id: string;
  options: number;
  /** Tick-all-that-apply. Two questions genuinely are lists — see
   *  SCOPE_QUESTIONS in RequestPage for which, and why. */
  multi?: boolean;
  /** Chip positions this build no longer OFFERS.
   *
   *  A position is the IDENTITY of an answer — it is what gets stored, and what
   *  the provider email and the quote page resolve back to wording — so a chip
   *  we stop asking about cannot be closed up by renumbering the ones after it.
   *  Doing that would silently change what every lead already taken means. It is
   *  dropped from the row and its wording stays in the deck for the leads that
   *  still carry it. */
  retired?: readonly number[];
  /** Positions that cannot be combined with anything else — the "no, nothing
   *  unusual" at the top and the "not sure" at the bottom. Ticking one clears
   *  the rest; ticking anything else clears these. Without it the funnel can
   *  send a mover "nothing unusual, and a piano", which is not an answer. */
  exclusive?: readonly number[];
}

/** One question's answer: a chip position, or several for a `multi` question. */
export type ScopeValue = number | number[];

/** questionId → the chip position(s) chosen. The two shapes are both current,
 *  which is also exactly how the backend stores and reads them. */
export type ScopeAnswers = Record<string, ScopeValue>;

/** The chosen positions, whichever shape the answer is in. */
export function scopeSelections(value: ScopeValue | undefined): number[] {
  if (typeof value === "number") return value > 0 ? [value] : [];
  return Array.isArray(value) ? value.filter((n) => Number.isInteger(n) && n > 0) : [];
}

/** True when this question has been answered at all.
 *
 *  Not `!!scope[q.id]`: an empty array is truthy in JS, so the moment a
 *  multi-select question existed, unticking your last box would have counted as
 *  an answer and walked you past the gate with nothing recorded. */
export function scopeAnswered(value: ScopeValue | undefined): boolean {
  return scopeSelections(value).length > 0;
}

/** The chip positions this question actually offers, in order. */
export function scopeChips(question: ScopeQuestion): number[] {
  return Array.from({ length: question.options }, (_, i) => i + 1)
    .filter((n) => !question.retired?.includes(n));
}

/**
 * The answer after tapping chip `n`.
 *
 * Single-choice: the tapped chip, replacing whatever was there.
 * Multi: toggles the chip, keeping the list in chip order (so the summary, the
 * payload and the provider's email read in the order the chips are drawn rather
 * than the order a thumb reached them), and applying the exclusivity rule.
 * Returns an EMPTY array when the last box is unticked — the caller drops the
 * key, which puts the question back to unanswered.
 */
export function toggleScopeOption(
  question: ScopeQuestion,
  value: ScopeValue | undefined,
  n: number,
): ScopeValue {
  if (!question.multi) return n;

  const current = scopeSelections(value);
  if (current.includes(n)) return current.filter((x) => x !== n);
  if (question.exclusive?.includes(n)) return [n];

  return [...current.filter((x) => !question.exclusive?.includes(x)), n].sort((a, b) => a - b);
}

/** The questions of one selected service, in the order they are asked. */
export interface ScopeGroup {
  category: ConciergeCategory;
  questions: ScopeQuestion[];
}

/**
 * A single-choice chip group, with the semantics a single choice actually has.
 *
 * These were `<button aria-pressed>` inside a `fieldset`, which a screen reader
 * announces as a row of independent toggle buttons — so nothing conveyed that
 * picking one clears the others, how many options there are, or which position
 * you are at. Keyboard users also had to Tab through every chip individually.
 *
 * `role="radiogroup"` + `role="radio"` fixes the announcement, and the roving
 * tabindex below is what the pattern requires: the group is ONE tab stop, and
 * arrows move within it. Arrow keys select as they move, which is standard radio
 * behaviour and safe here because every group's last option means "not sure" —
 * there is no destructive choice to land on by accident.
 *
 * Deliberately NOT used for the optional packing add-on: that one is clearable
 * by tapping the active chip again, and a radio group cannot be un-set. It stays
 * a toggle-button group, which is what it genuinely is.
 */
function ScopeRadioGroup({
  id, chips, value, label, optionLabel, onSelect, required = false,
}: {
  id: string;
  chips: number[];
  value: number | undefined;
  label: string;
  optionLabel: (n: number) => string;
  onSelect: (n: number) => void;
  required?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  // The group's single tab stop: the chosen chip, or the first one when nothing
  // is chosen yet.
  const tabStop = value !== undefined && chips.includes(value) ? value : chips[0];

  // Indexes into `chips` rather than arithmetic on the position, because the two
  // stopped being the same thing: a question can retire a chip and keep the
  // positions after it (see ScopeQuestion.retired), so "the next chip" is the
  // next one DRAWN, not the next number.
  const move = (index: number) => {
    const next = chips[((index % chips.length) + chips.length) % chips.length];
    onSelect(next);
    refs.current[chips.indexOf(next)]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const key = event.key;
    if (key === "ArrowRight" || key === "ArrowDown") { event.preventDefault(); move(index + 1); }
    else if (key === "ArrowLeft" || key === "ArrowUp") { event.preventDefault(); move(index - 1); }
    else if (key === "Home") { event.preventDefault(); move(0); }
    else if (key === "End") { event.preventDefault(); move(chips.length - 1); }
  };

  return (
    <div>
      <p id={`${id}-label`} className="mb-1.5 text-sm font-medium text-foreground">
        {label}{required && <span className="text-destructive"> *</span>}
      </p>
      <div role="radiogroup" aria-labelledby={`${id}-label`} aria-required={required || undefined} className="flex flex-wrap gap-2">
        {chips.map((n, index) => {
          const active = value === n;
          return (
            <button
              key={n}
              ref={(el) => { refs.current[index] = el; }}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={tabStop === n ? 0 : -1}
              onKeyDown={(e) => onKeyDown(e, index)}
              onClick={() => onSelect(n)}
              className={`min-h-[44px] rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                active
                  ? "border-navy-ink bg-navy-ink text-white"
                  : "border-line-2 bg-card text-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {optionLabel(n)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A tick-all-that-apply chip group, for the two questions that genuinely are
 * lists.
 *
 * WHY NOT THE RADIO GROUP ABOVE. "Anything heavy or awkward?" had a chip reading
 * "several of these", which is the shape of the control leaking into the copy:
 * the customer with a piano AND an aquarium could not say so, and the mover
 * pricing "several of these" is guessing at precisely the thing that decides the
 * price. Ticking two boxes says it, and says which two.
 *
 * SEMANTICS, NOT JUST APPEARANCE. `role="checkbox"` is what tells a screen
 * reader these are independent — the radio group above announces "1 of 6" and
 * implies picking one clears the rest, which is now the wrong promise. Each chip
 * is its own tab stop, as checkboxes are: the roving tabindex belongs to the
 * radio pattern, where arrows both move AND select, and arrows cannot select
 * here without destroying the answer you are arrowing past.
 *
 * The tick box is not decoration. Selection is otherwise conveyed by fill colour
 * alone, which fails anyone who cannot see the difference, and a square box is
 * the one glance-level signal that separates this row from every other chip row
 * on the step — it is the same "you may pick several" mark the service cards on
 * step 1 use.
 */
function ScopeCheckboxGroup({
  id, chips, values, label, hint, optionLabel, onToggle, required = false,
}: {
  id: string;
  chips: number[];
  values: number[];
  label: string;
  hint: string;
  optionLabel: (n: number) => string;
  onToggle: (n: number) => void;
  required?: boolean;
}) {
  const hintId = `${id}-hint`;
  return (
    <div>
      <p id={`${id}-label`} className="mb-0.5 text-sm font-medium text-foreground">
        {label}{required && <span className="text-destructive"> *</span>}
      </p>
      {/* Says the thing the control cannot say for itself on a phone, where
          there is no hover and nobody reads the ARIA. Without it the row looks
          exactly like the five single-choice rows above it. */}
      <p id={hintId} className="mb-1.5 text-xs text-muted-foreground">{hint}</p>
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        aria-describedby={hintId}
        className="flex flex-wrap gap-2"
      >
        {chips.map((n) => {
          const active = values.includes(n);
          return (
            <button
              key={n}
              type="button"
              role="checkbox"
              aria-checked={active}
              onClick={() => onToggle(n)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                active
                  ? "border-navy-ink bg-navy-ink text-white"
                  : "border-line-2 bg-card text-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {/* Deliberately a DARKER outline than the chip's own border
                  (`border-line-2`, ~1.3:1 on white). This box is the state
                  indicator and the only thing distinguishing this row from the
                  single-choice rows above it, so it has to clear the 3:1 that
                  non-text controls owe — muted-foreground gives ~4.6:1 and
                  still reads as quiet. */}
              <span
                aria-hidden
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
                  active ? "border-white bg-white/25 text-white" : "border-muted-foreground bg-card"
                }`}
              >
                {active && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              {optionLabel(n)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The step-2 scoping questions, laid out so that adding the per-service
 * questions a provider actually needs did not turn step 2 into a wall.
 *
 * Each service now asks three or four things instead of two (a mover cannot
 * quote without access at BOTH addresses; a trailer request is unfulfillable if
 * nobody can legally tow it; a van with a driver is a different service from a
 * van without one). One service is fine — three or four chip rows, one tap each.
 * Bundling is the funnel's superpower though, and someone who picks storage +
 * moving + cleaning would have met TEN required chip groups stacked in a column
 * with nothing marking where one service ended and the next began.
 *
 * So the disclosure is conditioned on how much there is to disclose:
 *
 *  - ONE service — rendered flat, exactly as before. No headers, no collapsing,
 *    nothing hidden. This is the common case and it must not get slower, and the
 *    original objection to collapsing still stands: these gate the Next button,
 *    and putting a required field behind an extra tap is both more clicks and a
 *    worse form.
 *  - TWO OR MORE — one service open at a time, in the order they were picked.
 *    Nothing is hidden that the visitor still has to answer: the open section is
 *    always the FIRST one with an unanswered question, so finishing a service
 *    moves them to the next automatically. Answered sections collapse to a
 *    one-line recap of what was chosen, which is also the review affordance the
 *    flat list never had.
 *
 * The open section is derived, not stored, so it cannot drift out of sync with
 * the answers. `openCategory` is only the visitor's manual override (reopening a
 * finished section to change an answer); the page clears it when validation
 * fails, which snaps the form back to the question that is actually missing.
 */
export function RequestScopeSections({
  groups, scope, openCategory, onOpenCategory, onSelect,
}: {
  groups: ScopeGroup[];
  scope: ScopeAnswers;
  /** Manual override — null means "show the first unanswered service". */
  openCategory: ConciergeCategory | null;
  onOpenCategory: (category: ConciergeCategory) => void;
  /** The question's WHOLE new answer, not a delta — a multi-select question
   *  hands back the full list (empty when the last box was unticked) so the page
   *  never has to reconstruct what was already there. */
  onSelect: (questionId: string, value: ScopeValue) => void;
}) {
  const { t } = useLanguage();
  const headerRefs = useRef<Partial<Record<ConciergeCategory, HTMLButtonElement | null>>>({});
  const prevActive = useRef<ConciergeCategory | null>(null);

  const isComplete = (group: ScopeGroup) => group.questions.every((q) => scopeAnswered(scope[q.id]));

  const sectioned = groups.length > 1;
  const firstIncomplete = groups.find((group) => !isComplete(group));
  // The override is checked against the current groups, not trusted: stepping
  // back to step 1 and deselecting the open service would otherwise leave it
  // pointing at a section that no longer exists, and every remaining section
  // collapsed with no way to open one.
  const override = groups.some((group) => group.category === openCategory) ? openCategory : null;
  const active: ConciergeCategory | null = !sectioned
    ? null
    : (override ?? firstIncomplete?.category ?? groups[groups.length - 1].category);

  // Answering the last question of a section collapses it and opens the next,
  // which would drop the visitor's focus into a hidden element and strand
  // keyboard and screen-reader users at the top of the document. Move focus with
  // the disclosure instead. Guarded on a previous value so that merely ARRIVING
  // on step 2 never yanks focus away from the top of the form.
  useEffect(() => {
    if (active && prevActive.current && prevActive.current !== active) {
      headerRefs.current[active]?.focus();
    }
    prevActive.current = active;
  }, [active]);

  const optionLabel = (q: ScopeQuestion) => (n: number) => t(`request.scope.${q.id}.opt${n}`);

  const question = (q: ScopeQuestion) =>
    q.multi ? (
      <ScopeCheckboxGroup
        key={q.id}
        id={q.id}
        chips={scopeChips(q)}
        values={scopeSelections(scope[q.id])}
        label={t(`request.scope.${q.id}.label`)}
        hint={t("request.scope.multiHint")}
        optionLabel={optionLabel(q)}
        required
        onToggle={(n) => onSelect(q.id, toggleScopeOption(q, scope[q.id], n))}
      />
    ) : (
      <ScopeRadioGroup
        key={q.id}
        id={q.id}
        chips={scopeChips(q)}
        value={scopeSelections(scope[q.id])[0]}
        label={t(`request.scope.${q.id}.label`)}
        optionLabel={optionLabel(q)}
        required
        onSelect={(n) => onSelect(q.id, n)}
      />
    );

  if (!sectioned) {
    return <div className="space-y-4">{(groups[0]?.questions ?? []).map(question)}</div>;
  }

  return (
    <div className="space-y-2.5">
      {groups.map((group) => {
        const Icon = SERVICE_TYPE_ICONS[group.category];
        const open = group.category === active;
        const complete = isComplete(group);
        const answered = group.questions.filter((q) => scopeAnswered(scope[q.id])).length;
        const panelId = `scope-panel-${group.category}`;
        return (
          <div
            key={group.category}
            className={`overflow-hidden rounded-xl border transition-colors ${
              open ? "border-line-2 bg-card" : "border-line bg-card/60"
            }`}
          >
            <h3>
              <button
                ref={(el) => { headerRefs.current[group.category] = el; }}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => onOpenCategory(group.category)}
                className="flex min-h-[52px] w-full items-center gap-2.5 px-3.5 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    complete ? "bg-success/10 text-success" : "bg-teal/[0.14] text-teal-deep"
                  }`}
                >
                  {/* The tick is the collapsed section's only "you're done here"
                      signal, so it replaces the service icon only once the
                      section is both finished AND closed. */}
                  {complete && !open
                    ? <Check className="h-4 w-4" aria-hidden />
                    : <Icon className="h-4 w-4" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[13px] font-semibold leading-tight text-foreground">
                    {t(`serviceType.${group.category}`)}
                  </span>
                  {!open && (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {complete
                        // A recap of the actual answers, not just "done" — this
                        // is the only place a bundled request can be reviewed
                        // without reopening every section. Two separators doing
                        // two jobs: " · " between questions, ", " between the
                        // several boxes ticked for one of them.
                        ? group.questions
                            .map((q) => scopeSelections(scope[q.id])
                              .map((n) => t(`request.scope.${q.id}.opt${n}`))
                              .join(", "))
                            .join(" · ")
                        : t("request.scope.remaining")
                            .replace("{done}", String(answered))
                            .replace("{total}", String(group.questions.length))}
                    </span>
                  )}
                </span>
                <ChevronDown
                  aria-hidden
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>
            </h3>
            {/* `hidden` rather than unmounting: aria-controls must point at an
                element that exists, and a half-answered section keeps its chip
                state either way. No display utility is applied here, so the
                attribute is free to do its job. */}
            <div id={panelId} hidden={!open} className="space-y-4 border-t border-line px-3.5 pb-4 pt-3.5">
              {group.questions.map(question)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
