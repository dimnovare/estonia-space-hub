import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { queryKeys } from "@/services/queryKeys";

export interface SizeBucket {
  code: "XS" | "S" | "M" | "L" | "XL";
  minM2: number | null;
  maxM2: number | null;
}

export function useSizeBuckets() {
  return useQuery({
    queryKey: queryKeys.sizeBuckets.all(),
    queryFn: async () => apiClient.get<SizeBucket[]>("/listings/size-buckets"),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/**
 * Format a bucket as "3.7–7.4 m²" for display alongside the code.
 * `upTo` is the localized "up to" word for the open-min bucket (e.g. "kuni"/"up to").
 * Defaults to "≤" so a missing translation still renders something language-neutral.
 */
export function formatBucketRange(b: SizeBucket, upTo = "≤"): string {
  if (b.minM2 === null && b.maxM2 !== null) return `${upTo} ${b.maxM2} m²`;
  if (b.minM2 !== null && b.maxM2 === null) return `${b.minM2}+ m²`;
  return `${b.minM2}–${b.maxM2} m²`;
}

/** Find the bucket code for a given size in m². */
export function bucketCodeForSize(
  buckets: SizeBucket[] | undefined,
  sizeM2: number | null | undefined,
): string | null {
  if (!buckets || sizeM2 == null) return null;
  const b = buckets.find(
    (b) =>
      (b.minM2 === null || sizeM2 >= b.minM2) &&
      (b.maxM2 === null || sizeM2 < b.maxM2),
  );
  return b?.code ?? null;
}