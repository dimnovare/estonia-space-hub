export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-border overflow-hidden ${className || ""}`}>
      <div className="aspect-[4/3] sm:aspect-[16/10] animate-shimmer" />
      <div className="p-4">
        <div className="h-4 w-3/4 rounded animate-shimmer" />
        <div className="mt-3 h-3 w-1/2 rounded animate-shimmer" />
        <div className="mt-2 h-3 w-1/3 rounded animate-shimmer" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
