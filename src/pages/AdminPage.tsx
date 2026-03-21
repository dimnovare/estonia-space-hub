import { useState } from "react";
import {
  LayoutDashboard, List, MessageSquare, Settings, Users, FileText,
  TrendingUp, Eye, DollarSign, PlusCircle, Edit, Trash2, Warehouse, Truck, CarFront,
  X, Save, ChevronDown, Mail, Phone, Calendar, Shield, Globe, Bell, CreditCard, ToggleLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const sidebarLinks = [
  { id: "dashboard", label: "Ülevaade", icon: LayoutDashboard },
  { id: "listings", label: "Kuulutused", icon: List },
  { id: "inquiries", label: "Päringud", icon: MessageSquare },
  { id: "users", label: "Kasutajad", icon: Users },
  { id: "content", label: "Sisu", icon: FileText },
  { id: "settings", label: "Seaded", icon: Settings },
];

const stats = [
  { label: "Kuulutusi", value: "156", change: "+12%", icon: Eye },
  { label: "Päringuid", value: "342", change: "+24%", icon: MessageSquare },
  { label: "Kasutajaid", value: "2,847", change: "+8%", icon: Users },
  { label: "Tulu", value: "€4,230", change: "+18%", icon: DollarSign },
];

const initialInquiries = [
  { id: 1, customer: "Andres Tamm", email: "andres@email.com", listing: "Laobox Tallinn", type: "warehouse", date: "2026-03-20", status: "Uus", notes: "" },
  { id: 2, customer: "Kati Mets", email: "kati@email.com", listing: "KoliExpress", type: "moving", date: "2026-03-19", status: "Vastatud", notes: "Klient soovib lisainfot" },
  { id: 3, customer: "Jüri Kask", email: "jyri@email.com", listing: "HaagisRent", type: "trailer", date: "2026-03-18", status: "Lõpetatud", notes: "" },
  { id: 4, customer: "Maria Saar", email: "maria@email.com", listing: "MiniLadu Tartu", type: "warehouse", date: "2026-03-17", status: "Uus", notes: "" },
];

const initialListings = [
  { id: "w1", title: "Laobox Tallinn Kesklinn", type: "warehouse", status: "Aktiivne", views: 234, inquiries: 18, price: 49, city: "Tallinn" },
  { id: "w2", title: "MiniLadu Tartu", type: "warehouse", status: "Aktiivne", views: 156, inquiries: 8, price: 29, city: "Tartu" },
  { id: "m1", title: "KoliExpress", type: "moving", status: "Aktiivne", views: 312, inquiries: 24, price: 45, city: "Tallinn" },
  { id: "t1", title: "HaagisRent Tallinn", type: "trailer", status: "Peatatud", views: 89, inquiries: 5, price: 25, city: "Tallinn" },
];

const initialUsers = [
  { id: 1, name: "Andres Tamm", email: "andres@email.com", role: "Klient", registered: "2025-11-05", bookings: 3, status: "Aktiivne" },
  { id: 2, name: "Kati Mets", email: "kati@email.com", role: "Klient", registered: "2025-12-12", bookings: 1, status: "Aktiivne" },
  { id: 3, name: "Jüri Kask", email: "jyri@email.com", role: "Klient", registered: "2026-01-08", bookings: 5, status: "Aktiivne" },
  { id: 4, name: "Maria Saar", email: "maria@email.com", role: "Pakkuja", registered: "2025-10-20", bookings: 0, status: "Aktiivne" },
  { id: 5, name: "Peeter Kuusk", email: "peeter@email.com", role: "Admin", registered: "2025-09-01", bookings: 0, status: "Aktiivne" },
  { id: 6, name: "Liina Rebane", email: "liina@email.com", role: "Klient", registered: "2026-02-14", bookings: 2, status: "Blokeeritud" },
];

const typeIcons: Record<string, typeof Warehouse> = { warehouse: Warehouse, moving: Truck, trailer: CarFront };

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-card lg:block">
        <div className="p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin</h2>
        </div>
        <nav className="space-y-0.5 px-2">
          {sidebarLinks.map((l) => {
            const Icon = l.icon;
            const active = activeTab === l.id;
            return (
              <button
                key={l.id}
                onClick={() => setActiveTab(l.id)}
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

/* ─── Dashboard ─── */
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
            {initialInquiries.map((inq) => (
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Listings ─── */
function AdminListings() {
  const [listings, setListings] = useState(initialListings);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<typeof initialListings[0] | null>(null);
  const [isNew, setIsNew] = useState(false);

  const openNew = () => {
    setEditItem({ id: `new-${Date.now()}`, title: "", type: "warehouse", status: "Aktiivne", views: 0, inquiries: 0, price: 0, city: "" });
    setIsNew(true);
    setEditOpen(true);
  };

  const openEdit = (item: typeof initialListings[0]) => {
    setEditItem({ ...item });
    setIsNew(false);
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!editItem) return;
    if (isNew) {
      setListings((prev) => [...prev, editItem]);
    } else {
      setListings((prev) => prev.map((l) => (l.id === editItem.id ? editItem : l)));
    }
    setEditOpen(false);
  };

  const handleDelete = (id: string) => {
    setListings((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Kuulutused</h1>
        <Button onClick={openNew} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <PlusCircle className="mr-2 h-4 w-4" /> Lisa kuulutus
        </Button>
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pealkiri</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tüüp</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Linn</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Hind</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Staatus</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vaatamisi</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Toimingud</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => {
              const Icon = typeIcons[l.type] || Warehouse;
              return (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{l.title}</td>
                  <td className="px-4 py-3"><Icon className="h-4 w-4 text-muted-foreground" /></td>
                  <td className="px-4 py-3 text-muted-foreground">{l.city}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.price}€</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      l.status === "Aktiivne" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                    }`}>{l.status}</span>
                  </td>
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

      {/* Edit / Add dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNew ? "Lisa uus kuulutus" : "Muuda kuulutust"}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Pealkiri</label>
                <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  value={editItem.title} onChange={(e) => setEditItem({ ...editItem, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Tüüp</label>
                  <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    value={editItem.type} onChange={(e) => setEditItem({ ...editItem, type: e.target.value })}>
                    <option value="warehouse">Laopind</option>
                    <option value="moving">Kolimine</option>
                    <option value="trailer">Haagise rent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Linn</label>
                  <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    value={editItem.city} onChange={(e) => setEditItem({ ...editItem, city: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Hind (€)</label>
                  <input type="number" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    value={editItem.price} onChange={(e) => setEditItem({ ...editItem, price: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Staatus</label>
                  <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    value={editItem.status} onChange={(e) => setEditItem({ ...editItem, status: e.target.value })}>
                    <option value="Aktiivne">Aktiivne</option>
                    <option value="Peatatud">Peatatud</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Tühista</Button>
                <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Save className="mr-2 h-4 w-4" /> Salvesta
                </Button>
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
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<typeof initialInquiries[0] | null>(null);

  const openView = (inq: typeof initialInquiries[0]) => {
    setViewItem({ ...inq });
    setViewOpen(true);
  };

  const updateStatus = (id: number, status: string) => {
    setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    if (viewItem?.id === id) setViewItem((prev) => prev ? { ...prev, status } : prev);
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Päringud</h1>
      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Klient</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">E-post</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kuulutus</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kuupäev</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Staatus</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Toimingud</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.map((inq) => (
              <tr key={inq.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{inq.customer}</td>
                <td className="px-4 py-3 text-muted-foreground">{inq.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{inq.listing}</td>
                <td className="px-4 py-3 text-muted-foreground">{inq.date}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    inq.status === "Uus" ? "bg-accent/10 text-accent" :
                    inq.status === "Vastatud" ? "bg-info/10 text-info" : "bg-muted text-muted-foreground"
                  }`}>{inq.status}</span>
                </td>
                <td className="px-4 py-3">
                  <Button variant="outline" size="sm" onClick={() => openView(inq)}>Vaata</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Päringu detailid</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-xs text-muted-foreground">Klient</span><p className="font-medium">{viewItem.customer}</p></div>
                <div><span className="text-xs text-muted-foreground">E-post</span><p className="font-medium">{viewItem.email}</p></div>
                <div><span className="text-xs text-muted-foreground">Kuulutus</span><p className="font-medium">{viewItem.listing}</p></div>
                <div><span className="text-xs text-muted-foreground">Kuupäev</span><p className="font-medium">{viewItem.date}</p></div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Staatus</span>
                <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  value={viewItem.status} onChange={(e) => updateStatus(viewItem.id, e.target.value)}>
                  <option value="Uus">Uus</option>
                  <option value="Vastatud">Vastatud</option>
                  <option value="Lõpetatud">Lõpetatud</option>
                </select>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Märkmed</span>
                <textarea className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" rows={3}
                  value={viewItem.notes} onChange={(e) => setViewItem({ ...viewItem, notes: e.target.value })} placeholder="Lisa märkmed..." />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setViewOpen(false)} className="bg-accent text-accent-foreground hover:bg-accent/90">Sulge</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Users ─── */
function AdminUsers() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Kasutajad</h1>
      <p className="mt-2 text-sm text-muted-foreground">Halda kasutajaid ja teenusepakkujaid.</p>
      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nimi</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">E-post</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Roll</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Registreeritud</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Broneeringud</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Staatus</th>
            </tr>
          </thead>
          <tbody>
            {initialUsers.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.role === "Admin" ? "bg-primary/10 text-primary" :
                    u.role === "Pakkuja" ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
                  }`}>{u.role}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.registered}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.bookings}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.status === "Aktiivne" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  }`}>{u.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Content ─── */
function AdminContent() {
  const [editOpen, setEditOpen] = useState(false);
  const [editSection, setEditSection] = useState("");
  const [contentValues, setContentValues] = useState<Record<string, string>>({
    "Avalehe hero": "Leia laopinda, kolimist ja logistikat ühest kohast",
    "KKK küsimused": "Kuidas Ruumly töötab?\nKas broneerimine on tasuta?\nKuidas ma saan pakkujaks?",
    "Kategooriad": "Laopinnad, Kolimine, Haagise rent",
    "Jalus": "© 2026 Ruumly. Kõik õigused kaitstud.",
  });

  const openEdit = (section: string) => {
    setEditSection(section);
    setEditOpen(true);
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Sisu haldus</h1>
      <p className="mt-2 text-sm text-muted-foreground">Muutke avalehe sisu, kategooriaid ja KKK-d.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {Object.keys(contentValues).map((item) => (
          <div key={item} className="card-elevated flex items-center justify-between p-4">
            <span className="text-sm font-medium">{item}</span>
            <Button variant="outline" size="sm" onClick={() => openEdit(item)}>Muuda</Button>
          </div>
        ))}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Muuda: {editSection}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              rows={6}
              value={contentValues[editSection] || ""}
              onChange={(e) => setContentValues({ ...contentValues, [editSection]: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Tühista</Button>
              <Button onClick={() => setEditOpen(false)} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Save className="mr-2 h-4 w-4" /> Salvesta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Settings ─── */
function AdminSettings() {
  const [settings, setSettings] = useState({
    siteName: "Ruumly",
    siteEmail: "info@ruumly.eu",
    sitePhone: "+372 5555 1234",
    defaultLanguage: "et",
    currency: "EUR",
    commissionRate: "10",
    emailNotifications: true,
    maintenanceMode: false,
    autoApproveListings: false,
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Seaded</h1>
      <p className="mt-2 text-sm text-muted-foreground">Platvormi ja konto seaded.</p>

      <div className="mt-6 space-y-6">
        {/* General */}
        <div className="rounded-xl border border-border p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold"><Globe className="h-4 w-4 text-accent" /> Üldised seaded</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Saidi nimi</label>
              <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                value={settings.siteName} onChange={(e) => setSettings({ ...settings, siteName: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">E-post</label>
              <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                value={settings.siteEmail} onChange={(e) => setSettings({ ...settings, siteEmail: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Telefon</label>
              <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                value={settings.sitePhone} onChange={(e) => setSettings({ ...settings, sitePhone: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Vaikimisi keel</label>
              <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                value={settings.defaultLanguage} onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}>
                <option value="et">Eesti</option>
                <option value="en">English</option>
                <option value="ru">Русский</option>
              </select>
            </div>
          </div>
        </div>

        {/* Business */}
        <div className="rounded-xl border border-border p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold"><CreditCard className="h-4 w-4 text-accent" /> Äri seaded</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Valuuta</label>
              <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Komisjonitasu (%)</label>
              <input type="number" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                value={settings.commissionRate} onChange={(e) => setSettings({ ...settings, commissionRate: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="rounded-xl border border-border p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold"><ToggleLeft className="h-4 w-4 text-accent" /> Lülitid</h3>
          <div className="mt-4 space-y-3">
            {[
              { key: "emailNotifications" as const, label: "E-posti teavitused", desc: "Saada teavitusi uutest päringutest" },
              { key: "maintenanceMode" as const, label: "Hooldusrežiim", desc: "Lülita sait hooldusrežiimi" },
              { key: "autoApproveListings" as const, label: "Automaatne kinnitamine", desc: "Kinnita uued kuulutused automaatselt" },
            ].map((toggle) => (
              <div key={toggle.key} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <div className="text-sm font-medium">{toggle.label}</div>
                  <div className="text-xs text-muted-foreground">{toggle.desc}</div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, [toggle.key]: !settings[toggle.key] })}
                  className={`relative h-6 w-11 rounded-full transition-colors ${settings[toggle.key] ? "bg-accent" : "bg-muted"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${settings[toggle.key] ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Save className="mr-2 h-4 w-4" /> Salvesta seaded
          </Button>
        </div>
      </div>
    </div>
  );
}
