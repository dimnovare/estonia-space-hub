import { useAuth, type UserRole } from "@/contexts/AuthContext";
import { Bug } from "lucide-react";
import { useState } from "react";

const roles: { role: UserRole; label: string; color: string }[] = [
  { role: "guest", label: "Guest", color: "bg-muted text-muted-foreground" },
  { role: "customer", label: "Customer", color: "bg-accent/10 text-accent" },
  { role: "provider", label: "Provider", color: "bg-info/10 text-info" },
  { role: "admin", label: "Admin", color: "bg-primary/10 text-primary" },
];

export default function DevRoleSwitcher() {
  const { role, switchRole } = useAuth();
  const [open, setOpen] = useState(false);

  if (import.meta.env.PROD) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100]">
      {open && (
        <div className="mb-2 rounded-xl border border-border bg-card p-3 shadow-lg">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Dev Mode — Switch Role</p>
          <div className="flex flex-col gap-1">
            {roles.map((r) => (
              <button
                key={r.role}
                onClick={() => { switchRole(r.role); setOpen(false); }}
                className={`rounded-lg px-3 py-1.5 text-left text-xs font-medium transition-colors ${role === r.role ? r.color + " ring-1 ring-accent" : "hover:bg-secondary"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
        title="Dev: Switch user role"
      >
        <Bug className="h-4 w-4" />
      </button>
    </div>
  );
}
