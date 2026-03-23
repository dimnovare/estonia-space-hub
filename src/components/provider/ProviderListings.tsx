import { useState } from "react";
import { MapPin, Edit, Plus, Check, X, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";

export default function ProviderListings() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["provider-listings"],
    queryFn: () => apiClient.get<any[]>("/admin/listings"),
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiClient.patch(`/admin/listings/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-listings"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Kuulutus uuendatud");
      setEditDialogListing(null);
    },
    onError: (err: any) => toast.error(err.message || "Uuendamine ebaõnnestus"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post("/admin/listings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-listings"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Kuulutus lisatud");
      setCreateOpen(false);
      setCreateStep(0);
      setNewListing({ title: "", type: "warehouse", city: "Tallinn", address: "", description: "", price: "", size: "", features: [] as string[] });
    },
    onError: (err: any) => toast.error(err.message || "Lisamine ebaõnnestus"),
  });

  const [editDialogListing, setEditDialogListing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ title: "", price: "", city: "", status: "" });
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(0);

  const [newListing, setNewListing] = useState({
    title: "", type: "warehouse", city: "Tallinn", address: "", description: "",
    price: "", size: "", features: [] as string[],
  });

  const featureKeys = [
    "provider.features.access", "provider.features.heating", "provider.features.cameras", "provider.features.alarm",
    "provider.features.loadingDock", "provider.features.forklift", "provider.features.insurance", "provider.features.lighting",
    "provider.features.parking", "provider.features.business"
  ];

  const toggleFeature = (f: string) => {
    setNewListing(prev => ({
      ...prev,
      features: prev.features.includes(f) ? prev.features.filter(x => x !== f) : [...prev.features, f]
    }));
  };

  const submitListing = () => {
    createMutation.mutate({
      title: newListing.title || "Uus kuulutus",
      type: newListing.type,
      city: newListing.city,
      address: newListing.address,
      description: newListing.description,
      price: parseInt(newListing.price) || 0,
      priceUnit: "€/kuu",
      status: "active",
    });
  };

  const steps = [t("provider.listings.stepBasic"), t("provider.listings.stepLocation"), t("provider.listings.stepPrice"), t("provider.listings.stepFeatures")];
  const inp = "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{t("provider.listings.title")}</h1>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> {t("provider.listings.add")}</Button>
      </div>

      {listings.length === 0 && (
        <div className="mt-12 flex flex-col items-center py-12 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground/20" />
          <p className="mt-3 text-sm font-medium">Kuulutusi pole veel</p>
          <p className="mt-1 text-xs text-muted-foreground">Lisage uus kuulutus ülaloleva nupuga</p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {listings.map((l: any) => {
          const statusLabel = l.status === "active" ? "Aktiivne" : "Peatatud";
          const statusColor = l.status === "active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning";
          return (
            <div key={l.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-14 w-14 rounded-lg bg-secondary overflow-hidden shrink-0">
                    <img src={l.images?.[0] || "/placeholder.svg"} alt={l.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{l.title}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{l.city} · {l.price ?? l.priceFrom}€/kuu</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>{statusLabel}</span>
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditDialogListing(l);
                    setEditForm({ title: l.title, price: String(l.price ?? l.priceFrom ?? ""), city: l.city, status: l.status });
                  }}>
                    <Edit className="h-3.5 w-3.5 mr-1.5" /> Muuda
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("provider.listings.createTitle")}</DialogTitle></DialogHeader>
          <div className="flex items-center gap-1 mb-4">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-1 flex-1">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i <= createStep ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>{i + 1}</div>
                <span className={`text-[10px] hidden sm:inline ${i <= createStep ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
                {i < steps.length - 1 && <div className={`mx-1 h-px flex-1 ${i < createStep ? "bg-accent" : "bg-border"}`} />}
              </div>
            ))}
          </div>

          {createStep === 0 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.listingTitle")}</label>
                <input value={newListing.title} onChange={e => setNewListing(p => ({ ...p, title: e.target.value }))} className={inp} placeholder="nt. Laobox Tallinn Kesklinn" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.serviceType")}</label>
                <select value={newListing.type} onChange={e => setNewListing(p => ({ ...p, type: e.target.value }))} className={inp}>
                  <option value="warehouse">{t("provider.listings.typeWarehouse")}</option>
                  <option value="moving">{t("provider.listings.typeMoving")}</option>
                  <option value="trailer">{t("provider.listings.typeTrailer")}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.description")}</label>
                <textarea value={newListing.description} onChange={e => setNewListing(p => ({ ...p, description: e.target.value }))} className={inp + " min-h-[80px]"} placeholder={t("provider.listings.descPlaceholder")} />
              </div>
            </div>
          )}

          {createStep === 1 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.city")}</label>
                <select value={newListing.city} onChange={e => setNewListing(p => ({ ...p, city: e.target.value }))} className={inp}>
                  <option>Tallinn</option><option>Tartu</option><option>Pärnu</option><option>Narva</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.address")}</label>
                <input value={newListing.address} onChange={e => setNewListing(p => ({ ...p, address: e.target.value }))} className={inp} />
              </div>
            </div>
          )}

          {createStep === 2 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.price")}</label>
                <input type="number" value={newListing.price} onChange={e => setNewListing(p => ({ ...p, price: e.target.value }))} className={inp} placeholder="nt. 49" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("provider.listings.size")}</label>
                <input type="number" value={newListing.size} onChange={e => setNewListing(p => ({ ...p, size: e.target.value }))} className={inp} placeholder="nt. 15" />
              </div>
              <div className="rounded-lg bg-accent/5 border border-accent/20 p-3">
                <p className="text-xs text-muted-foreground">
                  <strong>{t("provider.listings.commission")}</strong> {t("provider.listings.commissionDesc")}
                </p>
              </div>
            </div>
          )}

          {createStep === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{t("provider.listings.featuresDesc")}</p>
              <div className="grid grid-cols-2 gap-2">
                {featureKeys.map(fKey => {
                  const label = t(fKey);
                  return (
                    <button key={fKey} onClick={() => toggleFeature(fKey)} className={`rounded-lg border p-2.5 text-xs font-medium text-left transition-colors ${newListing.features.includes(fKey) ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-accent/50"}`}>
                      {newListing.features.includes(fKey) ? <Check className="inline h-3 w-3 mr-1" /> : null}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => createStep > 0 ? setCreateStep(createStep - 1) : setCreateOpen(false)}>
              {createStep === 0 ? t("provider.listings.cancelBtn") : t("provider.listings.back")}
            </Button>
            {createStep < steps.length - 1 ? (
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setCreateStep(createStep + 1)}>{t("provider.listings.next")}</Button>
            ) : (
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={createMutation.isPending} onClick={submitListing}>
                {createMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loome...</> : t("provider.listings.create")}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editDialogListing} onOpenChange={(o) => !o && setEditDialogListing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Muuda kuulutust</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Pealkiri</label>
              <input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Hind (€/kuu)</label>
                <input type="number" value={editForm.price} onChange={e => setEditForm(p => ({ ...p, price: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Linn</label>
                <input value={editForm.city} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} className={inp} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Staatus</label>
              <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} className={inp}>
                <option value="active">Aktiivne</option>
                <option value="paused">Peatatud</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setEditDialogListing(null)}>Tühista</Button>
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={updateMutation.isPending} onClick={() => {
                if (!editDialogListing) return;
                updateMutation.mutate({
                  id: editDialogListing.id,
                  data: {
                    title: editForm.title || editDialogListing.title,
                    price: editForm.price ? Number(editForm.price) : editDialogListing.price,
                    city: editForm.city || editDialogListing.city,
                    status: editForm.status || editDialogListing.status,
                  },
                });
              }}>
                {updateMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />...</> : "Salvesta"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
