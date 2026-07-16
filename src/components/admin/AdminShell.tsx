import { useEffect, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminCommandPalette from "@/components/admin/AdminCommandPalette";
import { findNavItem } from "@/components/admin/adminNav";

interface Props {
  /** Active section id (AdminPage ?tab= value or "partners"). */
  active: string;
  children: ReactNode;
}

/**
 * Shared admin frame (control-room spec §2): dark rail + slim shell header
 * carrying the visible Cmd+K trigger, light content area. Every admin page
 * (AdminPage, partner list/detail) renders inside this shell so the palette
 * and the keyboard shortcut are available everywhere.
 */
export default function AdminShell({ active, children }: Props) {
  const { t } = useLanguage();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const located = findNavItem(active);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <AdminSidebar activeTab={active} />
      <div className="min-w-0 flex-1 overflow-x-hidden">
        <header className="flex h-12 items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-6">
          <span className="hidden truncate font-mono-label text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:block">
            {located ? `${t(located.group.labelKey)} · ${t(located.item.labelKey)}` : t("admin.title")}
          </span>
          <button
            type="button"
            data-testid="admin-cmdk-trigger"
            onClick={() => setPaletteOpen(true)}
            className="inline-flex min-h-[36px] items-center gap-2 rounded-md border border-border bg-background px-3 text-[13px] text-muted-foreground transition-colors hover:border-navy-ink/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search aria-hidden className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{t("admin.cmdk.trigger")}</span>
            <kbd aria-hidden className="font-data hidden rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground sm:inline-block">
              {navigator.platform?.toUpperCase().includes("MAC") ? "⌘K" : "Ctrl K"}
            </kbd>
          </button>
        </header>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
      <AdminCommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
