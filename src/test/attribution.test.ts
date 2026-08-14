import { describe, expect, it } from "vitest";
import { buildAttribution } from "@/lib/attribution";

// Attribution is what makes "cost per qualified request" — a north-star metric —
// computable at all. It is also a string collected from the URL bar and written
// into the database, so its allow-list is a privacy boundary, not a nicety.
describe("buildAttribution", () => {
  const HOST = "ruumly.eu";

  it("captures the UTM parameters a campaign actually sets", () => {
    const value = buildAttribution(
      "?utm_source=google&utm_medium=cpc&utm_campaign=kolimine-tallinn",
      "", HOST, "/et/request",
    );

    expect(value).toContain("utm_source=google");
    expect(value).toContain("utm_medium=cpc");
    expect(value).toContain("utm_campaign=kolimine-tallinn");
    expect(value).toContain("lp=/et/request");
  });

  it("captures click ids so ad platforms can be reconciled", () => {
    expect(buildAttribution("?gclid=abc123", "", HOST, "/et")).toContain("gclid=abc123");
    expect(buildAttribution("?fbclid=xyz789", "", HOST, "/et")).toContain("fbclid=xyz789");
  });

  it("NEVER copies parameters outside the allow-list", () => {
    // The whole point of an allow-list: a page reached with a personal value in
    // the query string must not smuggle it into the leads table.
    const value = buildAttribution(
      "?utm_source=fb&email=someone@example.com&phone=%2B37255555555&token=secret",
      "", HOST, "/et/request",
    );

    expect(value).toContain("utm_source=fb");
    expect(value).not.toContain("someone@example.com");
    expect(value).not.toContain("37255555555");
    expect(value).not.toContain("secret");
  });

  it("reduces an external referrer to its host, never the full URL", () => {
    // A full referrer URL can itself carry someone's search terms or an
    // internal path from another site.
    const value = buildAttribution(
      "", "https://www.google.com/search?q=kolimisteenus+tallinn+odav", HOST, "/et/request",
    );

    expect(value).toContain("ref=www.google.com");
    expect(value).not.toContain("kolimisteenus");
    expect(value).not.toContain("search?q=");
  });

  it("ignores same-site navigation as a referrer", () => {
    // Someone moving from the homepage to /request has no new attribution to
    // record — treating it as one would overwrite nothing but pollute reports.
    expect(buildAttribution("", `https://${HOST}/et`, HOST, "/et/request")).toBeNull();
  });

  it("returns null for direct traffic with no marketing signal", () => {
    expect(buildAttribution("", "", HOST, "/et/request")).toBeNull();
  });

  it("survives a malformed referrer instead of throwing", () => {
    expect(buildAttribution("?utm_source=nl", "not a url", HOST, "/et")).toContain("utm_source=nl");
  });

  it("never exceeds the backend column length", () => {
    const value = buildAttribution(
      `?utm_source=${"a".repeat(500)}&utm_campaign=${"b".repeat(500)}&utm_content=${"c".repeat(500)}`,
      "https://very-long-referrer.example.com", HOST, `/et/${"d".repeat(500)}`,
    );

    expect(value!.length).toBeLessThanOrEqual(300);
  });

  it("strips the separators it uses, so one field cannot fake another", () => {
    const value = buildAttribution("?utm_source=a|utm_medium=injected", "", HOST, "/et");

    // The injected pair must not survive as a parseable second field.
    expect(value).not.toContain("|utm_medium=injected");
  });
});
