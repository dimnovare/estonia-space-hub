import { useState } from "react";
import { PlusCircle, MapPin, Save, Loader2, Edit, X, Warehouse, Truck, CarFront, Trash2, Upload, CheckCircle, AlertCircle } from "lucide-react";
import ImageUploader from "./ImageUploader";
import GeocodeLookup from "./AdminLocationsGeocode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { locationService, supplierService } from "@/services";
import { apiClient } from "@/services/apiClient";
import type { SupplierLocation } from "@/services/types";
import { toast } from "sonner";
import { queryKeys } from "@/services/queryKeys";

// ── Bulk Import types ──
interface BulkUnitRow {
  title: string;
  type: "Warehouse" | "Moving" | "Trailer";
  priceFrom: number;
  priceUnit: string;
  sizeM2?: number;
  quantityTotal?: number;
  description?: string;
}

interface ParseResult {
  rows: BulkUnitRow[];
  errors: string[];
}

function parseBulkInput(raw: string): ParseResult {
  const rows: BulkUnitRow[] = [];
  const errors: string[] = [];
  const trimmed = raw.trim();
  if (!trimmed) return { rows, errors: ["Empty input"] };

  // Try JSON first
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) { errors.push("JSON must be an array"); return { rows, errors }; }
      parsed.forEach((item: any, i: number) => {
        if (!item.title) { errors.push(`Row ${i + 1}: missing title`); return; }
        const validTypes = ["Warehouse", "Moving", "Trailer"];
        const type = validTypes.includes(item.type) ? item.type : "Warehouse";
        const price = parseFloat(item.priceFrom);
        if (isNaN(price)) { errors.push(`Row ${i + 1}: invalid priceFrom`); return; }
        rows.push({
          title: String(item.title),
          type: type as BulkUnitRow["type"],
          priceFrom: price,
          priceUnit: item.priceUnit || "€/month",
          sizeM2: item.sizeM2 ? parseFloat(item.sizeM2) : undefined,
          quantityTotal: item.quantityTotal ? parseInt(item.quantityTotal) : undefined,
          description: item.description || undefined,
        });
      });
      return { rows, errors };
    } catch {
      errors.push("Invalid JSON");
      return { rows, errors };
    }
  }

  // CSV parsing
  const lines = trimmed.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) { errors.push("CSV needs a header row + at least one data row"); return { rows, errors }; }

  const sep = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase());
  const col = (name: string) => headers.indexOf(name);

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(sep).map(c => c.trim());
    const title = col("title") >= 0 ? cells[col("title")] : "";
    if (!title) { errors.push(`Row ${i}: missing title`); continue; }
    const rawType = col("type") >= 0 ? cells[col("type")] : "Warehouse";
    const validTypes = ["Warehouse", "Moving", "Trailer"];
    const type = validTypes.find(t => t.toLowerCase() === (rawType || "").toLowerCase()) || "Warehouse";
    const priceRaw = col("pricefrom") >= 0 ? cells[col("pricefrom")] : "";
    const price = parseFloat(priceRaw);
    if (isNaN(price)) { errors.push(`Row ${i}: invalid priceFrom "${priceRaw}"`); continue; }
    const priceUnit = col("priceunit") >= 0 ? cells[col("priceunit")] : "€/month";
    const sizeRaw = col("sizem2") >= 0 ? cells[col("sizem2")] : "";
    const qtyRaw = col("quantitytotal") >= 0 ? cells[col("quantitytotal")] : "";
    const desc = col("description") >= 0 ? cells[col("description")] : undefined;
    rows.push({
      title,
      type: type as BulkUnitRow["type"],
      priceFrom: price,
      priceUnit: priceUnit || "€/month",
      sizeM2: sizeRaw ? parseFloat(sizeRaw) : undefined,
      quantityTotal: qtyRaw ? parseInt(qtyRaw) : undefined,
      description: desc || undefined,
    });
  }
  return { rows, errors };
}

