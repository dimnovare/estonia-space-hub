import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { leadService } from "@/services";

/** Mirrors LeadPhotoNormalizer.MaxPhotosPerLead on the backend. */
const MAX_PHOTOS = 6;

interface Photo {
  /** Private-bucket key returned by the upload endpoint — submitted with the lead. */
  key: string;
  /** Local object URL for the thumbnail. Revoked on removal. */
  preview: string;
}

/**
 * Optional photo attachment on the request funnel.
 *
 * WHY IT EXISTS. A provider refused to quote a real move without it: Adduco
 * replied "selle info pealt adekvaatset pakkumist paraku ei saa teha" and asked
 * for pictures, costing a full round trip on a job the customer needed that
 * same week. For bulky or awkward loads — gym equipment, furniture, a cellar
 * full of boxes — a photo is not decoration, it is the difference between a
 * price and a guess.
 *
 * Uploads happen as the visitor picks them, BEFORE the request is submitted,
 * because the outreach goes out the moment the request lands: a photo that
 * arrived afterwards would miss the only email that matters. The backend
 * returns opaque keys, which ride along with the request.
 *
 * Deliberately optional and never blocking. Someone on a train with one bar of
 * signal must still be able to finish the form — a failed upload shows an
 * inline note and nothing else stops.
 */
export function RequestPhotoUpload({
  photos,
  onChange,
}: {
  photos: Photo[];
  onChange: (next: Photo[]) => void;
}) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_PHOTOS - photos.length;

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);

    // Sliced client-side too, so a multi-select of 30 does not fire 30 requests
    // at a rate limiter that will refuse most of them.
    const chosen = Array.from(files).slice(0, remaining);
    setBusy((n) => n + chosen.length);

    // Sequential, not parallel: several multi-megabyte uploads at once on a
    // phone connection is how you get a stalled form and a confused visitor.
    const added: Photo[] = [];
    for (const file of chosen) {
      try {
        const { key } = await leadService.uploadPhoto(file);
        added.push({ key, preview: URL.createObjectURL(file) });
      } catch {
        setError(t("request.photos.failed"));
      } finally {
        setBusy((n) => n - 1);
      }
    }

    if (added.length) onChange([...photos, ...added]);
    // Let the same file be picked again after a removal.
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (key: string) => {
    const gone = photos.find((p) => p.key === key);
    if (gone) URL.revokeObjectURL(gone.preview);
    onChange(photos.filter((p) => p.key !== key));
  };

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-foreground">{t("request.photos.label")}</p>
      <p className="mb-2.5 text-xs text-muted-foreground">{t("request.photos.hint")}</p>

      {photos.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {photos.map((p) => (
            <li key={p.key} className="relative">
              <img
                src={p.preview}
                alt=""
                className="h-20 w-20 rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => remove(p.key)}
                aria-label={t("request.photos.remove")}
                className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy > 0}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-dashed border-line-2 bg-card px-4 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
        >
          {busy > 0
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Camera className="h-4 w-4" aria-hidden />}
          {busy > 0 ? t("request.photos.uploading") : t("request.photos.add")}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        // capture is intentionally absent: on a phone this leaves BOTH the
        // camera and the gallery available, and most people photographed the
        // room before they opened the form.
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export type { Photo };
