/**
 * What a failed POST against a public quote token MEANS — decided once, for
 * both forms on the quote page.
 *
 * The page asks a provider for two different things (a price, and what they are
 * missing when they cannot give one), but both go to the same token, through
 * the same `provider-quote` rate-limit bucket, against the same lead. So 404,
 * 409 lead_closed, 429 and 400 carry identical meaning to each of them. Two
 * copies of this branch would be two things to keep in step the next time the
 * backend grows a status, and the feature that added the second form exists
 * because a mismatch between what one side believed and what the other did cost
 * a customer a week. One copy; the only per-form difference — what to say when
 * the status itself tells us nothing — is a parameter.
 *
 * Lives in its own module rather than beside a component so that importing it
 * does not cost either caller its fast refresh (see the `admin/leads` and
 * `admin/kit` helper modules for the same split).
 */

/** A failure is either the end of the road for the whole page, or a sentence. */
export type QuoteFailure =
  | { kind: "closed" }
  | { kind: "message"; message: string };

export function readQuoteFailure(
  err: Error & { status?: number; body?: unknown; retryAfter?: number },
  t: (key: string) => string,
  fallback: string,
): QuoteFailure {
  const status = err?.status;
  // 409 + reason "lead_closed": the request ended while this page was open.
  // That is a dead end for the whole page, not a message beside a field — the
  // link is fine and the provider did nothing wrong, the job is simply gone.
  const reason = (err?.body as { reason?: string } | undefined)?.reason;
  if (status === 409 && reason === "lead_closed") return { kind: "closed" };
  if (status === 404) return { kind: "message", message: t("quote.expiredError") };
  if (status === 429) {
    // Prefer the server's own Retry-After over a vague "wait a bit".
    const secs = err.retryAfter;
    return {
      kind: "message",
      message: secs && secs > 0
        ? t("quote.rateLimitRetryAfter").replace("{seconds}", String(Math.ceil(secs)))
        : t("quote.rateLimitError"),
    };
  }
  // 400 = server-side validation (a negative amount, `<`/`>` in a string, an
  // ask carrying neither a reason nor a note). Surface the backend's own
  // wording: it is more specific than anything the status alone would let us
  // say, and it names the actual problem.
  if (status === 400) return { kind: "message", message: err.message || fallback };
  return { kind: "message", message: fallback };
}
