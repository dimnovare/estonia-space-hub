import { useMemo, useState } from "react";
import { PlusCircle, MapPin, Save, Loader2, Edit, X, Warehouse, Truck, CarFront, Trash2, Upload, CheckCircle, AlertCircle, Search, Pin, CheckCircle2 } from "lucide-react";
import ImageUploader from "./ImageUploader";
import GeocodeLookup from "./AdminLocationsGeocode";
import InteractiveMap from "@/components/InteractiveMap";
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

function parseBulkInput(raw: string, t: (key: string) => string): ParseResult {
  const rows: BulkUnitRow[] = [];
  const errors: string[] = [];
  const trimmed = raw.trim();
  if (!trimmed) return { rows, errors: [t("admin.bulkParse.emptyInput")] };

  // Try JSON first
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) { errors.push(t("admin.bulkParse.jsonNotArray")); return { rows, errors }; }
      parsed.forEach((item: any, i: number) => {
        if (!item.title) { errors.push(t("admin.bulkParse.missingTitle").replace("{row}", String(i + 1))); return; }
        const validTypes = ["Warehouse", "Moving", "Trailer"];
        const type = validTypes.includes(item.type) ? item.type : "Warehouse";
        const price = parseFloat(item.priceFrom);
        if (isNaN(price)) { errors.push(t("admin.bulkParse.invalidPriceFrom").replace("{row}", String(i + 1))); return; }
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
      errors.push(t("admin.bulkParse.invalidJson"));
      return { rows, errors };
    }
  }

  // CSV parsing
  const lines = trimmed.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) { errors.push(t("admin.bulkParse.csvNeedsHeader")); return { rows, errors }; }

  const sep = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase());
  const col = (name: string) => headers.indexOf(name);

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(sep).map(c => c.trim());
    const title = col("title") >= 0 ? cells[col("title")] : "";
    if (!title) { errors.push(t("admin.bulkParse.missingTitle").replace("{row}", String(i))); continue; }
    const rawType = col("type") >= 0 ? cells[col("type")] : "Warehouse";
    const validTypes = ["Warehouse", "Moving", "Trailer"];
    const type = validTypes.find(vt => vt.toLowerCase() === (rawType || "").toLowerCase()) || "Warehouse";
    const priceRaw = col("pricefrom") >= 0 ? cells[col("pricefrom")] : "";
    const price = parseFloat(priceRaw);
    if (isNaN(price)) { errors.push(t("admin.bulkParse.invalidPriceFromValue").replace("{row}", String(i)).replace("{value}", priceRaw)); continue; }
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

// ── Design-system input class (00-foundations §5: radius 10, 1px line-2, focus navy ring) ──
const inp = "mt-1.5 w-full rounded-md border border-line-2 bg-card px-3.5 py-2.5 text-[14.5px] text-ink placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";
const fieldLabel = "text-[13px] font-semibold text-ink-2";

