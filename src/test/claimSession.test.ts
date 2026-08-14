import { describe, it, expect } from "vitest";
import { isClaimSessionRejection, claimRetryPolicy } from "@/pages/ClaimPage";

/**
 * A claim session is bought with a single-use magic link, so the page must be
 * very sure before it throws one away. The backend redeploys several times a
 * day and the claim reads sit behind the shared "search" rate limiter — both
 * produce errors that say nothing whatsoever about the session.
 */
const err = (message: string, status?: number) => {
  const e = new Error(message) as Error & { status?: number };
  if (status !== undefined) e.status = status;
  return e;
};

describe("claim session rejection", () => {
  it("treats the answers that mean the credential is finished as finished", () => {
    expect(isClaimSessionRejection(err("Session expired", 401))).toBe(true);
    expect(isClaimSessionRejection(err("Belongs to a different profile", 403))).toBe(true);
    expect(isClaimSessionRejection(err("Profile not found", 404))).toBe(true);
  });

  // The api client only attaches a status on the logged-in refresh-and-retry
  // path; an anonymous 401 arrives as a bare Error("Unauthorized").
  it("recognises the status-less anonymous 401", () => {
    expect(isClaimSessionRejection(new Error("Unauthorized"))).toBe(true);
  });

  it("survives a backend restart and a rate limit", () => {
    expect(isClaimSessionRejection(err("Bad gateway", 502))).toBe(false);
    expect(isClaimSessionRejection(err("Service unavailable", 503))).toBe(false);
    expect(isClaimSessionRejection(err("Too many requests", 429))).toBe(false);
    expect(isClaimSessionRejection(err("Cannot connect to server."))).toBe(false);
    expect(isClaimSessionRejection(null)).toBe(false);
  });

  // A 500 whose body happened to mention authorisation is still a 500.
  it("does not read the message when a status is present", () => {
    expect(isClaimSessionRejection(err("Unauthorized upstream", 500))).toBe(false);
  });
});

describe("claim retry policy", () => {
  it("never answers a rate limit with more requests", () => {
    expect(claimRetryPolicy(0, err("Too many requests", 429))).toBe(false);
    expect(claimRetryPolicy(0, err("Not found", 404))).toBe(false);
    expect(claimRetryPolicy(0, new Error("Unauthorized"))).toBe(false);
  });

  it("gives a restart or a dropped connection a second chance, then stops", () => {
    expect(claimRetryPolicy(0, err("Bad gateway", 502))).toBe(true);
    expect(claimRetryPolicy(1, err("Bad gateway", 502))).toBe(true);
    expect(claimRetryPolicy(2, err("Bad gateway", 502))).toBe(false);
    expect(claimRetryPolicy(0, new Error("Cannot connect to server."))).toBe(true);
  });
});
