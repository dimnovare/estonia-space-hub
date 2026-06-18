import { useState, type ComponentType } from "react";
import { Link } from "@/i18n/routing";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  LayoutDashboard, MessageSquare, Settings, Users,
  Package, Activity, ChevronDown, Route, MapPin, Banknote, Receipt,
  Building2, Inbox, Gauge, BarChart2, ClipboardCheck, Sparkles, Zap,
  ArrowLeft,
} from "lucide-react";

type Item = { id: string; label: string; icon: ComponentType<any>; href: string };

function useItems(): Item[] {
  const { t } = useLanguage();
  return [
    { id: "dashboard",    label: t("admin.dashboard"),    icon: LayoutDashboard, href: "/admin" },
    { id: "partners",     label: t("admin.partners"),     icon: Building2,       href: "/admin/partners" },
    { id: "suppliers",    label: t("admin.applications"), icon: ClipboardCheck,  href: "/admin?tab=suppliers" },
    { id: "catalog",      label: t("admin.featureCatalog"), icon: Sparkles,      href: "/admin?tab=catalog" },
    { id: "requests",     label: t("admin.featureRequests"), icon: Zap,          href: "/admin?tab=requests" },
    { id: "locations",    label: t("admin.locations"),    icon: MapPin,          href: "/admin?tab=locations" },
    { id: "orders",       label: t("admin.orders"),       icon: Package,         href: "/admin?tab=orders" },
    { id: "payouts",      label: t("admin.payouts"),      icon: Banknote,        href: "/admin?tab=payouts" },
    { id: "rebates",      label: t("admin.rebates"),      icon: Receipt,         href: "/admin?tab=rebates" },
    { id: "routing",      label: t("admin.routing"),      icon: Route,           href: "/admin?tab=routing" },
    { id: "inquiries",    label: t("admin.inquiries"),    icon: MessageSquare,   href: "/admin?tab=inquiries" },
    { id: "leads",        label: t("admin.leads"),        icon: Inbox,           href: "/admin?tab=leads" },
    { id: "users",        label: t("admin.users"),        icon: Users,           href: "/admin?tab=users" },
    { id: "audit",        label: t("admin.audit"),        icon: Activity,        href: "/admin?tab=audit" },
    { id: "ops",          label: t("admin.ops"),          icon: Gauge,           href: "/admin?tab=ops" },
    { id: "metrics",      label: t("admin.health"),       icon: BarChart2,       href: "/admin?tab=metrics" },
    { id: "settings",     label: t("admin.settings"),     icon: Settings,        href: "/admin?tab=settings" },
  ];
}

interface Props {
  /** id of the active section (e.g. "partners", "orders"). Accepts either prop name. */
  activeTab?: string;
  activeSection?: string;
}

export default function AdminSidebar({ activeTab, activeSection }: Props) {
  const { t } = useLanguage();
  const items = useItems();
  const active = activeSection ?? activeTab ?? "dashboard";
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderItem = (l: Item, onClick?: () => void) => {
    const Icon = l.icon;
    const isActive = l.id === active;
    const cls = `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
      isActive
        ? "bg-navy-ink text-white"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    }`;
    return (
      <Link key={l.id} to={l.href} onClick={onClick} className={cls} aria-current={isActive ? "page" : undefined}>
        <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-teal" : "text-muted-foreground/80"}`} />
        {l.label}
      </Link>
    );
  };

  const current = items.find((i) => i.id === active) ?? items[0];
  const CurrentIcon = current.icon;

  return (
    <>
      {/* Desktop white sidebar */}
      <aside className="hidden w-[248px] shrink-0 border-r border-border bg-card lg:block">
        <div className="px-5 pb-3 pt-6">
          <div className="font-display text-[15px] font-bold text-navy-ink">{t("admin.title")}</div>
          <div className="text-[12.5px] text-muted-foreground">{t("admin.roleCaption")}</div>
        </div>
        <div className="px-5 pb-2 pt-1">
          <span className="font-mono-label text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
            {t("admin.navCaption")}
          </span>
        </div>
        <nav className="space-y-0.5 px-3 pb-4">{items.map((l) => renderItem(l))}</nav>
        <div className="mx-3 my-2 border-t border-border" />
        <div className="px-3 pb-6">
          <Link
            to="/"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-[18px] w-[18px] shrink-0 text-muted-foreground/80" />
            {t("admin.backToSite")}
          </Link>
        </div>
      </aside>

      {/* Mobile dropdown tab bar */}
      <div className="relative px-4 pt-4 sm:px-6 lg:hidden">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium shadow-card"
        >
          <span className="flex items-center gap-2.5">
            <CurrentIcon className="h-4 w-4 text-teal-deep" />
            {current.label}
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${mobileOpen ? "rotate-180" : ""}`} />
        </button>
        {mobileOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-4 right-4 top-full z-40 mt-1 max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-prominent sm:left-6 sm:right-6">
              {items.map((l) => renderItem(l, () => setMobileOpen(false)))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
