import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  LayoutDashboard, List, MessageSquare, Settings, Users, FileText,
  TrendingUp, Eye, DollarSign, PlusCircle, Edit, Trash2, Warehouse, Truck, CarFront,
  X, Save, ChevronDown, Mail, Phone, Calendar, Shield, Globe, Bell, CreditCard, ToggleLeft,
  Package, Wifi, Hand, Send, Search, CheckCircle, Link2, Activity, Clock, AlertTriangle,
  RefreshCw, ExternalLink, FileCode, Server, Zap, Route, Plug
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MOCK_ORDERS, ORDER_STATUS_CONFIG, INTEGRATION_TYPE_CONFIG, generateOrderEmailPreview, type Order, type OrderStatus } from "@/data/mockOrders";
import { supplierService, userService, auditService } from "@/services";
import type { Supplier, User as ServiceUser, AuditLogEntry, PartnerIntegrationSettings, OrderRoutingRule, ApprovalMode, PostingMode } from "@/services/types";
import { useLanguage } from "@/i18n/LanguageContext";

const typeIcons: Record<string, typeof Warehouse> = { warehouse: Warehouse, moving: Truck, trailer: CarFront };

// ─── Mock integration settings ───
const MOCK_INTEGRATION_SETTINGS: PartnerIntegrationSettings[] = [
  { id: "int-1", supplierId: "sup-1", supplierName: "Laobox OÜ", approvalMode: "auto", postingMode: "api", fallbackPostingMode: "email", apiEndpoint: "https://api.laobox.ee/v1/orders", apiAuthType: "bearer", apiAuthPlaceholder: "Bearer sk_live_***", recipientEmail: "orders@laobox.ee", mappingProfile: "laobox_v2", isActive: true, lastTestedAt: "2026-03-20 14:30", lastTestResult: "success" },
  { id: "int-2", supplierId: "sup-2", supplierName: "MiniLadu AS", approvalMode: "admin", postingMode: "email", fallbackPostingMode: "manual", recipientEmail: "tiina@miniladu.ee", mappingProfile: "default", isActive: true },
  { id: "int-3", supplierId: "sup-3", supplierName: "SecureStore OÜ", approvalMode: "auto", postingMode: "api", fallbackPostingMode: "email", apiEndpoint: "https://api.securestore.ee/bookings", apiAuthType: "apikey", apiAuthPlaceholder: "X-Api-Key: ***", recipientEmail: "bookings@securestore.ee", mappingProfile: "securestore_v1", isActive: true, lastTestedAt: "2026-03-19 09:15", lastTestResult: "success" },
  { id: "int-4", supplierId: "sup-4", supplierName: "KoliExpress OÜ", approvalMode: "provider", postingMode: "email", fallbackPostingMode: "manual", recipientEmail: "andres@koliexpress.ee", mappingProfile: "default", isActive: true },
  { id: "int-5", supplierId: "sup-5", supplierName: "HaagisRent OÜ", approvalMode: "admin", postingMode: "manual", fallbackPostingMode: "email", recipientEmail: "kristjan@haagisrent.ee", isActive: false },
];

const MOCK_ROUTING_RULES: OrderRoutingRule[] = [
  { id: "rule-1", name: "API partnerid — automaatne", serviceType: "warehouse", requiresApproval: false, approverRole: "admin", postingChannel: "api", priority: 1, isActive: true },
  { id: "rule-2", name: "Ärikliendid — admin kinnitab", customerType: "business", requiresApproval: true, approverRole: "admin", postingChannel: "email", priority: 2, isActive: true },
  { id: "rule-3", name: "Kõrge hinnaga tellimused", priceThreshold: 500, requiresApproval: true, approverRole: "admin", postingChannel: "email", priority: 3, isActive: true },
  { id: "rule-4", name: "Kolimine — partner kinnitab", serviceType: "moving", requiresApproval: true, approverRole: "provider", postingChannel: "email", priority: 4, isActive: true },
  { id: "rule-5", name: "Haagise rent — manuaalne", serviceType: "trailer", requiresApproval: true, approverRole: "admin", postingChannel: "manual", priority: 5, isActive: false },
];

const initialInquiries = [
  { id: 1, customer: "Andres Tamm", email: "andres@email.com", listing: "Laobox Tallinn", type: "warehouse", date: "2026-03-20", status: "new", notes: "" },
  { id: 2, customer: "Kati Mets", email: "kati@email.com", listing: "KoliExpress", type: "moving", date: "2026-03-19", status: "answered", notes: "Klient soovib lisainfot" },
  { id: 3, customer: "Jüri Kask", email: "jyri@email.com", listing: "HaagisRent", type: "trailer", date: "2026-03-18", status: "closed", notes: "" },
  { id: 4, customer: "Maria Saar", email: "maria@email.com", listing: "MiniLadu Tartu", type: "warehouse", date: "2026-03-17", status: "new", notes: "" },
];

const initialListings = [
  { id: "w1", title: "Laobox Tallinn Kesklinn", type: "warehouse", status: "active", views: 234, inquiries: 18, price: 49, city: "Tallinn" },
  { id: "w2", title: "MiniLadu Tartu", type: "warehouse", status: "active", views: 156, inquiries: 8, price: 29, city: "Tartu" },
  { id: "m1", title: "KoliExpress", type: "moving", status: "active", views: 312, inquiries: 24, price: 45, city: "Tallinn" },
  { id: "t1", title: "HaagisRent Tallinn", type: "trailer", status: "paused", views: 89, inquiries: 5, price: 25, city: "Tallinn" },
];

