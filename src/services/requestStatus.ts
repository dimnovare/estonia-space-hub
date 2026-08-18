import { apiClient } from "@/services/apiClient";

/**
 * Public concierge request-status page (`/{lang}/request-status/{token}`) —
 * anonymous, token-keyed, rate-limited. 404 for unknown tokens, identical to a
 * missing one.
 *
 * Deliberately its OWN module rather than another block in `services/index.ts`:
 * that file is being edited concurrently and is the exact file whose stale
 * restore reverted 23 translation keys into production on 2026-08-18. Nothing
 * here needs to sit beside the rest — it imports `apiClient` the same way a
 * dozen components already do. Re-export it from `index.ts` later if the
 * barrel is wanted; that is one line and no merge.
 */

/** Customer-facing stage. A vocabulary of its own — NOT the backend lead status. */
export type RequestStatusState =
  /** Logged, nobody contacted yet. */
  | "received"
  /** Providers have the request; nobody has priced it. */
  | "contacted"
  /** At least one provider came back with a price. */
  | "collecting"
  /** An offer is live and waiting on the customer. */
  | "offer_sent"
  /** The customer picked an option; ops is confirming it. */
  | "chosen"
  /** Done. */
  | "booked"
  /** Nobody could take it — an answer, not a silence. */
  | "no_match"
  /** Ended for some other reason. */
  | "closed";

export interface RequestStatusRequest {
  /** Service slug ("moving", "warehouse", …) or "any" for a multi-service ask. */
  service: string;
  city: string;
  toCity?: string | null;
  needDate?: string | null;
  details?: string | null;
  photoCount: number;
  submittedAt: string;
}

/**
 * What the endpoint returns. Note what is NOT here and never will be: supplier
 * names, supplier emails, prices before the offer is released, admin notes.
 * If a future field arrives carrying any of those, it is a bug in the API, not
 * something for this page to render.
 */
export interface RequestStatus {
  state: RequestStatusState;
  request: RequestStatusRequest;
  /** Providers that actually received it — bounced addresses are not counted. */
  providersContacted: number;
  providersContactedAt?: string | null;
  offerSent: boolean;
  offerSentAt?: string | null;
  /** Token for the customer's existing offer page; the language prefix is ours to add. */
  offerToken?: string | null;
  /** Nothing further will happen on its own. */
  closed: boolean;
}

export const requestStatusService = {
  async get(token: string): Promise<RequestStatus> {
    return apiClient.get<RequestStatus>(`/request-status/${encodeURIComponent(token)}`);
  },
};
