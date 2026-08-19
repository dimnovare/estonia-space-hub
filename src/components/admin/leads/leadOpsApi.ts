import { apiClient } from "@/services/apiClient";
import type { AdminLeadsResponse, AdminLeadMetrics, AdminLeadStatus, AdminLeadListOpts } from "@/services";

/**
 * The provider-side data the lead workspace now reads, and the one call that
 * fetches it.
 *
 * WHY IT IS HERE AND NOT IN services/index.ts. These shapes landed with the
 * backend on the same day as this UI; the shared service layer is owned
 * elsewhere and is being edited concurrently. Declaring them locally keeps this
 * feature type-checked and working today without two agents writing the same
 * file — and every one of them is a plain structural type, so folding them into
 * the service layer later is a move, not a rewrite.
 *
 * Everything here is optional on the wire. The admin SPA and the API deploy
 * separately, so a browser tab open across a rollback must degrade to "we do not
 * know" rather than to a crash or, worse, to a confident zero.
 */

/** Per-lead provider-side summary from GET /admin/leads (`outreach`, keyed by lead id). */
export interface LeadOutreachSummary {
  /** Outreach rows sent for this lead. */
  asked: number;
  /** The provider said something: replied, declined, or asked a question. */
  answered: number;
  /** The mail provably never reached a human (bounce / spam complaint). */
  failed: number;
  /** asked - answered - failed. The number this workspace exists to expose. */
  silent: number;
  /** Rows with a delivery receipt. */
  delivered: number;
  /** Rows with no receipt and no failure verdict — UNKNOWN, never undelivered. */
  deliveryUnknown: number;
  /** Open provider questions (ProviderInfoRequest) blocking a quote. */
  blocked: number;
  /** Newest send. Null when nobody was ever asked — not the same as "long ago". */
  lastSentAt: string | null;
  /** Open, unanswered, and nothing sent for `stalledAfterDays`. Decided by the
   *  server so the row badge and the queue chip cannot mean different things. */
  stalled: boolean;
}

/** Counts for the three queues, over the whole filtered set (not the page). */
export interface LeadQueueCounts {
  needsResponse: number;
  blocked: number;
  stalled: number;
  /** The threshold the server used, so a badge cannot disagree with the chip. */
  stalledAfterDays: number;
}

/** GET /admin/leads response, including the two sibling maps added 2026-08-19. */
export type AdminLeadsResponseWithOutreach = AdminLeadsResponse & {
  outreach?: Record<string, LeadOutreachSummary>;
  queues?: LeadQueueCounts;
};

/**
 * The provider-side delivery funnel from GET /admin/leads/metrics.
 *
 * Rates are `null` — never 0 — when nothing measurable has been sent yet, and
 * `unknownSent` counts the rows in the window that predate any receipt. Both
 * exist so the UI can say "we do not know" instead of "0%".
 */
export interface OutreachDeliveryMetrics {
  /** Earliest send for which any receipt exists. Null before the first one ever. */
  measuredFrom: string | null;
  sent: number;
  delivered: number;
  opened: number;
  deliveredRate: number | null;
  openRate: number | null;
  unknownSent: number;
}

export type AdminLeadMetricsWithDelivery = AdminLeadMetrics & {
  outreachDelivery30d?: OutreachDeliveryMetrics;
};

/** One provider who has never answered anything we sent them. */
export interface SilentProvider {
  supplierId: string;
  supplierName: string | null;
  city: string | null;
  contactEmail: string | null;
  /** Their address is retired: they never had the chance to answer. */
  contactEmailUnusable: boolean;
  asked: number;
  lastAskedAt: string;
  delivered: number;
  deliveryFailed: number;
  deliveryUnknown: number;
}

export interface ProviderSilenceResponse {
  providersContacted: number;
  providersSilent: number;
  asksUnanswered: number;
  items: SilentProvider[];
}

/**
 * The three views an operator works from, as a server-side filter.
 *
 * `needsresponse` is the SLA queue the cockpit already deep-links to with
 * `?needsResponse=1`; the other two are new. All three come back oldest-first,
 * because in a queue the row that has been waiting longest is the point.
 */
export type LeadQueue = "needsresponse" | "blocked" | "stalled";

/**
 * GET /admin/leads with the queue selector.
 *
 * A near-copy of `adminLeadService.list` — the only difference is `queue`, which
 * the shared service does not know about yet. It is here rather than there for
 * the same concurrency reason as the types above; the parameter names and the
 * URL are identical, so folding the one extra line into the service later
 * deletes this function outright.
 */
export async function listLeads(
  status: AdminLeadStatus | "all",
  page: number,
  limit: number,
  opts: AdminLeadListOpts & { queue?: LeadQueue } = {},
): Promise<AdminLeadsResponseWithOutreach> {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (opts.source) params.set("source", opts.source);
  if (opts.category && opts.category !== "any") params.set("category", opts.category);
  if (opts.city?.trim()) params.set("city", opts.city.trim());
  if (opts.queue) params.set("queue", opts.queue);
  return apiClient.get<AdminLeadsResponseWithOutreach>(`/admin/leads?${params}`);
}

/** Local cache key — kept out of the shared queryKeys module for the same reason as the types. */
export const providerSilenceKey = (limit: number) => ["admin-provider-silence", limit] as const;

/** GET /admin/leads/provider-silence — worst first (most asks wasted, then coldest). */
export async function fetchProviderSilence(limit = 20): Promise<ProviderSilenceResponse> {
  return apiClient.get<ProviderSilenceResponse>(
    `/admin/leads/provider-silence?limit=${encodeURIComponent(String(limit))}`);
}
