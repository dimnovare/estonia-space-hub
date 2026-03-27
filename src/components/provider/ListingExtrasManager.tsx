import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useSupplierListingExtras, useCreateListingExtra, useUpdateListingExtra, useRemoveListingExtra, usePricingConfig } from "@/hooks/queries";
import { Loader2, Plus, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

function labelToKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export default function ListingExtrasManager({ listingId }: { listingId: string }) {
  const { t } = useLanguage();
  const { data: extras = [], isLoading } = useSupplierListingExtras(listingId);
  const { data: pricingConfig } = usePricingConfig();
  const createExtra = useCreateListingExtra();
  const updateExtra = useUpdateListingExtra();
  const removeExtra = useRemoveListingExtra();

  const partnerDiscount = (pricingConfig as any)?.defaultPartnerDiscount ?? 15;
  const minMargin = (pricingConfig as any)?.ruumlyMinMarginRate ?? 8;
  const customerDiscount = Math.max(0, partnerDiscount - minMargin);
  const calcCustomerPrice = (publicPrice: number) =>
    Math.round(publicPrice * (1 - customerDiscount / 100) * 100) / 100;

  const [newLabel, setNewLabel] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newNoDiscount, setNewNoDiscount] = useState(false);

  const handleAdd = () => {
    const label = newLabel.trim();
    const price = parseFloat(newPrice);
    if (!label) { toast.error(t("provider.extras.labelRequired")); return; }
    if (isNaN(price) || price <= 0) { toast.error(t("provider.extras.priceRequired")); return; }

    createExtra.mutate(
      {
        listingId,
        data: {
          key: labelToKey(label),
          label,
          description: newDesc.trim() || undefined,
          publicPrice: price,
          ...(newNoDiscount ? { partnerDiscountRate: 0 } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success(t("provider.extras.added"));
          setNewLabel("");
          setNewDesc("");
          setNewPrice("");
          setNewNoDiscount(false);
        },
        onError: () => toast.error(t("provider.extras.addError")),
      }
    );
  };

  const handleToggle = (extraId: string, isActive: boolean) => {
    updateExtra.mutate(
      { extraId, data: { isActive } },
      { onError: () => toast.error(t("provider.extras.updateError")) }
    );
  };

  const handleRemove = (extraId: string) => {
    removeExtra.mutate(extraId, {
      onSuccess: () => toast.success(t("provider.extras.removed")),
      onError: () => toast.error(t("provider.extras.removeError")),
    });
  };

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  const parsedNewPrice = parseFloat(newPrice);
  const showCustomerPreview = !isNaN(parsedNewPrice) && parsedNewPrice > 0;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">{t("provider.extras.title")}</h3>

      <div className="flex items-start gap-2 rounded-lg border border-accent/20 bg-accent/5 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p className="text-xs text-muted-foreground">
          {t("provider.extras.tip")}
        </p>
      </div>

      {extras.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">{t("provider.extras.label")}</th>
                <th className="pb-2 pr-3 font-medium">{t("provider.extras.yourPrice")}</th>
                <th className="pb-2 pr-3 font-medium">{t("provider.extras.customerSees")}</th>
                <th className="pb-2 pr-3 font-medium">{t("provider.extras.active")}</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {extras.map((extra) => (
                <tr key={extra.id} className="border-b border-border/50 last:border-0">
                  <td className="py-2 pr-3">
                    <div className="font-medium">{extra.label}</div>
                    {extra.description && (
                      <div className="text-muted-foreground">{extra.description}</div>
                    )}
                  </td>
                  <td className="py-2 pr-3">€{extra.publicPrice}</td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    €{extra.price ?? calcCustomerPrice(extra.publicPrice)}
                  </td>
                  <td className="py-2 pr-3">
                    <Switch
                      checked={extra.isActive}
                      onCheckedChange={(v) => handleToggle(extra.id, v)}
                      disabled={updateExtra.isPending}
                    />
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => handleRemove(extra.id)}
                      disabled={removeExtra.isPending}
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {extras.length === 0 && (
        <p className="text-xs text-muted-foreground">{t("provider.extras.none")}</p>
      )}

      <div className="space-y-2 rounded-lg border border-border p-3">
        <p className="text-xs font-medium">{t("provider.extras.addNew")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            placeholder={t("provider.extras.labelPlaceholder")}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            maxLength={100}
          />
          <Input
            placeholder={t("provider.extras.descPlaceholder")}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            maxLength={200}
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[11px] text-muted-foreground">
              Teie tavahind (otse klientidele)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder={t("provider.extras.pricePlaceholder")}
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
            />
            {showCustomerPreview && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t("provider.extras.customerWillSee")}: €{calcCustomerPrice(parsedNewPrice)}
                {customerDiscount > 0 && (
                  <span className="ml-1 text-primary">
                    ({customerDiscount}% soodustus vs teie hind)
                  </span>
                )}
              </p>
            )}
          </div>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={createExtra.isPending}
          >
            {createExtra.isPending ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="mr-1 h-3.5 w-3.5" />
            )}
            {t("provider.extras.add")}
          </Button>
        </div>
      </div>
    </div>
  );
}
