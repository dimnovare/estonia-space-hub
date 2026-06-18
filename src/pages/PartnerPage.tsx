import { useMemo, useState } from "react";
import { useParams, Link } from "@/i18n/routing";
import { Loader2, MapPin, Clock, Star, ShieldCheck, Award, Box, MessageCircle, Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SkeletonCard } from "@/components/SkeletonCard";
import { SEO } from "@/components/SEO";
import { ErrorState } from "@/components/ErrorState";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePartner } from "@/hooks/usePartner";
import { useListings } from "@/hooks/queries";
import { useFavorites } from "@/hooks/useFavorites";
import { contactService } from "@/services";
import ListingCard from "@/components/ListingCard";
import type { PartnerProfile } from "@/types/partner";
import type { Language } from "@/i18n/translations";

function buildStructuredData(partner: PartnerProfile, lang: Language) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: partner.name,
    url: `https://ruumly.eu/${lang}/partner/${partner.slug}`,
    logo: partner.logoUrl ?? undefined,
    image: partner.heroImageUrl ?? undefined,
    sameAs: partner.websiteUrl ? [partner.websiteUrl] : undefined,
    aggregateRating: partner.reviewCount > 0 ? {
      "@type": "AggregateRating",
      ratingValue: partner.rating,
      reviewCount: partner.reviewCount,
    } : undefined,
    subOrganization: partner.locations.map((loc) => ({
      "@type": "SelfStorage",
      name: loc.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: loc.address,
        addressLocality: loc.city,
        addressCountry: loc.country,
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: loc.lat,
        longitude: loc.lng,
      },
      openingHours: loc.openingHours ?? undefined,
    })),
  };
}

/**
 * Contact modal (pixel-spec §Partner header "Contact"). Captures a partner-contact
 * lead via the contact endpoint and confirms with a toast. Keeps the visitor on-page.
 */
