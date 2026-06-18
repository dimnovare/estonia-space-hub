import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useLocations, useCreateLocation, useUpdateLocation, useAddUnit } from "@/hooks/queries";
import { useFeatureDefinitions } from "@/hooks/useFeatureDefinitions";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { ESTONIAN_CITIES } from "@/lib/constants";
import { Loader2, MapPin, Warehouse, Truck, CarFront, Plus, Pencil, ChevronDown, ChevronUp, Trash2, Eye, EyeOff, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ListingExtrasManager from "./ListingExtrasManager";
import ImageUploader from "@/components/admin/ImageUploader";
import type { SupplierLocation } from "@/services/types";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { trackEvent } from "@/lib/analytics";
import { formatPriceUnit } from "@/lib/priceUnit";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { queryKeys } from "@/services/queryKeys";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const TYPE_ICON: Record<string, LucideIcon> = {
  warehouse: Warehouse, Warehouse: Warehouse,
  moving: Truck, Moving: Truck,
  trailer: CarFront, Trailer: CarFront,
};

const TYPE_LABEL_KEY: Record<string, string> = {
  warehouse: "provider.listings.typeWarehouse", Warehouse: "provider.listings.typeWarehouse",
  moving: "provider.listings.typeMoving", Moving: "provider.listings.typeMoving",
  trailer: "provider.listings.typeTrailer", Trailer: "provider.listings.typeTrailer",
};

// ── Schemas ──

const locationSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  description: z.string().optional(),
  openingHours: z.string().optional(),
  images: z.array(z.string()).optional(),
});
type LocationForm = z.infer<typeof locationSchema>;

const unitSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["Warehouse", "Moving", "Trailer"]),
  priceFrom: z.coerce.number().min(0),
  priceUnit: z.string().min(1),
  sizeM2: z.coerce.number().optional(),
  quantityTotal: z.coerce.number().optional(),
  description: z.string().optional(),
  vatRate: z.coerce.number().optional(),
});
type UnitForm = z.infer<typeof unitSchema>;

// ── Location Dialog ──

