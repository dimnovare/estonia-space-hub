import { Eye, Package, Users, DollarSign, TrendingUp } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { useUsers, useSuppliers } from "@/hooks/queries";
import { useLanguage } from "@/i18n/LanguageContext";

const initialListings = [
  { id: "w1", title: "Laobox Tallinn Kesklinn", type: "warehouse", status: "active", views: 234, inquiries: 18, price: 49, city: "Tallinn" },
  { id: "w2", title: "MiniLadu Tartu", type: "warehouse", status: "active", views: 156, inquiries: 8, price: 29, city: "Tartu" },
  { id: "m1", title: "KoliExpress", type: "moving", status: "active", views: 312, inquiries: 24, price: 45, city: "Tallinn" },
  { id: "t1", title: "HaagisRent Tallinn", type: "trailer", status: "paused", views: 89, inquiries: 5, price: 25, city: "Tallinn" },
];

const initialInquiries = [
  { id: 1, customer: "Andres Tamm", email: "andres@email.com", listing: "Laobox Tallinn", type: "warehouse", date: "2026-03-20", status: "new", notes: "" },
  { id: 2, customer: "Kati Mets", email: "kati@email.com", listing: "KoliExpress", type: "moving", date: "2026-03-19", status: "answered", notes: "Klient soovib lisainfot" },
  { id: 3, customer: "Jüri Kask", email: "jyri@email.com", listing: "HaagisRent", type: "trailer", date: "2026-03-18", status: "closed", notes: "" },
  { id: 4, customer: "Maria Saar", email: "maria@email.com", listing: "MiniLadu Tartu", type: "warehouse", date: "2026-03-17", status: "new", notes: "" },
];

export { initialListings, initialInquiries };

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { data: orders = [] } = useOrders();
  const { data: users = [] } = useUsers();
  const { data: suppliers = [] } = useSuppliers();

  const stats = [
    { label: t("admin.stats.listings"), value: initialListings.length.toString(), change: "+12%", icon: Eye },
    { label: t("admin.stats.orders"), value: orders.length.toString(), change: "+24%", icon: Package },
    { label: t("admin.stats.users"), value: users.length.toLocaleString(), change: "+8%", icon: Users },
    { label: t("admin.stats.revenue"), value: "€" + suppliers.reduce((s, sup) => s + sup.revenue, 0).toLocaleString(), change: "+18%", icon: DollarSign },
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
