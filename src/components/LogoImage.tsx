import { useState, type ReactEventHandler } from "react";

/**
 * Aspect-aware provider-logo <img> for square tiles (partner-page header tile,
 * search-card thumb).
 *
 * Measured on real prod logos: roughly half are square-ish marks or photos,
 * the rest are wide wordmarks (up to ~9:1, e.g. 340×38). One fixed fit fails
 * one of the two groups: object-contain letterboxes square logos in a fat
 * white frame, object-cover crops a wordmark down to a few zoomed letters.
 *
 * So the fit is decided per image from naturalWidth/naturalHeight on load:
 *  - ratio 0.67–1.5 (square-ish) → object-cover, fills the tile;
 *  - anything wider/taller (wordmarks) → object-contain with a thin padding on
 *    a light background — wordmarks are designed for light surfaces — so they
 *    stay legible without the fat white frame.
 *
 * Error handling stays with the caller via onError (hide + show fallback).
 */
const COVER_MIN_RATIO = 0.67;
const COVER_MAX_RATIO = 1.5;

interface LogoImageProps {
  src: string;
  alt: string;
  /** Padding used in the contain (wordmark) mode — keep it thin (p-1/p-1.5). */
  padClass?: string;
  loading?: "lazy" | "eager";
  onError?: ReactEventHandler<HTMLImageElement>;
}

export function LogoImage({ src, alt, padClass = "p-1", loading = "lazy", onError }: LogoImageProps) {
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      onLoad={(e) => {
        const { naturalWidth, naturalHeight } = e.currentTarget;
        if (!naturalWidth || !naturalHeight) return;
        const ratio = naturalWidth / naturalHeight;
        setFit(ratio >= COVER_MIN_RATIO && ratio <= COVER_MAX_RATIO ? "cover" : "contain");
      }}
      onError={onError}
      className={`h-full w-full ${fit === "cover" ? "object-cover" : `object-contain bg-white ${padClass}`}`}
    />
  );
}
