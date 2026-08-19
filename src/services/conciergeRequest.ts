import { apiClient } from "@/services/apiClient";
// Type-only on purpose: `services/index.ts` re-exports this module, so a value
// import from the barrel here would close a runtime import cycle.
import type { ConciergeRequestInput } from "@/services";

/**
 * Submitting the concierge request — `POST /leads/request`. The single client
 * path to that endpoint, re-exported from `services/index.ts` so the barrel
 * works too.
 *
 * WHY IT IS NOT A `leadService` METHOD. It is the one lead call whose response
 * body is load-bearing. `leadService.requestConcierge` did the same POST and
 * threw the body away (`Promise<void>`), which was fine while the endpoint
 * answered `{ ok: true }` and nothing more. It now answers with the lead's own
 * `statusToken`, and the success screen needs it: the token is the only way an
 * account-less customer can reach `/request-status/{token}`, and that page
 * shipped with nothing at all linking to it. The void-returning twin is deleted
 * (2026-08-19) — don't reintroduce one; a caller that picks the body-discarding
 * path turns the funnel back into a dead end and nothing fails loudly.
 */

/**
 * What the endpoint answers. `statusToken` is optional on purpose: a browser
 * running against a backend that predates it — a cached bundle, a mid-deploy
 * window — must still submit successfully and simply not offer the link.
 */
export interface ConciergeRequestResult {
  ok: boolean;
  /** Bearer credential for THIS request's status page. Never logged, never
   *  sent to analytics — see `redactAnalyticsPath` in `lib/analytics.ts`. */
  statusToken?: string | null;
}

export const conciergeRequestService = {
  async submit(input: ConciergeRequestInput): Promise<ConciergeRequestResult> {
    return apiClient.post<ConciergeRequestResult>("/leads/request", {
      ...input,
      language: input.language ?? "et",
    });
  },
};
