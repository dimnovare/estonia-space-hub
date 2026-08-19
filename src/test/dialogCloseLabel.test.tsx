import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

/**
 * Every dialog and sheet in the app renders a close button whose only accessible
 * name is an sr-only string. That string used to be a hardcoded English "Close",
 * which made it the one label a Latvian or Lithuanian screen-reader user still
 * heard in English — on the provider quote page, the customer offer page, the
 * admin lead workspace and the photo galleries alike.
 *
 * Two things have to hold at once, and they pull in opposite directions:
 *
 *  - the label must be translated, and
 *  - the primitive must keep working for the ~40 call sites that pass nothing,
 *    including the ones with no <LanguageProvider> above them. useLanguage()
 *    THROWS there, so these tests deliberately render with no provider and no
 *    router: if the primitive ever reaches for the hook, every case below dies
 *    with "useLanguage must be used within LanguageProvider" rather than
 *    silently degrading.
 *
 * Rendered with createRoot rather than @testing-library/react: its
 * @testing-library/dom peer is not installed in this repo.
 */

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** The close button is the only <button> inside these fixtures. */
function closeButtonLabel(): string {
  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) throw new Error("dialog did not render");
  const button = dialog.querySelector("button");
  if (!button) throw new Error("close button did not render");
  return (button.textContent ?? "").trim();
}

describe("dialog close button label", () => {
  let container: HTMLDivElement;
  let root: Root;

  const renderDialog = async (closeLabel?: string) => {
    root.render(
      <Dialog open>
        <DialogContent closeLabel={closeLabel}>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    await settle();
  };

  const renderSheet = async (closeLabel?: string) => {
    root.render(
      <Sheet open>
        <SheetContent closeLabel={closeLabel}>
          <SheetTitle>Title</SheetTitle>
          <SheetDescription>Description</SheetDescription>
        </SheetContent>
      </Sheet>,
    );
    await settle();
  };

  /** The label is resolved from the /:lang URL segment, so tests drive the URL. */
  const at = (path: string) => window.history.replaceState({}, "", path);

  beforeEach(() => {
    localStorage.clear();
    at("/");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    root.unmount();
    await settle();
    container.remove();
    localStorage.clear();
    at("/");
  });

  it("still gives the close button a real accessible name when the caller passes nothing", async () => {
    await renderDialog();

    const label = closeButtonLabel();
    expect(label).not.toBe("");
    // A raw key leaking through is the failure mode that ships silently.
    expect(label).not.toBe("common.close");
  });

  it("translates the default label from the language segment in the URL", async () => {
    at("/lv/pieprasijums");
    await renderDialog();

    expect(closeButtonLabel()).toBe("Aizvērt");
  });

  it("translates the default label for every shipped language", async () => {
    const cases: Array<[string, string]> = [
      ["/et/", "Sulge"],
      ["/en/", "Close"],
      ["/ru/", "Закрыть"],
      ["/lv/", "Aizvērt"],
      ["/lt/", "Uždaryti"],
    ];

    for (const [path, expected] of cases) {
      at(path);
      await renderDialog();
      expect(closeButtonLabel(), `close label at ${path}`).toBe(expected);
    }
  });

  it("falls back to the stored language when the URL carries no language segment", async () => {
    localStorage.setItem("ruumly-lang", "lt");
    at("/");
    await renderDialog();

    expect(closeButtonLabel()).toBe("Uždaryti");
  });

  it("lets a caller override the label for a dialog that needs something more specific", async () => {
    at("/lv/");
    await renderDialog("Aizvērt fotoattēlu");

    expect(closeButtonLabel()).toBe("Aizvērt fotoattēlu");
  });

  it("hides the X glyph from assistive tech so the name comes from the sr-only text alone", async () => {
    await renderDialog();

    const svg = document.querySelector('[role="dialog"] button svg');
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("applies the same default to sheets, which share the close-button defect", async () => {
    at("/ru/");
    await renderSheet();

    expect(closeButtonLabel()).toBe("Закрыть");
  });

  it("lets a caller override the sheet label too", async () => {
    at("/ru/");
    await renderSheet("Закрыть меню");

    expect(closeButtonLabel()).toBe("Закрыть меню");
  });
});
