import { useLanguage } from "@/i18n/LanguageContext";
import type { PublicQuote } from "@/services";

/**
 * What the customer actually said about the job, on the provider's quote page.
 *
 * WHY IT EXISTS. The funnel asks three or four scoping questions per service —
 * home size, floors and lift at BOTH ends, heavy items, tow capability — as
 * one-tap chips, and those answers are the difference between a price and a
 * range. They reached this page in exactly one form: glued into `lead.details`
 * as prose, rendered in the CUSTOMER's language. So an Estonian mover opened
 * the page we emailed them and read the brief in Russian. 91% of requests reach
 * a provider and 9% come back with a quote; a brief the reader cannot read is
 * not a small part of that gap.
 *
 * The backend now sends the same answers structurally — `[{question, option}]`,
 * slugs and 1-based positions in catalogue order — and this component supplies
 * the wording from the funnel's own `request.scope.*` strings, which already
 * exist in all five languages. Nothing here is a server-rendered string, so a
 * question added server-side before this build knows about it degrades to being
 * SKIPPED rather than printing English at an Estonian mover.
 *
 * IT ALSO OWNS `details`, and that is not incidental — it is the whole reason
 * the two are one component. `details` still opens with the same answers in the
 * customer's language (RequestPage composes it that way, deliberately, because
 * the outreach email prints that field), so rendering both verbatim would show
 * every fact twice and bury the one line that matters — "there is also a piano"
 * — under a duplicate block in a language the reader does not have. Deciding
 * what of `details` is genuinely the customer's own words requires knowing how
 * many answers came with it, so the two cannot be split without splitting that
 * decision from its inputs.
 */

/** One answered scoping question, as it arrives on the wire. */
interface ScopeAnswer {
  question: string;
  option: number;
}

/** A row we have real wording for, ready to render. */
interface ScopeRow extends ScopeAnswer {
  label: string;
  answer: string;
}

/**
 * The wire payload, read from `unknown` rather than trusted through a type.
 *
 * Two reasons, and only one of them is temporary. `PublicQuote["lead"]` does not
 * declare `scope` yet (the service layer is landing it separately), and this is
 * in any case a deliberately forward-compatible list: the backend drops answers
 * it cannot validate rather than failing a request, so the page has to tolerate
 * the same shapes on the way out. Anything that is not a slug plus a whole,
 * 1-based chip position is dropped here for the same reason.
 */
function readAnswers(raw: unknown): ScopeAnswer[] {
  if (!Array.isArray(raw)) return [];
  const answers: ScopeAnswer[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { question, option } = entry as { question?: unknown; option?: unknown };
    if (typeof question !== "string" || question.trim().length === 0) continue;
    if (typeof option !== "number" || !Number.isInteger(option) || option < 1) continue;
    answers.push({ question, option });
  }
  return answers;
}

/** The first blank line — what `composeDetails` puts between the generated
 *  answer summary and whatever the visitor typed themselves. */
const BLANK_LINE = /\n[ \t]*\n/;

/**
 * Strip the answer summary off the front of `details`, leaving only the words
 * the customer wrote.
 *
 * RequestPage builds that field as `answers.join("\n")` + a blank line + the
 * free text, and it prepends the summary whenever there is at least one answer
 * — so when `answered > 0` the head of the string IS the summary, and we are
 * about to render those same facts properly just above.
 *
 * FAILS SAFE, DELIBERATELY. Dropping a customer's own words is the worst thing
 * this page could do to a provider trying to price a job, so the head is only
 * discarded when its line count matches the number of answers we were sent —
 * the shape the funnel writes. A lead composed by any other hand (an admin, an
 * importer, a future intake) will not match, and the whole field is shown
 * untouched. `answered` is therefore the count from the WIRE, not the count we
 * found wording for: the funnel wrote one line per answer regardless of what
 * this build can put into words.
 *
 * The caller adds the other half of that rule — see `replaced` below.
 */
