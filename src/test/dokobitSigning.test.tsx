import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { DokobitSigningFrame } from "@/components/ContractSigningModal";

describe("DokobitSigningFrame", () => {
  it("keeps the hosted signing flow inside the Ruumly modal", () => {
    const signingUrl =
      "https://gateway-sandbox.dokobit.com/signing/test-token?access_token=test";

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    flushSync(() => {
      root.render(<DokobitSigningFrame signingUrl={signingUrl} />);
    });

    const frame = container.querySelector<HTMLIFrameElement>(
      'iframe[title="Dokobit signing"]'
    );
    expect(frame?.id).toBe("isign-gateway");
    expect(frame?.src).toBe(signingUrl);

    flushSync(() => root.unmount());
    container.remove();
  });
});
