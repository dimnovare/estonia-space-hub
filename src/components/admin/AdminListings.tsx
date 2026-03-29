import { useState } from "react";
import ImageUploader from "./ImageUploader";
import { Warehouse, Truck, CarFront, Edit, Trash2, PlusCircle, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { supplierService } from "@/services";
import { toast } from "sonner";
import AdminExtrasOverrides from "./AdminExtrasOverrides";

const typeIcons: Record<string, typeof Warehouse> = { warehouse: Warehouse, moving: Truck, trailer: CarFront };
const inp = "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

export default function AdminListings() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [isNew, setIsNew] = useState(false);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: () => apiClient.get<any[]>("/admin/listings"),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => supplierService.getAll(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
    queryClient.invalidateQueries({ queryKey: ["listings"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post("/admin/listings", data),
    onSuccess: () => { invalidate(); toast.success(t("toast.listingAdded")); setEditOpen(false); },
    onError: (err: any) => toast.error(err.message || t("toast.addFailed")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.patch(`/admin/listings/${id}`, data),
    onSuccess: () => { invalidate(); toast.success(t("toast.listingUpdated")); setEditOpen(false); },
    onError: (err: any) => toast.error(err.message || t("toast.updateFailed")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/listings/${id}`),
    onSuccess: () => { invalidate(); toast.success(t("toast.listingDeleted")); },
    onError: (err: any) => toast.error(err.message || t("toast.deleteFailed")),
  });

  const openNew = () => {
    setEditItem({
      title: "", type: "warehouse", city: "", address: "",
      price: 0, priceUnit: "€/kuu", status: "active",
      description: "", supplierId: suppliers[0]?.id ?? "",
      lat: null, lng: null,
      partnerDiscountRateOverride: null,
      clientDiscountRateOverride: null,
      vatRate: null, pricesIncludeVat: false,
      images: [],
    });
    setIsNew(true);
    setEditOpen(true);
  };

  const openEdit = (l: any) => {
    setEditItem({
      ...l,
      price: l.priceFrom ?? l.price ?? 0,
      status: l.isActive !== false ? "active" : "paused",
      images: l.images || [],
    });
    setIsNew(false);
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!editItem) return;

    const payload: Record<string, unknown> = {
      type: editItem.type,
      title: editItem.title,
      supplierId: editItem.supplierId || undefined,
      address: editItem.address || "",
      city: editItem.city || "",
      lat: editItem.lat ? Number(editItem.lat) : 0,
      lng: editItem.lng ? Number(editItem.lng) : 0,
      priceFrom: Number(editItem.price ?? editItem.priceFrom ?? 0),
      priceUnit: editItem.priceUnit || "€/kuu",
      availableNow: editItem.status === "active",
      description: editItem.description || "",
      partnerDiscountRateOverride: editItem.partnerDiscountRateOverride ?? null,
      clientDiscountRateOverride: editItem.clientDiscountRateOverride ?? null,
      vatRate: editItem.vatRate ?? null,
      pricesIncludeVat: editItem.pricesIncludeVat ?? false,
      images: editItem.images || [],
    };

    if (isNew) {
      createMutation.mutate(payload);
    } else {
      const updatePayload = {
        ...payload,
        isActive: editItem.status === "active",
      };
      updateMutation.mutate({ id: editItem.id, data: updatePayload });
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Kustuta kuulutus?")) return;
    deleteMutation.mutate(id);
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{t("admin.listings")}</h1>
        <Button onClick={openNew} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90"><PlusCircle className="mr-1 h-3.5 w-3.5" /> {t("admin.addListing")}</Button>
      </div>
      {/* Mobile cards */}
      <div className="mt-4 space-y-2 sm:hidden">
        {listings.map((l: any) => {
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
                <span>{l.city} · {l.price ?? l.priceFrom}€ · {l.views ?? 0} vaatamist</span>
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
            {listings.map((l: any) => {
              const Icon = typeIcons[l.type] || Warehouse;
              return (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{l.title}</td>
                  <td className="px-4 py-3"><Icon className="h-4 w-4 text-muted-foreground" /></td>
                  <td className="px-4 py-3 text-muted-foreground">{l.city}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.price ?? l.priceFrom}€</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${l.status === "active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{l.status === "active" ? t("admin.active") : t("admin.paused")}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{l.views ?? 0}</td>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isNew ? t("admin.addNewListing") : t("admin.editListing")}</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.title_field")}</label>
                <input className={inp} value={editItem.title} onChange={e => setEditItem({ ...editItem, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.type")}</label>
                  <select className={inp} value={editItem.type} onChange={e => setEditItem({ ...editItem, type: e.target.value })}>
                    <option value="warehouse">{t("admin.warehouseType")}</option>
                    <option value="moving">{t("admin.movingType")}</option>
                    <option value="trailer">{t("admin.trailerType")}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.city")}</label>
                  <input className={inp} value={editItem.city} onChange={e => setEditItem({ ...editItem, city: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Aadress</label>
                <input className={inp} value={editItem.address ?? ""} onChange={e => setEditItem({ ...editItem, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.price")} (€)</label>
                  <input type="number" className={inp} value={editItem.price ?? editItem.priceFrom ?? 0} onChange={e => setEditItem({ ...editItem, price: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.status")}</label>
                  <select className={inp} value={editItem.status} onChange={e => setEditItem({ ...editItem, status: e.target.value })}>
                    <option value="active">{t("admin.active")}</option>
                    <option value="paused">{t("admin.paused")}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Kirjeldus</label>
                <textarea className={inp + " min-h-[60px]"} value={editItem.description ?? ""} onChange={e => setEditItem({ ...editItem, description: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Pildid</label>
                <ImageUploader
                  images={editItem.images || []}
                  onChange={imgs => setEditItem({ ...editItem, images: imgs })}
                  maxImages={10}
                />
              </div>

              {/* Supplier */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Partner</label>
                <select className={inp} value={editItem.supplierId ?? ""} onChange={e => setEditItem({ ...editItem, supplierId: e.target.value })}>
                  <option value="">— Vali partner —</option>
                  {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Pricing overrides */}
              <div className="rounded-lg border border-border p-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hinnakujundus</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Partneri allahindlus (% override)</label>
                    <input type="number" className={inp} placeholder="Partneri vaikimisi"
                      value={editItem.partnerDiscountRateOverride ?? ""}
                      onChange={e => setEditItem({ ...editItem, partnerDiscountRateOverride: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Kliendi allahindlus (% override)</label>
                    <input type="number" className={inp} placeholder="Vaikimisi"
                      value={editItem.clientDiscountRateOverride ?? ""}
                      onChange={e => setEditItem({ ...editItem, clientDiscountRateOverride: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">KM määr (%)</label>
                    <input type="number" className={inp} placeholder="0 = ei kohaldu"
                      value={editItem.vatRate ?? ""}
                      onChange={e => setEditItem({ ...editItem, vatRate: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                  <div className="flex items-end gap-2 pb-1">
                    <input type="checkbox" id="vat-incl" className="rounded border-border"
                      checked={editItem.pricesIncludeVat ?? false}
                      onChange={e => setEditItem({ ...editItem, pricesIncludeVat: e.target.checked })} />
                    <label htmlFor="vat-incl" className="text-xs font-medium text-muted-foreground">Hinnad sisaldavad KM-i</label>
                  </div>
                </div>
              </div>

              {/* Admin extras overrides */}
              {!isNew && editItem.id && (
                <AdminExtrasOverrides listingId={editItem.id} />
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>{t("admin.cancel")}</Button>
                <Button onClick={handleSave} disabled={isMutating} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {t("admin.save")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}