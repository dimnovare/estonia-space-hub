import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, List, PlusCircle, MessageSquare, Settings, Users, FileText, ChevronRight,
  TrendingUp, Eye, Clock, DollarSign, Search, MoreHorizontal, Edit, Trash2, Warehouse, Truck, CarFront,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const sidebarLinks = [
  { to: "/admin", label: "Ülevaade", icon: LayoutDashboard },
  { to: "/admin/listings", label: "Kuulutused", icon: List },
  { to: "/admin/inquiries", label: "Päringud", icon: MessageSquare },
  { to: "/admin/users", label: "Kasutajad", icon: Users },
  { to: "/admin/content", label: "Sisu", icon: FileText },
  { to: "/admin/settings", label: "Seaded", icon: Settings },
];

const stats = [
  { label: "Kuulutusi", value: "156", change: "+12%", icon: Eye },
  { label: "Päringuid", value: "342", change: "+24%", icon: MessageSquare },
  { label: "Kasutajaid", value: "2,847", change: "+8%", icon: Users },
  { label: "Tulu", value: "€4,230", change: "+18%", icon: DollarSign },
];

const recentInquiries = [
  { id: 1, customer: "Andres Tamm", listing: "Laobox Tallinn", type: "warehouse", date: "2026-03-20", status: "Uus" },
  { id: 2, customer: "Kati Mets", listing: "KoliExpress", type: "moving", date: "2026-03-19", status: "Vastatud" },
  { id: 3, customer: "Jüri Kask", listing: "HaagisRent", type: "trailer", date: "2026-03-18", status: "Lõpetatud" },
  { id: 4, customer: "Maria Saar", listing: "MiniLadu Tartu", type: "warehouse", date: "2026-03-17", status: "Uus" },
];

const listings = [
  { id: "w1", title: "Laobox Tallinn Kesklinn", type: "warehouse", status: "Aktiivne", views: 234, inquiries: 18 },
  { id: "w2", title: "MiniLadu Tartu", type: "warehouse", status: "Aktiivne", views: 156, inquiries: 8 },
  { id: "m1", title: "KoliExpress", type: "moving", status: "Aktiivne", views: 312, inquiries: 24 },
  { id: "t1", title: "HaagisRent Tallinn", type: "trailer", status: "Peatatud", views: 89, inquiries: 5 },
];

const typeIcons = { warehouse: Warehouse, moving: Truck, trailer: CarFront };

export default function AdminPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname.includes("listings")) return "listings";
    if (location.pathname.includes("inquiries")) return "inquiries";
    if (location.pathname.includes("users")) return "users";
    if (location.pathname.includes("content")) return "content";
    return "dashboard";
  });

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-border bg-card lg:block">
        <div className="p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin</h2>
        </div>
        <nav className="space-y-0.5 px-2">
          {sidebarLinks.map((l) => {
            const Icon = l.icon;
            const active = (activeTab === "dashboard" && l.to === "/admin") ||
              l.to.includes(activeTab);
            return (
              <button
                key={l.to}
                onClick={() => setActiveTab(l.to.replace("/admin/", "") || "dashboard")}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6">
        {activeTab === "dashboard" && <AdminDashboard />}
        {activeTab === "listings" && <AdminListings />}
        {activeTab === "inquiries" && <AdminInquiries />}
        {activeTab === "users" && <AdminUsers />}
        {activeTab === "content" && <AdminContent />}
        {activeTab === "settings" && <AdminSettings />}
      </main>
    </div>
  );
}

function AdminDashboard() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Ülevaade</h1>
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
              <div className="mt-1 flex items-center gap-1 text-xs text-success">
                <TrendingUp className="h-3 w-3" /> {s.change}
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mt-8 font-display text-lg font-semibold">Viimased päringud</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Klient</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kuulutus</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kuupäev</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Staatus</th>
            </tr>
          </thead>
          <tbody>
            {recentInquiries.map((inq) => (
              <tr key={inq.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{inq.customer}</td>
                <td className="px-4 py-3 text-muted-foreground">{inq.listing}</td>
                <td className="px-4 py-3 text-muted-foreground">{inq.date}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    inq.status === "Uus" ? "bg-accent/10 text-accent" :
                    inq.status === "Vastatud" ? "bg-info/10 text-info" : "bg-muted text-muted-foreground"
                  }`}>
                    {inq.status}
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

function AdminListings() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Kuulutused</h1>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
          <PlusCircle className="mr-2 h-4 w-4" /> Lisa kuulutus
        </Button>
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pealkiri</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tüüp</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Staatus</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vaatamisi</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Päringuid</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Toimingud</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => {
              const Icon = typeIcons[l.type as keyof typeof typeIcons];
              return (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{l.title}</td>
                  <td className="px-4 py-3"><Icon className="h-4 w-4 text-muted-foreground" /></td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      l.status === "Aktiivne" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                    }`}>{l.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{l.views}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.inquiries}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button className="rounded p-1 hover:bg-secondary"><Edit className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      <button className="rounded p-1 hover:bg-secondary"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminInquiries() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Päringud</h1>
      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Klient</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kuulutus</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kuupäev</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Staatus</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Toimingud</th>
            </tr>
          </thead>
          <tbody>
            {recentInquiries.map((inq) => (
              <tr key={inq.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{inq.customer}</td>
                <td className="px-4 py-3 text-muted-foreground">{inq.listing}</td>
                <td className="px-4 py-3 text-muted-foreground">{inq.date}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    inq.status === "Uus" ? "bg-accent/10 text-accent" :
                    inq.status === "Vastatud" ? "bg-info/10 text-info" : "bg-muted text-muted-foreground"
                  }`}>{inq.status}</span>
                </td>
                <td className="px-4 py-3">
                  <Button variant="outline" size="sm">Vaata</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminUsers() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Kasutajad</h1>
      <p className="mt-2 text-sm text-muted-foreground">Halda kasutajaid ja teenusepakkujaid.</p>
      <div className="mt-6 rounded-xl border border-border p-8 text-center text-muted-foreground">
        <Users className="mx-auto h-8 w-8" />
        <p className="mt-2 text-sm">Kasutajate haldus tulekul</p>
      </div>
    </div>
  );
}

function AdminContent() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Sisu haldus</h1>
      <p className="mt-2 text-sm text-muted-foreground">Muutke avalehe sisu, kategooriaid ja KKK-d.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {["Avalehe hero", "KKK küsimused", "Kategooriad", "Jalus"].map((item) => (
          <div key={item} className="card-elevated flex items-center justify-between p-4">
            <span className="text-sm font-medium">{item}</span>
            <Button variant="outline" size="sm">Muuda</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminSettings() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Seaded</h1>
      <p className="mt-2 text-sm text-muted-foreground">Platvormi ja konto seaded.</p>
      <div className="mt-6 rounded-xl border border-border p-8 text-center text-muted-foreground">
        <Settings className="mx-auto h-8 w-8" />
        <p className="mt-2 text-sm">Seaded tulekul</p>
      </div>
    </div>
  );
}
