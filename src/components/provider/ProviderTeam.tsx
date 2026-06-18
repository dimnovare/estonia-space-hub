import { useState } from "react";
import { Users, Loader2, UserPlus, Settings, Trash2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useLanguage } from "@/i18n/LanguageContext";
import { useSupplierTeam, useInviteTeamMember, useRemoveTeamMember } from "@/hooks/queries";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { isSupplierContextRequired } from "@/lib/apiErrors";
import type { TeamMember } from "@/services/types";

export default function ProviderTeam() {
  const { t } = useLanguage();
  const supplierId = useImpersonatedSupplierId();
  const { data: members, isLoading, error } = useSupplierTeam(supplierId);
  const invite = useInviteTeamMember(supplierId);
  const remove = useRemoveTeamMember(supplierId);

  const needsSupplierContext = isSupplierContextRequired(error);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);

  const { user } = useAuth();
  // The account owner can manage the team; an admin (incl. when impersonating a supplier)
  // always has full control even though their own id is not in the supplier's team list.
  const canManage =
    user?.role === "admin" || (members?.some((m) => m.isOwner && m.id === user?.id) ?? false);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    invite.mutate({ name: name.trim(), email: email.trim() }, {
      onSuccess: () => {
        toast.success(t("provider.team.invited"));
        setName("");
        setEmail("");
        setInviteOpen(false);
      },
    });
  };

  const handleRemove = (userId: string) => {
    remove.mutate(userId, {
      onSuccess: () => toast.success(t("provider.team.removed")),
    });
  };

  // A member who has never logged in is treated as a pending invite.
  const memberStatus = (m: TeamMember): "active" | "pending" => (m.lastLoginAt ? "active" : "pending");
  const roleLabel = (m: TeamMember) => (m.isOwner ? t("provider.team.owner") : m.role || t("provider.team.member"));

  const Header = (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-ink md:text-[28px]">{t("provider.team.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("provider.team.subtitle")}</p>
      </div>
      {canManage && (
        <Button className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" />
          {t("provider.team.inviteMember")}
        </Button>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div>
        {Header}
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      </div>
    );
  }

  if (needsSupplierContext) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-navy-ink md:text-[28px]">{t("provider.team.title")}</h1>
        <div className="rounded-xl border border-border bg-secondary/30 p-8 text-center">
          <h2 className="font-display text-lg font-semibold">{t("provider.adminContextRequired.title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("provider.adminContextRequired.body")}</p>
          <Link to="/admin/partners" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            {t("provider.adminContextRequired.linkLabel")} →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {Header}

      {!members?.length ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl bg-secondary/30 py-16 px-6 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-base font-semibold">{t("provider.team.empty")}</p>
          {canManage && (
            <Button
              className="mt-4 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => setInviteOpen(true)}
            >
              <UserPlus className="h-4 w-4" />
              {t("provider.team.inviteMember")}
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("provider.team.inviteName")}</TableHead>
                <TableHead>{t("provider.team.email")}</TableHead>
                <TableHead>{t("provider.team.role")}</TableHead>
                <TableHead>{t("provider.team.status")}</TableHead>
                {canManage && <TableHead className="w-[60px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const status = memberStatus(m);
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-accent font-display text-sm font-bold text-accent-foreground">
                          {(m.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <strong className="font-medium text-navy-ink">{m.name}</strong>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.email}</TableCell>
                    <TableCell>{roleLabel(m)}</TableCell>
                    <TableCell>
                      {status === "active" ? (
                        <span className="inline-flex rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                          {t("provider.team.statusActive")}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning-text">
                          {t("provider.team.statusPending")}
                        </span>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        {!m.isOwner && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                aria-label={t("provider.team.manageMember")}
                                className="flex h-8 w-8 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-secondary hover:text-navy-ink"
                              >
                                <Settings className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setRemoveTarget(m)}
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                {t("provider.team.remove")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Invite member dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-navy-ink">{t("provider.team.invite")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-ink-2">{t("provider.team.inviteName")}</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-ink-2">{t("provider.team.inviteEmail")}</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90" disabled={invite.isPending}>
              {invite.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("provider.team.invite")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove member confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("provider.team.remove")}</AlertDialogTitle>
            <AlertDialogDescription>{t("provider.team.removeConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeTarget) handleRemove(removeTarget.id);
                setRemoveTarget(null);
              }}
            >
              {t("provider.team.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
