import { useState } from "react";
import { MapPin, Edit, Plus, Check, X, Image, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";

const mockListings = [
  { id: "w1", title: "Laobox Tallinn Kesklinn", type: "warehouse", status: "Aktiivne", views: 234, bookings: 18, price: 49, city: "Tallinn", occupancy: 85 },
  { id: "w3", title: "SecureStore Ülemiste", type: "warehouse", status: "Aktiivne", views: 156, bookings: 12, price: 79, city: "Tallinn", occupancy: 92 },
];

export default function ProviderListings() {
  const { t } = useLanguage();
  const [listings, setListings] = useState(mockListings.map(l => ({ ...l, images: ["/placeholder.svg"] })));
  const [editId, setEditId] = useState<string | null>(null);
  const [editDialogListing, setEditDialogListing] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: "", price: "", city: "", status: "" });
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(0);

  const [newListing, setNewListing] = useState({
    title: "", type: "warehouse", city: "Tallinn", address: "", description: "",
    price: "", size: "", features: [] as string[], images: [] as string[],
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

  const addImage = () => {
    const fakeUrl = `https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop&t=${Date.now()}`;
    setNewListing(prev => ({ ...prev, images: [...prev.images, fakeUrl] }));
  };

  const submitListing = () => {
    const id = `w${Date.now()}`;
    setListings(prev => [...prev, {
      id, title: newListing.title || "Uus kuulutus", type: newListing.type,
      status: "Aktiivne", views: 0, bookings: 0,
      price: parseInt(newListing.price) || 0, city: newListing.city, occupancy: 0,
      images: newListing.images.length > 0 ? newListing.images : ["/placeholder.svg"],
    }]);
    setCreateOpen(false);
    setCreateStep(0);
    setNewListing({ title: "", type: "warehouse", city: "Tallinn", address: "", description: "", price: "", size: "", features: [], images: [] });
  };

  const handleImageUpload = (listingId: string) => {
    const fakeUrl = `https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop&t=${Date.now()}`;
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, images: [...l.images, fakeUrl] } : l));
  };

  const removeImage = (listingId: string, idx: number) => {
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, images: l.images.filter((_, i) => i !== idx) } : l));
  };

  const steps = [t("provider.listings.stepBasic"), t("provider.listings.stepLocation"), t("provider.listings.stepPrice"), t("provider.listings.stepImages"), t("provider.listings.stepFeatures")];
  const inp = "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{t("provider.listings.title")}</h1>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> {t("provider.listings.add")}</Button>
      </div>
      <div className="mt-6 space-y-3">
        {listings.map((l) => (
          <div key={l.id} className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-lg bg-secondary overflow-hidden shrink-0">
                  <img src={l.images[0]} alt={l.title} className="h-full w-full object-cover" />
                </div>
                <div>
                  <div className="text-sm font-medium">{l.title}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />{l.city} · {l.price}€/kuu · {t("provider.listings.occupancy")} {l.occupancy}%
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">{l.status}</span>
                <Button variant="outline" size="sm" onClick={() => setEditId(editId === l.id ? null : l.id)}>
                  <Image className="h-3.5 w-3.5 mr-1" /> {t("provider.listings.images")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  setEditDialogListing(l);
                  setEditForm({ title: l.title, price: String(l.price), city: l.city, status: l.status });
                }}><Edit className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            {editId === l.id && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t("provider.listings.listingImages")}</p>
                <div className="flex flex-wrap gap-3">
                  {l.images.map((img, idx) => (
                    <div key={idx} className="group relative h-20 w-28 rounded-lg overflow-hidden border border-border">
                      <img src={img} alt="" className="h-full w-full object-cover" />
                      <button onClick={() => removeImage(l.id, idx)} className="absolute top-1 right-1 rounded-full bg-destructive/90 p-0.5 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => handleImageUpload(l.id)} className="flex h-20 w-28 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors">
                    <Upload className="h-5 w-5" />
                    <span className="text-[10px] mt-1">{t("provider.listings.addImage")}</span>
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">{t("provider.listings.imageNote")}</p>
              </div>
            )}
          </div>
        ))}
      </div>

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
              <p className="text-xs text-muted-foreground">{t("provider.listings.imagesDesc")}</p>
              <div className="flex flex-wrap gap-3">
                {newListing.images.map((img, idx) => (
                  <div key={idx} className="group relative h-24 w-32 rounded-lg overflow-hidden border border-border">
                    <img src={img} alt="" className="h-full w-full object-cover" />
                    <button onClick={() => setNewListing(p => ({ ...p, images: p.images.filter((_, i) => i !== idx) }))} className="absolute top-1 right-1 rounded-full bg-destructive/90 p-0.5 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button onClick={addImage} className="flex h-24 w-32 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors">
                  <Upload className="h-6 w-6" />
                  <span className="text-xs mt-1">{t("provider.listings.addImage")}</span>
                </button>
              </div>
            </div>
          )}

          {createStep === 4 && (
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
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={submitListing}>{t("provider.listings.create")}</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
