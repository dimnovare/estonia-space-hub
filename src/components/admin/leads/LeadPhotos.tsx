import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, Images, Loader2 } from "lucide-react";
import type { AdminLead } from "@/services";
import { apiClient } from "@/services/apiClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { formatCount } from "@/i18n/plural";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/** Mirrors LeadPhotoNormalizer.MaxPhotosPerLead on the backend. */
const MAX_PHOTOS = 6;

/**
 * GET /admin/leads returns `photoCount` on every row, but the shared `AdminLead`
 * type does not declare it yet (services/index.ts is owned elsewhere). Reading it
 * through a narrow view rather than casting the whole lead to `any` keeps the
 * rest of the row type-checked, and leaves exactly one line to delete once the
 * field lands.
 */

/**
 * How many photos this request carries, as far as the browser is allowed to know.
 *
 * Clamped to the backend's own per-lead cap: the count decides how many fetches
 * this component fires, so a nonsense value from a future/stale API must cost at
 * most six requests rather than however many it claimed.
 */
function leadPhotoCount(lead: AdminLead): number {
  const count = lead.photoCount;
  if (typeof count !== "number" || !(count > 0)) return 0;
  return Math.min(Math.trunc(count), MAX_PHOTOS);
}

/**
 * "This request came with pictures" — for the queue, where the operator is
 * scanning rather than reading. Renders nothing when there are none.
 */
export function LeadPhotoBadge({ lead, className }: { lead: AdminLead; className?: string }) {
  const { t, language } = useLanguage();
  const count = leadPhotoCount(lead);
  if (count === 0) return null;

  const label = formatCount(language, count, t("admin.leads.photoCount"));
  return (
    <span
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      <Images className="h-3 w-3" aria-hidden />
      {/* The number carries the meaning, not the colour — the badge stays
          readable to anyone who cannot tell it apart from the pills beside it. */}
      <span className="font-data">{count}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

type Slot =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "failed" };

const loadingSlots = (count: number): Slot[] =>
  Array.from({ length: count }, () => ({ status: "loading" }));

/**
 * The customer's photos, in the workspace where the match loop is actually run.
 *
 * WHY IT EXISTS. Every other participant could already see them — the customer
 * sent them, the provider opens them from their quote token — while the one
 * person working the request by hand could not. Without this he cannot judge
 * whether a request is quotable from what was sent, answer a provider who asks
 * about a photo, or tell a customer their pictures were unusable.
 *
 * WHY THE BYTES ARE FETCHED RATHER THAN PUT IN `src`. The admin credential is an
 * access token held in memory and sent as an Authorization header (see
 * services/apiClient.ts); a plain `<img src>` cannot carry it, and the refresh
 * cookie alone does not authenticate an API route. So each photo is pulled
 * through the same authenticated client as every other admin call and handed to
 * the `<img>` as an object URL. Inventing a public URL or a signed-key scheme
 * would mean publishing addresses into the private bucket, which is the one
 * thing this feature is built to avoid.
 */
export function LeadPhotoGallery({ lead }: { lead: AdminLead }) {
  const { t } = useLanguage();
  const leadId = lead.id;
  const count = leadPhotoCount(lead);
  const [slots, setSlots] = useState<Slot[]>(() => loadingSlots(count));
  const [openAt, setOpenAt] = useState<number | null>(null);

  useEffect(() => {
    if (count === 0) {
      setSlots([]);
      return;
    }

    let cancelled = false;
    const created: string[] = [];
    setSlots(loadingSlots(count));

    // All at once rather than one at a time: at most six photos, each a bounded
    // 1600px JPEG, and the operator opened this panel precisely to look at them.
    // A serial trickle would deliver the answer to "can this be quoted?" last.
    void Promise.all(
      Array.from({ length: count }, async (_, index): Promise<Slot> => {
        try {
          const { blob } = await apiClient.fetchBinary(`/admin/leads/${leadId}/photos/${index}`);
          if (!blob) return { status: "failed" };
          const url = URL.createObjectURL(blob);
          // The panel closes when the row is collapsed, which can happen
          // mid-flight — a URL minted after that would never be revoked by the
          // cleanup below, so it is released here instead.
          if (cancelled) {
            URL.revokeObjectURL(url);
            return { status: "failed" };
          }
          created.push(url);
          return { status: "ready", url };
        } catch {
          // One unreadable object (purged at 30 days, or a bucket hiccup) must
          // not blank the gallery — the photos that did arrive are the whole
          // reason this panel is on screen.
          return { status: "failed" };
        }
      }),
    ).then((next) => {
      if (!cancelled) setSlots(next);
    });

    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [leadId, count]);

  if (count === 0) return null;

  const label = (key: string, index: number) =>
    t(key).replace("{n}", String(index + 1)).replace("{total}", String(count));

  const step = (delta: number) =>
    setOpenAt((at) => (at === null ? at : (at + delta + count) % count));

  const open = openAt !== null ? slots[openAt] : undefined;

  return (
    <div>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("admin.leads.photos")}
      </span>
      <p className="mt-0.5 text-xs text-muted-foreground">{t("admin.leads.photosHint")}</p>

      <ul className="mt-2 flex flex-wrap gap-2">
        {slots.map((slot, index) => (
          <li key={index}>
            {slot.status === "ready" ? (
              <button
                type="button"
                onClick={() => setOpenAt(index)}
                aria-label={label("admin.leads.photoOpen", index)}
                className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <img
                  src={slot.url}
                  // The button carries the label; announcing the alt as well
                  // would read the same sentence twice.
                  alt=""
                  className="h-24 w-24 rounded-lg border border-border object-cover transition-opacity hover:opacity-90"
                />
              </button>
            ) : (
              <div
                // Same 96px box whatever the state, so the row never reflows as
                // photos arrive or fail.
                className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary"
                title={slot.status === "failed" ? t("admin.leads.photoFailed") : undefined}
              >
                {slot.status === "loading" ? (
                  <span className="h-full w-full animate-pulse bg-muted motion-reduce:animate-none" />
                ) : (
                  <>
                    <ImageOff className="h-5 w-5 text-muted-foreground" aria-hidden />
                    <span className="sr-only">{t("admin.leads.photoFailed")}</span>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      <Dialog open={openAt !== null} onOpenChange={(isOpen) => { if (!isOpen) setOpenAt(null); }}>
        <DialogContent
          className="max-w-3xl"
          // Radix warns when a dialog has no description; this one is a picture.
          aria-describedby={undefined}
          onKeyDown={(e) => {
            if (count < 2) return;
            if (e.key === "ArrowLeft")  { e.preventDefault(); step(-1); }
            if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
          }}
        >
          <DialogTitle className="pr-8 text-sm font-medium text-muted-foreground">
            {label("admin.leads.photoAlt", openAt ?? 0)}
          </DialogTitle>

          <div className="flex min-h-[16rem] items-center justify-center rounded-lg bg-secondary/40 p-2">
            {open?.status === "ready" ? (
              <img
                src={open.url}
                alt={label("admin.leads.photoAlt", openAt ?? 0)}
                className="max-h-[70vh] w-auto max-w-full rounded object-contain"
              />
            ) : open?.status === "loading" ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <p className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <ImageOff className="h-6 w-6" aria-hidden />
                {t("admin.leads.photoFailed")}
              </p>
            )}
          </div>

          {count > 1 && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label={t("admin.leads.photoPrev")}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label={t("admin.leads.photoNext")}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