export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";
  const setActiveTab = (id: string) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set("tab", id); return n; }, { replace: true });
  const { t } = useLanguage();

  const sidebarLinks = [
    { id: "dashboard", label: t("admin.dashboard"), icon: LayoutDashboard },
    { id: "listings", label: t("admin.listings"), icon: List },
    { id: "orders", label: t("admin.orders"), icon: Package },
    { id: "suppliers", label: t("admin.suppliers"), icon: Link2 },
    { id: "integrations", label: t("admin.integrations"), icon: Plug },
    { id: "routing", label: t("admin.routing"), icon: Route },
    { id: "inquiries", label: t("admin.inquiries"), icon: MessageSquare },
    { id: "users", label: t("admin.users"), icon: Users },
    { id: "content", label: t("admin.content"), icon: FileText },
    { id: "audit", label: t("admin.audit"), icon: Activity },
    { id: "settings", label: t("admin.settings"), icon: Settings },
  ];

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const currentTab = sidebarLinks.find(l => l.id === activeTab);
  const CurrentIcon = currentTab?.icon || LayoutDashboard;

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-card lg:block">
        <div className="p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin.title")}</h2>
        </div>
        <nav className="space-y-0.5 px-2">
          {sidebarLinks.map((l) => {
            const Icon = l.icon;
            const active = activeTab === l.id;
            return (
              <button key={l.id} onClick={() => setActiveTab(l.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <Icon className="h-4 w-4" />{l.label}
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
        {/* Mobile: dropdown nav */}
        <div className="mb-4 lg:hidden relative">
          <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium">
            <span className="flex items-center gap-2.5"><CurrentIcon className="h-4 w-4 text-muted-foreground" />{currentTab?.label}</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${mobileNavOpen ? "rotate-180" : ""}`} />
          </button>
          {mobileNavOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMobileNavOpen(false)} />
              <div className="absolute left-0 right-0 top-full z-40 mt-1 rounded-xl border border-border bg-card p-1 shadow-xl max-h-[60vh] overflow-y-auto">
                {sidebarLinks.map((l) => {
                  const Icon = l.icon;
                  return (
                    <button key={l.id} onClick={() => { setActiveTab(l.id); setMobileNavOpen(false); }} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${activeTab === l.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                      <Icon className="h-4 w-4" />{l.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        {activeTab === "dashboard" && <AdminDashboard />}
        {activeTab === "listings" && <AdminListings />}
        {activeTab === "orders" && <AdminOrders />}
        {activeTab === "suppliers" && <AdminSuppliers />}
        {activeTab === "integrations" && <AdminIntegrations />}
        {activeTab === "routing" && <AdminRouting />}
        {activeTab === "inquiries" && <AdminInquiries />}
        {activeTab === "users" && <AdminUsers />}
        {activeTab === "content" && <AdminContent />}
        {activeTab === "audit" && <AdminAudit />}
        {activeTab === "settings" && <AdminSettings />}
      </main>
    </div>
  );
}

/* ─── Dashboard ─── */
function AdminDashboard() {
  const { t } = useLanguage();
  const stats = [
    { label: t("admin.stats.listings"), value: "156", change: "+12%", icon: Eye },
    { label: t("admin.stats.orders"), value: "342", change: "+24%", icon: Package },
    { label: t("admin.stats.users"), value: "2,847", change: "+8%", icon: Users },
    { label: t("admin.stats.revenue"), value: "€4,230", change: "+18%", icon: DollarSign },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("admin.dashboard")}</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card-elevated p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 font-display text-2xl font-bold">{s.value}</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-success"><TrendingUp className="h-3 w-3" /> {s.change}</div>
            </div>
          );
        })}
      </div>
      <h2 className="mt-8 font-display text-lg font-semibold">{t("admin.recentInquiries")}</h2>
      {/* Mobile cards */}
      <div className="mt-4 space-y-2 sm:hidden">
        {initialInquiries.map((inq) => (
          <div key={inq.id} className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{inq.customer}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inq.status === "new" ? "bg-accent/10 text-accent" : inq.status === "answered" ? "bg-info/10 text-info" : "bg-muted text-muted-foreground"}`}>
                {inq.status === "new" ? t("admin.new") : inq.status === "answered" ? t("admin.answered") : t("admin.closed")}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{inq.listing} · {inq.date}</p>
          </div>
        ))}
      </div>
      {/* Desktop table */}
      <div className="mt-4 hidden rounded-xl border border-border sm:block">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.client")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.listing")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.date")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.status")}</th>
            </tr>
          </thead>
          <tbody>
            {initialInquiries.map((inq) => (
              <tr key={inq.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{inq.customer}</td>
                <td className="px-4 py-3 text-muted-foreground">{inq.listing}</td>
                <td className="px-4 py-3 text-muted-foreground">{inq.date}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inq.status === "new" ? "bg-accent/10 text-accent" : inq.status === "answered" ? "bg-info/10 text-info" : "bg-muted text-muted-foreground"}`}>
                    {inq.status === "new" ? t("admin.new") : inq.status === "answered" ? t("admin.answered") : t("admin.closed")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Orders ─── */
function AdminOrders() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [emailPreview, setEmailPreview] = useState(false);

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const updateOrderStatus = (id: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
    if (viewOrder?.id === id) setViewOrder((prev) => prev ? { ...prev, status } : prev);
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("admin.orders")}</h1>
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {(["all", "created", "sending", "sent", "confirmed", "rejected", "active", "completed"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            {f === "all" ? `${t("admin.all")} (${orders.length})` : `${ORDER_STATUS_CONFIG[f].label} (${orders.filter((o) => o.status === f).length})`}
          </button>
        ))}
      </div>
      {/* Mobile cards */}
      <div className="mt-6 space-y-2 md:hidden">
        {filtered.map((o) => {
          const statusConf = ORDER_STATUS_CONFIG[o.status];
          return (
            <button key={o.id} onClick={() => setViewOrder(o)} className="w-full rounded-xl border border-border p-3 text-left hover:bg-secondary/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">{o.id}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusConf.color}`}>{statusConf.label}</span>
              </div>
              <p className="mt-1 text-sm font-medium truncate">{o.listingTitle}</p>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{o.customerName}</span>
                <span className="font-medium text-foreground">€{o.total}</span>
              </div>
            </button>
          );
        })}
      </div>
      {/* Desktop table */}
      <div className="mt-6 hidden rounded-xl border border-border md:block">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.client")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.service")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.partner")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.integration")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.amount")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.margin")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.status")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const intConf = INTEGRATION_TYPE_CONFIG[o.integrationType];
              const statusConf = ORDER_STATUS_CONFIG[o.status];
              const IntIcon = o.integrationType === "api" ? Wifi : o.integrationType === "email" ? Mail : Hand;
              return (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{o.id}</td>
                  <td className="px-4 py-3 font-medium">{o.customerName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.listingTitle}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.supplierName}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${intConf.color}`}><IntIcon className="h-3 w-3" />{intConf.label}</span></td>
                  <td className="px-4 py-3 font-medium">€{o.total}</td>
                  <td className="px-4 py-3 text-success font-medium">€{o.margin}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusConf.color}`}>{statusConf.label}</span></td>
                  <td className="px-4 py-3"><Button variant="outline" size="sm" onClick={() => setViewOrder(o)}>{t("admin.view")}</Button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      <Dialog open={!!viewOrder} onOpenChange={() => { setViewOrder(null); setEmailPreview(false); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("admin.order")} {viewOrder?.id}</DialogTitle></DialogHeader>
          {viewOrder && !emailPreview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-muted-foreground">{t("admin.client")}</span><p className="font-medium">{viewOrder.customerName}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.email")}</span><p className="font-medium">{viewOrder.customerEmail}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.phone")}</span><p className="font-medium">{viewOrder.customerPhone}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.service")}</span><p className="font-medium">{viewOrder.listingTitle}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.partner")}</span><p className="font-medium">{viewOrder.supplierName}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.integration")}</span><p><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${INTEGRATION_TYPE_CONFIG[viewOrder.integrationType].color}`}>{INTEGRATION_TYPE_CONFIG[viewOrder.integrationType].label}</span></p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.startDate")}</span><p className="font-medium">{viewOrder.startDate}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.period")}</span><p className="font-medium">{viewOrder.duration}</p></div>
              </div>

              {/* Fulfillment section */}
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><Route className="h-4 w-4 text-accent" /> Fulfillment</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-xs text-muted-foreground">{t("admin.approvalMode")}</span><p className="font-medium">{viewOrder.integrationType === "api" ? t("admin.approvalAuto") : t("admin.approvalAdmin")}</p></div>
                  <div><span className="text-xs text-muted-foreground">{t("admin.postingChannel")}</span><p className="font-medium">{INTEGRATION_TYPE_CONFIG[viewOrder.integrationType].label}</p></div>
                  {viewOrder.sentAt && <div><span className="text-xs text-muted-foreground">{t("admin.markSent")}</span><p className="font-medium">{viewOrder.sentAt}</p></div>}
                  {viewOrder.confirmedAt && <div><span className="text-xs text-muted-foreground">{t("admin.markConfirmed")}</span><p className="font-medium">{viewOrder.confirmedAt}</p></div>}
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t("admin.clientPrice")}</span><span>€{viewOrder.platformPrice}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("admin.partnerPrice")}</span><span>€{viewOrder.supplierPrice}</span></div>
                {viewOrder.extrasTotal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t("admin.extras")}</span><span>€{viewOrder.extrasTotal}</span></div>}
                <div className="mt-2 flex justify-between border-t border-border pt-2 font-bold"><span>{t("admin.totalFromClient")}</span><span>€{viewOrder.total}</span></div>
                <div className="flex justify-between text-success font-medium"><span>{t("admin.margin")}</span><span>€{viewOrder.margin}</span></div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t("admin.orderHistory")}</p>
                <div className="space-y-2">
                  {viewOrder.timeline.map((tl, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                      <div>
                        <p className="text-xs font-medium">{tl.event}</p>
                        {tl.detail && <p className="text-[10px] text-muted-foreground font-mono">{tl.detail}</p>}
                        <p className="text-[10px] text-muted-foreground">{tl.date} {tl.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {viewOrder.integrationType === "email" && (
                  <Button variant="outline" size="sm" onClick={() => setEmailPreview(true)}><Mail className="mr-1 h-3.5 w-3.5" /> {t("admin.viewEmail")}</Button>
                )}
                {(viewOrder.status === "created" || viewOrder.status === "sending") && (
                  <Button size="sm" onClick={() => updateOrderStatus(viewOrder.id, "sent")} className="bg-info text-white hover:bg-info/90"><Send className="mr-1 h-3.5 w-3.5" /> {t("admin.markSent")}</Button>
                )}
                {viewOrder.status === "sent" && (
                  <>
                    <Button size="sm" onClick={() => updateOrderStatus(viewOrder.id, "confirmed")} className="bg-success text-white hover:bg-success/90">{t("admin.markConfirmed")}</Button>
                    <Button size="sm" variant="outline" onClick={() => updateOrderStatus(viewOrder.id, "rejected")} className="text-destructive">{t("admin.markRejected")}</Button>
                  </>
                )}
              </div>
            </div>
          )}
          {viewOrder && emailPreview && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t("admin.emailPreview")}</p>
                <Button variant="outline" size="sm" onClick={() => setEmailPreview(false)}>{t("admin.back")}</Button>
              </div>
              <pre className="rounded-lg border border-border bg-card p-4 text-xs whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">{generateOrderEmailPreview(viewOrder)}</pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Suppliers ─── */
function AdminSuppliers() {
  const { t } = useLanguage();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; latency: number } | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    supplierService.getAll().then((data) => { setSuppliers(data); setLoading(false); });
  }, []);

  const filtered = filter === "all" ? suppliers : filter === "active" ? suppliers.filter(s => s.isActive) : suppliers.filter(s => !s.isActive);

  const toggleStatus = (id: string) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive, integrationHealth: !s.isActive ? "healthy" : "offline" } : s));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, isActive: !prev.isActive } : prev);
  };

  const testIntegration = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    const result = await supplierService.testIntegration(id);
    setTestResult(result);
    setTestingId(null);
  };

  const healthColor = (h: string) => h === "healthy" ? "bg-success/10 text-success" : h === "degraded" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive";
  const healthLabel = (h: string) => h === "healthy" ? t("admin.healthy") : h === "degraded" ? t("admin.degraded") : t("admin.offline");
  const intIcon = (tp: string) => tp === "api" ? <Zap className="h-3.5 w-3.5" /> : tp === "email" ? <Mail className="h-3.5 w-3.5" /> : <Hand className="h-3.5 w-3.5" />;

  if (loading) return <div className="flex items-center justify-center py-20"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{t("admin.suppliers")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.integrationDesc")}</p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card-elevated p-4"><div className="text-sm text-muted-foreground">{t("admin.totalPartners")}</div><div className="mt-1 font-display text-2xl font-bold">{suppliers.length}</div></div>
        <div className="card-elevated p-4"><div className="text-sm text-muted-foreground">{t("admin.activePartners")}</div><div className="mt-1 font-display text-2xl font-bold text-success">{suppliers.filter(s => s.isActive).length}</div></div>
        <div className="card-elevated p-4"><div className="text-sm text-muted-foreground">{t("admin.apiIntegrations")}</div><div className="mt-1 font-display text-2xl font-bold">{suppliers.filter(s => s.integrationType === "api").length}</div></div>
        <div className="card-elevated p-4"><div className="text-sm text-muted-foreground">{t("admin.totalRevenue")}</div><div className="mt-1 font-display text-2xl font-bold">€{suppliers.reduce((s, sup) => s + sup.revenue, 0).toLocaleString()}</div></div>
      </div>
      <div className="mt-6 flex gap-2">
        {(["all", "active", "inactive"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            {f === "all" ? t("admin.all") : f === "active" ? t("admin.active") : t("admin.inactive")}
          </button>
        ))}
      </div>
      {/* Mobile cards */}
      <div className="mt-4 space-y-2 md:hidden">
        {filtered.map(s => (
          <button key={s.id} onClick={() => { setSelected(s); setTestResult(null); }} className="w-full rounded-xl border border-border p-3 text-left hover:bg-secondary/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">{s.contactEmail}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.isActive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{s.isActive ? t("admin.active") : t("admin.inactive")}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${INTEGRATION_TYPE_CONFIG[s.integrationType].color}`}>{intIcon(s.integrationType)} {INTEGRATION_TYPE_CONFIG[s.integrationType].label}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${healthColor(s.integrationHealth)}`}>{healthLabel(s.integrationHealth)}</span>
              <span className="text-xs text-muted-foreground">{s.listingCount} kuulutust</span>
              <span className="text-xs font-medium">€{s.revenue.toLocaleString()}</span>
            </div>
          </button>
        ))}
      </div>
      {/* Desktop table */}
      <div className="mt-4 hidden rounded-xl border border-border md:block">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.partner")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.contact")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.integration")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.health")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.listingsCount")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.ordersCount")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.stats.revenue")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.status")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-3"><div className="font-medium">{s.name}</div><div className="text-[10px] text-muted-foreground font-mono">{s.registryCode}</div></td>
                <td className="px-4 py-3"><div className="text-xs">{s.contactName}</div><div className="text-[10px] text-muted-foreground">{s.contactEmail}</div></td>
                <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${INTEGRATION_TYPE_CONFIG[s.integrationType].color}`}>{intIcon(s.integrationType)} {INTEGRATION_TYPE_CONFIG[s.integrationType].label}</span></td>
                <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${healthColor(s.integrationHealth)}`}>{healthLabel(s.integrationHealth)}</span></td>
                <td className="px-4 py-3 text-muted-foreground">{s.listingCount}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.ordersTotal}</td>
                <td className="px-4 py-3 font-medium">€{s.revenue.toLocaleString()}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.isActive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{s.isActive ? t("admin.active") : t("admin.inactive")}</span></td>
                <td className="px-4 py-3"><Button variant="outline" size="sm" className="text-xs" onClick={() => { setSelected(s); setTestResult(null); }}>{t("admin.view")}</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setTestResult(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">{t("admin.contactPerson")}</p><p className="text-sm font-medium">{selected.contactName}</p></div>
                <div className="rounded-lg bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">{t("admin.email")}</p><p className="text-sm font-medium">{selected.contactEmail}</p></div>
                <div className="rounded-lg bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">{t("admin.phone")}</p><p className="text-sm font-medium">{selected.contactPhone}</p></div>
                <div className="rounded-lg bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">{t("admin.registryCode")}</p><p className="text-sm font-medium font-mono">{selected.registryCode}</p></div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><Server className="h-4 w-4 text-accent" /> {t("admin.integrationSettings")}</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">{t("admin.type")}</p><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${INTEGRATION_TYPE_CONFIG[selected.integrationType].color}`}>{intIcon(selected.integrationType)} {INTEGRATION_TYPE_CONFIG[selected.integrationType].label}</span></div>
                  <div><p className="text-xs text-muted-foreground">{t("admin.health")}</p><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${healthColor(selected.integrationHealth)}`}>{healthLabel(selected.integrationHealth)}</span></div>
                  {selected.apiEndpoint && (<div className="col-span-2"><p className="text-xs text-muted-foreground">{t("admin.apiEndpoint")}</p><p className="font-mono text-xs mt-0.5 rounded-md bg-secondary px-2 py-1">{selected.apiEndpoint}</p></div>)}
                </div>
                {selected.integrationType === "api" && (
                  <div className="mt-3">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => testIntegration(selected.id)} disabled={testingId === selected.id}>
                      {testingId === selected.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                      {t("admin.testConnection")}
                    </Button>
                    {testResult && (
                      <div className={`mt-2 rounded-lg p-2 text-xs font-medium ${testResult.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {testResult.success ? `✓ ${t("admin.connectionOk")} — ${testResult.latency}ms` : `✗ ${t("admin.connectionFailed")}`}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-secondary/50 p-3 text-center"><p className="text-xs text-muted-foreground">{t("admin.listingsCount")}</p><p className="text-lg font-bold">{selected.listingCount}</p></div>
                <div className="rounded-lg bg-secondary/50 p-3 text-center"><p className="text-xs text-muted-foreground">{t("admin.ordersCount")}</p><p className="text-lg font-bold">{selected.ordersTotal}</p></div>
                <div className="rounded-lg bg-secondary/50 p-3 text-center"><p className="text-xs text-muted-foreground">{t("admin.stats.revenue")}</p><p className="text-lg font-bold text-accent">€{selected.revenue.toLocaleString()}</p></div>
              </div>
              {selected.lastOrderAt && <p className="text-xs text-muted-foreground">{t("admin.lastOrder")}: {selected.lastOrderAt}</p>}
              {selected.notes && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-3"><p className="text-xs font-medium text-warning">{t("admin.notes")}</p><p className="text-xs text-muted-foreground mt-1">{selected.notes}</p></div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => toggleStatus(selected.id)}>{selected.isActive ? t("admin.block") : t("admin.activate")}</Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelected(null)}>{t("admin.close")}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Partner Integration Settings ─── */
function AdminIntegrations() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState(MOCK_INTEGRATION_SETTINGS);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<PartnerIntegrationSettings | null>(null);

  const approvalLabel = (m: ApprovalMode) => m === "auto" ? t("admin.approvalAuto") : m === "admin" ? t("admin.approvalAdmin") : t("admin.approvalProvider");
  const postingLabel = (m: PostingMode) => m === "api" ? "API" : m === "email" ? "Email" : "Manual";
  const approvalColor = (m: ApprovalMode) => m === "auto" ? "bg-success/10 text-success" : m === "admin" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent";

  const openEdit = (item: PartnerIntegrationSettings) => { setEditItem({ ...item }); setEditOpen(true); };
  const handleSave = () => {
    if (!editItem) return;
    setSettings(prev => prev.map(s => s.id === editItem.id ? editItem : s));
    setEditOpen(false);
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("admin.integrationTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("admin.integrationDesc")}</p>

      <div className="mt-6 space-y-3">
        {settings.map(s => (
          <div key={s.id} className={`rounded-xl border p-4 transition-colors ${s.isActive ? "border-border" : "border-border bg-muted/30"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary"><Link2 className="h-5 w-5 text-muted-foreground" /></div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{s.supplierName}</span>
                    {!s.isActive && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">{t("admin.inactive")}</span>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${approvalColor(s.approvalMode)}`}>{approvalLabel(s.approvalMode)}</span>
                    <span>→ {postingLabel(s.postingMode)}</span>
                    <span className="text-muted-foreground/50">({t("admin.fallbackMode")}: {postingLabel(s.fallbackPostingMode)})</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {s.lastTestResult && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${s.lastTestResult === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                    {s.lastTestResult === "success" ? "✓ OK" : "✗ Fail"}
                  </span>
                )}
                <Button variant="outline" size="sm" onClick={() => openEdit(s)}><Edit className="h-3.5 w-3.5 mr-1" /> {t("admin.edit")}</Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem?.supplierName} — {t("admin.integrationSettings")}</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.approvalMode")}</label>
                <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.approvalMode} onChange={e => setEditItem({ ...editItem, approvalMode: e.target.value as ApprovalMode })}>
                  <option value="auto">{t("admin.approvalAuto")}</option>
                  <option value="admin">{t("admin.approvalAdmin")}</option>
                  <option value="provider">{t("admin.approvalProvider")}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.postingMode")}</label>
                  <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.postingMode} onChange={e => setEditItem({ ...editItem, postingMode: e.target.value as PostingMode })}>
                    <option value="api">API</option><option value="email">Email</option><option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.fallbackMode")}</label>
                  <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.fallbackPostingMode} onChange={e => setEditItem({ ...editItem, fallbackPostingMode: e.target.value as PostingMode })}>
                    <option value="api">API</option><option value="email">Email</option><option value="manual">Manual</option>
                  </select>
                </div>
              </div>
              {(editItem.postingMode === "api" || editItem.fallbackPostingMode === "api") && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.apiEndpoint")}</label>
                  <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono" value={editItem.apiEndpoint || ""} onChange={e => setEditItem({ ...editItem, apiEndpoint: e.target.value })} placeholder="https://api.partner.ee/v1/orders" />
                </div>
              )}
              {(editItem.postingMode === "api" || editItem.fallbackPostingMode === "api") && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.apiAuth")}</label>
                  <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono" value={editItem.apiAuthPlaceholder || ""} onChange={e => setEditItem({ ...editItem, apiAuthPlaceholder: e.target.value })} placeholder="Bearer sk_live_***" />
                </div>
              )}
              {(editItem.postingMode === "email" || editItem.fallbackPostingMode === "email") && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.recipientEmail")}</label>
                  <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.recipientEmail || ""} onChange={e => setEditItem({ ...editItem, recipientEmail: e.target.value })} placeholder="orders@partner.ee" />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.mappingProfile")}</label>
                <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.mappingProfile || ""} onChange={e => setEditItem({ ...editItem, mappingProfile: e.target.value })} placeholder="default" />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-sm font-medium">{t("admin.active")}</span>
                <button type="button" role="switch" aria-checked={editItem.isActive} onClick={() => setEditItem({ ...editItem, isActive: !editItem.isActive })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${editItem.isActive ? "bg-accent" : "bg-muted"}`}>
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${editItem.isActive ? "translate-x-[1.3rem]" : "translate-x-0.5"} mt-0.5`} />
                </button>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>{t("admin.cancel")}</Button>
                <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90"><Save className="mr-2 h-4 w-4" /> {t("admin.save")}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Order Routing Rules ─── */
