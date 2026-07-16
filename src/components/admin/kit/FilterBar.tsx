import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Horizontal filter container (kit spec §4): standardizes the search-input +
 * selects/toggles row on every list screen. Purely presentational — screens
 * keep their own controls and state.
 */
export function FilterBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mb-4 flex flex-wrap items-center gap-2 ${className}`}>{children}</div>;
}

interface FilterChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
}

/**
 * The one pill-toggle for status/type filters. 44px touch target on touch
 * layouts, compact 36px from sm: up; active state is fill + aria-pressed
 * (not color alone).
 */
export function FilterChip({ active, className = "", children, ...rest }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`min-h-[44px] shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[36px] ${
        active
          ? "bg-navy-ink text-white"
          : "border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