function ownWords(details: string | null | undefined, answered: number): string {
  const text = (details ?? "").trim();
  if (!text || answered === 0) return text;
  const blank = BLANK_LINE.exec(text);
  const head = blank ? text.slice(0, blank.index) : text;
  const lines = head.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length !== answered) return text;
  // No blank line at all means the customer wrote nothing of their own: the
  // field was the summary and nothing else, and it is now rendered above.
  return blank ? text.slice(blank.index + blank[0].length).trim() : "";
}

export function QuoteLeadScope({ lead }: { lead: PublicQuote["lead"] }) {
  const { t } = useLanguage();

  const answers = readAnswers("scope" in lead ? lead.scope : null);

  // `t` returns the KEY when a string is missing — that is how the raw text
  // `quote.needInfo.cta` reached production once already — so a row is only
  // kept when BOTH halves of it resolved to something that is not their own
  // key. This, rather than a copy of the funnel's question catalogue, is what
  // makes an unknown question degrade to silence: a catalogue here would be a
  // second list to keep in step, and forgetting it would either hide an answer
  // the funnel does ask or print a key at somebody we are asking for a price.
  const rows: ScopeRow[] = [];
  for (const { question, option } of answers) {
    const labelKey = `request.scope.${question}.label`;
    const answerKey = `request.scope.${question}.opt${option}`;
    const label = t(labelKey);
    const answer = t(answerKey);
    if (label === labelKey || answer === answerKey) continue;
    rows.push({ question, option, label, answer });
  }

  // Strip the duplicate summary ONLY when the block above replaces all of it.
  // If even one answer went unworded — a question retired between the build
  // that took the request and the build reading it — its line in `details` is
  // the last place that fact exists. Duplicating four facts to keep the fifth
  // is a trade worth making every time; the reverse is a mover discovering the
  // piano on the day.
  const replaced = answers.length > 0 && rows.length === answers.length;
  const words = replaced ? ownWords(lead.details, answers.length) : (lead.details ?? "").trim();

  if (rows.length === 0 && !words) return null;

  return (
    <div className="mt-3">
      {rows.length > 0 && (
        <>
          {/* The heading carries real weight: `request.scope.*` labels are
              phrased as questions put TO the customer ("Can you tow it
              yourself?"), and this page's other second-person copy is
              addressed to the provider. Saying whose answers these are is what
              keeps the two apart — reusing the funnel's five languages of
              wording is worth one line of framing. */}
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("quote.scope.title")}
          </p>
          {/* `bg-card`, not the sunken `bg-background` the quoted prose below
              uses. Two reasons, and both matter: the question labels are
              `muted-foreground`, which clears 4.5:1 on card white but only
              reaches ~4.3:1 on the sunken tint — and keeping the sunken,
              quote-like surface for the customer's own words alone is what
              says, without a word, which of these two blocks is ours. */}
          <dl className="mt-2 overflow-hidden rounded-lg border border-border bg-card">
            {rows.map((row, index) => (
              // The ANSWER is what a provider scans for and the question is
              // only context, so the answer gets the readable size and weight
              // and the question stays quiet. Stacked on a phone (both halves
              // wrap badly in two 170px columns) and side by side from `sm`.
              <div
                key={row.question}
                className={`px-3 py-2 sm:grid sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:gap-x-3 ${
                  index > 0 ? "border-t border-border" : ""
                }`}
              >
                <dt className="text-xs leading-snug text-muted-foreground">{row.label}</dt>
                <dd className="text-sm font-medium leading-snug text-foreground">{row.answer}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {words && (
        <>
          {/* Labelled rather than dropped in bare. This is the one block that
              is NOT translated — it is whatever the customer typed, in their
              own language — and a provider meeting a paragraph of Latvian
              should know it is a quote, not a system message. */}
          <p className={`text-xs font-medium uppercase tracking-wide text-muted-foreground ${rows.length > 0 ? "mt-3" : ""}`}>
            {t("quote.scope.ownWords")}
          </p>
          <p className="mt-1.5 whitespace-pre-wrap break-words rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            {words}
          </p>
        </>
      )}
    </div>
  );
}
