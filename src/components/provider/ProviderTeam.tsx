import { useState } from "react";
import { UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";

export default function ProviderTeam() {
  const { t } = useLanguage();
  const [members, setMembers] = useState([
    { id: 1, name: "Maria Saar", email: "maria@laopind.ee", role: t("provider.team.owner"), status: t("provider.team.active") },
    { id: 2, name: "Janek Kivi", email: "janek@laopind.ee", role: t("provider.team.roleManager"), status: t("provider.team.active") },
  ]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState(t("provider.team.roleManager"));

  const addMember = () => {
    if (!newName || !newEmail) return;
    setMembers(prev => [...prev, { id: Date.now(), name: newName, email: newEmail, role: newRole, status: t("provider.team.invited") }]);
    setNewName(""); setNewEmail(""); setNewRole(t("provider.team.roleManager"));
    setDialogOpen(false);
  };

  const removeMember = (id: number) => setMembers(prev => prev.filter(m => m.id !== id));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{t("provider.team.title")}</h1>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1" onClick={() => setDialogOpen(true)}>
          <UserPlus className="h-4 w-4" /> {t("provider.team.addMember")}
        </Button>
      </div>
      <div className="mt-6 space-y-3">
        {members.map(m => (
          <div key={m.id} className="flex items-center justify-between rounded-xl border border-border p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                {m.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{m.name}</p>
                <p className="text-xs text-muted-foreground truncate">{m.email}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3 shrink-0 ml-2">
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">{m.role}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${m.status === t("provider.team.active") ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{m.status}</span>
              {m.role !== t("provider.team.owner") && (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => removeMember(m.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("provider.team.addTitle")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("provider.team.name")}</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" placeholder={t("provider.team.namePlaceholder")} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("provider.team.email")}</label>
              <input value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" placeholder={t("provider.team.emailPlaceholder")} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("provider.team.role")}</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <option>{t("provider.team.roleManager")}</option><option>{t("provider.team.roleViewer")}</option><option>{t("provider.team.roleAccountant")}</option>
              </select>
            </div>
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={addMember}>{t("provider.team.sendInvite")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
