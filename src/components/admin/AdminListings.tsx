import { useState } from "react";
import ImageUploader from "./ImageUploader";
import { Warehouse, Truck, CarFront, Edit, Trash2, PlusCircle, Save, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { supplierService } from "@/services";
import { toast } from "sonner";
import { queryKeys } from "@/services/queryKeys";
import AdminExtrasOverrides from "./AdminExtrasOverrides";
import { GooglePlacesAutocomplete } from "./GooglePlacesAutocomplete";

// Row shape rendered by the admin listings table/cards, derived from how each
// field is read below. The list endpoint returns priceFrom; legacy/mock shapes
// may also carry price/views, so both stay optional.
interface AdminListingRow {
  id: string;
  type: string;
  title: string;
  city: string;
  price?: number;
  priceFrom?: number;
  availableNow?: boolean;
  views?: number;
  address?: string;
  description?: string;
  supplierId?: string;
  lat?: number | null;
  lng?: number | null;
  priceUnit?: string;
  images?: string[];
  partnerDiscountRateOverride?: number | null;
  clientDiscountRateOverride?: number | null;
  vatRate?: number | null;
  pricesIncludeVat?: boolean;
}

// Paginated envelope returned by /admin/listings. Older/mock responses may hand
// back a raw array instead, handled at the call site.
interface AdminListingsResponse {
  data: AdminListingRow[];
  total?: number;
  hasMore?: boolean;
}

// Working copy held in the edit dialog: the row fields plus the form-only
// `status` toggle (active/paused) that maps to availableNow on save. `id` is
// optional because a not-yet-created listing (openNew) has none.
interface ListingEditItem extends Omit<AdminListingRow, "id" | "type"> {
  id?: string;
  type: string;
  status?: string;
}

// Payload sent to POST /admin/listings (create).
interface CreateListingPayload {
  type: string;
  title: string;
  supplierId?: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  priceFrom: number;
  priceUnit: string;
  availableNow: boolean;
  description: string;
  partnerDiscountRateOverride: number | null;
  clientDiscountRateOverride: number | null;
  vatRate: number | null;
  pricesIncludeVat: boolean;
  images: string[];
}

// PATCH /admin/listings/{id} (update) carries the create payload plus isActive.
interface UpdateListingPayload extends CreateListingPayload {
  isActive: boolean;
}

const typeIcons: Record<string, typeof Warehouse> = { warehouse: Warehouse, moving: Truck, trailer: CarFront };
const inp = "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

export default function AdminListings() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<ListingEditItem | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Bulk import
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSupplierId, setBulkSupplierId] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [bulkResult, setBulkResult] = useState<{ created: number; failed: number; results: { index: number; title: string; ok: boolean; error?: string }[] } | null>(null);

  const [page, setPage] = useState(1);
  const limit = 50;
  const { data: res, isLoading } = useQuery({
    queryKey: [...queryKeys.adminListings.all(), page],
    queryFn: () => apiClient.get<AdminListingsResponse | AdminListingRow[]>(`/admin/listings?page=${page}&limit=${limit}`),
  });
  // Tolerate both the paginated envelope and a raw array (mock / older responses).
  const listings: AdminListingRow[] = Array.isArray(res) ? res : res?.data ?? [];
  const total = Array.isArray(res) ? res.length : res?.total ?? listings.length;
  const hasMore = Array.isArray(res) ? false : res?.hasMore ?? false;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const { data: suppliers = [] } = useQuery({
    queryKey: queryKeys.suppliers.all(),
    queryFn: () => supplierService.getAll(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.adminListings.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.listings.all() });
  };

  // Parse pasted rows: one unit per line, comma- or tab-separated columns
  // title, type, city, price[, size, qty].
  const parseBulk = (text: string) =>
    text.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
      const cols = (line.includes("\t") ? line.split("\t") : line.split(",")).map(c => c.trim());
      const [title, type, city, price, size, qty] = cols;
      return {
        title: title ?? "",
        type: (type || "warehouse").toLowerCase(),
        city: city ?? "",
        priceFrom: parseFloat(price) || 0,
        sizeM2: size ? parseFloat(size) : undefined,
        quantityTotal: qty ? parseInt(qty, 10) : undefined,
      };
    });

  const bulkImport = useMutation({
    mutationFn: (vars: { supplierId: string; rows: unknown[] }) =>
      apiClient.post<{ created: number; failed: number; results: { index: number; title: string; ok: boolean; error?: string }[] }>(
        "/admin/listings/bulk", { supplierId: vars.supplierId, listings: vars.rows }),
    onSuccess: (data) => {
      setBulkResult(data);
      invalidate();
      if (data.failed === 0) toast.success(t("admin.bulkImportResult").replace("{created}", String(data.created)).replace("{failed}", String(data.failed)));
    },
    onError: (err: unknown) => toast.error((err instanceof Error ? err.message : "") || t("toast.error")),
  });

  const runBulk = () => {
    if (!bulkSupplierId) { toast.error(t("admin.bulkImportSupplierRequired")); return; }
    const rows = parseBulk(bulkText);
    if (rows.length === 0) { toast.error(t("admin.bulkImportEmpty")); return; }
    setBulkResult(null);
    bulkImport.mutate({ supplierId: bulkSupplierId, rows });
  };

  const openBulk = () => {
    setBulkResult(null);
    setBulkText("");
    setBulkSupplierId(suppliers[0]?.id ?? "");
    setBulkOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateListingPayload) => apiClient.post("/admin/listings", data),
    onSuccess: () => { invalidate(); toast.success(t("toast.listingAdded")); setEditOpen(false); },
    onError: (err: unknown) => toast.error((err instanceof Error ? err.message : "") || t("toast.addFailed")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateListingPayload }) => apiClient.patch(`/admin/listings/${id}`, data),
    onSuccess: () => { invalidate(); toast.success(t("toast.listingUpdated")); setEditOpen(false); },
    onError: (err: unknown) => toast.error((err instanceof Error ? err.message : "") || t("toast.updateFailed")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/listings/${id}`),
    onSuccess: () => { invalidate(); toast.success(t("toast.listingDeleted")); },
    onError: (err: unknown) => toast.error((err instanceof Error ? err.message : "") || t("toast.deleteFailed")),
  });

  const openNew = () => {
    setEditItem({
      title: "", type: "warehouse", city: "", address: "",
      price: 0, priceUnit: "€/month", status: "active",
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

  const openEdit = (l: AdminListingRow) => {
    setEditItem({
      ...l,
      price: l.priceFrom ?? l.price ?? 0,
      status: l.availableNow !== false ? "active" : "paused",
      images: l.images || [],
    });
    setIsNew(false);
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!editItem) return;

    const payload: CreateListingPayload = {
      type: editItem.type,
      title: editItem.title,
      supplierId: editItem.supplierId || undefined,
      address: editItem.address || "",
      city: editItem.city || "",
      lat: editItem.lat ? Number(editItem.lat) : 0,
      lng: editItem.lng ? Number(editItem.lng) : 0,
      priceFrom: Number(editItem.price ?? editItem.priceFrom ?? 0),
      priceUnit: editItem.priceUnit || "€/month",
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
      updateMutation.mutate({ id: editItem.id!, data: updatePayload });
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm(t("admin.deletePartnerConfirm"))) return;
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
        <div className="flex items-center gap-2">
          <Button onClick={openBulk} size="sm" variant="outline"><Upload className="mr-1 h-3.5 w-3.5" /> {t("admin.bulkImport")}</Button>
          <Button onClick={openNew} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90"><PlusCircle className="mr-1 h-3.5 w-3.5" /> {t("admin.addListing")}</Button>
        </div>
      </div>
      {/* Mobile cards */}
      <div className="mt-4 space-y-2 sm:hidden">
        {listings.map((l: AdminListingRow) => {
          const Icon = typeIcons[l.type] || Warehouse;
          return (
            <div key={l.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium truncate">{l.title}</span>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${l.availableNow === true ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{l.availableNow === true ? t("admin.active") : t("admin.paused")}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>{l.city} · {l.price ?? l.priceFrom}€ · {l.views ?? 0} {t("admin.views").toLowerCase()}</span>
                <div className="flex items-center gap-1">
                  <button aria-label={t("admin.edit")} onClick={() => openEdit(l)} className="rounded p-1 hover:bg-secondary"><Edit className="h-3.5 w-3.5 text-muted-foreground" /></button>
                  <button aria-label={t("admin.delete")} onClick={() => handleDelete(l.id)} className="rounded p-1 hover:bg-secondary"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Desktop table */}
      <div className="mt-6 hidden overflow-x-auto rounded-xl border border-border sm:block">
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
            {listings.map((l: AdminListingRow) => {
              const Icon = typeIcons[l.type] || Warehouse;
              return (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{l.title}</td>
                  <td className="px-4 py-3"><Icon className="h-4 w-4 text-muted-foreground" /></td>
                  <td className="px-4 py-3 text-muted-foreground">{l.city}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.price ?? l.priceFrom}€</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${l.availableNow === true ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{l.availableNow === true ? t("admin.active") : t("admin.paused")}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{l.views ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button aria-label={t("admin.edit")} onClick={() => openEdit(l)} className="rounded p-1 hover:bg-secondary"><Edit className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      <button aria-label={t("admin.delete")} onClick={() => handleDelete(l.id)} className="rounded p-1 hover:bg-secondary"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t("admin.pageOf").replace("{page}", String(page)).replace("{total}", String(totalPages))}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{t("admin.prev")}</Button>
            <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>{t("admin.next")}</Button>
          </div>
        </div>
      )}

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("admin.bulkImportTitle")}</DialogTitle>
            <DialogDescription>{t("admin.bulkImportHint")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label htmlFor="bulk-partner" className="text-xs font-medium text-muted-foreground">{t("admin.listings.partner")}</label>
              <select id="bulk-partner" className={inp} value={bulkSupplierId} onChange={e => setBulkSupplierId(e.target.value)}>
                <option value="">— {t("admin.listings.selectPartner")} —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="bulk-rows" className="text-xs font-medium text-muted-foreground">{t("admin.bulkImportTitle")}</label>
              <textarea
                id="bulk-rows"
                className={inp + " min-h-[140px] font-mono text-xs"}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                placeholder={t("admin.bulkImportPlaceholder")}
              />
            </div>
            {bulkResult && (
              <div className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">{t("admin.bulkImportResult").replace("{created}", String(bulkResult.created)).replace("{failed}", String(bulkResult.failed))}</p>
                {bulkResult.results.filter(r => !r.ok).length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-destructive">
                    {bulkResult.results.filter(r => !r.ok).map(r => (
                      <li key={r.index}>#{r.index + 1} {r.title || "—"}: {r.error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBulkOpen(false)}>{t("admin.cancel")}</Button>
              <Button onClick={runBulk} disabled={bulkImport.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {bulkImport.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {t("admin.bulkImportRun")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? t("admin.addNewListing") : t("admin.editListing")}</DialogTitle>
            <DialogDescription className="sr-only">{t("admin.listingDialogDescription")}</DialogDescription>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.places.search")}</label>
                <GooglePlacesAutocomplete
                  onSelect={(p) => setEditItem((prev: ListingEditItem | null) => ({
                    ...(prev as ListingEditItem),
                    title: prev?.title || p.name,
                    address: p.address,
                    city: p.city,
                    lat: p.lat,
                    lng: p.lng,
                  }))}
                />
              </div>
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
                <label className="text-xs font-medium text-muted-foreground">{t("admin.listings.address")}</label>
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
                <label className="text-xs font-medium text-muted-foreground">{t("admin.listings.description")}</label>
                <textarea className={inp + " min-h-[60px]"} value={editItem.description ?? ""} onChange={e => setEditItem({ ...editItem, description: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.listings.images")}</label>
                <ImageUploader
                  images={editItem.images || []}
                  onChange={imgs => setEditItem({ ...editItem, images: imgs })}
                  maxImages={10}
                />
              </div>

              {/* Supplier */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.listings.partner")}</label>
                <select className={inp} value={editItem.supplierId ?? ""} onChange={e => setEditItem({ ...editItem, supplierId: e.target.value })}>
                  <option value="">— {t("admin.listings.selectPartner")} —</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Pricing overrides */}
              <div className="rounded-lg border border-border p-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("admin.pricing")}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t("admin.listings.partnerDiscountOverride")}</label>
                    <input type="number" className={inp} placeholder={t("admin.listings.partnerDefault")}
                      value={editItem.partnerDiscountRateOverride ?? ""}
                      onChange={e => setEditItem({ ...editItem, partnerDiscountRateOverride: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t("admin.listings.clientDiscountOverride")}</label>
                    <input type="number" className={inp} placeholder={t("admin.listings.default")}
                      value={editItem.clientDiscountRateOverride ?? ""}
                      onChange={e => setEditItem({ ...editItem, clientDiscountRateOverride: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t("admin.listings.vatRate")}</label>
                    <input type="number" className={inp} placeholder={t("admin.listings.vatRateNotApplicable")}
                      value={editItem.vatRate ?? ""}
                      onChange={e => setEditItem({ ...editItem, vatRate: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                  <div className="flex items-end gap-2 pb-1">
                    <input type="checkbox" id="vat-incl" className="rounded border-border"
                      checked={editItem.pricesIncludeVat ?? false}
                      onChange={e => setEditItem({ ...editItem, pricesIncludeVat: e.target.checked })} />
                    <label htmlFor="vat-incl" className="text-xs font-medium text-muted-foreground">{t("admin.listings.pricesIncludeVat")}</label>
                  </div>
                </div>
              </div>

              {/* Admin extras overrides */}
              {!isNew && editItem.id && (
                <AdminExtrasOverrides listingId={editItem.id} />
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>{t("admin.cancel")}</Button>
                <Button onClick={handleSave} disabled={isMutating || !editItem?.supplierId} className="bg-accent text-accent-foreground hover:bg-accent/90">
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