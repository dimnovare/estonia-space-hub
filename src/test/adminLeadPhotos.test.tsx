import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { LeadPhotoGallery } from "@/components/admin/leads/LeadPhotos";
import { apiClient } from "@/services/apiClient";
import type { AdminLead } from "@/services";

/**
 * The admin gallery's two easy ways to go wrong, neither of which shows up in a
 * dev window with three good photos in the bucket.
 *
 * The bytes cannot ride an <img src>: the admin credential is an in-memory access
 * token sent as an Authorization header, so every photo is fetched and handed to
 * the browser as an object URL. That buys two obligations — release the URLs when
 * the workspace closes (the founder opens and collapses rows all day), and keep
 * the panel useful when one object is gone, which is the normal state of any
 * request older than the 30-day purge.
 *
 * Rendered with createRoot rather than @testing-library/react: its
 * @testing-library/dom peer is not installed in this repo.
 */

const BASE: AdminLead = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "cust@x.ee",
  city: "Tallinn",
  category: "moving",
  language: "et",
  createdAt: new Date().toISOString(),
  status: "new",
};

/** photoCount is not on the shared AdminLead type yet — see LeadPhotos.tsx. */
const leadWith = (photoCount: number) => ({ ...BASE, photoCount }) as AdminLead;

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

async function waitFor<T>(what: string, read: () => T | null | undefined, attempts = 60): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    const value = read();
    if (value) return value;
    await settle();
  }
  throw new Error(`timed out waiting for ${what}`);
}

describe("admin lead photo gallery", () => {
  let container: HTMLDivElement;
  let root: Root;
  let created: string[];
  let revoked: string[];

  const render = (lead: AdminLead) =>
    root.render(
      <MemoryRouter initialEntries={["/en/admin"]}>
        <LanguageProvider>
          <LeadPhotoGallery lead={lead} />
        </LanguageProvider>
      </MemoryRouter>,
    );

  beforeEach(() => {
    created = [];
    revoked = [];
    let seq = 0;
    // jsdom implements neither half of the object-URL API.
    URL.createObjectURL = vi.fn(() => {
      const url = `blob:mock/${++seq}`;
      created.push(url);
      return url;
    });
    URL.revokeObjectURL = vi.fn((url: string) => { revoked.push(url); });

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  it("renders nothing for a request that came without photos", async () => {
    const fetchBinary = vi.spyOn(apiClient, "fetchBinary");

    render(leadWith(0));
    await settle();

    expect(container.textContent).toBe("");
    expect(fetchBinary).not.toHaveBeenCalled();
    root.unmount();
  });

  it("fetches one photo per index and releases the URLs when the row is collapsed", async () => {
    const fetchBinary = vi.spyOn(apiClient, "fetchBinary")
      .mockResolvedValue({ blob: new Blob(["jpeg"], { type: "image/jpeg" }) });

    render(leadWith(3));
    await waitFor("three thumbnails", () => {
      const images = container.querySelectorAll("img");
      return images.length === 3 ? images : null;
    });

    // Addressed by index against this lead's own list — never by storage key.
    expect(fetchBinary.mock.calls.map((c) => c[0])).toEqual([
      `/admin/leads/${BASE.id}/photos/0`,
      `/admin/leads/${BASE.id}/photos/1`,
      `/admin/leads/${BASE.id}/photos/2`,
    ]);
    expect([...container.querySelectorAll("img")].map((i) => i.getAttribute("src"))).toEqual(created);
    expect(revoked).toEqual([]);

    root.unmount();
    expect(revoked.sort()).toEqual([...created].sort());
  });

  it("keeps the photos that loaded when one object is gone", async () => {
    vi.spyOn(apiClient, "fetchBinary").mockImplementation(async (endpoint: string) => {
      // The 30-day purge takes the objects; the lead row still names them.
      if (endpoint.endsWith("/1")) throw new Error("API error: 404");
      return { blob: new Blob(["jpeg"], { type: "image/jpeg" }) };
    });

    render(leadWith(3));

    // Two tiles render an <img>; the missing one degrades in place rather than
    // taking the panel — and the surviving photos keep their own indices.
    await waitFor("the two surviving photos", () => {
      const images = container.querySelectorAll("img");
      return images.length === 2 ? images : null;
    });
    expect(created).toHaveLength(2);
    expect(container.querySelectorAll("li")).toHaveLength(3);

    root.unmount();
  });
});
