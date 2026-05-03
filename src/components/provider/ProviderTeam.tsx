import { useState } from "react";
import { Users, Loader2, UserPlus } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useLanguage } from "@/i18n/LanguageContext";
import { useSupplierTeam, useInviteTeamMember, useRemoveTeamMember } from "@/hooks/queries";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ProviderTeam() {
  const { t } = useLanguage();
  const supplierId = useImpersonatedSupplierId();
  const { data: members, isLoading, error } = useSupplierTeam(supplierId);
  const invite = useInviteTeamMember(supplierId);
  const remove = useRemoveTeamMember(supplierId);

  const needsSupplierContext =
    (error as any)?.code === "supplier_context_required" ||
    (error as any)?.body?.error === "supplier_context_required";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const { user } = useAuth();
  const currentIsOwner = members?.some((m) => m.isOwner && m.id === user?.id) ?? false;

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    invite.mutate({ name: name.trim(), email: email.trim() }, {
      onSuccess: () => {
        toast.success(t("provider.team.invited"));
        setName("");
        setEmail("");
      },
    });
  };

  const handleRemove = (userId: string) => {
    remove.mutate(userId, {
      onSuccess: () => toast.success(t("provider.team.removed")),
    });
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold">{t("provider.team.title")}</h1>
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      </div>
    );
  }

  if (needsSupplierContext) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">{t("provider.team.title")}</h1>
        <div className="rounded-xl border border-border bg-secondary/30 p-8 text-center">
          <h2 className="font-display text-lg font-semibold">
            {t("provider.adminContextRequired.title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("provider.adminContextRequired.body")}
          </p>
          <Link
            to="/admin?tab=suppliers"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {t("provider.adminContextRequired.linkLabel")} →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">{t("provider.team.title")}</h1>

      {currentIsOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5" />
              {t("provider.team.invite")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-muted-foreground">
                  {t("provider.team.inviteName")}
                </label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-muted-foreground">
                  {t("provider.team.inviteEmail")}
                </label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" disabled={invite.isPending}>
                {invite.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("provider.team.invite")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {!members?.length ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-secondary/30 py-16 px-6 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-base font-semibold">{t("provider.team.empty")}</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("provider.team.inviteName")}</TableHead>
                  <TableHead>{t("provider.team.inviteEmail")}</TableHead>
                  <TableHead>{t("provider.team.role")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("provider.team.lastLogin")}</TableHead>
                  {currentIsOwner && <TableHead className="w-[100px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>
                      {m.isOwner ? (
                        <Badge>{t("provider.team.owner")}</Badge>
                      ) : (
                        <Badge variant="secondary">{t("provider.team.member")}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {m.lastLoginAt ? format(new Date(m.lastLoginAt), "dd.MM.yyyy HH:mm") : t("provider.team.noLogin")}
                    </TableCell>
                    {currentIsOwner && (
                      <TableCell>
                        {!m.isOwner && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                {t("provider.team.remove")}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("provider.team.remove")}</AlertDialogTitle>
                                <AlertDialogDescription>{t("provider.team.removeConfirm")}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemove(m.id)}>
                                  {t("provider.team.remove")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
