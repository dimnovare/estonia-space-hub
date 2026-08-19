import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * The customer's photos, on the provider's quote page.
 *
 * WHY IT EXISTS. The outreach email already prints a "Photos: 3" fact line, and
 * the backend has always sent `photoCount` — but the page rendered no gallery,
 * so a provider was told pictures existed, clicked through, and found none.
 * That is worse than having no photos at all: it is the exact round trip the
 * upload feature was built to remove (Adduco refused to quote a real Haapsalu
 * move without pictures, on a job the customer needed that week).
 *
 * Addressed by INDEX, never by storage key. `GET /quote/{token}/photos/{i}`
 * resolves the index against this lead's own list, so the page never has to
 * hold — or leak — a private-bucket key it could be probed for.
 *
 * Plain `<img src>` on a credential-checked, `private, no-store` endpoint: the
 * token in the path is the whole authorisation, so there is nothing for a
 * fetch-and-blob dance to add except a spinner and a revoke bug. `no-store`
 * does mean the viewer re-requests the bytes it just showed as a thumbnail;
 * that endpoint's limit is 60/min per IP against at most 6 photos, so the
 * refetch is affordable and the alternative (caching a stranger's home in a
 * shared cache) is not.
 */

/** Same composition the other non-apiClient URLs use (ImageUploader,
 *  ContractSigningModal): empty in dev behind the Vite proxy, the absolute API
 *  origin in prod. apiClient keeps its copy private, so this mirrors it. */
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export function QuoteLeadPhotos({ token, count }: { token: string; count: number }) {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // Thumbnails that 404'd or died in transit. Dropped from the grid rather than
  // left as a broken-image icon — a provider deciding whether to quote should
  // not have to work out whether the grey box is the customer's cellar.
  const [failed, setFailed] = useState<ReadonlySet<number>>(() => new Set<number>());
  // The viewer's own failure is tracked separately and never written back into
  // `failed`: removing the thumbnail that opened the dialog would delete the
  // element Radix restores focus to on close.
  const [viewerFailed, setViewerFailed] = useState(false);

  // photoCount is optional on the wire and comes from a count field, so treat
  // anything that isn't a sane positive integer as "no photos" instead of
  // rendering a grid of guaranteed 404s.
  const total = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  const shown = Array.from({ length: total }, (_, i) => i).filter((i) => !failed.has(i));

  if (total === 0) return null;

  const photoUrl = (index: number) =>
    `${API_BASE_URL}/quote/${encodeURIComponent(token)}/photos/${index}`;

  const fill = (index: number, label: string) => label
    .replace("{index}", String(index + 1))
    .replace("{count}", String(total));

  // Step through what is actually loadable, so a dead index in the middle isn't
  // a wall the provider hits halfway through the set.
  const step = (delta: number) => {
    if (openIndex === null || shown.length === 0) return;
    const at = shown.indexOf(openIndex);
    const next = shown[((at < 0 ? 0 : at) + delta + shown.length) % shown.length];
    setViewerFailed(false);
    setOpenIndex(next);
  };

  return (
    <div className="mt-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("quote.photos.title")}
      </p>

      {shown.length > 0 && (
        <>
          <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {shown.map((index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => { setViewerFailed(false); setOpenIndex(index); }}
                  aria-label={fill(index, t("quote.photos.open"))}
                  className="group block w-full overflow-hidden rounded-lg border border-border bg-secondary transition-colors hover:border-teal-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <img
                    src={photoUrl(index)}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                    // No download affordance anywhere in here, and no drag: these
                    // are pictures of somebody's home, shown to a stranger who
                    // needs to price a job, not to keep a copy. Blocking the
                    // context menu would be theatre — the bytes are already in
                    // the browser — so the real controls stay where they work:
                    // the token, and `private, no-store` on the response.
                    draggable={false}
                    onError={() => setFailed((prev) => new Set(prev).add(index))}
                    className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-muted-foreground">{t("quote.photos.hint")}</p>
        </>
      )}

      {/* Say a photo is missing rather than quietly showing fewer than the
          outreach email promised — a provider counting three and seeing two
          would otherwise assume the request itself is unreliable. */}
      {failed.size > 0 && (
        // role="status", not "alert": it appears as images 404 one by one, well
        // after the page settled, and it is information rather than a failure the
        // provider has to act on — so it should not interrupt what they are reading.
        <p role="status" className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <ImageOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {t("quote.photos.unavailable")}
        </p>
      )}

      <Dialog
        open={openIndex !== null}
        onOpenChange={(next) => { if (!next) { setOpenIndex(null); setViewerFailed(false); } }}
      >
        <DialogContent
          // aria-describedby is cleared deliberately: there is nothing to
          // describe a photo with that the title doesn't already say, and Radix
          // warns about a dangling reference otherwise.
          aria-describedby={undefined}
          onKeyDown={(e) => {
            if (shown.length < 2) return;
            if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
            if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
          }}
          // The stock close button sits over the photo, so it gets a solid pill
          // here — a bare dark X is invisible on a dark picture.
          className="max-w-3xl gap-0 overflow-hidden p-0 [&>button]:right-3 [&>button]:top-3 [&>button]:z-10 [&>button]:rounded-full [&>button]:bg-card [&>button]:p-1.5 [&>button]:text-foreground [&>button]:shadow-elevated"
        >
          <DialogTitle className="sr-only">{t("quote.photos.viewerTitle")}</DialogTitle>

          {/* Neutral dark behind the photo: a dim cellar or a garage at dusk is
              unreadable floating on a white sheet, and that is exactly the kind
              of load a provider is being asked to price. */}
          <div className="relative flex min-h-[240px] items-center justify-center bg-navy-ink">
            {openIndex !== null && !viewerFailed ? (
              <img
                src={photoUrl(openIndex)}
                alt={fill(openIndex, t("quote.photos.alt"))}
                draggable={false}
                onError={() => setViewerFailed(true)}
                className="max-h-[75vh] w-full object-contain"
              />
            ) : (
              <p className="px-6 py-16 text-center text-sm text-white/80">
                {t("quote.photos.viewerUnavailable")}
              </p>
            )}

            {shown.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label={t("quote.photos.prev")}
                  className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground shadow-elevated transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label={t("quote.photos.next")}
                  className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground shadow-elevated transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </button>
              </>
            )}
          </div>

          {total > 1 && openIndex !== null && (
            // Digits only — "2 / 3" needs no translation, and it stays aligned
            // with the alt text rather than counting the survivors.
            <p className="bg-card py-2 text-center text-xs font-medium text-muted-foreground">
              {openIndex + 1} / {total}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