function AdminRouting() {
  const { t } = useLanguage();
  const [rules, setRules] = useState(MOCK_ROUTING_RULES);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<OrderRoutingRule | null>(null);
  const [isNew, setIsNew] = useState(false);

  const openNew = () => {
    setEditItem({ id: `rule-${Date.now()}`, name: "", requiresApproval: true, approverRole: "admin", postingChannel: "email", priority: rules.length + 1, isActive: true });
    setIsNew(true); setEditOpen(true);
  };
  const openEdit = (r: OrderRoutingRule) => { setEditItem({ ...r }); setIsNew(false); setEditOpen(true); };
  const handleSave = () => {
    if (!editItem) return;
    if (isNew) setRules(prev => [...prev, editItem]);
    else setRules(prev => prev.map(r => r.id === editItem.id ? editItem : r));
    setEditOpen(false);
  };
  const toggleActive = (id: string) => setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{t("admin.routingTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.routingDesc")}</p>
        </div>
        <Button onClick={openNew} className="bg-accent text-accent-foreground hover:bg-accent/90"><PlusCircle className="mr-2 h-4 w-4" /> {t("admin.addRule")}</Button>
      </div>
      <div className="mt-6 space-y-3">
        {rules.sort((a, b) => a.priority - b.priority).map(r => (
          <div key={r.id} className={`rounded-xl border p-4 transition-colors ${r.isActive ? "border-border" : "border-border bg-muted/30 opacity-60"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-muted-foreground">#{r.priority}</div>
                <div>
                  <div className="text-sm font-semibold">{r.name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px]">
                    {r.serviceType && <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground">{r.serviceType === "warehouse" ? t("admin.warehouseType") : r.serviceType === "moving" ? t("admin.movingType") : t("admin.trailerType")}</span>}
                    {r.customerType && <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground">{r.customerType === "private" ? t("admin.private") : t("admin.business")}</span>}
                    {r.priceThreshold && <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground">≥ €{r.priceThreshold}</span>}
                    <span className={`rounded-full px-2 py-0.5 font-medium ${r.requiresApproval ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                      {r.requiresApproval ? `${t("admin.requiresApproval")}: ${r.approverRole}` : t("admin.approvalAuto")}
                    </span>
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 font-medium text-accent">→ {r.postingChannel.toUpperCase()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(r.id)} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${r.isActive ? "bg-accent" : "bg-muted"}`}>
                  <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${r.isActive ? "translate-x-[1rem]" : "translate-x-0.5"} mt-0.5`} />
                </button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Edit className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{isNew ? t("admin.addRule") : t("admin.edit")}</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div><label className="text-xs font-medium text-muted-foreground">{t("admin.ruleName")}</label><input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.serviceType")}</label>
                  <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.serviceType || ""} onChange={e => setEditItem({ ...editItem, serviceType: (e.target.value || undefined) as any })}>
                    <option value="">{t("admin.allTypes")}</option><option value="warehouse">{t("admin.warehouseType")}</option><option value="moving">{t("admin.movingType")}</option><option value="trailer">{t("admin.trailerType")}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.customerType")}</label>
                  <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.customerType || ""} onChange={e => setEditItem({ ...editItem, customerType: (e.target.value || undefined) as any })}>
                    <option value="">{t("admin.allTypes")}</option><option value="private">{t("admin.private")}</option><option value="business">{t("admin.business")}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.priceThreshold")} (€)</label>
                <input type="number" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.priceThreshold || ""} onChange={e => setEditItem({ ...editItem, priceThreshold: Number(e.target.value) || undefined })} placeholder="500" />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-sm font-medium">{t("admin.requiresApproval")}</span>
                <button type="button" role="switch" aria-checked={editItem.requiresApproval} onClick={() => setEditItem({ ...editItem, requiresApproval: !editItem.requiresApproval })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${editItem.requiresApproval ? "bg-accent" : "bg-muted"}`}>
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${editItem.requiresApproval ? "translate-x-[1.3rem]" : "translate-x-0.5"} mt-0.5`} />
                </button>
              </div>
              {editItem.requiresApproval && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.approverRole")}</label>
                  <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.approverRole} onChange={e => setEditItem({ ...editItem, approverRole: e.target.value as "admin" | "provider" })}>
                    <option value="admin">{t("admin.title")}</option><option value="provider">{t("admin.provider")}</option>
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.postingChannel")}</label>
                  <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.postingChannel} onChange={e => setEditItem({ ...editItem, postingChannel: e.target.value as PostingMode })}>
                    <option value="api">API</option><option value="email">Email</option><option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.priority")}</label>
                  <input type="number" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.priority} onChange={e => setEditItem({ ...editItem, priority: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>{t("admin.cancel")}</Button>
                <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90"><Save className="mr-2 h-4 w-4" /> {t("admin.save")}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Listings ─── */
function AdminListings() {
  const { t } = useLanguage();
  const [listings, setListings] = useState(initialListings);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<typeof initialListings[0] | null>(null);
  const [isNew, setIsNew] = useState(false);

  const openNew = () => { setEditItem({ id: `new-${Date.now()}`, title: "", type: "warehouse", status: "active", views: 0, inquiries: 0, price: 0, city: "" }); setIsNew(true); setEditOpen(true); };
  const openEdit = (item: typeof initialListings[0]) => { setEditItem({ ...item }); setIsNew(false); setEditOpen(true); };
  const handleSave = () => { if (!editItem) return; if (isNew) setListings(prev => [...prev, editItem]); else setListings(prev => prev.map(l => l.id === editItem.id ? editItem : l)); setEditOpen(false); };
  const handleDelete = (id: string) => setListings(prev => prev.filter(l => l.id !== id));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl sm:text-2xl font-bold">{t("admin.listings")}</h1>
        <Button onClick={openNew} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90"><PlusCircle className="mr-1 h-3.5 w-3.5" /> {t("admin.addListing")}</Button>
      </div>
      {/* Mobile cards */}
      <div className="mt-4 space-y-2 sm:hidden">
        {listings.map(l => {
          const Icon = typeIcons[l.type] || Warehouse;
          return (
            <div key={l.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium truncate">{l.title}</span>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${l.status === "active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{l.status === "active" ? t("admin.active") : t("admin.paused")}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>{l.city} · {l.price}€ · {l.views} vaatamist</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(l)} className="rounded p-1 hover:bg-secondary"><Edit className="h-3.5 w-3.5 text-muted-foreground" /></button>
                  <button onClick={() => handleDelete(l.id)} className="rounded p-1 hover:bg-secondary"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Desktop table */}
      <div className="mt-6 hidden rounded-xl border border-border sm:block">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.title_field")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.type")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.city")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.price")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.status")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.views")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {listings.map(l => {
              const Icon = typeIcons[l.type] || Warehouse;
              return (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{l.title}</td>
                  <td className="px-4 py-3"><Icon className="h-4 w-4 text-muted-foreground" /></td>
                  <td className="px-4 py-3 text-muted-foreground">{l.city}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.price}€</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${l.status === "active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{l.status === "active" ? t("admin.active") : t("admin.paused")}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{l.views}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(l)} className="rounded p-1 hover:bg-secondary"><Edit className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      <button onClick={() => handleDelete(l.id)} className="rounded p-1 hover:bg-secondary"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{isNew ? t("admin.addNewListing") : t("admin.editListing")}</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div><label className="text-xs font-medium text-muted-foreground">{t("admin.title_field")}</label><input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" value={editItem.title} onChange={e => setEditItem({ ...editItem, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-muted-foreground">{t("admin.type")}</label><select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.type} onChange={e => setEditItem({ ...editItem, type: e.target.value })}><option value="warehouse">{t("admin.warehouseType")}</option><option value="moving">{t("admin.movingType")}</option><option value="trailer">{t("admin.trailerType")}</option></select></div>
                <div><label className="text-xs font-medium text-muted-foreground">{t("admin.city")}</label><input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.city} onChange={e => setEditItem({ ...editItem, city: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-muted-foreground">{t("admin.price")} (€)</label><input type="number" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.price} onChange={e => setEditItem({ ...editItem, price: Number(e.target.value) })} /></div>
                <div><label className="text-xs font-medium text-muted-foreground">{t("admin.status")}</label><select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.status} onChange={e => setEditItem({ ...editItem, status: e.target.value })}><option value="active">{t("admin.active")}</option><option value="paused">{t("admin.paused")}</option></select></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>{t("admin.cancel")}</Button>
                <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90"><Save className="mr-2 h-4 w-4" /> {t("admin.save")}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Inquiries ─── */
function AdminInquiries() {
  const { t } = useLanguage();
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<typeof initialInquiries[0] | null>(null);

  const openView = (inq: typeof initialInquiries[0]) => { setViewItem({ ...inq }); setViewOpen(true); };
  const updateStatus = (id: number, status: string) => { setInquiries(prev => prev.map(i => i.id === id ? { ...i, status } : i)); if (viewItem?.id === id) setViewItem(prev => prev ? { ...prev, status } : prev); };
  const statusLabel = (s: string) => s === "new" ? t("admin.new") : s === "answered" ? t("admin.answered") : t("admin.closed");

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("admin.inquiries")}</h1>
      {/* Mobile cards */}
      <div className="mt-4 space-y-2 sm:hidden">
        {inquiries.map(inq => (
          <button key={inq.id} onClick={() => openView(inq)} className="w-full rounded-xl border border-border p-3 text-left hover:bg-secondary/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{inq.customer}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inq.status === "new" ? "bg-accent/10 text-accent" : inq.status === "answered" ? "bg-info/10 text-info" : "bg-muted text-muted-foreground"}`}>{statusLabel(inq.status)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{inq.listing} · {inq.date}</p>
          </button>
        ))}
      </div>
      {/* Desktop table */}
      <div className="mt-6 hidden rounded-xl border border-border sm:block">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.client")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.email")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.listing")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.date")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.status")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.map(inq => (
              <tr key={inq.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{inq.customer}</td>
                <td className="px-4 py-3 text-muted-foreground">{inq.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{inq.listing}</td>
                <td className="px-4 py-3 text-muted-foreground">{inq.date}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inq.status === "new" ? "bg-accent/10 text-accent" : inq.status === "answered" ? "bg-info/10 text-info" : "bg-muted text-muted-foreground"}`}>{statusLabel(inq.status)}</span></td>
                <td className="px-4 py-3"><Button variant="outline" size="sm" onClick={() => openView(inq)}>{t("admin.view")}</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("admin.inquiryDetails")}</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-xs text-muted-foreground">{t("admin.client")}</span><p className="font-medium">{viewItem.customer}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.email")}</span><p className="font-medium">{viewItem.email}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.listing")}</span><p className="font-medium">{viewItem.listing}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.date")}</span><p className="font-medium">{viewItem.date}</p></div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{t("admin.status")}</span>
                <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={viewItem.status} onChange={e => updateStatus(viewItem.id, e.target.value)}>
                  <option value="new">{t("admin.new")}</option><option value="answered">{t("admin.answered")}</option><option value="closed">{t("admin.closed")}</option>
                </select>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{t("admin.notesField")}</span>
                <textarea className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" rows={3} value={viewItem.notes} onChange={e => setViewItem({ ...viewItem, notes: e.target.value })} />
              </div>
              <div className="flex justify-end"><Button onClick={() => setViewOpen(false)} className="bg-accent text-accent-foreground hover:bg-accent/90">{t("admin.close")}</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Users ─── */
function AdminUsers() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<ServiceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<ServiceUser | null>(null);
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { userService.getAll().then(data => { setUsers(data); setLoading(false); }); }, []);

  const filtered = users.filter(u => {
    if (filterRole !== "all" && u.role !== filterRole) return false;
    if (filterStatus !== "all" && u.status !== filterStatus) return false;
    if (searchQuery && !u.name.toLowerCase().includes(searchQuery.toLowerCase()) && !u.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const toggleStatus = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === "active" ? "blocked" as const : "active" as const } : u));
    if (selectedUser?.id === id) setSelectedUser(prev => prev ? { ...prev, status: prev.status === "active" ? "blocked" as const : "active" as const } : prev);
  };

  const roleLabel = (r: string) => r === "customer" ? t("admin.customer") : r === "provider" ? t("admin.provider") : r === "admin" ? t("admin.title") : t("admin.guest");

  if (loading) return <div className="flex items-center justify-center py-20"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("admin.users")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{users.length} {t("admin.usersTotal")}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t("admin.searchUsers")} className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm" />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <option value="all">{t("admin.allRoles")}</option><option value="customer">{t("admin.customer")}</option><option value="provider">{t("admin.provider")}</option><option value="admin">{t("admin.title")}</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <option value="all">{t("admin.allStatuses")}</option><option value="active">{t("admin.active")}</option><option value="blocked">{t("admin.blocked")}</option>
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} {t("admin.usersFound")}</span>
      </div>
      {/* Mobile cards */}
      <div className="mt-4 space-y-2 md:hidden">
        {filtered.map(u => (
          <button key={u.id} onClick={() => setSelectedUser(u)} className="w-full rounded-xl border border-border p-3 text-left hover:bg-secondary/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{u.name.split(" ").map(n => n[0]).join("")}</div>
                <div className="min-w-0"><p className="text-sm font-medium truncate">{u.name}</p><p className="text-[10px] text-muted-foreground truncate">{u.email}</p></div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${u.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{u.status === "active" ? t("admin.active") : t("admin.blocked")}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${u.role === "admin" ? "bg-primary/10 text-primary" : u.role === "provider" ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"}`}>{roleLabel(u.role)}</span>
              <span className="text-[10px] text-muted-foreground">{u.bookingsCount} bron.</span>
            </div>
          </button>
        ))}
      </div>
      {/* Desktop table */}
      <div className="mt-4 hidden rounded-xl border border-border md:block">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.name")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.email")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.role")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.registered")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.lastLogin")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.bookings")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.status")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{u.name.split(" ").map(n => n[0]).join("")}</div>
                    <div><div className="font-medium">{u.name}</div>{u.company && <div className="text-[10px] text-muted-foreground">{u.company}</div>}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.role === "admin" ? "bg-primary/10 text-primary" : u.role === "provider" ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"}`}>{roleLabel(u.role)}</span></td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{u.registeredAt}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{u.lastLoginAt || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.bookingsCount}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{u.status === "active" ? t("admin.active") : t("admin.blocked")}</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSelectedUser(u)}><Eye className="h-3 w-3 mr-1" />{t("admin.view")}</Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => toggleStatus(u.id)}>
                      {u.status === "active" ? <><Shield className="h-3 w-3 mr-1" />{t("admin.block")}</> : <><CheckCircle className="h-3 w-3 mr-1" />{t("admin.activate")}</>}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      <Dialog open={!!selectedUser} onOpenChange={o => !o && setSelectedUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("admin.userProfile")}</DialogTitle></DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary font-display text-xl font-bold">{selectedUser.name.split(" ").map(n => n[0]).join("")}</div>
                <div><p className="font-semibold">{selectedUser.name}</p><p className="text-sm text-muted-foreground">{selectedUser.email}</p>{selectedUser.company && <p className="text-xs text-accent">{selectedUser.company}</p>}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">{t("admin.role")}</p><p className="text-sm font-medium">{roleLabel(selectedUser.role)}</p></div>
                <div className="rounded-lg bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">{t("admin.status")}</p><p className={`text-sm font-medium ${selectedUser.status === "active" ? "text-success" : "text-destructive"}`}>{selectedUser.status === "active" ? t("admin.active") : t("admin.blocked")}</p></div>
                <div className="rounded-lg bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">{t("admin.registered")}</p><p className="text-sm font-medium">{selectedUser.registeredAt}</p></div>
                <div className="rounded-lg bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">{t("admin.lastLogin")}</p><p className="text-sm font-medium">{selectedUser.lastLoginAt || "—"}</p></div>
                {selectedUser.phone && <div className="rounded-lg bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">{t("admin.phone")}</p><p className="text-sm font-medium">{selectedUser.phone}</p></div>}
                <div className="rounded-lg bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">{t("admin.bookings")}</p><p className="text-sm font-medium">{selectedUser.bookingsCount}</p></div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => toggleStatus(selectedUser.id)}>{selectedUser.status === "active" ? t("admin.blockUser") : t("admin.activateUser")}</Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedUser(null)}>{t("admin.close")}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Audit Log ─── */
