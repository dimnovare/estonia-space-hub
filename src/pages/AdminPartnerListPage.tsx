import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/i18n/routing";
import { Search, Building2, ExternalLink, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { supplierService } from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { useLanguage } from "@/i18n/LanguageContext";

type Filter = "all" | "active" | "withPage";

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
      return true;
    });
  }, [suppliers, search, filter]);

  const tierBadge = (tier?: string) => {
    const v = (tier ?? "starter").toLowerCase();
    const cls = v === "premium"
      ? "bg-accent/10 text-accent"
      : v === "standard"
        ? "bg-primary/10 text-primary"
        : "bg-secondary text-muted-foreground";
    return (
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
        {t("admin.partner.featureSetBadge").replace("{value}", t(`admin.partner.featureSet.${v}`))}
      </span>
    );
  };

  const pageStatus = (s: any) => {
    if (!s.slug) return <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{t("admin.partner.pageNone")}</span>;
    if (s.isPartnerPagePublished) return <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">{t("admin.partner.pagePublished")}</span>;
    return <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">{t("admin.partner.pageDraft")}</span>;
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
      <SEO title="Partners — Ruumly Admin" description="" noindex />
      <AdminSidebar activeTab="partners" />
      <div className="flex-1 min-w-0 overflow-x-hidden p-4 sm:p-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">{t("admin.partners")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtered.length} / {suppliers.length}
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/admin?tab=suppliers">
              <Plus className="mr-1 h-4 w-4" />
              {t("admin.addPartner")}
            </Link>
          </Button>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.searchPartners")}
              className="pl-9"
            />
          </div>
          {(["all", "active", "withPage"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`rounded-full px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-95 sm:py-1.5 ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              {f === "all" ? t("admin.allPartners") : f === "active" ? t("admin.activePartners") : t("admin.partnerPages")}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-secondary" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-10 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium">
              {suppliers.length === 0
                ? t("admin.noPartnersYet")
                : t("admin.noPartnerMatches")}
            </p>
            {suppliers.length === 0 && (
              <Button asChild size="sm" className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/admin?tab=suppliers">
                  {t("admin.approveApplication")}
                </Link>
              </Button>
            )}
          </div>
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
                    <span><strong className="text-foreground">{s.listingCount ?? 0}</strong> {t("admin.listingsLabel")}</span>
                    <span><strong className="text-foreground">{s.ordersTotal ?? 0}</strong> {t("admin.ordersLabel")}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
