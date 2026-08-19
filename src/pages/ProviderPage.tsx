import { Link } from "@/i18n/routing";
import {
  ArrowRight, ChevronDown,
  Inbox, Send, BadgeCheck, Sparkles, Check, Globe, Map, ShieldCheck,
  Megaphone, Settings, Boxes, Truck, Container,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { SEO } from "@/components/SEO";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

/* ── Optional-feature catalog (seed content lifted from prototype DATA.catalog) ──
   Discoverable + clearly secondary. NOT a plans table. Free items show a "Free" tag.
   Visible name/desc come from t() keys; price/scope are short tokens kept inline. */
type CatalogItem = { id: string; nameKey: string; descKey: string; price: string; unitKey?: string; scopeKey: string; free?: boolean };
type CatalogGroup = { id: string; titleKey: string; icon: typeof Sparkles; tile: "teal" | "navy"; items: CatalogItem[] };

const getCatalog = (): CatalogGroup[] => [
  {
    id: "visibility", titleKey: "provPage.cat.visibility", icon: Sparkles, tile: "teal",
    items: [
      { id: "featured_search", nameKey: "provPage.feat.featuredSearch.name", descKey: "provPage.feat.featuredSearch.desc", price: "€29", unitKey: "provPage.unit.month", scopeKey: "provPage.scope.listing" },
      { id: "featured_map", nameKey: "provPage.feat.featuredMap.name", descKey: "provPage.feat.featuredMap.desc", price: "€24", unitKey: "provPage.unit.month", scopeKey: "provPage.scope.location" },
      { id: "homepage", nameKey: "provPage.feat.homepage.name", descKey: "provPage.feat.homepage.desc", price: "€79", unitKey: "provPage.unit.month", scopeKey: "provPage.scope.supplier" },
      { id: "city_pages", nameKey: "provPage.feat.cityPages.name", descKey: "provPage.feat.cityPages.desc", price: "€39", unitKey: "provPage.unit.month", scopeKey: "provPage.scope.location" },
      { id: "highlight_card", nameKey: "provPage.feat.highlightCard.name", descKey: "provPage.feat.highlightCard.desc", price: "€19", unitKey: "provPage.unit.month", scopeKey: "provPage.scope.listing" },
      { id: "badge_available", nameKey: "provPage.feat.badgeAvailable.name", descKey: "provPage.feat.badgeAvailable.desc", price: "€12", unitKey: "provPage.unit.month", scopeKey: "provPage.scope.listing" },
      { id: "seasonal", nameKey: "provPage.feat.seasonal.name", descKey: "provPage.feat.seasonal.desc", price: "€49+", scopeKey: "provPage.scope.supplier" },
    ],
  },
  {
    id: "trust", titleKey: "provPage.cat.trust", icon: ShieldCheck, tile: "navy",
    items: [
      { id: "verified_badge", nameKey: "provPage.feat.verifiedBadge.name", descKey: "provPage.feat.verifiedBadge.desc", price: "€0", scopeKey: "provPage.scope.supplier", free: true },
      { id: "reviewed_profile", nameKey: "provPage.feat.reviewedProfile.name", descKey: "provPage.feat.reviewedProfile.desc", price: "€59", unitKey: "provPage.unit.oneTime", scopeKey: "provPage.scope.supplier" },
      { id: "photo_review", nameKey: "provPage.feat.photoReview.name", descKey: "provPage.feat.photoReview.desc", price: "€39", unitKey: "provPage.unit.oneTime", scopeKey: "provPage.scope.listing" },
      { id: "review_campaign", nameKey: "provPage.feat.reviewCampaign.name", descKey: "provPage.feat.reviewCampaign.desc", price: "€29", unitKey: "provPage.unit.month", scopeKey: "provPage.scope.supplier" },
      { id: "response_badge", nameKey: "provPage.feat.responseBadge.name", descKey: "provPage.feat.responseBadge.desc", price: "€12", unitKey: "provPage.unit.month", scopeKey: "provPage.scope.supplier" },
    ],
  },
  {
    id: "leadgen", titleKey: "provPage.cat.leadgen", icon: Megaphone, tile: "teal",
    items: [
      { id: "lead_fields", nameKey: "provPage.feat.leadFields.name", descKey: "provPage.feat.leadFields.desc", price: "€15", unitKey: "provPage.unit.month", scopeKey: "provPage.scope.supplier" },
      { id: "priority_lead", nameKey: "provPage.feat.priorityLead.name", descKey: "provPage.feat.priorityLead.desc", price: "€19", unitKey: "provPage.unit.month", scopeKey: "provPage.scope.supplier" },
      { id: "lead_export", nameKey: "provPage.feat.leadExport.name", descKey: "provPage.feat.leadExport.desc", price: "€9", unitKey: "provPage.unit.month", scopeKey: "provPage.scope.supplier" },
      { id: "call_tracking", nameKey: "provPage.feat.callTracking.name", descKey: "provPage.feat.callTracking.desc", price: "€24", unitKey: "provPage.unit.month", scopeKey: "provPage.scope.supplier" },
      { id: "sponsored_landing", nameKey: "provPage.feat.sponsoredLanding.name", descKey: "provPage.feat.sponsoredLanding.desc", price: "€89", unitKey: "provPage.unit.month", scopeKey: "provPage.scope.supplier" },
      { id: "newsletter", nameKey: "provPage.feat.newsletter.name", descKey: "provPage.feat.newsletter.desc", price: "€49", unitKey: "provPage.unit.placement", scopeKey: "provPage.scope.supplier" },
      { id: "blog", nameKey: "provPage.feat.blog.name", descKey: "provPage.feat.blog.desc", price: "€129", unitKey: "provPage.unit.article", scopeKey: "provPage.scope.supplier" },
    ],
  },
  {
    id: "operations", titleKey: "provPage.cat.operations", icon: Settings, tile: "navy",
    items: [
      { id: "bulk_import", nameKey: "provPage.feat.bulkImport.name", descKey: "provPage.feat.bulkImport.desc", price: "€0", unitKey: "provPage.unit.withWorkflow", scopeKey: "provPage.scope.supplier", free: true },
      { id: "done_for_you", nameKey: "provPage.feat.doneForYou.name", descKey: "provPage.feat.doneForYou.desc", price: "€99", unitKey: "provPage.unit.oneTime", scopeKey: "provPage.scope.supplier" },
      { id: "places_prefill", nameKey: "provPage.feat.placesPrefill.name", descKey: "provPage.feat.placesPrefill.desc", price: "€0", unitKey: "provPage.unit.free", scopeKey: "provPage.scope.location", free: true },
      { id: "calendar_sync", nameKey: "provPage.feat.calendarSync.name", descKey: "provPage.feat.calendarSync.desc", price: "€15", unitKey: "provPage.unit.month", scopeKey: "provPage.scope.supplier" },
      { id: "api_dispatch", nameKey: "provPage.feat.apiDispatch.name", descKey: "provPage.feat.apiDispatch.desc", price: "€39", unitKey: "provPage.unit.month", scopeKey: "provPage.scope.supplier" },
      { id: "booking_enable", nameKey: "provPage.feat.bookingEnable.name", descKey: "provPage.feat.bookingEnable.desc", price: "€0", unitKey: "provPage.unit.optional", scopeKey: "provPage.scope.listing", free: true },
      { id: "payments", nameKey: "provPage.feat.payments.name", descKey: "provPage.feat.payments.desc", price: "€0", unitKey: "provPage.unit.optional", scopeKey: "provPage.scope.supplier", free: true },
      { id: "contracts", nameKey: "provPage.feat.contracts.name", descKey: "provPage.feat.contracts.desc", price: "€19", unitKey: "provPage.unit.month", scopeKey: "provPage.scope.supplier" },
      { id: "analytics_export", nameKey: "provPage.feat.analyticsExport.name", descKey: "provPage.feat.analyticsExport.desc", price: "€19", unitKey: "provPage.unit.month", scopeKey: "provPage.scope.supplier" },
    ],
  },
];

/* ── Built-for-each-vertical feature notes (DATA.verticalFeatures) ── */
const getVerticals = (showMoving: boolean, showTrailer: boolean) => [
  {
    key: "storage", icon: Boxes, labelKey: "provPage.vertical.storage", show: true,
    featureKeys: ["provPage.vfeat.storage1", "provPage.vfeat.storage2", "provPage.vfeat.storage3", "provPage.vfeat.storage4"],
  },
  {
    key: "moving", icon: Truck, labelKey: "provPage.vertical.moving", show: showMoving,
    featureKeys: ["provPage.vfeat.moving1", "provPage.vfeat.moving2", "provPage.vfeat.moving3", "provPage.vfeat.moving4"],
  },
  {
    key: "trailer", icon: Container, labelKey: "provPage.vertical.trailer", show: showTrailer,
    featureKeys: ["provPage.vfeat.trailer1", "provPage.vfeat.trailer2", "provPage.vfeat.trailer3", "provPage.vfeat.trailer4"],
  },
].filter((v) => v.show);

const tileClass: Record<"teal" | "navy", string> = {
  teal: "bg-teal/[0.16] text-teal-deep",
  navy: "bg-primary/10 text-primary",
};

export default function ProviderPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const settings = usePlatformSettings();

  const showMoving = settings?.showMovingService !== false;
  const showTrailer = settings?.showTrailerService !== false;

  const catalog = getCatalog();
  const verticals = getVerticals(showMoving, showTrailer);

  // Concierge match-loop value cards (qualify demand → you reply → pay for results)
  const valueCards = [
    { icon: Inbox,     titleKey: "provPage.value1.title", descKey: "provPage.value1.desc" },
    { icon: Send,      titleKey: "provPage.value2.title", descKey: "provPage.value2.desc" },
    { icon: BadgeCheck, titleKey: "provPage.value3.title", descKey: "provPage.value3.desc" },
  ];

  // "How the match loop works" steps
  const steps = [
    { icon: Inbox,      titleKey: "provPage.step1.title", descKey: "provPage.step1.desc" },
    { icon: Send,       titleKey: "provPage.step2.title", descKey: "provPage.step2.desc" },
    { icon: BadgeCheck, titleKey: "provPage.step3.title", descKey: "provPage.step3.desc" },
  ];

  // q1's answer is reframed to "free always" (permanent) — override its answer key.
  const faqItems: { q: string; a: string }[] = [
    { q: "provPage.faq.q1", a: "provPage.faq.q1.aPermanent" },
    { q: "provPage.faq.q2", a: "provPage.faq.q2.a" },
    { q: "provPage.faq.q3", a: "provPage.faq.q3.a" },
    { q: "provPage.faq.q4", a: "provPage.faq.q4.a" },
    { q: "provPage.faq.q5", a: "provPage.faq.q5.a" },
  ];

  return (
    <div>
      <SEO
        title={`${t("seo.providerProgram")} — Ruumly`}
        description={t("seo.providerProgramDesc")}
        path="/provider"
      />

      {/* ── Hero (navy) ── */}
      <section className="surface-dark relative overflow-hidden pt-[96px] pb-20 md:py-28">
        <div className="container-wide relative text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-accent to-teal-deep px-3.5 py-1.5 text-xs font-semibold text-white shadow-card">
            <Sparkles className="h-3.5 w-3.5" />
            {t("provPage.hero.badgePermanent")}
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl font-display text-3xl font-bold leading-tight text-white md:text-5xl lg:text-[3.5rem]">
            {t("provPage.hero.titleLead")}{" "}
            <span className="text-teal">{t("provPage.hero.titleAccent")}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/80 md:text-lg">
            {t("provPage.hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" className="bg-accent px-8 text-accent-foreground shadow-elevated hover:bg-brand-greenDeep" asChild>
              <Link to="/provider/onboarding">
                {t("provPage.hero.ctaPrimary")} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" className="bg-white px-8 text-navy-ink hover:bg-secondary" asChild>
              {/* Existing partners → dashboard; everyone else → login/register (never a dead login wall). */}
              <Link to={user?.role === "provider" ? "/provider/dashboard" : "/login"}>{t("provPage.hero.ctaSecondary")}</Link>
            </Button>
          </div>
          <p className="mt-5 text-xs text-white/55">{t("provPage.hero.reassurance")}</p>
        </div>
      </section>

      {/* ── Trust strip (plain muted row, mirrors home §B) ── */}
      <section className="container-wide py-8 md:py-10">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {[
            { icon: Check, label: t("provPage.trust.listings") },
            { icon: Map, label: t("provPage.trust.mapPresence") },
            { icon: Globe, label: t("provPage.trust.google") },
            { icon: ShieldCheck, label: t("provPage.trust.verifiedBadge") },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Icon className="h-[18px] w-[18px] text-teal-deep" />
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* ── Value: We do the marketing ── */}
      <section className="container-wide py-12 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono-label text-xs uppercase tracking-[0.2em] text-teal-text">
            {t("provPage.value.eyebrow")}
          </span>
          <h2 className="mt-3 font-display text-2xl font-bold md:text-3xl">{t("provPage.value.title")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("provPage.value.subtitle")}</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
          {valueCards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.titleKey} className="card-elevated p-6 md:p-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal/[0.16]">
                  <Icon className="h-6 w-6 text-teal-deep" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{t(c.titleKey)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(c.descKey)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── How free partnership works ── */}
      <section className="surface-sunken border-y border-border py-12 md:py-20">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl text-center">
            <span className="font-mono-label text-xs uppercase tracking-[0.2em] text-teal-text">
              {t("provPage.how.eyebrow")}
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold md:text-3xl">{t("provPage.how.title")}</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.titleKey} className="card-elevated p-6 text-center">
                  <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal/[0.16]">
                    <Icon className="h-6 w-6 text-teal-deep" />
                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-navy-ink font-mono-label text-xs font-bold text-white">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold">{t(s.titleKey)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(s.descKey)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Optional add-ons (secondary, collapsed by default — NOT a storefront).
             The real upsell lives in the logged-in ProviderBoosts dashboard. ── */}
      <section className="container-wide py-12 md:py-16">
        <Collapsible className="mx-auto max-w-3xl overflow-hidden rounded-[14px] border border-border bg-secondary/40">
          <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset">
            <span className="text-sm font-medium text-muted-foreground">{t("provPage.optional.toggle")}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-border px-5 pb-6 pt-5">
            <p className="mb-6 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("provPage.optional.subtitle")}</p>
            <div className="space-y-10">
              {catalog.map((group) => {
                const GroupIcon = group.icon;
                return (
                  <div key={group.id}>
                    <div className="mb-5 flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tileClass[group.tile]}`}>
                        <GroupIcon className="h-5 w-5" />
                      </div>
                      <h3 className="font-display text-lg font-bold md:text-xl">{t(group.titleKey)}</h3>
                      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                        {group.items.length}
                      </span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {group.items.map((it) => (
                        <div
                          key={it.id}
                          className="group flex flex-col gap-3 rounded-[14px] border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-teal"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-display text-[15.5px] font-semibold leading-snug">{t(it.nameKey)}</h4>
                            {it.free && (
                              <span className="inline-flex shrink-0 items-center rounded-full bg-gradient-to-r from-accent to-teal-deep px-2.5 py-0.5 text-xs font-semibold text-white">
                                {t("provPage.tag.free")}
                              </span>
                            )}
                          </div>
                          <p className="flex-1 text-[13px] leading-relaxed text-muted-foreground">{t(it.descKey)}</p>
                          <div className="mt-auto flex items-center justify-between gap-2">
                            <span className="font-display text-base font-bold text-navy-ink">
                              {it.price}
                              {it.unitKey && <span className="ml-1 text-xs font-medium text-muted-foreground">{t(it.unitKey)}</span>}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                              {t(it.scopeKey)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ── Built for each vertical ── */}
        <div className="mt-12 rounded-[14px] border border-border bg-secondary/60 p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-lg font-semibold">{t("provPage.vertical.title")}</h3>
            <span className="text-sm text-muted-foreground">{t("provPage.vertical.subtitle")}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {verticals.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.key} className="rounded-[14px] border border-border bg-card p-5 shadow-card">
                  <div className="mb-3 flex items-center gap-2">
                    <Icon className="h-5 w-5 text-teal-deep" />
                    <strong className="font-display text-base">{t(v.labelKey)}</strong>
                  </div>
                  <ul className="space-y-2.5">
                    {v.featureKeys.map((fk) => (
                      <li key={fk} className="flex items-start gap-2 text-[13.5px] text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <span>{t(fk)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Closing CTA (green→teal gradient) ── */}
      <section className="container-wide pb-12 md:pb-16">
        <div className="mx-auto rounded-[18px] bg-gradient-to-br from-accent to-teal-deep p-10 text-center text-white shadow-prominent md:p-14">
          <h2 className="font-display text-2xl font-bold text-white md:text-3xl">{t("provPage.closing.title")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/90 md:text-base">
            {t("provPage.closing.subtitle")}
          </p>
          <Button size="lg" className="mt-7 bg-white px-8 text-navy-ink hover:bg-secondary" asChild>
            <Link to="/provider/onboarding">
              {t("provPage.closing.cta")} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Partner FAQ ── */}
      <section className="surface-sunken border-t border-border py-12 md:py-20">
        <div className="container-wide mx-auto max-w-2xl">
          <div className="text-center">
            <span className="font-mono-label text-xs uppercase tracking-[0.2em] text-teal-text">
              {t("provPage.faq.eyebrow")}
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold md:text-3xl">{t("provPage.faq.title")}</h2>
          </div>
          <Accordion type="single" collapsible className="mt-8">
            {faqItems.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left font-display text-[15.5px] font-semibold">
                  {t(item.q)}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {t(item.a)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </div>
  );
}
