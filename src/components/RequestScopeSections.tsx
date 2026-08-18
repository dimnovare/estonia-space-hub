import { useEffect, useRef } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { SERVICE_TYPE_ICONS } from "@/lib/serviceTypes";
import type { ConciergeCategory } from "@/services";

/** One chip group. `options` is how many chips; the LAST one always means
 *  "not sure", which is why every one of these can be required without ever
 *  hard-blocking anybody. */
export interface ScopeQuestion { id: string; options: number }

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
  id, options, value, label, optionLabel, onSelect, required = false,
}: {
  id: string;
  options: number;
  value: number | undefined;
  label: string;
  optionLabel: (n: number) => string;
  onSelect: (n: number) => void;
  required?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const choices = Array.from({ length: options }, (_, i) => i + 1);
  // The group's single tab stop: the chosen chip, or the first one when nothing
  // is chosen yet.
  const tabStop = value ?? 1;

  const move = (to: number) => {
    const next = ((to - 1 + options) % options) + 1;
    onSelect(next);
    refs.current[next - 1]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, n: number) => {
    const key = event.key;
    if (key === "ArrowRight" || key === "ArrowDown") { event.preventDefault(); move(n + 1); }
    else if (key === "ArrowLeft" || key === "ArrowUp") { event.preventDefault(); move(n - 1); }
    else if (key === "Home") { event.preventDefault(); move(1); }
    else if (key === "End") { event.preventDefault(); move(options); }
  };

  return (
    <div>
      <p id={`${id}-label`} className="mb-1.5 text-sm font-medium text-foreground">
        {label}{required && <span className="text-destructive"> *</span>}
      </p>
      <div role="radiogroup" aria-labelledby={`${id}-label`} aria-required={required || undefined} className="flex flex-wrap gap-2">
        {choices.map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              ref={(el) => { refs.current[n - 1] = el; }}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={tabStop === n ? 0 : -1}
              onKeyDown={(e) => onKeyDown(e, n)}
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
  scope: Record<string, number>;
  /** Manual override — null means "show the first unanswered service". */
  openCategory: ConciergeCategory | null;
  onOpenCategory: (category: ConciergeCategory) => void;
  onSelect: (questionId: string, option: number) => void;
}) {
  const { t } = useLanguage();
  const headerRefs = useRef<Partial<Record<ConciergeCategory, HTMLButtonElement | null>>>({});
  const prevActive = useRef<ConciergeCategory | null>(null);

  const isComplete = (group: ScopeGroup) => group.questions.every((q) => !!scope[q.id]);

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

  const question = (q: ScopeQuestion) => (
    <ScopeRadioGroup
      key={q.id}
      id={q.id}
      options={q.options}
      value={scope[q.id]}
      label={t(`request.scope.${q.id}.label`)}
      optionLabel={(n) => t(`request.scope.${q.id}.opt${n}`)}
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
        const answered = group.questions.filter((q) => scope[q.id]).length;
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
                        // without reopening every section.
                        ? group.questions
                            .map((q) => t(`request.scope.${q.id}.opt${scope[q.id]}`))
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
