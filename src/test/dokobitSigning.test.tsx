import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { DokobitSigningFrame } from "@/components/ContractSigningModal";
import { LanguageProvider } from "@/i18n/LanguageContext";

describe("DokobitSigningFrame", () => {
  it("keeps the hosted signing flow inside the Ruumly modal", () => {
    const signingUrl =
      "https://gateway-sandbox.dokobit.com/signing/test-token?access_token=test";

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    // The frame title is now localized via useLanguage(), so render inside the
    // router + language provider it depends on, and assert on the stable iframe
    // id/src (the security contract: hosted flow stays embedded) rather than the
    // translated title text.
    flushSync(() => {
      root.render(
        <MemoryRouter initialEntries={["/en"]}>
          <LanguageProvider>
            <DokobitSigningFrame signingUrl={signingUrl} />
          </LanguageProvider>
        </MemoryRouter>
      );
    });

    const frame = container.querySelector<HTMLIFrameElement>("iframe#isign-gateway");
    expect(frame?.id).toBe("isign-gateway");
    expect(frame?.src).toBe(signingUrl);
    expect((frame?.title ?? "").length).toBeGreaterThan(0);

    flushSync(() => root.unmount());
    container.remove();
  });
});
