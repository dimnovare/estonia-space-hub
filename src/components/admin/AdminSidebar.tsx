import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageContext";
import { adminLeadService } from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { ChevronDown, ArrowLeft } from "lucide-react";
import {
  ADMIN_NAV_GROUPS, groupOfSection, findNavItem,
  type AdminNavGroup, type AdminNavItem,
} from "@/components/admin/adminNav";

/**
 * Control-room rail (spec §2): dark navy instrument-panel frame around a light
 * content area. Four labeled groups in ops-first order; COMMERCE + PLATFORM
 * collapsed by default with the user's explicit toggles persisted per-browser.
 * The group holding the ACTIVE section always auto-expands (without persisting,
 * so a transient visit doesn't rewrite the user's preference).
 */
const STORAGE_KEY = "ruumly-admin-nav-groups";
const DEFAULT_EXPANDED: Record<string, boolean> = { supply: true, commerce: false, platform: false };

function loadStoredExpansion(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Count of leads waiting on a first response (SLA badge on the Leads item).
 * Existing endpoint only: GET /admin/leads?needsResponse=true&limit=1 → total.
 */
export function useNeedsResponseCount(): number {
  const { data } = useQuery({
    queryKey: [...queryKeys.adminLeads.root(), "needs-response-count"],
    queryFn: () => adminLeadService.list("all", 1, 1, { needsResponse: true }),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  });
  return data?.total ?? 0;
}

function NeedsResponseBadge({ count, onDark }: { count: number; onDark: boolean }) {
  const { t } = useLanguage();
  if (count <= 0) return null;
  return (
    <span
      aria-label={t("admin.nav.needsResponseBadge").replace("{count}", String(count))}
      className={`font-data ml-auto inline-flex min-w-[22px] shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none ${
        onDark ? "bg-teal text-navy-deep" : "bg-navy-ink text-white"
      }`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

interface Props {
  /** id of the active section (e.g. "partners", "orders"). Accepts either prop name. */
  activeTab?: string;
  activeSection?: string;
}

export default function AdminSidebar({ activeTab, activeSection }: Props) {
  const { t } = useLanguage();
  const active = activeSection ?? activeTab ?? "dashboard";
  const activeGroup = groupOfSection(active);
  const [mobileOpen, setMobileOpen] = useState(false);
  const needsResponse = useNeedsResponseCount();

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({
    ...DEFAULT_EXPANDED,
    ...loadStoredExpansion(),
  }));

  // Active-group auto-expand: transient (not persisted) so landing on a
  // commerce tab opens COMMERCE without permanently overriding the collapse.
  useEffect(() => {
    if (activeGroup && activeGroup !== "operate") {
      setExpanded((prev) => (prev[activeGroup] ? prev : { ...prev, [activeGroup]: true }));
    }
  }, [activeGroup]);

  const toggleGroup = (id: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  };

  const renderItem = (item: AdminNavItem, onDark: boolean, onClick?: () => void) => {
    const Icon = item.icon;
    const isActive = item.id === active;
    const cls = onDark
      ? `relative flex min-h-[40px] w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ${
          isActive ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/5 hover:text-white"
        }`
      : `relative flex min-h-[44px] w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          isActive ? "bg-navy-ink text-white" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`;
    return (
      <Link key={item.id} to={item.href} onClick={onClick} className={cls} aria-current={isActive ? "page" : undefined}>
        {isActive && (
          <span aria-hidden className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-teal" />
        )}
        <Icon
          className={`h-[18px] w-[18px] shrink-0 ${
            isActive ? "text-teal" : onDark ? "text-white/60" : "text-muted-foreground/80"
          }`}
        />
        <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
        {item.id === "leads" && <NeedsResponseBadge count={needsResponse} onDark={onDark || isActive} />}
      </Link>
    );
  };

  const renderGroup = (group: AdminNavGroup, onDark: boolean, onItemClick?: () => void) => {
    const isOperate = group.id === "operate";
    const open = isOperate || !!expanded[group.id];
    const headCls = onDark
      ? "text-white/60 hover:text-white"
      : "text-muted-foreground/80 hover:text-foreground";
    return (
      <div key={group.id} data-nav-group={group.id}>
        {isOperate ? (
          <div className={`px-3 pb-1 pt-0.5 font-mono-label text-[11px] font-medium uppercase tracking-[0.18em] ${onDark ? "text-white/60" : "text-muted-foreground/80"}`}>
            {t(group.labelKey)}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => toggleGroup(group.id)}
            aria-expanded={open}
            className={`flex min-h-[36px] w-full items-center justify-between rounded-md px-3 py-1.5 font-mono-label text-[11px] font-medium uppercase tracking-[0.18em] transition-colors focus-visible:outline-none focus-visible:ring-2 ${onDark ? "focus-visible:ring-teal" : "focus-visible:ring-ring"} ${headCls}`}
          >
            {t(group.labelKey)}
            <ChevronDown aria-hidden className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
          </button>
        )}
        {open && <div className="mt-0.5 space-y-0.5">{group.items.map((i) => renderItem(i, onDark, onItemClick))}</div>}
      </div>
    );
  };

  const current = findNavItem(active)?.item ?? ADMIN_NAV_GROUPS[0].items[0];
  const CurrentIcon = current.icon;

  return (
    <>
      {/* Desktop: dark navy rail — the instrument panel's frame (spec §1). */}
      <aside className="hidden w-[248px] shrink-0 bg-navy-ink lg:block">
        <div className="px-5 pb-4 pt-6">
          <div className="font-display text-[15px] font-bold text-white">{t("admin.title")}</div>
          <div className="text-[12.5px] text-white/60">{t("admin.roleCaption")}</div>
        </div>
        <nav aria-label={t("admin.navCaption")} className="space-y-3 px-3 pb-4">
          {ADMIN_NAV_GROUPS.map((g) => renderGroup(g, true))}
        </nav>
        <div className="mx-3 my-2 border-t border-white/10" />
        <div className="px-3 pb-6">
          <Link
            to="/"
            className="flex min-h-[40px] w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-white/75 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            <ArrowLeft className="h-[18px] w-[18px] shrink-0 text-white/60" />
            {t("admin.backToSite")}
          </Link>
        </div>
      </aside>

      {/* Mobile dropdown tab bar — same groups in the existing drawer pattern. */}
      <div className="relative px-4 pt-4 sm:px-6 lg:hidden">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium shadow-card"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <CurrentIcon className="h-4 w-4 shrink-0 text-teal-deep" />
            <span className="truncate">{t(current.labelKey)}</span>
            {current.id !== "leads" && <NeedsResponseBadge count={needsResponse} onDark={false} />}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${mobileOpen ? "rotate-180" : ""}`} />
        </button>
        {mobileOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-4 right-4 top-full z-40 mt-1 max-h-[60vh] space-y-2 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-prominent sm:left-6 sm:right-6">
              {ADMIN_NAV_GROUPS.map((g) => renderGroup(g, false, () => setMobileOpen(false)))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