// ── Status tag (00-foundations §2 tag colorways) ──
function StatusTag({ kind, children }: { kind: "ok" | "warn" | "muted"; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    ok: "bg-success/10 text-success",
    warn: "bg-warning/10 text-warning-text",
    muted: "bg-secondary text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-display text-[11.5px] font-semibold ${styles[kind]}`}>
      {children}
    </span>
  );
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
    setParseResult(parseBulkInput(raw, t));
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
        toast.error(t("admin.bulkImportNotDeployed"));
      } else {
        toast.error(err?.message || t("admin.bulkImportFailed"));
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
          <DialogTitle className="flex items-center gap-2 font-display text-navy-ink">
            <Upload className="h-4 w-4" />
            {t("admin.bulkImport")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <textarea
            className={inp + " min-h-[160px] font-mono-label text-[13px]"}
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
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p className="flex items-center gap-1 font-medium text-destructive">
                <AlertCircle className="h-4 w-4" /> {t("admin.bulkImportErrors")}
              </p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-destructive/80">
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
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="border-b border-border bg-secondary/40">
                    <tr>
                      {["title", "type", "priceFrom", "priceUnit", "sizeM2", "qty"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.rows.map((row, i) => (
                      <tr key={i} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-1.5 font-medium text-navy-ink">{row.title}</td>
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
            <div className={`rounded-md border p-3 text-sm ${importResult.failed === 0 ? "border-success/30 bg-success/5 text-success" : "border-warning/30 bg-warning/5 text-warning-text"}`}>
              <p className="flex items-center gap-1 font-medium">
                <CheckCircle className="h-4 w-4" />
                {t("admin.bulkImportResult")
                  .replace("{created}", String(importResult.created))
                  .replace("{failed}", String(importResult.failed))}
              </p>
              {importResult.errors && importResult.errors.length > 0 && (
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs opacity-80">
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

const typeIcons: Record<string, typeof Warehouse> = { warehouse: Warehouse, Warehouse: Warehouse, moving: Truck, Moving: Truck, trailer: CarFront, Trailer: CarFront };

// A location reads as "geocoded" once it has real coordinates.
function isGeocoded(loc: { lat: number; lng: number }): boolean {
  return Number(loc.lat) !== 0 && Number(loc.lng) !== 0;
}

export default function AdminLocations({ supplierId }: { supplierId?: string }) {
  const { t, language } = useLanguage();
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
  const [partnerFilter, setPartnerFilter] = useState<string>("all");
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

  // ── Per-partner filter chips (built from the loaded locations) ──
  const partnerOptions = useMemo(() => {
    const map = new Map<string, string>();
    locations.forEach((l) => {
      if (l.supplierId) map.set(l.supplierId, l.supplierName || l.supplierId);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [locations]);

  const filtered = locations.filter((l) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || l.name.toLowerCase().includes(q) || l.city.toLowerCase().includes(q) || (l.supplierName || "").toLowerCase().includes(q);
    const matchesPartner = partnerFilter === "all" || l.supplierId === partnerFilter;
    return matchesSearch && matchesPartner;
  });

  // Counts for the page subtitle / status overview.
  const publishedCount = locations.filter((l) => l.isActive).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      {/* ── Page head ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="font-mono-label text-[11.5px] uppercase tracking-[0.2em] text-teal-deep">
            {t("admin.locations.eyebrow")}
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-ink md:text-[28px]">{t("admin.locations")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {t("admin.locations.subtitle")
              .replace("{total}", String(locations.length))
              .replace("{published}", String(publishedCount))}
          </p>
        </div>
        <Button
          onClick={() => { setNewLoc({ ...emptyLoc, supplierId: supplierId ?? (suppliers[0]?.id ?? "") }); setAddLocOpen(true); }}
          className="h-11 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <PlusCircle className="h-[18px] w-[18px]" /> {t("admin.locations.add")}
        </Button>
      </div>

      {/* ── Toolbar: search + per-partner filter chips ── */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground/70" />
          <input
            className="h-11 w-full rounded-md border border-line-2 bg-card pl-11 pr-3.5 text-[14.5px] text-ink placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            placeholder={t("admin.locations.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {partnerOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPartnerFilter("all")}
              aria-pressed={partnerFilter === "all"}
              className={`min-h-[36px] rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                partnerFilter === "all"
                  ? "bg-navy-ink text-white"
                  : "border border-line-2 bg-card text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {t("admin.locations.allPartners")}
            </button>
            {partnerOptions.map((p) => (
              <button
                key={p.id}
                onClick={() => setPartnerFilter(p.id)}
                aria-pressed={partnerFilter === p.id}
                className={`min-h-[36px] rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  partnerFilter === p.id
                    ? "bg-navy-ink text-white"
                    : "border border-line-2 bg-card text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Grid: 340px list | map ── */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Left: partner location cards */}
        <div className="space-y-2.5">
          {filtered.length === 0 ? (
            <div className="rounded-[14px] border border-border bg-card p-8 text-center shadow-card">
              <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t("admin.locations.noLocations")}</p>
            </div>
          ) : (
            filtered.map((loc) => {
              const geocoded = isGeocoded(loc);
              const active = selectedId === loc.id;
              return (
                <button
                  key={loc.id}
                  onClick={() => { setSelectedId(loc.id); setEditing(false); }}
                  aria-pressed={active}
                  className={`w-full rounded-[14px] border bg-card p-4 text-left shadow-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-line-2 hover:bg-secondary/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate font-display text-[15px] font-semibold text-navy-ink">{loc.name}</span>
                    {loc.isActive
                      ? <StatusTag kind="ok"><CheckCircle2 className="h-3 w-3" />{t("admin.locations.tagPublished")}</StatusTag>
                      : <StatusTag kind="muted">{t("admin.locations.tagHidden")}</StatusTag>}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{loc.supplierName ? `${loc.supplierName} · ` : ""}{loc.city}</span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="font-mono-label text-[11px] uppercase tracking-wide text-muted-foreground">
                      {loc.unitCount ?? 0} {t("admin.locations.unitCount").toLowerCase()}
                    </span>
                    {loc.priceFrom != null && (
                      <span className="font-mono-label text-[11px] uppercase tracking-wide text-muted-foreground">€{loc.priceFrom}+</span>
                    )}
                    {geocoded
                      ? <StatusTag kind="ok"><Pin className="h-3 w-3" />{t("admin.locations.tagGeocoded")}</StatusTag>
                      : <StatusTag kind="warn"><AlertCircle className="h-3 w-3" />{t("admin.locations.tagNotGeocoded")}</StatusTag>}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right: map + selected detail */}
        <div className="min-w-0 space-y-5">
          {/* Leaflet map */}
          <div className="overflow-hidden rounded-[14px] border border-border bg-card p-1.5 shadow-card">
            <InteractiveMap
              locations={filtered as SupplierLocation[]}
              selectedId={selectedId}
              onLocationClick={(loc) => { setSelectedId(loc.id); setEditing(false); }}
              height="h-[360px]"
              language={language}
              className="rounded-[10px]"
              tUnits={t("admin.locations.unitCount").toLowerCase()}
            />
          </div>

          {/* Selected location detail / edit */}
          {!selected ? (
            <div className="rounded-[14px] border border-border bg-card p-12 text-center shadow-card">
              <MapPin className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{t("admin.locations.selectLocation")}</p>
            </div>
          ) : editing ? (
            /* ── Edit mode ── */
            <div className="space-y-4 rounded-[14px] border border-border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-navy-ink">{t("admin.editListing")}</h2>
                <button onClick={() => setEditing(false)} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div>
                <label className={fieldLabel}>{t("admin.title_field")}</label>
                <input className={inp} value={editLoc.name} onChange={(e) => setEditLoc({ ...editLoc, name: e.target.value })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={fieldLabel}>{t("admin.address")}</label>
                  <input className={inp} value={editLoc.address} onChange={(e) => setEditLoc({ ...editLoc, address: e.target.value })} />
                </div>
                <div>
                  <label className={fieldLabel}>{t("admin.city")}</label>
                  <input className={inp} value={editLoc.city} onChange={(e) => setEditLoc({ ...editLoc, city: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={fieldLabel}>{t("admin.locations.openingHours")}</label>
                <input className={inp} value={editLoc.openingHours} onChange={(e) => setEditLoc({ ...editLoc, openingHours: e.target.value })} />
              </div>
              <div>
                <label className={fieldLabel}>{t("admin.description")}</label>
                <textarea className={inp + " min-h-[60px]"} value={editLoc.description} onChange={(e) => setEditLoc({ ...editLoc, description: e.target.value })} />
              </div>
              <div>
                <label className={fieldLabel}>{t("admin.locations.imageUrls")}</label>
                <div className="mt-1.5">
                  <ImageUploader images={editLoc.images} onChange={imgs => setEditLoc({ ...editLoc, images: imgs })} />
                </div>
              </div>
              <div>
                <label className={fieldLabel}>
                  {t("admin.locations.externalId")}
                  <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                    {t("admin.locations.externalIdHint")}
                  </span>
                </label>
                <input
                  className={inp}
                  placeholder={t("admin.locations.externalIdPlaceholder")}
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
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button variant="outline" onClick={() => setEditing(false)}>{t("admin.cancel")}</Button>
                <Button onClick={handleUpdateLoc} disabled={updateLocMutation.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {updateLocMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {t("admin.save")}
                </Button>
              </div>
            </div>
          ) : (
            /* ── View mode ── */
            <div className="space-y-5">
              {/* Detail header card */}
              <div className="rounded-[14px] border border-border bg-card p-6 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-bold text-navy-ink">{selected.name}</h2>
                      {selected.isActive
                        ? <StatusTag kind="ok"><CheckCircle2 className="h-3 w-3" />{t("admin.locations.tagPublished")}</StatusTag>
                        : <StatusTag kind="muted">{t("admin.locations.tagHidden")}</StatusTag>}
                      {isGeocoded(selected)
                        ? <StatusTag kind="ok"><Pin className="h-3 w-3" />{t("admin.locations.tagGeocoded")}</StatusTag>
                        : <StatusTag kind="warn"><AlertCircle className="h-3 w-3" />{t("admin.locations.tagNotGeocoded")}</StatusTag>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{selected.address}, {selected.city}</p>
                    {selected.supplierName && (
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        {t("admin.locations.supplier")}: <span className="text-ink-2">{selected.supplierName}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9" onClick={startEdit}>
                      <Edit className="mr-1 h-3.5 w-3.5" /> {t("admin.edit")}
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={async () => {
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
                {selected.description && <p className="mt-4 text-sm leading-relaxed text-ink-2">{selected.description}</p>}
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5 border-t border-border pt-4 text-[13px] text-muted-foreground">
                  {selected.openingHours && (
                    <span><span className="font-mono-label text-[11px] uppercase tracking-wide">{t("admin.locations.openingHours")}</span> · {selected.openingHours}</span>
                  )}
                  <span><span className="font-mono-label text-[11px] uppercase tracking-wide">{t("admin.locations.latLng")}</span> · {selected.lat}, {selected.lng}</span>
                </div>
              </div>

              {/* ── Units table ── */}
              <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-card">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <h3 className="font-display text-[15px] font-semibold text-navy-ink">
                    {t("admin.locations.units")} <span className="text-muted-foreground">({selected.units?.length ?? 0})</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-9" onClick={() => setBulkImportOpen(true)}>
                      <Upload className="mr-1 h-3.5 w-3.5" /> {t("admin.bulkImport")}
                    </Button>
                    <Button size="sm" variant="outline" className="h-9" onClick={() => { setNewUnit(emptyUnit); setAddUnitOpen(true); }}>
                      <PlusCircle className="mr-1 h-3.5 w-3.5" /> {t("admin.locations.addUnit")}
                    </Button>
                  </div>
                </div>
                {(!selected.units || selected.units.length === 0) ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">{t("admin.locations.noUnits")}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border bg-secondary/40">
                        <tr>
                          <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.title_field")}</th>
                          <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.type")}</th>
                          <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.locations.sizeM2")}</th>
                          <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.locations.quantity")}</th>
                          <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.price")}</th>
                          <th className="px-5 py-3 text-right font-medium text-muted-foreground">{t("admin.actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.units.map((u) => {
                          const Icon = typeIcons[u.type] || Warehouse;
                          return (
                            <tr key={u.id} className="border-b border-border transition-colors last:border-0 hover:bg-secondary/30">
                              <td className="px-5 py-3.5 font-medium text-navy-ink">{u.title}</td>
                              <td className="px-5 py-3.5">
                                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                  <Icon className="h-4 w-4" />
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-muted-foreground">{u.sizeM2 ?? "—"}</td>
                              <td className="px-5 py-3.5 text-muted-foreground">{u.quantityTotal ?? "—"}</td>
                              <td className="px-5 py-3.5 text-ink-2">€{u.priceFrom} <span className="text-muted-foreground">{u.priceUnit}</span></td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    aria-label={t("admin.edit")}
                                    onClick={() => { setEditingUnit({ ...u }); setEditUnitOpen(true); }}
                                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-navy-ink"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    aria-label={t("admin.delete")}
                                    onClick={async () => {
                                      if (!confirm(t("admin.deletePartnerConfirm"))) return;
                                      try {
                                        await apiClient.delete(`/locations/${selected.id}/units/${u.id}`);
                                        invalidate();
                                        toast.success(t("admin.locations.unitDeleted"));
                                      } catch (err: any) {
                                        toast.error(err.message || t("provider.listings.deleteFailed"));
                                      }
                                    }}
                                    className="rounded-md p-1.5 text-destructive transition-colors hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
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
          <DialogHeader><DialogTitle className="font-display text-navy-ink">{t("admin.locations.add")}</DialogTitle></DialogHeader>
          <div className="space-y-3.5">
            <div>
              <label className={fieldLabel}>{t("admin.locations.supplier")}</label>
              <select className={inp} value={newLoc.supplierId} onChange={(e) => setNewLoc({ ...newLoc, supplierId: e.target.value })}>
                <option value="">—</option>
                {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={fieldLabel}>{t("admin.title_field")} <span className="text-destructive">*</span></label>
              <input className={inp} value={newLoc.name} onChange={(e) => setNewLoc({ ...newLoc, name: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={fieldLabel}>{t("admin.address")} <span className="text-destructive">*</span></label>
                <input className={inp} value={newLoc.address} onChange={(e) => setNewLoc({ ...newLoc, address: e.target.value })} />
              </div>
              <div>
                <label className={fieldLabel}>{t("admin.city")} <span className="text-destructive">*</span></label>
                <input className={inp} value={newLoc.city} onChange={(e) => setNewLoc({ ...newLoc, city: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={fieldLabel}>{t("admin.locations.openingHours")}</label>
              <input className={inp} placeholder={t("admin.locations.openingHoursPlaceholder")} value={newLoc.openingHours} onChange={(e) => setNewLoc({ ...newLoc, openingHours: e.target.value })} />
            </div>
            <div>
              <label className={fieldLabel}>{t("admin.description")}</label>
              <textarea className={inp + " min-h-[60px]"} value={newLoc.description} onChange={(e) => setNewLoc({ ...newLoc, description: e.target.value })} />
            </div>
            <div>
              <label className={fieldLabel}>{t("admin.locations.imageUrls")}</label>
              <div className="mt-1.5">
                <ImageUploader images={newLoc.images} onChange={imgs => setNewLoc({ ...newLoc, images: imgs })} />
              </div>
            </div>
            <GeocodeLookup
              address={newLoc.address}
              lat={newLoc.lat}
              lng={newLoc.lng}
              onCoordsChange={(lat, lng) => setNewLoc({ ...newLoc, lat, lng })}
            />
            <div className="flex justify-end gap-2 border-t border-border pt-4">
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
          <DialogHeader><DialogTitle className="font-display text-navy-ink">{t("admin.locations.addUnit")}</DialogTitle></DialogHeader>
          <div className="space-y-3.5">
            <div>
              <label className={fieldLabel}>{t("admin.title_field")} <span className="text-destructive">*</span></label>
              <input className={inp} placeholder={t("admin.locations.unitPlaceholder")} value={newUnit.title} onChange={(e) => setNewUnit({ ...newUnit, title: e.target.value })} />
            </div>
            <div>
              <label className={fieldLabel}>{t("admin.type")} <span className="text-destructive">*</span></label>
              <select className={inp} value={newUnit.type} onChange={(e) => setNewUnit({ ...newUnit, type: e.target.value as any })}>
                <option value="Warehouse">{t("admin.warehouseType")}</option>
                <option value="Moving">{t("admin.movingType")}</option>
                <option value="Trailer">{t("admin.trailerType")}</option>
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={fieldLabel}>{t("admin.price")} (€) <span className="text-destructive">*</span></label>
                <input type="number" className={inp} value={newUnit.priceFrom} onChange={(e) => setNewUnit({ ...newUnit, priceFrom: e.target.value })} />
              </div>
              <div>
                <label className={fieldLabel}>{t("admin.locations.priceUnit")}</label>
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
                <label className={fieldLabel}>{t("admin.locations.sizeM2")}</label>
                <input type="number" className={inp} value={newUnit.sizeM2} onChange={(e) => setNewUnit({ ...newUnit, sizeM2: e.target.value })} />
              </div>
              <div>
                <label className={fieldLabel}>{t("admin.locations.quantity")}</label>
                <input type="number" className={inp} value={newUnit.quantityTotal} onChange={(e) => setNewUnit({ ...newUnit, quantityTotal: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={fieldLabel}>{t("admin.description")}</label>
              <textarea className={inp + " min-h-[60px]"} value={newUnit.description} onChange={(e) => setNewUnit({ ...newUnit, description: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={fieldLabel}>{t("admin.locations.vatRate")}</label>
                <select className={inp} value={newUnit.vatRate} onChange={(e) => setNewUnit({ ...newUnit, vatRate: e.target.value })}>
                  <option value="">{t("admin.locations.vatDefault")}</option>
                  <option value="24">{t("admin.locations.vatStandard")}</option>
                  <option value="13">{t("admin.locations.vatReduced13")}</option>
                  <option value="9">{t("admin.locations.vatReduced9")}</option>
                  <option value="0">{t("admin.locations.vatExempt")}</option>
                </select>
              </div>
              <div className="flex items-end gap-2 pb-2.5">
                <input type="checkbox" id="unit-vat-incl" className="h-4 w-4 rounded border-line-2 text-accent focus:ring-primary/30"
                  checked={newUnit.pricesIncludeVat}
                  onChange={(e) => setNewUnit({ ...newUnit, pricesIncludeVat: e.target.checked })} />
                <label htmlFor="unit-vat-incl" className="text-[13px] font-medium text-ink-2">{t("admin.locations.vatIncluded")}</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border pt-4">
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
          <DialogHeader><DialogTitle className="font-display text-navy-ink">{t("admin.locations.editUnit")}</DialogTitle></DialogHeader>
          {editingUnit && (
            <div className="space-y-3.5">
              <div>
                <label className={fieldLabel}>{t("admin.title_field")}</label>
                <input className={inp} value={editingUnit.title} onChange={e => setEditingUnit({ ...editingUnit, title: e.target.value })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={fieldLabel}>{t("admin.price")} (€)</label>
                  <input type="number" className={inp} value={editingUnit.priceFrom ?? ""} onChange={e => setEditingUnit({ ...editingUnit, priceFrom: Number(e.target.value) })} />
                </div>
                <div>
                  <label className={fieldLabel}>{t("admin.locations.sizeM2")}</label>
                  <input type="number" className={inp} value={editingUnit.sizeM2 ?? ""} onChange={e => setEditingUnit({ ...editingUnit, sizeM2: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={fieldLabel}>{t("admin.locations.quantity")}</label>
                  <input type="number" className={inp} value={editingUnit.quantityTotal ?? ""} onChange={e => setEditingUnit({ ...editingUnit, quantityTotal: Number(e.target.value) })} />
                </div>
                <div>
                  <label className={fieldLabel}>{t("admin.locations.priceUnit")}</label>
                  <select className={inp} value={editingUnit.priceUnit ?? "/month"} onChange={e => setEditingUnit({ ...editingUnit, priceUnit: e.target.value })}>
                    <option value="/month">{t("admin.locations.perMonth")}</option>
                    <option value="/day">{t("admin.locations.perDay")}</option>
                    <option value="/hour">{t("admin.locations.perHour")}</option>
                    <option value="/time">{t("admin.locations.perTime")}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={fieldLabel}>{t("admin.locations.type")}</label>
                <select className={inp} value={editingUnit.type || ""} onChange={(e) => setEditingUnit({ ...editingUnit, type: e.target.value })}>
                  <option value="warehouse">{t("admin.locations.warehouse")}</option>
                  <option value="moving">{t("admin.locations.moving")}</option>
                  <option value="trailer">{t("admin.locations.trailer")}</option>
                </select>
              </div>
              <div>
                <label className={fieldLabel}>{t("admin.locations.vatRate")}</label>
                <select className={inp} value={editingUnit.vatRate ?? ""} onChange={(e) => setEditingUnit({ ...editingUnit, vatRate: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">—</option>
                  <option value="24">24%</option>
                  <option value="13">13%</option>
                  <option value="9">9%</option>
                  <option value="0">0%</option>
                </select>
              </div>
              <div>
                <label className={fieldLabel}>{t("admin.locations.description")}</label>
                <textarea className={inp} rows={2} value={editingUnit.description || ""} onChange={(e) => setEditingUnit({ ...editingUnit, description: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border-line-2 text-accent focus:ring-primary/30" checked={editingUnit.isActive !== false}
                  onChange={e => setEditingUnit({ ...editingUnit, isActive: e.target.checked })} />
                <label className="text-[13px] font-medium text-ink-2">{t("admin.locations.active")}</label>
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-4">
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
                      toast.success(t("toast.unitUpdated"));
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
