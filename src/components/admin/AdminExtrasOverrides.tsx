import { useSupplierListingExtras, useUpdateListingExtra } from "@/hooks/queries";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function AdminExtrasOverrides({ listingId }: { listingId: string }) {
  const { data: extras = [], isLoading } = useSupplierListingExtras(listingId);
  const updateExtra = useUpdateListingExtra();

  const handleUpdate = (extraId: string, field: string, value: string) => {
    const numVal = value === "" ? null : Number(value);
    updateExtra.mutate(
      { extraId, data: { [field]: numVal } as any },
      { onError: (err: any) => toast.error(err?.message || "Salvestamine ebaõnnestus") }
    );
  };

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (extras.length === 0) return null;

  return (
    <div className="rounded-lg border border-border p-3 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Lisateenuste hinnakujundus (admin)
      </p>
      <div className="space-y-2">
        {extras.map((extra) => (
          <div key={extra.id} className="rounded border border-border/50 p-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{extra.label}</span>
              <span className="text-xs text-muted-foreground">
                Avalik hind: €{extra.publicPrice} → Kliendihind: €{extra.price}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-muted-foreground">
                  Partneri allahindlus % (tühi = partneri vaikimisi, 0 = ei allahindlust)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  className="h-8 text-xs"
                  placeholder="Partneri vaikimisi"
                  defaultValue={extra.partnerDiscountRate ?? ""}
                  onBlur={(e) => handleUpdate(extra.id, "partnerDiscountRate", e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">
                  Kliendihinna override (€, tühi = automaatne)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-8 text-xs"
                  placeholder="Automaatne"
                  defaultValue={extra.customerPriceOverride ?? ""}
                  onBlur={(e) => handleUpdate(extra.id, "customerPriceOverride", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
