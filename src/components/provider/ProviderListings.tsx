import { useLanguage } from "@/i18n/LanguageContext";
import { useLocations } from "@/hooks/queries";
import { Loader2, MapPin, Warehouse, Truck, CarFront } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TYPE_ICON: Record<string, LucideIcon> = {
  warehouse: Warehouse, Warehouse: Warehouse,
  moving: Truck, Moving: Truck,
  trailer: CarFront, Trailer: CarFront,
};

export default function ProviderListings() {
  const { t } = useLanguage();
  const { data: locations = [], isLoading } = useLocations();

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (locations.length === 0) return (
    <div className="flex flex-col items-center py-20 text-center">
      <MapPin className="h-12 w-12 text-muted-foreground/20" />
      <p className="mt-3 text-sm font-medium">
        {t("provider.listings.noLocations")}
      </p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        {t("provider.listings.noLocationsDesc")}
      </p>
    </div>
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">
        {t("provider.listings.title")}
      </h1>

      <div className="mt-6 space-y-4">
        {locations.map((loc) => (
          <div key={loc.id} className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium">{loc.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">· {loc.city}</span>
              </div>
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
          </div>
        ))}
      </div>
    </div>
  );
}
