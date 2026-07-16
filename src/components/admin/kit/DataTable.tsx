import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes, HTMLAttributes } from "react";

/**
 * Control-room table styling (kit spec §4) — a styled COMPOSITION of the
 * existing <table> markup, not a table library. Screens keep their own row
 * logic (expandable rows, dialogs, mobile cards); the kit standardizes the
 * container, header typography, compact 40-44px rows and mono numeric cells.
 */

/** Scrollable card container + table element. */
export function DataTable({ children, className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`overflow-x-auto rounded-[14px] border border-border bg-card shadow-card ${className}`} {...rest}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

/** thead with the instrument-panel header row. Sticky so it pins when a
 *  parent constrains the table height (no effect in page-scroll layouts). */
export function DataTableHead({ children, className = "", ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={`sticky top-0 z-[1] border-b border-border bg-secondary/50 ${className}`} {...rest}>
      {children}
    </thead>
  );
}

interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "right" | "center";
}

/** Column header: small mono uppercase — the header IS part of the instrument read. */
export function Th({ children, align = "left", className = "", ...rest }: ThProps) {
  const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th
      className={`whitespace-nowrap px-4 py-2.5 font-mono-label text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground ${alignCls} ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}

/** Body row: hairline borders only (no zebra), quiet hover. */
export function Tr({ children, className = "", ...rest }: HTMLAttributes<HTMLTableRowElement> & { id?: string }) {
  return (
    <tr className={`border-b border-border transition-colors last:border-0 hover:bg-secondary/40 ${className}`} {...rest}>
      {children}
    </tr>
  );
}

interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "right" | "center";
  /** Numeric/date/money cell → data font with tabular figures. */
  data?: boolean;
}

/** Body cell; `data` renders mono numerals (money, counts, dates, ids). */
export function Td({ children, align = "left", data = false, className = "", ...rest }: TdProps) {
  const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  const dataCls = data ? "font-data whitespace-nowrap text-[13px]" : "";
  return (
    <td className={`px-4 py-2.5 align-middle ${alignCls} ${dataCls} ${className}`} {...rest}>
      {children}
    </td>
  );
}

/** Consistent loading state: shimmering skeleton rows inside the table. */
export function DataTableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <tbody data-testid="table-skeleton">
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-border last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <div className="h-3.5 animate-shimmer rounded" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

/** Consistent in-table empty state (full-width row). */
export function DataTableEmptyRow({ cols, children }: { cols: number; children: ReactNode }) {
  return (
    <tbody>
      <tr>
        <td colSpan={cols} className="px-5 py-12 text-center text-sm text-muted-foreground">
          {children}
        </td>
      </tr>
    </tbody>
  );
}
