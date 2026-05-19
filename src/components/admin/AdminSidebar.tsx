import { useState, type ComponentType } from "react";
import { Link } from "@/i18n/routing";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  LayoutDashboard, MessageSquare, Settings, Users, FileText,
  Package, Activity, ChevronDown, Route, MapPin, Banknote, Receipt,
  Building2, Inbox,
} from "lucide-react";

type Item = { id: string; label: string; icon: ComponentType<any>; href: string };

function useItems(): Item[] {
  const { t } = useLanguage();
  return [
    { id: "dashboard",    label: t("admin.dashboard"),    icon: LayoutDashboard, href: "/admin" },
    { id: "partners",     label: t("admin.partners"),     icon: Building2,       href: "/admin/partners" },
    { id: "locations",    label: t("admin.locations"),    icon: MapPin,          href: "/admin?tab=locations" },
    { id: "orders",       label: t("admin.orders"),       icon: Package,         href: "/admin?tab=orders" },
    { id: "payouts",      label: t("admin.payouts"),      icon: Banknote,        href: "/admin?tab=payouts" },
    { id: "rebates",      label: t("admin.rebates"),      icon: Receipt,         href: "/admin?tab=rebates" },
    { id: "routing",      label: t("admin.routing"),      icon: Route,           href: "/admin?tab=routing" },
    { id: "inquiries",    label: t("admin.inquiries"),    icon: MessageSquare,   href: "/admin?tab=inquiries" },
    { id: "leads",        label: t("admin.leads"),        icon: Inbox,           href: "/admin?tab=leads" },
    { id: "users",        label: t("admin.users"),        icon: Users,           href: "/admin?tab=users" },
    { id: "content",      label: t("admin.content"),      icon: FileText,        href: "/admin?tab=content" },
    { id: "audit",        label: t("admin.audit"),        icon: Activity,        href: "/admin?tab=audit" },
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
    const cls = `flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    }`;
    return (
      <Link key={l.id} to={l.href} onClick={onClick} className={cls}>
        <Icon className="h-4 w-4" />{l.label}
      </Link>
    );
  };

  const current = items.find((i) => i.id === active) ?? items[0];
  const CurrentIcon = current.icon;

  return (
    <>
      <aside className="hidden w-56 shrink-0 border-r border-border bg-card lg:block">
        <div className="p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin.title")}</h2>
        </div>
        <nav className="space-y-0.5 px-2">{items.map((l) => renderItem(l))}</nav>
      </aside>

      <div className="relative px-4 pt-4 sm:px-6 lg:hidden">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium"
        >
          <span className="flex items-center gap-2.5">
            <CurrentIcon className="h-4 w-4 text-muted-foreground" />
            {current.label}
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${mobileOpen ? "rotate-180" : ""}`} />
        </button>
        {mobileOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-4 right-4 top-full z-40 mt-1 rounded-xl border border-border bg-card p-1 shadow-xl max-h-[60vh] overflow-y-auto sm:left-6 sm:right-6">
              {items.map((l) => renderItem(l, () => setMobileOpen(false)))}
            </div>
          </>
        )}
      </div>
    </>
  );
}