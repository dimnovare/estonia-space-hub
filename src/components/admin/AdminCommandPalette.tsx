import { useEffect, useState } from "react";
import { useNavigate } from "@/i18n/routing";
import { useQuery } from "@tanstack/react-query";
import { Building2, Inbox } from "lucide-react";
import { Command as CommandPrimitive } from "cmdk";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { useLanguage } from "@/i18n/LanguageContext";
import { adminLeadService, supplierService } from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { serviceTypeLabel } from "@/lib/serviceTypes";
import { ADMIN_NAV_GROUPS } from "@/components/admin/adminNav";

/** Small debounce so lead search doesn't fire per keystroke (spec §2). */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Cmd+K command palette (control-room spec §2). Keyboard-first jump box over
 * three sources, all EXISTING endpoints:
 *  - nav destinations (shared ADMIN_NAV_GROUPS definition, same grouping);
 *  - partners by name — supplierService.getAll is already fully client-loaded,
 *    filtered locally → /admin/partners/{id};
 *  - leads by name/email/city — the admin leads list endpoint, fetched once on
 *    ≥2 typed chars (debounced) and filtered locally → ?tab=leads&lead={id}
 *    (that param already auto-expands + scrolls the lead workspace).
 * Filtering is manual (shouldFilter=false): partner/lead entries only appear
 * from 2 chars, nav always matches by translated label.
 */
export default function AdminCommandPalette({ open, onOpenChange }: Props) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 200);
  const q = debouncedQuery.trim().toLowerCase();
  const searching = q.length >= 2;

  const { data: suppliers = [] } = useQuery({
    queryKey: queryKeys.suppliers.all(),
    queryFn: supplierService.getAll,
    staleTime: 60_000,
    enabled: open,
  });

  const { data: leadPage } = useQuery({
    queryKey: [...queryKeys.adminLeads.root(), "palette"],
    queryFn: () => adminLeadService.list("all", 1, 50),
    staleTime: 30_000,
    retry: 1,
    enabled: open && searching,
  });

  const partnerHits = searching
    ? suppliers.filter((s) => s.name?.toLowerCase().includes(q)).slice(0, 8)
    : [];
  const leadHits = searching
    ? (leadPage?.items ?? [])
        .filter((l) => [l.name, l.email, l.city].some((v) => v?.toLowerCase().includes(q)))
        .slice(0, 8)
    : [];

  const navGroups = ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => (q ? t(item.labelKey).toLowerCase().includes(q) : true)),
  })).filter((group) => group.items.length > 0);

  const go = (href: string) => {
    onOpenChange(false);
    setQuery("");
    navigate(href);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setQuery(""); }}>
      <DialogContent className="overflow-hidden p-0 shadow-prominent sm:max-w-[560px]">
        <DialogTitle className="sr-only">{t("admin.cmdk.title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("admin.cmdk.placeholder")}</DialogDescription>
        <CommandPrimitive
          shouldFilter={false}
          label={t("admin.cmdk.title")}
          className="flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground"
        >
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={t("admin.cmdk.placeholder")}
          />
          <CommandList className="max-h-[400px]">
            <CommandEmpty>{t("admin.cmdk.empty")}</CommandEmpty>
            {navGroups.map((group) => (
              <CommandGroup
                key={group.id}
                heading={<span className="font-mono-label text-[10.5px] uppercase tracking-[0.16em]">{t(group.labelKey)}</span>}
              >
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem key={item.id} value={`nav-${item.id}`} onSelect={() => go(item.href)} className="min-h-[44px] cursor-pointer">
                      <Icon aria-hidden className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                      {t(item.labelKey)}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
            {partnerHits.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup
                  heading={<span className="font-mono-label text-[10.5px] uppercase tracking-[0.16em]">{t("admin.partners")}</span>}
                >
                  {partnerHits.map((s) => (
                    <CommandItem key={s.id} value={`partner-${s.id}`} onSelect={() => go(`/admin/partners/${s.id}`)} className="min-h-[44px] cursor-pointer">
                      <Building2 aria-hidden className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
            {leadHits.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup
                  heading={<span className="font-mono-label text-[10.5px] uppercase tracking-[0.16em]">{t("admin.leads")}</span>}
                >
                  {leadHits.map((l) => (
                    <CommandItem key={l.id} value={`lead-${l.id}`} onSelect={() => go(`/admin?tab=leads&lead=${l.id}`)} className="min-h-[44px] cursor-pointer">
                      <Inbox aria-hidden className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">
                        {l.name || l.email}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {l.city} · {serviceTypeLabel(t, l.category)}
                        </span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}