function PartnerContactModal({
  partner,
  open,
  onOpenChange,
}: {
  partner: PartnerProfile;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t, language } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const inputCls =
    "h-11 rounded-[10px] border border-input bg-card px-3.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error(t("detail.requestMissingFields"));
      return;
    }
    setSubmitting(true);
    try {
      await contactService.send({
        name: name.trim(),
        email: email.trim(),
        subject: `Partner contact — ${partner.name}`,
        message: `${message.trim()}\n\nPartner: ${partner.name} (${partner.slug})`,
        language,
      });
      onOpenChange(false);
      toast.success(t("partner.contactToast"));
    } catch {
      toast.error(t("detail.requestError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[14px] p-0">
        <DialogHeader className="flex flex-row items-center justify-between gap-3 border-b border-border px-5 py-4 text-left">
          <DialogTitle className="font-display text-lg font-bold">
            {t("partner.contactTitle").replace("{name}", partner.name)}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3.5 px-5 pb-5">
          <DialogDescription className="text-sm text-muted-foreground">
            {t("partner.contactIntro").replace("{name}", partner.name)}
          </DialogDescription>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pc-name" className="text-[13px] font-semibold text-ink-2">{t("detail.requestNameLabel")}</label>
            <input id="pc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("detail.requestNamePlaceholder")} className={inputCls} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pc-email" className="text-[13px] font-semibold text-ink-2">{t("detail.requestEmailLabel")}</label>
            <input id="pc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className={inputCls} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pc-message" className="text-[13px] font-semibold text-ink-2">{t("detail.requestMessageLabel")}</label>
            <textarea
              id="pc-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="min-h-[88px] rounded-[10px] border border-input bg-card px-3.5 py-2.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="h-12 w-full gap-2 bg-primary text-base font-semibold text-primary-foreground hover:bg-navy-ink"
          >
            {t("detail.sendRequestBtn")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PartnerPage() {
  const { slug } = useParams();
  const { t, language } = useLanguage();
  const { data: partner, isLoading } = usePartner(slug);

  const { data: listingsRes } = useListings(
    partner?.id ? { supplierId: partner.id, limit: 50 } : undefined,
  );
  const partnerListings = useMemo(() => listingsRes?.data ?? [], [listingsRes]);

  const { isFavorite, toggle } = useFavorites();
  const saveKey = partner ? `partner:${partner.slug}` : "";
  const saved = saveKey ? isFavorite(saveKey) : false;
  const [contactOpen, setContactOpen] = useState(false);

  const handleSave = () => {
    if (!saveKey) return;
    toggle(saveKey);
    toast.success(saved ? t("partner.unsaveToast") : t("partner.saveToast"));
  };

  if (isLoading) {
    return (
      <div className="container-wide py-10">
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <>
        <SEO title={t("partner.notFound")} description="" path={`/partner/${slug ?? ""}`} noindex />
        <ErrorState kind="notFound" />
      </>
    );
  }

  const seoImage = partner.heroImageUrl || partner.logoUrl || undefined;
  const seoTitle = `${partner.name} — ${t("partner.seoTitleSuffix")}`;
  const seoDescription =
    partner.tagline || `${partner.name} — ${partner.locationCount} ${t("partner.stats.locations")}, ${partner.country}.`;
  const city = partner.locations[0]?.city;

  return (
    <div>
      <SEO
        title={seoTitle}
        description={seoDescription}
        path={`/partner/${partner.slug}`}
        image={seoImage}
        structuredData={buildStructuredData(partner, language)}
      />

      {/* Header — navy linear gradient 135deg #0E2156 → #173B8D, padding 40px 0 */}
      <header
        className="text-white"
        style={{ background: "linear-gradient(135deg, #0E2156, #173B8D)", paddingTop: 40, paddingBottom: 40 }}
      >
        <div className="container-wide flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-0 items-start gap-5">
            {/* 72px white rounded-14px monogram tile, navy letter */}
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-white shadow-card">
              {partner.logoUrl ? (
                <img src={partner.logoUrl} alt={`${partner.name} logo`} className="h-12 w-12 object-contain" />
              ) : (
                <span className="font-display text-[28px] font-extrabold text-primary">
                  {partner.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-2xl font-extrabold text-white md:text-[30px]">{partner.name}</h1>
                {partner.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal/20 px-2.5 py-1 text-xs font-semibold text-teal">
                    <ShieldCheck className="h-3.5 w-3.5" /> {t("partner.verified")}
                  </span>
                )}
                {partner.foundingPartner && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#0A9881] to-[#1FA6AE] px-2.5 py-1 text-xs font-semibold text-white">
                    <Award className="h-3.5 w-3.5" /> {t("partner.foundingPartner")}
                  </span>
                )}
              </div>

              {partner.tagline && (
                <p className="mt-2 max-w-2xl text-sm" style={{ color: "rgba(255,255,255,.8)" }}>{partner.tagline}</p>
              )}

              {/* Meta row: location · rating · listings · since */}
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" style={{ color: "rgba(255,255,255,.7)" }}>
                {city && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {city}, {partner.country}
                  </span>
                )}
                {partner.reviewCount > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-[#F2A900] text-[#F2A900]" />
                    {partner.rating.toFixed(1)} {t("partner.ratingLabel")}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Box className="h-4 w-4" />
                  {partner.listingCount} {t("partner.listingsLabel")}
                </span>
                {partner.foundedYear && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {t("partner.since").replace("{{year}}", String(partner.foundedYear))}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions: Contact (white) + Save (green) */}
          <div className="flex shrink-0 flex-wrap gap-3">
            <Button
              onClick={() => setContactOpen(true)}
              className="min-h-[44px] bg-white text-navy-ink hover:bg-secondary"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              {t("partner.contact")}
            </Button>
            <Button
              onClick={handleSave}
              aria-pressed={saved}
              className="min-h-[44px] bg-accent text-accent-foreground hover:bg-brand-greenDeep"
            >
              <Heart className={`mr-2 h-4 w-4 ${saved ? "fill-current" : ""}`} />
              {saved ? t("partner.saved") : t("partner.save")}
            </Button>
          </div>
        </div>
      </header>

      {/* Body — "Available from {name}" listings grid */}
      <section className="container-wide py-14">
        <h2 className="font-display text-[22px] font-extrabold text-navy-ink">
          {t("partner.availableFrom").replace("{name}", partner.name)}
        </h2>

        {partnerListings.length > 0 ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {partnerListings.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        ) : (
          /* Empty "getting set up" state */
          <div className="mx-auto mt-6 flex max-w-md flex-col items-center rounded-[14px] border border-line bg-card p-10 text-center shadow-card">
            <div className="flex h-[54px] w-[54px] items-center justify-center rounded-[14px] bg-secondary">
              <Box className="h-[26px] w-[26px] text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-display text-lg font-extrabold text-navy-ink">
              {t("partner.empty.title")}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("partner.empty.body")}
            </p>
          </div>
        )}
      </section>

      <PartnerContactModal partner={partner} open={contactOpen} onOpenChange={setContactOpen} />
    </div>
  );
}
