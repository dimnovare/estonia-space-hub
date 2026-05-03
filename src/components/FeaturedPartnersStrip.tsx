import { Link } from "@/i18n/routing";
import { ShieldCheck } from "lucide-react";
import { useFeaturedPartners } from "@/hooks/useFeaturedPartners";
import { useLanguage } from "@/i18n/LanguageContext";
import { SkeletonCard } from "@/components/SkeletonCard";

export default function FeaturedPartnersStrip() {
  const { t } = useLanguage();
  const { data: partners = [], isLoading } = useFeaturedPartners();

  if (isLoading) {
    return (
      <section className="container-wide py-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </section>
    );
  }
  if (!partners || partners.length === 0) return null;

  return (
    <section className="surface-sunken py-12 md:py-16">
      <div className="container-wide">
        <div className="mb-6 text-center">
          <h2 className="font-display text-2xl font-bold md:text-3xl">{t("featuredPartners.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("featuredPartners.subtitle")}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {partners.map((p) => {
            const inner = (
              <>
                <div className="flex h-16 items-center justify-center">
                  {p.logoUrl ? (
                    <img src={p.logoUrl} alt={`${p.name} logo`} className="max-h-12 object-contain" loading="lazy" />
                  ) : (
                    <div className="font-display text-lg font-bold text-foreground">{p.name}</div>
                  )}
                </div>
                <h3 className="mt-3 text-center font-semibold text-foreground">{p.name}</h3>
                {p.tagline && (
                  <p className="mt-1 line-clamp-2 text-center text-xs text-muted-foreground">{p.tagline}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
                  {p.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 font-semibold text-success">
                      <ShieldCheck className="h-3 w-3" />
                      {t("partner.verified")}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {p.locationCount} {t("featuredPartners.locations")}
                  </span>
                </div>
              </>
            );
            const className = "card-elevated block p-4 transition-shadow hover:shadow-lg";
            return p.slug ? (
              <Link key={p.id} to={`/partner/${p.slug}`} className={className}>{inner}</Link>
            ) : (
              <div key={p.id} className={className}>{inner}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}