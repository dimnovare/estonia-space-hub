import { useState } from "react";
import { Warehouse, Truck, CarFront, Edit, Trash2, PlusCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { initialListings } from "./AdminDashboard";

const typeIcons: Record<string, typeof Warehouse> = { warehouse: Warehouse, moving: Truck, trailer: CarFront };

export default function AdminListings() {
  const { t } = useLanguage();
  const [listings, setListings] = useState(initialListings);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [isNew, setIsNew] = useState(false);

  const openNew = () => { setEditItem({ id: "", title: "", type: "warehouse", status: "active", views: 0, inquiries: 0, price: 0, city: "" }); setIsNew(true); setEditOpen(true); };
  const openEdit = (l: any) => { setEditItem({ ...l }); setIsNew(false); setEditOpen(true); };
  const handleSave = () => { if (!editItem) return; if (isNew) setListings(prev => [...prev, { ...editItem, id: `l${Date.now()}` }]); else setListings(prev => prev.map(l => l.id === editItem.id ? editItem : l)); setEditOpen(false); };
  const handleDelete = (id: string) => setListings(prev => prev.filter(l => l.id !== id));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{t("admin.listings")}</h1>
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
