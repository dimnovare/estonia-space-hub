import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useLocations, useCreateLocation, useUpdateLocation, useAddUnit } from "@/hooks/queries";
import { ESTONIAN_CITIES } from "@/lib/constants";
import { Loader2, MapPin, Warehouse, Truck, CarFront, Plus, Pencil } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SupplierLocation } from "@/services/types";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

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

// ── Schemas ──

const locationSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  description: z.string().optional(),
  openingHours: z.string().optional(),
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
  const isEdit = !!locationId;

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
        { id: locationId!, data: { name: data.name, address: data.address, city: data.city, lat: data.lat ?? 0, lng: data.lng ?? 0, description: data.description, openingHours: data.openingHours } },
        {
          onSuccess: () => {
            toast.success(t("toast.locationUpdated"));
            onOpenChange(false);
          },
          onError: () => toast.error(t("toast.locationEditError")),
        }
      );
    } else {
      createLoc.mutate(
        { supplierId: "", name: data.name, address: data.address, city: data.city, lat: data.lat ?? 0, lng: data.lng ?? 0, description: data.description, openingHours: data.openingHours },
        {
          onSuccess: () => {
            toast.success(t("toast.locationCreated"));
            onOpenChange(false);
          },
          onError: () => toast.error(t("toast.locationCreateError")),
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
            <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.locationName")}</label>
            <Input {...form.register("name")} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.locationAddress")}</label>
            <Input {...form.register("address")} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.locationCity")}</label>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.locationLat")}</label>
              <Input type="number" step="any" {...form.register("lat")} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.locationLng")}</label>
              <Input type="number" step="any" {...form.register("lng")} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.locationHours")}</label>
            <Input {...form.register("openingHours")} />
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
  const { t } = useLanguage();
  const addUnit = useAddUnit();

  const form = useForm<UnitForm>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      title: "",
      type: "Warehouse",
      priceFrom: 0,
      priceUnit: "€/kuu",
      description: "",
    },
  });

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
        },
      },
      {
        onSuccess: () => {
          toast.success(t("toast.unitAdded"));
          onOpenChange(false);
        },
        onError: () => toast.error(t("toast.unitAddError")),
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
                    <SelectItem value="Moving">{t("provider.listings.typeMoving")}</SelectItem>
                    <SelectItem value="Trailer">{t("provider.listings.typeTrailer")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.unitPriceFrom")}</label>
              <Input type="number" step="0.01" {...form.register("priceFrom")} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.unitPriceUnit")}</label>
              <Input {...form.register("priceUnit")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <Input type="number" step="0.1" {...form.register("vatRate")} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.unitDesc")}</label>
            <Textarea rows={2} {...form.register("description")} />
          </div>
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
  const { data: locations = [], isLoading } = useLocations();

  const [locDialogOpen, setLocDialogOpen] = useState(false);
  const [editLoc, setEditLoc] = useState<SupplierLocation | null>(null);
  const [unitDialogLocId, setUnitDialogLocId] = useState<string | null>(null);

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">
          {t("provider.listings.title")}
        </h1>
        <Button size="sm" onClick={() => setLocDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {t("provider.listings.addLocation")}
        </Button>
      </div>

      {locations.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground/20" />
          <p className="mt-3 text-sm font-medium">
            {t("provider.listings.noLocations")}
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {t("provider.listings.noLocationsDesc")}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {locations.map((loc) => (
            <div key={loc.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium">{loc.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">· {loc.city}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditLoc(loc)}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  title={t("provider.listings.editLocation")}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {loc.unitCount} {t("location.units")}
                </span>
              </div>

              {loc.units && loc.units.length > 0 ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">{t("provider.listings.unitTitle")}</th>
                        <th className="pb-2 pr-4 font-medium">{t("admin.locations.sizeM2")}</th>
                        <th className="pb-2 pr-4 font-medium">{t("admin.locations.quantity")}</th>
                        <th className="pb-2 font-medium">{t("listing.price")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loc.units.map((unit) => {
                        const UIcon = TYPE_ICON[unit.type] || Warehouse;
                        return (
                          <tr key={unit.id} className="border-b border-border/50 last:border-0">
                            <td className="py-2 pr-4">
                              <span className="flex items-center gap-1.5">
                                <UIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                {unit.title}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-muted-foreground">
                              {unit.sizeM2 ? `${unit.sizeM2} m²` : "—"}
                            </td>
                            <td className="py-2 pr-4 text-muted-foreground">
                              {unit.quantityTotal ?? 1}
                            </td>
                            <td className="py-2">
                              €{unit.priceFrom}
                              <span className="text-muted-foreground">
                                /{unit.priceUnit?.replace("€/", "") || "kuu"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("provider.listings.noUnitsYet")}
                </p>
              )}

              <div className="mt-3 border-t border-border/50 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUnitDialogLocId(loc.id)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {t("provider.listings.addUnit")}
                </Button>
              </div>
            </div>
          ))}
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
    </div>
  );
}
