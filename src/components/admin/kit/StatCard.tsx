import type { ComponentType, ReactNode } from "react";
import { Link } from "@/i18n/routing";

interface Props {
  label: string;
  /** The KPI value — always rendered in the data font (mono, tabular figures). */
  value: ReactNode;
  /** Delta / context line under the value. */
  sub?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  /** Compact variant for secondary rows (platform stats). */
  size?: "md" | "sm";
  /** Makes the whole card a link (focus-visible ring included). */
  href?: string;
  className?: string;
}

/**
 * THE KPI card (kit spec §4) — the only stat card in the admin. The mono
 * value with tabular figures is the control-room signature: columns of
 * numbers align and read like an instrument panel.
 */
export function StatCard({ label, value, sub, icon: Icon, size = "md", href, className = "" }: Props) {
  const card = (
    <div className={`h-full rounded-[14px] border border-border bg-card shadow-card ${size === "md" ? "p-5" : "p-3.5"} ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <span className={`text-muted-foreground ${size === "md" ? "text-sm" : "truncate text-xs"}`} title={label}>{label}</span>
        {Icon && <Icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground/70" aria-hidden />}
      </div>
      <div className={`font-data font-semibold leading-none text-navy-ink ${size === "md" ? "mt-2 text-[26px]" : "mt-1.5 text-lg"}`}>
        {value}
      </div>
      {sub && <div className={`text-muted-foreground ${size === "md" ? "mt-1.5 text-[12.5px]" : "mt-1 text-[11.5px]"}`}>{sub}</div>}
    </div>
  );
  if (!href) return card;
  return (
    <Link to={href} className="block h-full rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      {card}
    </Link>
  );
}
