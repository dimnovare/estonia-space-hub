import {
  LayoutDashboard, Inbox, MessageSquare, Building2, MapPin, ListChecks,
  ClipboardCheck, Package, Banknote, Receipt, ShieldAlert, Sparkles, Zap,
  Users, Route, Link2, Newspaper, Settings, Activity, Gauge, BarChart2,
  type LucideIcon,
} from "lucide-react";

/**
 * Single source of truth for the admin navigation (control-room spec §2).
 * Consumed by AdminSidebar (grouped rail) AND AdminCommandPalette (Cmd+K), so
 * the two can never drift. Ops-first priority order: OPERATE (the daily
 * concierge loop) on top, marketplace ops below it, platform plumbing last.
 * All 21 pre-redesign destinations are preserved — nothing was removed,
 * only grouped.
 */
export type AdminNavGroupId = "operate" | "supply" | "commerce" | "platform";

export interface AdminNavItem {
  /** Matches AdminPage's ?tab= value (or the route id for partner pages). */
  id: string;
  labelKey: string;
  icon: LucideIcon;
  href: string;
}

export interface AdminNavGroup {
  id: AdminNavGroupId;
  labelKey: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "operate",
    labelKey: "admin.nav.groupOperate",
    items: [
      { id: "dashboard", labelKey: "admin.dashboard", icon: LayoutDashboard, href: "/admin" },
      { id: "leads",     labelKey: "admin.leads",     icon: Inbox,           href: "/admin?tab=leads" },
      { id: "inquiries", labelKey: "admin.inquiries", icon: MessageSquare,   href: "/admin?tab=inquiries" },
    ],
  },
  {
    id: "supply",
    labelKey: "admin.nav.groupSupply",
    items: [
      { id: "partners",  labelKey: "admin.partners",     icon: Building2,      href: "/admin/partners" },
      { id: "locations", labelKey: "admin.locations",    icon: MapPin,         href: "/admin?tab=locations" },
      { id: "listings",  labelKey: "admin.listings",     icon: ListChecks,     href: "/admin?tab=listings" },
      { id: "suppliers", labelKey: "admin.applications", icon: ClipboardCheck, href: "/admin?tab=suppliers" },
    ],
  },
  {
    id: "commerce",
    labelKey: "admin.nav.groupCommerce",
    items: [
      { id: "orders",   labelKey: "admin.orders",          icon: Package,     href: "/admin?tab=orders" },
      { id: "payouts",  labelKey: "admin.payouts",         icon: Banknote,    href: "/admin?tab=payouts" },
      { id: "rebates",  labelKey: "admin.rebates",         icon: Receipt,     href: "/admin?tab=rebates" },
      { id: "disputes", labelKey: "admin.disputes",        icon: ShieldAlert, href: "/admin?tab=disputes" },
      { id: "catalog",  labelKey: "admin.featureCatalog",  icon: Sparkles,    href: "/admin?tab=catalog" },
      { id: "requests", labelKey: "admin.featureRequests", icon: Zap,         href: "/admin?tab=requests" },
    ],
  },
  {
    id: "platform",
    labelKey: "admin.nav.groupPlatform",
    items: [
      { id: "users",        labelKey: "admin.users",        icon: Users,     href: "/admin?tab=users" },
      { id: "routing",      labelKey: "admin.routing",      icon: Route,     href: "/admin?tab=routing" },
      { id: "integrations", labelKey: "admin.integrations", icon: Link2,     href: "/admin?tab=integrations" },
      { id: "blog",         labelKey: "admin.blog",         icon: Newspaper, href: "/admin?tab=blog" },
      { id: "settings",     labelKey: "admin.settings",     icon: Settings,  href: "/admin?tab=settings" },
      { id: "audit",        labelKey: "admin.audit",        icon: Activity,  href: "/admin?tab=audit" },
      { id: "ops",          labelKey: "admin.ops",          icon: Gauge,     href: "/admin?tab=ops" },
      { id: "metrics",      labelKey: "admin.health",       icon: BarChart2, href: "/admin?tab=metrics" },
    ],
  },
];

/** The group a section id belongs to (undefined for unknown ids). */
export function groupOfSection(sectionId: string): AdminNavGroupId | undefined {
  return ADMIN_NAV_GROUPS.find((g) => g.items.some((i) => i.id === sectionId))?.id;
}

/** Find a nav item by section id. */
export function findNavItem(sectionId: string): { group: AdminNavGroup; item: AdminNavItem } | undefined {
  for (const group of ADMIN_NAV_GROUPS) {
    const item = group.items.find((i) => i.id === sectionId);
    if (item) return { group, item };
  }
  return undefined;
}
