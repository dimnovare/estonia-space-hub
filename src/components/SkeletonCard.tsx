export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl border border-border p-4 ${className || ""}`}>
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="mt-3 h-3 w-1/2 rounded bg-muted" />
      <div className="mt-2 h-3 w-1/3 rounded bg-muted" />
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
