import { useState, type ComponentType } from "react";
import { Link, useLocation } from "@/i18n/routing";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  LayoutDashboard, MessageSquare, Settings, Users, FileText,
  Package, Activity, ChevronDown, Route, MapPin, Banknote, Receipt, Building2,
} from "lucide-react";

type LinkItem =
  | { id: string; label: string; icon: ComponentType<any>; href: string }
  | { id: string; label: string; icon: ComponentType<any>; tab: true };

export function useAdminSidebarLinks(): LinkItem[] {
  const { t } = useLanguage();
  return [
    { id: "partners", label: t("admin.partners"), icon: Building2, href: "/admin/partners" },
    { id: "dashboard", label: t("admin.dashboard"), icon: LayoutDashboard, tab: true },
    { id: "locations", label: t("admin.locations"), icon: MapPin, tab: true },
    { id: "orders", label: t("admin.orders"), icon: Package, tab: true },
    { id: "payouts", label: t("admin.payouts"), icon: Banknote, tab: true },
    { id: "rebates", label: t("admin.rebates"), icon: Receipt, tab: true },
    { id: "routing", label: t("admin.routing"), icon: Route, tab: true },
    { id: "inquiries", label: t("admin.inquiries"), icon: MessageSquare, tab: true },
    { id: "users", label: t("admin.users"), icon: Users, tab: true },
    { id: "content", label: t("admin.content"), icon: FileText, tab: true },
    { id: "audit", label: t("admin.audit"), icon: Activity, tab: true },
    { id: "settings", label: t("admin.settings"), icon: Settings, tab: true },
  ];
}

interface Props {
  activeTab: string;
  onTabChange?: (id: string) => void;
}

export default function AdminSidebar({ activeTab, onTabChange }: Props) {
  const { t } = useLanguage();
  const links = useAdminSidebarLinks();
  const { pathname } = useLocation();
  const onPartnersRoute = /\/admin\/partners(\/|$)/.test(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (l: LinkItem) =>
    "href" in l ? onPartnersRoute && l.id === "partners" : l.id === activeTab && !onPartnersRoute;

  const renderItem = (l: LinkItem, onClick?: () => void) => {
    const Icon = l.icon;
    const active = isActive(l);
    const cls = `flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    }`;
    if ("href" in l) {
      return (
        <Link key={l.id} to={l.href} onClick={onClick} className={cls}>
          <Icon className="h-4 w-4" />{l.label}
        </Link>
      );
    }
    return (
      <button
        key={l.id}
        onClick={() => { onTabChange?.(l.id); onClick?.(); }}
        className={cls}
      >
        <Icon className="h-4 w-4" />{l.label}
      </button>
    );
  };

  const current = links.find(isActive);
  const CurrentIcon = current?.icon || LayoutDashboard;

  return (
    <>
      <aside className="hidden w-56 shrink-0 border-r border-border bg-card lg:block">
        <div className="p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin.title")}</h2>
        </div>
        <nav className="space-y-0.5 px-2">{links.map((l) => renderItem(l))}</nav>
      </aside>

      <div className="mb-4 lg:hidden relative">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium"
        >
          <span className="flex items-center gap-2.5">
            <CurrentIcon className="h-4 w-4 text-muted-foreground" />
            {current?.label ?? t("admin.title")}
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${mobileOpen ? "rotate-180" : ""}`} />
        </button>
        {mobileOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 right-0 top-full z-40 mt-1 rounded-xl border border-border bg-card p-1 shadow-xl max-h-[60vh] overflow-y-auto">
              {links.map((l) => renderItem(l, () => setMobileOpen(false)))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
