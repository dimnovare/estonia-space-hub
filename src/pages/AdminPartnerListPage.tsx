import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/i18n/routing";
import { Search, Building2, ExternalLink, Plus, AlertTriangle } from "lucide-react";
import { isRetiredServiceSlug } from "@/lib/serviceTypes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import AdminShell from "@/components/admin/AdminShell";
import { AdminPageHeader, FilterBar, FilterChip, EmptyState } from "@/components/admin/kit";
import { supplierService } from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { useLanguage } from "@/i18n/LanguageContext";

type Filter = "all" | "active" | "withPage" | "noServices";

/**
 * A partner with no service types can never be returned as a candidate for any
 * customer request — the matcher filters on them before it looks at location or
 * radius. Such a row still shows a name, an address and coordinates, so the only
 * way to notice is to flag it here.
 */
const sellsNothing = (s: { serviceTypes?: string[] }) =>
  (s.serviceTypes ?? []).filter((slug) => !isRetiredServiceSlug(slug)).length === 0;

export default function AdminPartnerListPage() {
  const { t } = useLanguage();
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: queryKeys.suppliers.all(),
    queryFn: supplierService.getAll,
    staleTime: 30_000,
  });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter((s: any) => {
      if (q && !s.name?.toLowerCase().includes(q)) return false;
      if (filter === "active" && !s.isActive) return false;
      if (filter === "withPage" && !s.slug) return false;
      if (filter === "noServices" && !sellsNothing(s)) return false;
      return true;
    });
  }, [suppliers, search, filter]);

  const unmatchableCount = useMemo(
    () => suppliers.filter((s: any) => sellsNothing(s)).length,
    [suppliers],
  );

  const tierBadge = (tier?: string) => {
    const v = (tier ?? "starter").toLowerCase();
    const cls = v === "premium"
      ? "bg-success/10 text-success-text"
      : v === "standard"
        ? "bg-primary/10 text-primary"
        : "bg-secondary text-ink-2";
    return (
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
        {t("admin.partner.featureSetBadge").replace("{value}", t(`admin.partner.featureSet.${v}`))}
      </span>
    );
  };

  const pageStatus = (s: any) => {
    if (!s.slug) return <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-ink-2">{t("admin.partner.pageNone")}</span>;
    if (s.isPartnerPagePublished) return <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success-text">{t("admin.partner.pagePublished")}</span>;
    return <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning-text">{t("admin.partner.pageDraft")}</span>;
  };

  return (
    <AdminShell active="partners">
      <SEO title={`${t("seo.adminPartners")} — Ruumly`} description="" noindex />
        <AdminPageHeader
          eyebrow={t("admin.nav.groupSupply")}
          title={t("admin.partners")}
          count={`${filtered.length} / ${suppliers.length}`}
          actions={
            <Button asChild size="sm">
              <Link to="/admin?tab=suppliers">
                <Plus className="mr-1 h-4 w-4" />
                {t("admin.addPartner")}
              </Link>
            </Button>
          }
        />

        <FilterBar>
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.searchPartners")}
              className="pl-9"
            />
          </div>
          {(["all", "active", "withPage", "noServices"] as Filter[]).map((f) => (
            <FilterChip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f === "all"
                ? t("admin.allPartners")
                : f === "active"
                  ? t("admin.activePartners")
                  : f === "withPage"
                    ? t("admin.partnerPages")
                    : `${t("admin.partner.noServiceTypes")} (${unmatchableCount})`}
            </FilterChip>
          ))}
        </FilterBar>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-secondary" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={suppliers.length === 0 ? t("admin.noPartnersYet") : t("admin.noPartnerMatches")}
            action={suppliers.length === 0 ? (
              <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/admin?tab=suppliers">
                  {t("admin.approveApplication")}
                </Link>
              </Button>
            ) : undefined}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((s: any) => {
              const initials = (s.name || "?").slice(0, 2).toUpperCase();
              return (
                <Link
                  key={s.id}
                  to={`/admin/partners/${s.id}`}
                  className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent hover:bg-accent/5"
                >
                  <div className="flex items-start gap-3">
                    {s.logoUrl ? (
                      <img src={s.logoUrl} alt="" className="h-12 w-12 rounded-lg border border-border object-contain p-1" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-sm font-semibold">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold">{s.name}</h3>
                        <span className={`h-2 w-2 rounded-full ${s.isActive ? "bg-success" : "bg-muted-foreground/40"}`} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {tierBadge(s.tier)}
                        {pageStatus(s)}
                        {sellsNothing(s) && (
                          <span
                            title={t("admin.partner.noServiceTypesHint")}
                            className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive-text"
                          >
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                            {t("admin.partner.noServiceTypes")}
                          </span>
                        )}
                      </div>
                    </div>
                    {s.slug && s.isPartnerPagePublished && (
                      <a
                        href={`/et/partner/${s.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={t("admin.openPartnerPage")}
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-95"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span><strong className="font-data text-foreground">{s.listingCount ?? 0}</strong> {t("admin.listingsLabel")}</span>
                    <span><strong className="font-data text-foreground">{s.ordersTotal ?? 0}</strong> {t("admin.ordersLabel")}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
    </AdminShell>
  );
}
