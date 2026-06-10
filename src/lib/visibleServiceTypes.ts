export type PublicServiceType = "warehouse" | "moving" | "trailer";

export function getVisibleServiceTypes(
  showMovingService: boolean,
  showTrailerService: boolean,
): PublicServiceType[] {
  return [
    "warehouse",
    ...(showMovingService ? ["moving" as const] : []),
    ...(showTrailerService ? ["trailer" as const] : []),
  ];
}
