import { apiClient } from "@/services/apiClient";
import type { ConciergeRequestInput } from "@/services";

/**
 * Submitting the concierge request — `POST /leads/request`.
 *
 * WHY THIS IS NOT `leadService.requestConcierge`. That function does the same
 * POST and throws the response body away (`Promise<void>`), which was fine
 * while the endpoint answered `{ ok: true }` and nothing more. It now answers
 * with the lead's own `statusToken`, and the success screen needs it: the token
 * is the only way an account-less customer can reach `/request-status/{token}`,
 * and that page shipped with nothing at all linking to it.
 *
 * It lives in its own module for the same reason `services/requestStatus.ts`
 * does — `services/index.ts` is being edited concurrently, and a stale restore
 * of that file is what reverted 23 translation keys into production on
 * 2026-08-18. Nothing here needs to sit in the barrel to work.
 *
 * FOLD THESE TOGETHER once `index.ts` is free: `leadService.requestConcierge`
 * should either delegate here or be deleted in favour of this. Two call paths
 * to one endpoint is a temporary state, not a design.
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