function LocationDialog({
  open,
  onOpenChange,
  defaultValues,
  locationId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultValues?: Partial<LocationForm>;
  locationId?: string; // if set, we're editing
}) {
  const { t } = useLanguage();
  const createLoc = useCreateLocation();
  const updateLoc = useUpdateLocation();
  const { user } = useAuth();
  const isEdit = !!locationId;
  const [images, setImages] = useState<string[]>(defaultValues?.images || []);
  const form = useForm<LocationForm>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      description: "",
      openingHours: "",
      ...defaultValues,
    },
  });

  const isPending = createLoc.isPending || updateLoc.isPending;

  const onSubmit = (data: LocationForm) => {
    if (isEdit) {
      updateLoc.mutate(
        { id: locationId!, data: { name: data.name, address: data.address, city: data.city, lat: data.lat ?? 0, lng: data.lng ?? 0, description: data.description, openingHours: data.openingHours, images } },
        {
          onSuccess: () => {
            toast.success(t("toast.locationUpdated"));
            onOpenChange(false);
          },
          onError: (err: any) => toast.error(err?.message || t("toast.locationEditError")),
        }
      );
    } else {
      createLoc.mutate(
        { supplierId: user?.supplierId || undefined, name: data.name, address: data.address, city: data.city, lat: data.lat ?? 0, lng: data.lng ?? 0, description: data.description, openingHours: data.openingHours, images },
        {
          onSuccess: () => {
            toast.success(t("toast.locationCreated"));
            onOpenChange(false);
          },
          onError: (err: any) => toast.error(err?.message || t("toast.locationCreateError")),
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("provider.listings.editLocation") : t("provider.listings.addLocation")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isEdit ? t("provider.listings.editLocation") : t("provider.listings.addLocation")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.locationName")} <span className="text-destructive">*</span></label>
            <Input {...form.register("name")} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.locationCity")} <span className="text-destructive">*</span></label>
            <Controller
              control={form.control}
              name="city"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ESTONIAN_CITIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.locationAddress")} <span className="text-destructive">*</span></label>
              <Input {...form.register("address")} />
            </div>
            <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={async () => {
              const addr = form.getValues("address");
              const city = form.getValues("city");
              if (!addr) { toast.error(t("provider.listings.enterAddress")); return; }
              try {
                const q = encodeURIComponent(`${addr}, ${city || "Estonia"}`);
                const res = await fetch(
                  `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1&countrycodes=ee`,
                  { headers: { "User-Agent": "Ruumly/1.0 (info@ruumly.eu)" } }
                );
                const data = await res.json();
                if (data.length > 0) {
                  form.setValue("lat", parseFloat(data[0].lat));
                  form.setValue("lng", parseFloat(data[0].lon));
                  toast.success(t("provider.listings.coordsFound"));
                } else {
                  toast.error(t("provider.listings.addressNotFound"));
                }
              } catch {
                toast.error(t("provider.listings.geocodeFailed"));
              }
            }}>
              <MapPin className="mr-1 h-3.5 w-3.5" /> {t("provider.listings.findCoords")}
            </Button>
          </div>
          {(form.watch("lat") || form.watch("lng")) && (
            <p className="text-xs text-muted-foreground">
              {t("provider.listings.coordinates")}: {form.watch("lat")}, {form.watch("lng")}
            </p>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.locationHours")}</label>
            <Input {...form.register("openingHours")} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.images")}</label>
            <ImageUploader images={images} onChange={setImages} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.locationDesc")}</label>
            <Textarea rows={3} {...form.register("description")} />
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("provider.listings.saving")}</>
            ) : (
              t("provider.listings.save")
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Unit Dialog ──

function UnitDialog({
  open,
  onOpenChange,
  locationId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  locationId: string;
}) {
  const { t, language } = useLanguage();
  const { showMovingService, showTrailerService } = usePlatformSettings();
  const addUnit = useAddUnit();
  const { data: featureDefs = {} } = useFeatureDefinitions();
  const [features, setFeatures] = useState<Record<string, boolean>>({});

  const form = useForm<UnitForm>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      title: "",
      type: "Warehouse",
      priceFrom: 0,
      priceUnit: "€/month",
      description: "",
    },
  });

  const watchedType = form.watch("type")?.toLowerCase() || "warehouse";
  const typeDefs = featureDefs[watchedType] || [];

  const onSubmit = (data: UnitForm) => {
    addUnit.mutate(
      {
        locationId,
        unit: {
          title: data.title,
          type: data.type,
          priceFrom: data.priceFrom,
          priceUnit: data.priceUnit,
          sizeM2: data.sizeM2,
          quantityTotal: data.quantityTotal,
          description: data.description,
          vatRate: data.vatRate,
          pricesIncludeVat: false,
          features: Object.fromEntries(
            Object.entries(features).filter(([, v]) => v)
          ),
        },
      },
      {
        onSuccess: () => {
          trackEvent("provider_first_unit", {});
          toast.success(t("toast.unitAdded"));
          onOpenChange(false);
        },
        onError: (err: any) => toast.error(err?.message || t("toast.unitAddError")),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("provider.listings.addUnit")}</DialogTitle>
          <DialogDescription className="sr-only">{t("provider.listings.addUnit")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.unitTitle")} <span className="text-destructive">*</span></label>
            <Input {...form.register("title")} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.unitType")} <span className="text-destructive">*</span></label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Warehouse">{t("provider.listings.typeWarehouse")}</SelectItem>
                    {showMovingService  && <SelectItem value="Moving">{t("provider.listings.typeMoving")}</SelectItem>}
                    {showTrailerService && <SelectItem value="Trailer">{t("provider.listings.typeTrailer")}</SelectItem>}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.unitPriceFrom")} <span className="text-destructive">*</span></label>
              <Input type="number" step="0.01" {...form.register("priceFrom")} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.unitPriceUnit")}</label>
              <Input {...form.register("priceUnit")} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.unitSizeM2")}</label>
              <Input type="number" step="0.1" {...form.register("sizeM2")} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.unitQuantity")}</label>
              <Input type="number" {...form.register("quantityTotal")} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.unitVatRate")}</label>
            <Controller
              control={form.control}
              name="vatRate"
              render={({ field }) => (
                <Select value={String(field.value ?? "")} onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}>
                  <SelectTrigger><SelectValue placeholder={t("provider.listings.selectVatRate")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24% ({t("provider.listings.vatStandard")})</SelectItem>
                    <SelectItem value="13">13% ({t("provider.listings.vatReduced")})</SelectItem>
                    <SelectItem value="9">9% ({t("provider.listings.vatReduced")})</SelectItem>
                    <SelectItem value="0">0% ({t("provider.listings.vatExempt")})</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.unitDesc")}</label>
            <Textarea rows={2} {...form.register("description")} />
          </div>
          {typeDefs.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.features") || "Features"}</label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {typeDefs.map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFeatures(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      features[f.key]
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-muted-foreground hover:border-foreground"
                    }`}
                  >
                    {f.labels[language] || f.labels.en || f.key}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Button type="submit" disabled={addUnit.isPending} className="w-full">
            {addUnit.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("provider.listings.saving")}</>
            ) : (
              t("provider.listings.save")
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ──

export default function ProviderListings() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const supplierId = useImpersonatedSupplierId();
  const { data: locations = [], isLoading } = useLocations(supplierId ? { supplierId } : undefined);

  const [locDialogOpen, setLocDialogOpen] = useState(false);
  const [editLoc, setEditLoc] = useState<SupplierLocation | null>(null);
  const [unitDialogLocId, setUnitDialogLocId] = useState<string | null>(null);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [editUnitOpen, setEditUnitOpen] = useState(false);
  const [editingUnitData, setEditingUnitData] = useState<any>(null);

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">
            {t("provider.listings.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("provider.listings.subtitle")}
          </p>
        </div>
        <Button size="sm" onClick={() => setLocDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {t("provider.listings.addLocation")}
        </Button>
      </div>

      {locations.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <Warehouse className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="mt-4 text-base font-semibold">
            {t("provider.noListings")}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {t("provider.noListingsDesc")}
          </p>
          <button
            type="button"
            onClick={() => setLocDialogOpen(true)}
            className="mt-5 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent/90 transition-colors"
          >
            {t("provider.noListingsCta")}
          </button>
          {/* 3-step mini guide */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {[
              { step: 1, label: t("provider.noListingsStep1") },
              { step: 2, label: t("provider.noListingsStep2") },
              { step: 3, label: t("provider.noListingsStep3") },
            ].map(({ step, label }) => (
              <div key={step} className="flex flex-col items-center gap-1">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-accent/30 text-sm font-bold text-accent">
                  {step}
                </span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {locations.map((loc) => {
            const locViews = (loc as { viewCount?: number }).viewCount;
            return (
            <div key={loc.id} className="overflow-hidden rounded-[14px] border border-border bg-card shadow-card">
              {/* Location card header — teal pin tile + name + Published tag + sub; right views + Edit */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] bg-teal/15 text-teal-deep">
                    <MapPin className="h-[22px] w-[22px]" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[15.5px] font-bold text-navy-ink">{loc.name}</span>
                      {loc.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                          {t("provider.listings.published")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {t("admin.inactive")}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-[13px] text-muted-foreground">
                      {loc.address ? `${loc.address}, ${loc.city}` : loc.city} · {loc.unitCount} {t("location.units")}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {typeof locViews === "number" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" />
                      {locViews.toLocaleString()} {t("provider.listings.views")}
                    </span>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setEditLoc(loc)}>
                    {t("admin.edit")}
                  </Button>
                  <button
                    type="button"
                    title={loc.isActive ? t("provider.unpublishLocation") : t("provider.publishLocation")}
                    onClick={async () => {
                      const action = loc.isActive ? "unpublish" : "publish";
                      try {
                        await apiClient.patch(`/locations/${loc.id}/${action}`, {});
                        queryClient.invalidateQueries({ queryKey: queryKeys.locations.all() });
                        toast.success(loc.isActive ? t("provider.unpublishSuccess") : t("provider.publishSuccess"));
                      } catch (err: any) {
                        toast.error(err?.message || (loc.isActive ? t("provider.unpublishError") : t("provider.publishError")));
                      }
                    }}
                    className={`shrink-0 rounded-md p-1.5 transition-colors ${loc.isActive ? "text-success hover:bg-success/10" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                  >
                    {loc.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(t("provider.listings.deleteLocationConfirm"))) return;
                      try {
                        await apiClient.delete(`/locations/${loc.id}`);
                        queryClient.invalidateQueries({ queryKey: queryKeys.locations.all() });
                        toast.success(t("provider.listings.locationDeleted"));
                      } catch (err: any) {
                        toast.error(err?.message || t("provider.listings.deleteFailed"));
                      }
                    }}
                    className="shrink-0 rounded-md p-1.5 text-destructive transition-colors hover:bg-destructive/10"
                    title={t("admin.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Striped 16/10 photo placeholder — swap target for uploaded location/unit photos */}
              <div className="px-5 pt-5">
                {loc.images && loc.images.length > 0 ? (
                  <div
                    className="aspect-[16/10] w-full max-w-sm overflow-hidden rounded-[10px] bg-cover bg-center"
                    style={{ backgroundImage: `url(${loc.images[0]})` }}
                  />
                ) : (
                  <div
                    className="flex aspect-[16/10] w-full max-w-sm items-center justify-center rounded-[10px]"
                    style={{ background: "repeating-linear-gradient(135deg,#e9eef7,#e9eef7 12px,#eef2fa 12px,#eef2fa 24px)" }}
                  >
                    <span className="font-mono-label text-[11px] uppercase tracking-wide" style={{ color: "#97A0B6" }}>
                      {t("provider.listings.photoCaption")}
                    </span>
                  </div>
                )}
              </div>

              <div className="px-5 pb-2">

              {loc.units && loc.units.length > 0 ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-2.5 pr-4 text-xs font-medium">{t("provider.listings.unitTitle")}</th>
                        <th className="pb-2.5 pr-4 text-xs font-medium">{t("provider.listings.unitType")}</th>
                        <th className="pb-2.5 pr-4 text-xs font-medium">{t("admin.locations.sizeM2")}</th>
                        <th className="pb-2.5 pr-4 text-xs font-medium">{t("provider.listings.colAvailable")}</th>
                        <th className="pb-2.5 pr-4 text-xs font-medium">{t("listing.price")}</th>
                        <th className="pb-2.5 pr-4 text-xs font-medium">{t("provider.listings.colBooking")}</th>
                        <th className="pb-2.5 text-xs font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {loc.units.map((unit) => {
                        const UIcon = TYPE_ICON[unit.type] || Warehouse;
                        const isExpanded = expandedUnit === unit.id;
                        const qty = unit.quantityTotal ?? 1;
                        return (
                          <tr key={unit.id} className="border-b border-border/50 last:border-0">
                            <td className="py-2.5 pr-4">
                              <span className="font-semibold text-foreground">{unit.title}</span>
                            </td>
                            <td className="py-2.5 pr-4">
                              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                <UIcon className="h-3.5 w-3.5 text-teal-deep" />
                                {t(TYPE_LABEL_KEY[unit.type] || "provider.listings.typeWarehouse")}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 text-muted-foreground">
                              {unit.sizeM2 ? `${unit.sizeM2} m²` : "—"}
                            </td>
                            <td className="py-2.5 pr-4">
                              {unit.availableNow ? (
                                <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                                  {t("provider.listings.available")}
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                                  {t("provider.listings.nLeft").replace("{count}", String(qty))}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 pr-4">
                              <span className="font-semibold text-foreground">€{unit.priceFrom}</span>
                              <span className="text-muted-foreground">
                                {formatPriceUnit(unit.priceUnit, t)}
                              </span>
                            </td>
                            <td className="py-2 pr-4">
                              {unit.bookingEnabled ? (
                                <span className="inline-flex items-center rounded-full bg-teal/15 px-2 py-0.5 text-[11px] font-medium text-teal-deep">
                                  {t("provider.listings.bookingOnline")}
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                  {t("provider.listings.bookingRequest")}
                                </span>
                              )}
                            </td>
                            <td className="py-2">
                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingUnitData({
                                      id: unit.id,
                                      locationId: loc.id,
                                      title: unit.title,
                                      type: unit.type,
                                      priceFrom: unit.priceFrom,
                                      priceUnit: unit.priceUnit || "€/month",
                                      sizeM2: unit.sizeM2,
                                      quantityTotal: unit.quantityTotal || 1,
                                      description: unit.description || "",
                                      vatRate: unit.vatRate,
                                      images: unit.images || [],
                                      features: (unit as { features?: Record<string, unknown> }).features ?? {},
                                    });
                                    setEditUnitOpen(true);
                                  }}
                                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                  title={t("provider.listings.editUnit") || "Edit"}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExpandedUnit(isExpanded ? null : unit.id)}
                                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                  title={t("provider.extras.title")}
                                >
                                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!confirm(t("provider.listings.deleteUnitConfirm") || "Delete this unit?")) return;
                                    try {
                                      await apiClient.delete(`/locations/${loc.id}/units/${unit.id}`);
                                      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all() });
                                      toast.success(t("toast.unitDeleted") || "Unit deleted");
                                    } catch (err: any) {
                                      toast.error(err?.message || t("provider.listings.deleteFailed"));
                                    }
                                  }}
                                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                  title={t("admin.delete")}
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
                  {/* Expanded extras panel */}
                  {expandedUnit && loc.units.some(u => u.id === expandedUnit) && (
                    <div className="mt-3 rounded-lg border border-border/50 bg-secondary/30 p-4">
                      <ListingExtrasManager listingId={expandedUnit} />
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("provider.listings.noUnitsYet")}
                </p>
              )}
              </div>

              {/* Card footer — soft-sm Add unit + Bulk import (Workflow tool, not plan-gated) */}
              <div className="flex flex-wrap items-center gap-2 p-5 pt-3">
                <button
                  type="button"
                  onClick={() => setUnitDialogLocId(loc.id)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-secondary px-3.5 text-[13px] font-semibold text-navy-ink transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("provider.listings.addUnit")}
                </button>
                <button
                  type="button"
                  title={t("provider.listings.bulkImportHint")}
                  onClick={() => toast.info(t("provider.listings.bulkImportHint"))}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-secondary px-3.5 text-[13px] font-semibold text-navy-ink transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {t("provider.listings.bulkImport")}
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {locations.length > 0 && (
        <div className="mt-4 flex items-center gap-4 rounded-lg border border-border p-3 text-xs text-muted-foreground">
          <span>{locations.length} {t("provider.listings.totalLocations")}</span>
          <span>{locations.reduce((sum, l) => sum + (l.units?.length ?? 0), 0)} {t("provider.listings.totalUnits")}</span>
          {locations.some(l => l.fullyBooked) && (
            <span className="text-destructive font-medium">
              {locations.filter(l => l.fullyBooked).length} {t("provider.listings.fullyBookedCount")}
            </span>
          )}
        </div>
      )}

      {/* Add Location Dialog */}
      <LocationDialog
        open={locDialogOpen}
        onOpenChange={setLocDialogOpen}
      />

      {/* Edit Location Dialog */}
      {editLoc && (
        <LocationDialog
          open={!!editLoc}
          onOpenChange={(v) => { if (!v) setEditLoc(null); }}
          locationId={editLoc.id}
          defaultValues={{
            name: editLoc.name,
            address: editLoc.address,
            city: editLoc.city,
            lat: editLoc.lat,
            lng: editLoc.lng,
            description: editLoc.description,
            openingHours: editLoc.openingHours ?? "",
            images: editLoc.images ?? [],
          }}
        />
      )}

      {/* Add Unit Dialog */}
      {unitDialogLocId && (
        <UnitDialog
          open={!!unitDialogLocId}
          onOpenChange={(v) => { if (!v) setUnitDialogLocId(null); }}
          locationId={unitDialogLocId}
        />
      )}

      {/* Edit Unit Dialog */}
      {editingUnitData && (
        <EditUnitDialog
          open={editUnitOpen}
          onOpenChange={(v) => { setEditUnitOpen(v); if (!v) setEditingUnitData(null); }}
          unitData={editingUnitData}
        />
      )}
    </div>
  );
}

// ── Edit Unit Dialog ──

function EditUnitDialog({
  open,
  onOpenChange,
  unitData,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  unitData: any;
}) {
  const { t, language } = useLanguage();
  const { showMovingService, showTrailerService } = usePlatformSettings();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<string[]>(unitData?.images || []);
  const { data: featureDefs = {} } = useFeatureDefinitions();
  const [features, setFeatures] = useState<Record<string, boolean>>(unitData?.features || {});

  const form = useForm<UnitForm>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      title: unitData?.title || "",
      type: unitData?.type || "Warehouse",
      priceFrom: unitData?.priceFrom || 0,
      priceUnit: unitData?.priceUnit || "€/month",
      sizeM2: unitData?.sizeM2,
      quantityTotal: unitData?.quantityTotal || 1,
      description: unitData?.description || "",
      vatRate: unitData?.vatRate,
    },
  });

  useEffect(() => {
    if (unitData) {
      form.reset({
        title: unitData.title || "",
        type: unitData.type || "Warehouse",
        priceFrom: unitData.priceFrom || 0,
        priceUnit: unitData.priceUnit || "€/month",
        sizeM2: unitData.sizeM2,
        quantityTotal: unitData.quantityTotal || 1,
        description: unitData.description || "",
        vatRate: unitData.vatRate,
      });
      setImages(unitData.images || []);
      setFeatures(unitData.features || {});
    }
  }, [unitData]);

  const onSubmit = async (data: UnitForm) => {
    setSaving(true);
    try {
      await apiClient.patch(
        `/locations/${unitData.locationId}/units/${unitData.id}`,
        {
          title: data.title,
          priceFrom: data.priceFrom,
          priceUnit: data.priceUnit,
          sizeM2: data.sizeM2,
          quantityTotal: data.quantityTotal,
          description: data.description,
          vatRate: data.vatRate,
          images,
          features: Object.fromEntries(
            Object.entries(features).filter(([, v]) => v)
          ),
        }
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all() });
      toast.success(t("toast.unitUpdated") || "Unit updated");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || t("toast.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("provider.listings.editUnit") || "Edit unit"}</DialogTitle>
          <DialogDescription className="sr-only">{t("provider.listings.editUnit") || "Edit unit"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.unitTitle")}</label>
            <Input {...form.register("title")} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.unitType")}</label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Warehouse">{t("provider.listings.typeWarehouse")}</SelectItem>
                    {showMovingService  && <SelectItem value="Moving">{t("provider.listings.typeMoving")}</SelectItem>}
                    {showTrailerService && <SelectItem value="Trailer">{t("provider.listings.typeTrailer")}</SelectItem>}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.unitPriceFrom")}</label>
              <Input type="number" step="0.01" {...form.register("priceFrom")} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.unitPriceUnit")}</label>
              <Input {...form.register("priceUnit")} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.unitSizeM2")}</label>
              <Input type="number" step="0.1" {...form.register("sizeM2")} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.unitQuantity")}</label>
              <Input type="number" {...form.register("quantityTotal")} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.unitVatRate")}</label>
            <Controller
              control={form.control}
              name="vatRate"
              render={({ field }) => (
                <Select value={String(field.value ?? "")} onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}>
                  <SelectTrigger><SelectValue placeholder={t("provider.listings.selectVatRate")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24% ({t("provider.listings.vatStandard")})</SelectItem>
                    <SelectItem value="13">13% ({t("provider.listings.vatReduced")})</SelectItem>
                    <SelectItem value="9">9% ({t("provider.listings.vatReduced")})</SelectItem>
                    <SelectItem value="0">0% ({t("provider.listings.vatExempt")})</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.unitDesc")}</label>
            <Textarea rows={2} {...form.register("description")} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.images") || "Images"}</label>
            <ImageUploader images={images} onChange={setImages} />
          </div>
          {(() => {
            const editType = form.watch("type")?.toLowerCase() || "warehouse";
            const defs = featureDefs[editType] || [];
            if (defs.length === 0) return null;
            return (
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.features") || "Features"}</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {defs.map(f => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFeatures(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        features[f.key]
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-muted-foreground hover:border-foreground"
                      }`}
                    >
                      {f.labels[language] || f.labels.en || f.key}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("account.saving")}</>
            ) : (
              t("provider.listings.saveUnit") || "Save changes"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
