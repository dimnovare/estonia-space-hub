import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function ProviderProfile() {
  const { user } = useAuth();
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Ettevõtte profiil</h1>
      <div className="mt-6 max-w-lg space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Ettevõtte nimi</label>
          <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" defaultValue={user?.company || ""} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Registrikood</label>
          <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" defaultValue="12345678" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">KMKR number</label>
          <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" defaultValue="EE123456789" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Kontakt e-post</label>
          <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" defaultValue={user?.email || ""} />
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">Salvesta</Button>
      </div>
    </div>
  );
}