// ── Bulk Import Dialog ──
function BulkImportDialog({ open, onOpenChange, locationId }: { open: boolean; onOpenChange: (v: boolean) => void; locationId: string }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [raw, setRaw] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; failed: number; errors?: string[] } | null>(null);

  const handleParse = () => {
    setParseResult(parseBulkInput(raw));
    setImportResult(null);
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.rows.length === 0) return;
    setImporting(true);
    try {
      const res = await apiClient.post<{ created: number; failed: number; errors?: string[] }>(
        `/admin/locations/${locationId}/units/bulk`,
        { units: parseResult.rows }
      );
      setImportResult(res);
      if (res.created > 0) {
        qc.invalidateQueries({ queryKey: queryKeys.adminLocations.all() });
        qc.invalidateQueries({ queryKey: queryKeys.locations.all() });
        toast.success(t("admin.bulkImportSuccess"));
      }
    } catch (err: any) {
      // Endpoint may not exist yet — show graceful error
      if (err?.status === 404 || err?.statusCode === 404) {
        toast.error("Bulk import endpoint not yet deployed");
      } else {
        toast.error(err?.message || "Import failed");
      }
    } finally {
      setImporting(false);
    }
  };

  const handleClose = (v: boolean) => {
    if (!v) { setRaw(""); setParseResult(null); setImportResult(null); }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            {t("admin.bulkImport")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <textarea
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent min-h-[160px]"
            placeholder={t("admin.bulkImportPlaceholder")}
            value={raw}
            onChange={e => { setRaw(e.target.value); setParseResult(null); setImportResult(null); }}
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleParse} disabled={!raw.trim()}>
              {t("admin.bulkImportParse")}
            </Button>
            {parseResult && parseResult.rows.length > 0 && (
              <Button
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={handleImport}
                disabled={importing}
              >
                {importing
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Upload className="mr-2 h-4 w-4" />}
                {t("admin.bulkImportImport").replace("{n}", String(parseResult.rows.length))}
              </Button>
            )}
          </div>

          {/* Parse errors */}
          {parseResult && parseResult.errors.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p className="font-medium text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> {t("admin.bulkImportErrors")}
              </p>
              <ul className="mt-1 list-disc list-inside text-destructive/80 text-xs space-y-0.5">
                {parseResult.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {/* Preview table */}
          {parseResult && parseResult.rows.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {t("admin.bulkImportPreview").replace("{n}", String(parseResult.rows.length))}
              </p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="border-b border-border bg-secondary/50">
                    <tr>
                      {["title", "type", "priceFrom", "priceUnit", "sizeM2", "qty"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.rows.map((row, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="px-3 py-1.5 font-medium">{row.title}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.type}</td>
                        <td className="px-3 py-1.5">€{row.priceFrom}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.priceUnit}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.sizeM2 ?? "—"}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.quantityTotal ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div className={`rounded-lg border p-3 text-sm ${importResult.failed === 0 ? "border-success/30 bg-success/5 text-success" : "border-warning/30 bg-warning/5 text-warning"}`}>
              <p className="flex items-center gap-1 font-medium">
                <CheckCircle className="h-4 w-4" />
                {t("admin.bulkImportResult")
                  .replace("{created}", String(importResult.created))
                  .replace("{failed}", String(importResult.failed))}
              </p>
              {importResult.errors && importResult.errors.length > 0 && (
                <ul className="mt-1 list-disc list-inside text-xs space-y-0.5 opacity-80">
                  {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const inp = "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";
const typeIcons: Record<string, typeof Warehouse> = { warehouse: Warehouse, Warehouse: Warehouse, moving: Truck, Moving: Truck, trailer: CarFront, Trailer: CarFront };

export default function AdminLocations({ supplierId }: { supplierId?: string }) {
  const { t } = useLanguage();
  const qc = useQueryClient();

  const { data: locations = [], isLoading } = useQuery({
    queryKey: queryKeys.adminLocations.all(supplierId),
    queryFn: () => locationService.getAll(supplierId ? { supplierId } : undefined),
    staleTime: 30_000,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: queryKeys.suppliers.all(),
    queryFn: () => supplierService.getAll(),
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addLocOpen, setAddLocOpen] = useState(false);
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [editUnitOpen, setEditUnitOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  const selected = locations.find((l) => l.id === selectedId);

  // ── New location form state ──
  const emptyLoc = {
    supplierId: "",
    name: "",
    address: "",
    city: "",
    lat: "",
    lng: "",
    description: "",
    openingHours: "",
    images: [] as string[],
    notes: "",
    externalId: "",
  };
  const [newLoc, setNewLoc] = useState(emptyLoc);

  // ── Edit location form state ──
  const [editLoc, setEditLoc] = useState<typeof emptyLoc>(emptyLoc);

  // ── New unit form state ──
  const emptyUnit = {
    title: "",
    type: "Warehouse" as "Warehouse" | "Moving" | "Trailer",
    priceFrom: "",
    priceUnit: "/month",
    sizeM2: "",
    quantityTotal: "1",
    description: "",
    vatRate: "",
    pricesIncludeVat: false,
  };
  const [newUnit, setNewUnit] = useState(emptyUnit);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.adminLocations.all() });
    qc.invalidateQueries({ queryKey: queryKeys.locations.all() });
  };

  const createLocMutation = useMutation({
    mutationFn: (data: Parameters<typeof locationService.create>[0]) => locationService.create(data),
    onSuccess: (loc) => {
      invalidate();
      toast.success(t("toast.locationAdded"));
      setAddLocOpen(false);
      setNewLoc(emptyLoc);
      setSelectedId(loc.id);
    },
    onError: (err: any) => toast.error(err.message || t("toast.addFailed")),
  });

  const updateLocMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof locationService.update>[1] }) => locationService.update(id, data),
    onSuccess: () => {
      invalidate();
      toast.success(t("toast.locationUpdated"));
      setEditing(false);
    },
    onError: (err: any) => toast.error(err.message || t("toast.updateFailed")),
  });

  const addUnitMutation = useMutation({
    mutationFn: ({ locationId, unit }: { locationId: string; unit: Parameters<typeof locationService.addUnit>[1] }) =>
      locationService.addUnit(locationId, unit),
    onSuccess: () => {
      invalidate();
      toast.success(t("toast.unitAdded"));
      setAddUnitOpen(false);
      setNewUnit(emptyUnit);
    },
    onError: (err: any) => toast.error(err.message || t("toast.addFailed")),
  });

  const handleCreateLoc = () => {
    createLocMutation.mutate({
      supplierId: newLoc.supplierId,
      name: newLoc.name,
      address: newLoc.address,
      city: newLoc.city,
      lat: Number(newLoc.lat) || 0,
      lng: Number(newLoc.lng) || 0,
      description: newLoc.description || undefined,
      openingHours: newLoc.openingHours || undefined,
      images: newLoc.images.length > 0 ? newLoc.images : undefined,
      notes: newLoc.notes || undefined,
    });
  };

  const handleUpdateLoc = () => {
    if (!selected) return;
    updateLocMutation.mutate({
      id: selected.id,
      data: {
        name: editLoc.name,
        address: editLoc.address,
        city: editLoc.city,
        lat: Number(editLoc.lat) || 0,
        lng: Number(editLoc.lng) || 0,
        description: editLoc.description,
        openingHours: editLoc.openingHours,
        images: editLoc.images,
        notes: editLoc.notes,
        externalId: editLoc.externalId || null,
      },
    });
  };

  const handleAddUnit = () => {
    if (!selected) return;
    addUnitMutation.mutate({
      locationId: selected.id,
      unit: {
        title: newUnit.title,
        type: newUnit.type,
        priceFrom: Number(newUnit.priceFrom) || 0,
        priceUnit: newUnit.priceUnit,
        sizeM2: newUnit.sizeM2 ? Number(newUnit.sizeM2) : undefined,
        quantityTotal: Number(newUnit.quantityTotal) || 1,
        description: newUnit.description || undefined,
        vatRate: newUnit.vatRate ? Number(newUnit.vatRate) : undefined,
        pricesIncludeVat: newUnit.pricesIncludeVat,
      },
    });
  };

  const startEdit = () => {
    if (!selected) return;
    setEditLoc({
      supplierId: selected.supplierId,
      name: selected.name,
      address: selected.address,
      city: selected.city,
      lat: String(selected.lat),
      lng: String(selected.lng),
      description: selected.description || "",
      openingHours: selected.openingHours || "",
      images: selected.images || [],
      notes: selected.notes || "",
      externalId: selected.externalId ?? "",
    });
    setEditing(true);
  };

  const filtered = locations.filter((l) => {
    const q = search.toLowerCase();
    return !q || l.name.toLowerCase().includes(q) || l.city.toLowerCase().includes(q) || (l.supplierName || "").toLowerCase().includes(q);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold">{t("admin.locations")}</h1>
        <Button onClick={() => { setNewLoc({ ...emptyLoc, supplierId: supplierId ?? (suppliers[0]?.id ?? "") }); setAddLocOpen(true); }} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
          <PlusCircle className="mr-1 h-3.5 w-3.5" /> {t("admin.locations.add")}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* ── Left panel: location list ── */}
        <div className="w-full lg:w-80 shrink-0 space-y-2">
          <input
            className={inp}
            placeholder={t("hero.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {filtered.length === 0 && (
            <div className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">
              <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              {t("admin.locations.noLocations")}
            </div>
          )}
          {filtered.map((loc) => (
            <button
              key={loc.id}
              onClick={() => { setSelectedId(loc.id); setEditing(false); }}
              className={`w-full rounded-xl border p-3 text-left text-sm transition-colors ${
                selectedId === loc.id
                  ? "border-accent bg-accent/5"
                  : "border-border hover:bg-secondary/50"
              }`}
            >
              <div className="font-medium truncate">{loc.name}</div>
              <div className="mt-0.5 text-xs text-muted-foreground truncate">
                {loc.supplierName} · {loc.city}
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{loc.unitCount ?? 0} {t("admin.locations.unitCount").toLowerCase()}</span>
                {loc.priceFrom != null && <span>€{loc.priceFrom}+</span>}
              </div>
            </button>
          ))}
        </div>

        {/* ── Right panel: selected location detail ── */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="rounded-xl border border-border p-12 text-center text-sm text-muted-foreground">
              <MapPin className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
              {t("admin.locations.selectLocation")}
            </div>
          ) : editing ? (
            /* ── Edit mode ── */
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{t("admin.editListing")}</h2>
                <button onClick={() => setEditing(false)} className="rounded p-1 hover:bg-secondary">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.title_field")}</label>
                <input className={inp} value={editLoc.name} onChange={(e) => setEditLoc({ ...editLoc, name: e.target.value })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.address")}</label>
                  <input className={inp} value={editLoc.address} onChange={(e) => setEditLoc({ ...editLoc, address: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.city")}</label>
                  <input className={inp} value={editLoc.city} onChange={(e) => setEditLoc({ ...editLoc, city: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.locations.openingHours")}</label>
                <input className={inp} value={editLoc.openingHours} onChange={(e) => setEditLoc({ ...editLoc, openingHours: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.description")}</label>
                <textarea className={inp + " min-h-[60px]"} value={editLoc.description} onChange={(e) => setEditLoc({ ...editLoc, description: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.locations.imageUrls")}</label>
                <ImageUploader images={editLoc.images} onChange={imgs => setEditLoc({ ...editLoc, images: imgs })} />
              </div>
              <div>
                <label className="text-xs font-medium">
                  External ID
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                    (vendor's location ID — used for stock polling)
                  </span>
                </label>
                <input
                  className={inp}
                  placeholder="e.g. vendor-loc-abc"
                  value={editLoc.externalId ?? ""}
                  onChange={(e) => setEditLoc({ ...editLoc, externalId: e.target.value })}
                />
              </div>
              <GeocodeLookup
                address={editLoc.address}
                lat={editLoc.lat}
                lng={editLoc.lng}
                onCoordsChange={(lat, lng) => setEditLoc({ ...editLoc, lat, lng })}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(false)}>{t("admin.cancel")}</Button>
                <Button onClick={handleUpdateLoc} disabled={updateLocMutation.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {updateLocMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {t("admin.save")}
                </Button>
              </div>
            </div>
          ) : (
            /* ── View mode ── */
            <div className="space-y-4">
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{selected.name}</h2>
                    <p className="text-sm text-muted-foreground">{selected.address}, {selected.city}</p>
                    {selected.supplierName && <p className="text-xs text-muted-foreground mt-1">{t("admin.locations.supplier")}: {selected.supplierName}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={startEdit}>
                      <Edit className="mr-1 h-3.5 w-3.5" /> {t("admin.edit")}
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={async () => {
                      if (!confirm(t("provider.listings.deleteLocationConfirm"))) return;
                      try {
                        await apiClient.delete(`/locations/${selected.id}`);
                        invalidate();
                        toast.success(t("admin.locations.deleted"));
                        setSelectedId(null);
                      } catch (err: any) {
                        toast.error(err.message || t("provider.listings.deleteFailed"));
                      }
                    }}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> {t("admin.delete")}
                    </Button>
                  </div>
                </div>
                {selected.description && <p className="mt-3 text-sm text-muted-foreground">{selected.description}</p>}
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                  {selected.openingHours && <span>{t("admin.locations.openingHours")}: {selected.openingHours}</span>}
                  <span>{t("admin.locations.latLng")}: {selected.lat}, {selected.lng}</span>
                </div>
              </div>

              {/* ── Units table ── */}
              <div className="rounded-xl border border-border">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h3 className="font-medium text-sm">{t("admin.locations.units")} ({selected.units?.length ?? 0})</h3>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setBulkImportOpen(true)}>
                      <Upload className="mr-1 h-3.5 w-3.5" /> {t("admin.bulkImport")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setNewUnit(emptyUnit); setAddUnitOpen(true); }}>
                      <PlusCircle className="mr-1 h-3.5 w-3.5" /> {t("admin.locations.addUnit")}
                    </Button>
                  </div>
                </div>
                {(!selected.units || selected.units.length === 0) ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">{t("admin.locations.noUnits")}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border bg-secondary/50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t("admin.title_field")}</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t("admin.type")}</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t("admin.locations.sizeM2")}</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t("admin.locations.quantity")}</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t("admin.price")}</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">{t("admin.actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.units.map((u) => {
                          const Icon = typeIcons[u.type] || Warehouse;
                          return (
                            <tr key={u.id} className="border-b border-border last:border-0">
                              <td className="px-4 py-2 font-medium">{u.title}</td>
                              <td className="px-4 py-2"><Icon className="h-4 w-4 text-muted-foreground" /></td>
                              <td className="px-4 py-2 text-muted-foreground">{u.sizeM2 ?? "—"}</td>
                              <td className="px-4 py-2 text-muted-foreground">{u.quantityTotal ?? "—"}</td>
                              <td className="px-4 py-2 text-muted-foreground">€{u.priceFrom} {u.priceUnit}</td>
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-1">
                                  <button onClick={() => { setEditingUnit({ ...u }); setEditUnitOpen(true); }} className="rounded p-1 hover:bg-secondary">
                                    <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                                  </button>
                                  <button onClick={async () => {
                                    if (!confirm(t("admin.deletePartnerConfirm"))) return;
                                    try {
                                      await apiClient.delete(`/locations/${selected.id}/units/${u.id}`);
                                      invalidate();
                                      toast.success(t("admin.locations.unitDeleted"));
                                    } catch (err: any) {
                                      toast.error(err.message || t("provider.listings.deleteFailed"));
                                    }
                                  }} className="rounded p-1 hover:bg-secondary">
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Location Dialog ── */}
      <Dialog open={addLocOpen} onOpenChange={setAddLocOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("admin.locations.add")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("admin.locations.supplier")}</label>
              <select className={inp} value={newLoc.supplierId} onChange={(e) => setNewLoc({ ...newLoc, supplierId: e.target.value })}>
                <option value="">—</option>
                {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("admin.title_field")} <span className="text-destructive">*</span></label>
              <input className={inp} value={newLoc.name} onChange={(e) => setNewLoc({ ...newLoc, name: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.address")} <span className="text-destructive">*</span></label>
                <input className={inp} value={newLoc.address} onChange={(e) => setNewLoc({ ...newLoc, address: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.city")} <span className="text-destructive">*</span></label>
                <input className={inp} value={newLoc.city} onChange={(e) => setNewLoc({ ...newLoc, city: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("admin.locations.openingHours")}</label>
              <input className={inp} placeholder="E-R 8-20, L 9-15" value={newLoc.openingHours} onChange={(e) => setNewLoc({ ...newLoc, openingHours: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("admin.description")}</label>
              <textarea className={inp + " min-h-[60px]"} value={newLoc.description} onChange={(e) => setNewLoc({ ...newLoc, description: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("admin.locations.imageUrls")}</label>
              <ImageUploader images={newLoc.images} onChange={imgs => setNewLoc({ ...newLoc, images: imgs })} />
            </div>
            <GeocodeLookup
              address={newLoc.address}
              lat={newLoc.lat}
              lng={newLoc.lng}
              onCoordsChange={(lat, lng) => setNewLoc({ ...newLoc, lat, lng })}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddLocOpen(false)}>{t("admin.cancel")}</Button>
              <Button onClick={handleCreateLoc} disabled={createLocMutation.isPending || !newLoc.supplierId || !newLoc.name} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {createLocMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t("admin.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Unit Dialog ── */}
      <Dialog open={addUnitOpen} onOpenChange={setAddUnitOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("admin.locations.addUnit")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("admin.title_field")} <span className="text-destructive">*</span></label>
              <input className={inp} placeholder={t("admin.locations.unitPlaceholder")} value={newUnit.title} onChange={(e) => setNewUnit({ ...newUnit, title: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("admin.type")} <span className="text-destructive">*</span></label>
              <select className={inp} value={newUnit.type} onChange={(e) => setNewUnit({ ...newUnit, type: e.target.value as any })}>
                <option value="Warehouse">{t("admin.warehouseType")}</option>
                <option value="Moving">{t("admin.movingType")}</option>
                <option value="Trailer">{t("admin.trailerType")}</option>
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.price")} (€) <span className="text-destructive">*</span></label>
                <input type="number" className={inp} value={newUnit.priceFrom} onChange={(e) => setNewUnit({ ...newUnit, priceFrom: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.locations.priceUnit")}</label>
                <select className={inp} value={newUnit.priceUnit} onChange={(e) => setNewUnit({ ...newUnit, priceUnit: e.target.value })}>
                  <option value="/month">{t("admin.locations.perMonth")}</option>
                  <option value="/day">{t("admin.locations.perDay")}</option>
                  <option value="/hour">{t("admin.locations.perHour")}</option>
                  <option value="/time">{t("admin.locations.perTime")}</option>
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.locations.sizeM2")}</label>
                <input type="number" className={inp} value={newUnit.sizeM2} onChange={(e) => setNewUnit({ ...newUnit, sizeM2: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.locations.quantity")}</label>
                <input type="number" className={inp} value={newUnit.quantityTotal} onChange={(e) => setNewUnit({ ...newUnit, quantityTotal: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("admin.description")}</label>
              <textarea className={inp + " min-h-[60px]"} value={newUnit.description} onChange={(e) => setNewUnit({ ...newUnit, description: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("admin.locations.vatRate")}</label>
              <select className={inp} value={newUnit.vatRate} onChange={(e) => setNewUnit({ ...newUnit, vatRate: e.target.value })}>
                <option value="">{t("admin.locations.vatDefault")}</option>
                <option value="24">{t("admin.locations.vatStandard")}</option>
                <option value="13">{t("admin.locations.vatReduced13")}</option>
                <option value="9">{t("admin.locations.vatReduced9")}</option>
                <option value="0">{t("admin.locations.vatExempt")}</option>
              </select>
            </div>
              <div className="flex items-end gap-2 pb-1">
                <input type="checkbox" id="unit-vat-incl" className="rounded border-border"
                  checked={newUnit.pricesIncludeVat}
                  onChange={(e) => setNewUnit({ ...newUnit, pricesIncludeVat: e.target.checked })} />
                <label htmlFor="unit-vat-incl" className="text-xs font-medium text-muted-foreground">{t("admin.locations.vatIncluded")}</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddUnitOpen(false)}>{t("admin.cancel")}</Button>
              <Button onClick={handleAddUnit} disabled={addUnitMutation.isPending || !newUnit.title} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {addUnitMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t("admin.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Unit Dialog ── */}
      <Dialog open={editUnitOpen} onOpenChange={setEditUnitOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("admin.locations.editUnit")}</DialogTitle></DialogHeader>
          {editingUnit && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.title_field")}</label>
                <input className={inp} value={editingUnit.title} onChange={e => setEditingUnit({ ...editingUnit, title: e.target.value })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.price")} (€)</label>
                  <input type="number" className={inp} value={editingUnit.priceFrom ?? ""} onChange={e => setEditingUnit({ ...editingUnit, priceFrom: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.locations.sizeM2")}</label>
                  <input type="number" className={inp} value={editingUnit.sizeM2 ?? ""} onChange={e => setEditingUnit({ ...editingUnit, sizeM2: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.locations.quantity")}</label>
                  <input type="number" className={inp} value={editingUnit.quantityTotal ?? ""} onChange={e => setEditingUnit({ ...editingUnit, quantityTotal: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.locations.priceUnit")}</label>
                  <select className={inp} value={editingUnit.priceUnit ?? "/month"} onChange={e => setEditingUnit({ ...editingUnit, priceUnit: e.target.value })}>
                    <option value="/month">{t("admin.locations.perMonth")}</option>
                    <option value="/day">{t("admin.locations.perDay")}</option>
                    <option value="/hour">{t("admin.locations.perHour")}</option>
                    <option value="/time">{t("admin.locations.perTime")}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.locations.type")}</label>
                <select className={inp} value={editingUnit.type || ""} onChange={(e) => setEditingUnit({ ...editingUnit, type: e.target.value })}>
                  <option value="warehouse">{t("admin.locations.warehouse")}</option>
                  <option value="moving">{t("admin.locations.moving")}</option>
                  <option value="trailer">{t("admin.locations.trailer")}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.locations.vatRate")}</label>
                <select className={inp} value={editingUnit.vatRate ?? ""} onChange={(e) => setEditingUnit({ ...editingUnit, vatRate: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">—</option>
                  <option value="24">24%</option>
                  <option value="13">13%</option>
                  <option value="9">9%</option>
                  <option value="0">0%</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.locations.description")}</label>
                <textarea className={inp} rows={2} value={editingUnit.description || ""} onChange={(e) => setEditingUnit({ ...editingUnit, description: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={editingUnit.isActive !== false}
                  onChange={e => setEditingUnit({ ...editingUnit, isActive: e.target.checked })} />
                <label className="text-xs font-medium text-muted-foreground">{t("admin.locations.active") || "Active"}</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditUnitOpen(false)}>{t("admin.cancel")}</Button>
                <Button
                  onClick={async () => {
                    try {
                      await apiClient.patch(`/admin/listings/${editingUnit.id}`, {
                        title: editingUnit.title,
                        priceFrom: editingUnit.priceFrom,
                        sizeM2: editingUnit.sizeM2,
                        quantityTotal: editingUnit.quantityTotal,
                        priceUnit: editingUnit.priceUnit,
                        description: editingUnit.description,
                        vatRate: editingUnit.vatRate,
                        isActive: editingUnit.isActive,
                      });
                      invalidate();
                      toast.success(t("toast.unitUpdated") || "Unit updated");
                      setEditUnitOpen(false);
                    } catch (err: any) {
                      toast.error(err.message || t("admin.deleteFailed"));
                    }
                  }}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {t("admin.save")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Bulk Import Dialog ── */}
      {selected && (
        <BulkImportDialog
          open={bulkImportOpen}
          onOpenChange={setBulkImportOpen}
          locationId={selected.id}
        />
      )}
    </div>
  );
}
