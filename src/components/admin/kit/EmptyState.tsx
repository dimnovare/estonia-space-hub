import type { ComponentType, ReactNode } from "react";

interface Props {
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Consistent empty state (kit spec §4): icon, one-liner, optional action. */
export function EmptyState({ icon: Icon, title, description, action, className = "" }: Props) {
  return (
    <div className={`rounded-[14px] border border-border bg-card px-5 py-12 text-center shadow-card ${className}`}>
      {Icon && <Icon className="mx-auto h-10 w-10 text-muted-foreground/40" aria-hidden />}
      <p className={`text-sm font-medium text-foreground ${Icon ? "mt-3" : ""}`}>{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
