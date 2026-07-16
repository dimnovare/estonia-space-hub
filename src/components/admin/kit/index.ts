/**
 * Shared admin kit (control-room spec §4) — small, boring, reused everywhere.
 * All components are i18n-agnostic: labels arrive translated from the caller.
 */
export { AdminPageHeader } from "./AdminPageHeader";
export { StatCard } from "./StatCard";
export {
  DataTable, DataTableHead, Th, Tr, Td, DataTableSkeleton, DataTableEmptyRow,
} from "./DataTable";
export { StatusBadge, type StatusTone } from "./StatusBadge";
export { FilterBar, FilterChip } from "./FilterBar";
export { EmptyState } from "./EmptyState";
