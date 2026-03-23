import { useState } from "react";
import { Edit2, Save, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bankService } from "@/services";
import { toast } from "sonner";

export default function ProviderBilling() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [editingBank, setEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState({
    iban: "", bankAccountName: "", bankName: ""
  });

  const { data: bankDetails, isLoading: bankLoading } = useQuery({
    queryKey: ["bank-details"],
    queryFn: bankService.getBankDetails,
  });

  const saveBankMutation = useMutation({
    mutationFn: bankService.updateBankDetails,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-details"] });
      toast.success("Pangaandmed salvestatud");
      setEditingBank(false);
    },
    onError: (err: any) =>
      toast.error(err.message || "Salvestamine ebaõnnestus"),
  });

  const startEdit = () => {
    setBankForm({
      iban: bankDetails?.iban ?? "",
      bankAccountName: bankDetails?.bankAccountName ?? "",
      bankName: bankDetails?.bankName ?? "",
    });
    setEditingBank(true);
  };

  const formatIban = (iban?: string) => {
    if (!iban) return "—";
    return iban.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();
  };

  const inp = "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("provider.billing.title")}</h1>

      {/* Payout summary cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card-elevated p-5">
          <div className="text-sm text-muted-foreground">{t("provider.billing.nextPayout")}</div>
          <div className="mt-1 font-display text-2xl font-bold">—</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Andmed uuenevad pärast esimesi broneeringuid
          </div>
        </div>
        <div className="card-elevated p-5">
          <div className="text-sm text-muted-foreground">{t("provider.billing.totalPayouts")}</div>
          <div className="mt-1 font-display text-2xl font-bold">€0</div>
          <div className="mt-1 text-xs text-muted-foreground">{t("provider.billing.sinceJoined")}</div>
        </div>
      </div>

      {/* Bank details - editable */}
      <div className="mt-6 rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t("provider.billing.bankDetails")}</h3>
          {!editingBank && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={startEdit}>
              <Edit2 className="h-3 w-3" />
              Muuda
            </Button>
          )}
        </div>

        {editingBank ? (
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {t("provider.billing.iban")}
              </label>
              <input
                className={inp}
                placeholder="EE00 0000 0000 0000 0000"
                value={bankForm.iban}
                onChange={e => setBankForm(p => ({ ...p, iban: e.target.value }))}
              />
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Sisestage IBAN tühikutega või ilma
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {t("provider.billing.recipient")}
              </label>
              <input
                className={inp}
                placeholder="Ettevõtte nimi"
                value={bankForm.bankAccountName}
                onChange={e => setBankForm(p => ({ ...p, bankAccountName: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {t("provider.billing.bank")}
              </label>
              <input
                className={inp}
                placeholder="Swedbank, SEB, LHV..."
                value={bankForm.bankName}
                onChange={e => setBankForm(p => ({ ...p, bankName: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="gap-1"
                onClick={() => saveBankMutation.mutate(bankForm)}
                disabled={saveBankMutation.isPending}
              >
                {saveBankMutation.isPending
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvestan...</>
                  : <><Save className="h-3.5 w-3.5" /> Salvesta</>}
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditingBank(false)}>
                <X className="h-3.5 w-3.5" />
                Tühista
              </Button>
            </div>
          </div>
        ) : bankLoading ? (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Laadin...
          </div>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">{t("provider.billing.iban")}</span>
              <p className="font-mono">
                {bankDetails?.iban
                  ? formatIban(bankDetails.iban)
                  : <span className="text-muted-foreground italic">Lisage IBAN</span>}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">{t("provider.billing.recipient")}</span>
              <p>
                {bankDetails?.bankAccountName ||
                  <span className="text-muted-foreground italic">—</span>}
              </p>
            </div>
            {bankDetails?.bankName && (
              <div>
                <span className="text-xs text-muted-foreground">{t("provider.billing.bank")}</span>
                <p>{bankDetails.bankName}</p>
              </div>
            )}
          </div>
        )}

        {!editingBank && !bankDetails?.iban && !bankLoading && (
          <div className="mt-3 rounded-lg bg-warning/10 border border-warning/20 p-3 text-xs text-warning">
            ⚠️ Pangakonto andmed puuduvad. Lisage IBAN, et saada väljamakseid.
          </div>
        )}
      </div>

      {/* Empty payouts state */}
      <div className="mt-6 rounded-xl border border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Väljamaksete ajalugu ilmub siia pärast esimesi broneeringuid
        </p>
      </div>
    </div>
  );
}