function AdminAudit() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { auditService.getAll().then(data => { setLogs(data); setLoading(false); }); }, []);

  const actionColor = (a: string) => {
    if (a.includes("confirmed") || a.includes("activated")) return "bg-success/10 text-success";
    if (a.includes("rejected") || a.includes("blocked") || a.includes("deactivated")) return "bg-destructive/10 text-destructive";
    if (a.includes("sent")) return "bg-info/10 text-info";
    return "bg-secondary text-muted-foreground";
  };

  if (loading) return <div className="flex items-center justify-center py-20"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("admin.auditTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("admin.auditDesc")}</p>
      <div className="mt-6 space-y-2">
        {logs.map(log => (
          <div key={log.id} className="flex items-start gap-3 rounded-xl border border-border p-4">
            <div className="mt-0.5"><Activity className="h-4 w-4 text-muted-foreground" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium font-mono ${actionColor(log.action)}`}>{log.action}</span>
                <span className="text-xs text-muted-foreground">→</span>
                <span className="text-xs font-medium">{log.target}</span>
              </div>
              {log.detail && <p className="mt-1 text-xs text-muted-foreground">{log.detail}</p>}
              <p className="mt-1 text-[10px] text-muted-foreground">{log.actor} · {log.createdAt}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Content ─── */
function AdminContent() {
  const { t } = useLanguage();
  const [editOpen, setEditOpen] = useState(false);
  const [editSection, setEditSection] = useState("");
  const [contentValues, setContentValues] = useState<Record<string, string>>({
    "Homepage hero": "Leia laopinda, kolimist ja logistikat ühest kohast",
    "FAQ": "Kuidas Ruumly töötab?\nKas broneerimine on tasuta?\nKuidas ma saan pakkujaks?",
    "Categories": "Laopinnad, Kolimine, Haagise rent",
    "Footer": "© 2026 Ruumly. Kõik õigused kaitstud.",
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("admin.contentManagement")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("admin.contentDesc")}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {Object.keys(contentValues).map(item => (
          <div key={item} className="card-elevated flex items-center justify-between p-4">
            <span className="text-sm font-medium">{item}</span>
            <Button variant="outline" size="sm" onClick={() => { setEditSection(item); setEditOpen(true); }}>{t("admin.edit")}</Button>
          </div>
        ))}
      </div>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("admin.edit")}: {editSection}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <textarea className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" rows={6} value={contentValues[editSection] || ""} onChange={e => setContentValues({ ...contentValues, [editSection]: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>{t("admin.cancel")}</Button>
              <Button onClick={() => setEditOpen(false)} className="bg-accent text-accent-foreground hover:bg-accent/90"><Save className="mr-2 h-4 w-4" /> {t("admin.save")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Settings ─── */
function AdminSettings() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState({
    siteName: "Ruumly", siteEmail: "info@ruumly.eu", sitePhone: "+372 5555 1234",
    defaultLanguage: "et", currency: "EUR", commissionRate: "10",
    emailNotifications: true, maintenanceMode: false, autoApproveListings: false,
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("admin.settingsTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("admin.settingsDesc")}</p>
      <div className="mt-6 space-y-6">
        <div className="rounded-xl border border-border p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold"><Globe className="h-4 w-4 text-accent" /> {t("admin.generalSettings")}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><label className="text-xs font-medium text-muted-foreground">{t("admin.siteName")}</label><input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={settings.siteName} onChange={e => setSettings({ ...settings, siteName: e.target.value })} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">{t("admin.email")}</label><input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={settings.siteEmail} onChange={e => setSettings({ ...settings, siteEmail: e.target.value })} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">{t("admin.phone")}</label><input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={settings.sitePhone} onChange={e => setSettings({ ...settings, sitePhone: e.target.value })} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">{t("admin.defaultLanguage")}</label><select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={settings.defaultLanguage} onChange={e => setSettings({ ...settings, defaultLanguage: e.target.value })}><option value="et">Eesti</option><option value="en">English</option><option value="ru">Русский</option></select></div>
          </div>
        </div>
        <div className="rounded-xl border border-border p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold"><CreditCard className="h-4 w-4 text-accent" /> {t("admin.businessSettings")}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><label className="text-xs font-medium text-muted-foreground">{t("admin.currency")}</label><input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={settings.currency} onChange={e => setSettings({ ...settings, currency: e.target.value })} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">{t("admin.commission")}</label><input type="number" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={settings.commissionRate} onChange={e => setSettings({ ...settings, commissionRate: e.target.value })} /></div>
          </div>
        </div>
        <div className="rounded-xl border border-border p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold"><ToggleLeft className="h-4 w-4 text-accent" /> {t("admin.toggles")}</h3>
          <div className="mt-4 space-y-3">
            {([
              { key: "emailNotifications" as const, label: t("admin.emailNotifications"), desc: t("admin.emailNotificationsDesc") },
              { key: "maintenanceMode" as const, label: t("admin.maintenanceMode"), desc: t("admin.maintenanceModeDesc") },
              { key: "autoApproveListings" as const, label: t("admin.autoApprove"), desc: t("admin.autoApproveDesc") },
            ]).map(toggle => (
              <div key={toggle.key} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div><div className="text-sm font-medium">{toggle.label}</div><div className="text-xs text-muted-foreground">{toggle.desc}</div></div>
                <button type="button" role="switch" aria-checked={settings[toggle.key]} onClick={() => setSettings(prev => ({ ...prev, [toggle.key]: !prev[toggle.key] }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${settings[toggle.key] ? "bg-accent" : "bg-muted"}`}>
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${settings[toggle.key] ? "translate-x-[1.3rem]" : "translate-x-0.5"} mt-0.5`} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end"><Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Save className="mr-2 h-4 w-4" /> {t("admin.saveSettings")}</Button></div>
      </div>
    </div>
  );
}
