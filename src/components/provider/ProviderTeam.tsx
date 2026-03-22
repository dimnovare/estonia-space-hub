import { useState } from "react";
import { UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ProviderTeam() {
  const [members, setMembers] = useState([
    { id: 1, name: "Maria Saar", email: "maria@laopind.ee", role: "Omanik", status: "Aktiivne" },
    { id: 2, name: "Janek Kivi", email: "janek@laopind.ee", role: "Haldur", status: "Aktiivne" },
  ]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("Haldur");

  const addMember = () => {
    if (!newName || !newEmail) return;
    setMembers(prev => [...prev, { id: Date.now(), name: newName, email: newEmail, role: newRole, status: "Kutse saadetud" }]);
    setNewName(""); setNewEmail(""); setNewRole("Haldur");
    setDialogOpen(false);
  };

  const removeMember = (id: number) => setMembers(prev => prev.filter(m => m.id !== id));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Meeskond</h1>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1" onClick={() => setDialogOpen(true)}>
          <UserPlus className="h-4 w-4" /> Lisa liige
        </Button>
      </div>
      <div className="mt-6 space-y-3">
        {members.map(m => (
          <div key={m.id} className="flex items-center justify-between rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                {m.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <p className="text-sm font-medium">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">{m.role}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${m.status === "Aktiivne" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{m.status}</span>
              {m.role !== "Omanik" && (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => removeMember(m.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Lisa meeskonnaliige</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nimi</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" placeholder="Täisnimi" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">E-post</label>
              <input value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" placeholder="email@ettevote.ee" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Roll</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <option>Haldur</option><option>Vaataja</option><option>Raamatupidaja</option>
              </select>
            </div>
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={addMember}>Saada kutse</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
