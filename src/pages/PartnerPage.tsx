import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "@/i18n/routing";
import { Loader2, MapPin, Clock, Star, ShieldCheck, Award, Box, MessageCircle, Heart, ExternalLink, Sparkles, ArrowRight, Info, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePartnerGoogleReviews, type GoogleReview } from "@/hooks/usePartnerGoogleReviews";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SkeletonCard } from "@/components/SkeletonCard";
import { LogoImage } from "@/components/LogoImage";
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
import { serviceTypeLabel } from "@/lib/serviceTypes";

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ContactFieldErrors = { name?: string; email?: string; message?: string };

/**
 * Contact modal (pixel-spec §Partner header "Contact").
 *
 * ── Who actually answers ──
 *
 * There are two kinds of partner behind this button and only one of them can
 * reply, so the dialog says two different things.
 *
 * A CLAIMED partner has a Ruumly account and a dashboard, so the lead this
 * creates reaches them and "they'll reply by email" is a promise we keep.
 *
 * The branch is `repliesDirectly` — does this partner have a provider login —
 * and deliberately NOT `isDirectory`. Those are different questions:
 * `isDirectory` is PROVENANCE, recording that a row was imported rather than
 * hand-added, and a partner an admin typed in has isDirectory=false while still
 * having nobody to email. This codebase has already paid for conflating the two
 * once, in ProviderCandidateFinder, where gating capability on provenance made
 * every admin-added partner invisible to every lead.
 *
 * An UNREACHABLE partner has no account, no dashboard, no channel we can push a
 * message down. The copy
 * promised a reply from them anyway, in all five languages, and two real
 * visitors sent messages that no partner ever saw; one was an Estonian lead on
 * a self-storage page inside the Tallinn catchment. So on an unclaimed profile
 * this form makes NO promise on the company's behalf: it is addressed to
 * Ruumly, and it states outright that we do not forward it to them. Softer
 * wording that still implies the partner writes back would be the same bug.
 *
 * ── How the partner identity travels ──
 *
 * As `partnerSlug`, not as a "Partner: name (slug)" line stapled onto the end
 * of the message. The backend resolves the slug into a DemandLead routed to
 * that supplier; prose in a free-text body could only ever be read by a human,
 * which is how these two leads went nowhere.
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
  // Falsy means "make no promise". A profile is cached for 60s and an entry
  // written before RepliesDirectly existed deserializes without it, so the
  // default has to fail towards honesty rather than towards a reply we cannot
  // deliver.
  const unclaimed = partner.repliesDirectly !== true;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<ContactFieldErrors>({});
  const [sendError, setSendError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const fieldRefs: Record<keyof ContactFieldErrors, React.RefObject<HTMLElement>> = {
    name: nameRef,
    email: emailRef,
    message: messageRef,
  };

  // Reopening must not greet the visitor with the banner from a send that
  // failed ten minutes ago. What they TYPED survives on purpose: Esc and a
  // click on the overlay both close this dialog by accident, and losing the
  // message to either is worse than one stale error line.
  useEffect(() => {
    if (open) {
      setErrors({});
      setSendError(null);
    }
  }, [open]);

  const inputCls =
    "h-11 rounded-[10px] border bg-card px-3.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";
  const borderFor = (invalid: boolean) => (invalid ? "border-destructive" : "border-input");

  const validate = (): ContactFieldErrors => {
    const next: ContactFieldErrors = {};
    if (!name.trim()) next.name = t("contact.errorName");
    if (!email.trim()) next.email = t("contact.errorEmail");
    // The reply comes back to this address and nowhere else, so a typo here is
    // the same silence the honesty fix above exists to prevent.
    else if (!EMAIL_RE.test(email.trim())) next.email = t("contact.errorEmailInvalid");
    // Required now that the partner identity no longer rides along in the body:
    // an empty box used to still send the "Partner: …" line, and today it would
    // file a lead with nothing in it for the concierge to act on.
    // Mirror ContactRequestValidator's 10-char floor. Without it the server
    // rejects a short message with a bare 400 and the visitor sees a generic
    // failure naming no field — which is how "test" became a lead nobody could
    // act on. The rule stays server-side; this only states it in their language.
    if (!message.trim()) next.message = t("contact.errorMessage");
    else if (message.trim().length < 10) next.message = t("contact.errorMessageShort");
    return next;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Put the caret on the first thing that is wrong. This was a toast, which
      // is announced once, disappears, and never says WHICH field — leaving a
      // keyboard or screen-reader user to hunt for it.
      const order: (keyof ContactFieldErrors)[] = ["name", "email", "message"];
      const firstInvalid = order.find((k) => found[k]);
      if (firstInvalid) fieldRefs[firstInvalid].current?.focus();
      return;
    }
    setSendError(null);
    setSubmitting(true);
    try {
      await contactService.send({
        name: name.trim(),
        email: email.trim(),
        subject: `Partner contact — ${partner.name}`,
        message: message.trim(),
        partnerSlug: partner.slug,
        language,
      });
      setName("");
      setEmail("");
      setMessage("");
      onOpenChange(false);
      toast.success(unclaimed ? t("partner.contactToastDirectory") : t("partner.contactToast"));
    } catch {
      // Inline, not a toast: the dialog stays open with everything still typed
      // in it, so a retry is one click rather than a retyped message.
      setSendError(t("detail.requestError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[14px] p-0">
        <DialogHeader className="flex flex-row items-center justify-between gap-3 border-b border-border px-5 py-4 text-left">
          <DialogTitle className="font-display text-lg font-bold">
            {(unclaimed ? t("partner.contactTitleDirectory") : t("partner.contactTitle")).replace("{name}", partner.name)}
          </DialogTitle>
        </DialogHeader>
        {/* noValidate: the browser's own required/type=email bubbles preempt
            this handler, and they speak the browser's language rather than the
            visitor's — so all validation runs here, in one voice. */}
        <form onSubmit={submit} noValidate className="space-y-3.5 px-5 pb-5">
          <DialogDescription className="text-sm text-muted-foreground">
            {(unclaimed ? t("partner.contactIntroDirectory") : t("partner.contactIntro")).replace("{name}", partner.name)}
          </DialogDescription>
          {/* The whole point of the branch: on an unclaimed profile, say who
              reads this and who does not. */}
          {unclaimed && (
            <p className="flex items-start gap-2 rounded-lg border border-line bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-deep" aria-hidden />
              {t("partner.contactNoteDirectory").replace("{name}", partner.name)}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pc-name" className="text-[13px] font-semibold text-ink-2">
              {t("detail.requestNameLabel")} <span className="text-destructive">*</span>
            </label>
            <input
              id="pc-name"
              ref={nameRef}
              value={name}
              autoComplete="name"
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
              placeholder={t("detail.requestNamePlaceholder")}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "pc-name-error" : undefined}
              required
              className={`${inputCls} ${borderFor(!!errors.name)}`}
            />
            {errors.name && <p id="pc-name-error" role="alert" className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pc-email" className="text-[13px] font-semibold text-ink-2">
              {t("detail.requestEmailLabel")} <span className="text-destructive">*</span>
            </label>
            <input
              id="pc-email"
              ref={emailRef}
              type="email"
              value={email}
              autoComplete="email"
              inputMode="email"
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
              placeholder="you@email.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "pc-email-error" : undefined}
              required
              className={`${inputCls} ${borderFor(!!errors.email)}`}
            />
            {errors.email && <p id="pc-email-error" role="alert" className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pc-message" className="text-[13px] font-semibold text-ink-2">
              {t("detail.requestMessageLabel")} <span className="text-destructive">*</span>
            </label>
            <textarea
              id="pc-message"
              ref={messageRef}
              value={message}
              onChange={(e) => { setMessage(e.target.value); setErrors((p) => ({ ...p, message: undefined })); }}
              rows={3}
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? "pc-message-error" : undefined}
              required
              className={`min-h-[88px] rounded-[10px] border bg-card px-3.5 py-2.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${borderFor(!!errors.message)}`}
            />
            {errors.message && <p id="pc-message-error" role="alert" className="text-xs text-destructive">{errors.message}</p>}
          </div>
          {sendError && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {sendError}
            </div>
          )}
          {/* The spinner is added BESIDE the label rather than replacing it —
              swapping the text out leaves the button with no accessible name
              at the one moment a screen reader is asked what is happening. */}
          <Button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="h-12 w-full gap-2 bg-primary text-base font-semibold text-primary-foreground hover:bg-navy-ink"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {t("detail.sendRequestBtn")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PartnerStarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= Math.round(rating) ? "fill-[#F2A900] text-[#F2A900]" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

/** Inline Google wordmark so Google-sourced reviews are clearly attributed. */
function GoogleBadge() {
  return (
    <span
      aria-hidden
      className="inline-flex select-none items-center font-bold leading-none tracking-tight"
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      <span style={{ color: "#4285F4" }}>G</span>
      <span style={{ color: "#EA4335" }}>o</span>
      <span style={{ color: "#FBBC05" }}>o</span>
      <span style={{ color: "#4285F4" }}>g</span>
      <span style={{ color: "#34A853" }}>l</span>
      <span style={{ color: "#EA4335" }}>e</span>
    </span>
  );
}

function GoogleReviewCard({ review }: { review: GoogleReview }) {
  return (
    <div className="rounded-[14px] border border-line bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {review.authorPhotoUrl ? (
            <img src={review.authorPhotoUrl} alt="" className="h-9 w-9 rounded-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary font-display text-sm font-bold text-foreground">
              {(review.authorName || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <strong className="font-display text-sm font-semibold text-navy-ink">{review.authorName}</strong>
            <div className="mt-0.5"><PartnerStarRow rating={review.rating} /></div>
          </div>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{review.relativeTimeDesc}</span>
      </div>
      {review.text && <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{review.text}</p>}
    </div>
  );
}

/**
 * Partner reviews. Most partners are directory-only / request-based and can never
 * earn an in-platform review (those require a completed booking). When the partner
 * has a linked Google place, surface its rating + a few reviews instead of an empty
 * section — clearly labelled "from Google", never merged into the platform average.
 */
function PartnerGoogleReviews({ partner }: { partner: PartnerProfile }) {
  const { t } = useLanguage();
  // Skip the request when there are platform reviews (header already shows them)
  // or when the partner has no linked Google place.
  const enabled = partner.reviewCount === 0 && (partner.hasGoogleReviews ?? false);
  const { data: google } = usePartnerGoogleReviews(partner.slug, enabled);

  const googleReviews = google?.reviews?.slice(0, 3) ?? [];
  if (!enabled || !google || googleReviews.length === 0) return null;

  return (
    <section className="container-wide pb-14">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-[22px] font-extrabold text-navy-ink">{t("reviews.title")}</h2>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Star className="h-4 w-4 fill-[#F2A900] text-[#F2A900]" />
          {google.rating.toFixed(1)} ({t("reviews.count").replace("{count}", String(google.totalRatings))})
          <span className="inline-flex items-center gap-1 text-[11px]">· {t("reviews.fromGoogle")} <GoogleBadge /></span>
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("reviews.noPlatformYet")}</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {googleReviews.map((r, i) => (
          <GoogleReviewCard key={`${r.authorName}-${r.time}-${i}`} review={r} />
        ))}
      </div>
      {google.mapsUrl && (
        <a
          href={google.mapsUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          {t("reviews.viewOnGoogle")}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </section>
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
  // Broken logo URLs (imported directory data can 404) fall back to the
  // monogram tile instead of the browser's broken-image glyph.
  const [logoFailed, setLogoFailed] = useState(false);

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
  const seoDescription =
    partner.tagline || `${partner.name} — ${partner.locationCount} ${t("partner.stats.locations")}, ${partner.country}.`;
  const city = partner.locations[0]?.city;

  // Concierge CTA for unclaimed directory profiles — capture the lead on-platform
  // (scoped to the provider's primary service + city) instead of pushing the
  // customer off-site for pricing before a lead is captured.
  const primarySlug = partner.serviceTypes?.[0];
  const primaryServiceLabel = primarySlug ? serviceTypeLabel(t, primarySlug) : t("serviceType.warehouse");

  // The title says what this provider ACTUALLY does and where. It used to append
  // a fixed "partner.seoTitleSuffix" — literally "Storage in Tallinn" in all five
  // languages — so every one of ~1,200 partner pages was titled that in Google and
  // in every social share: a Klaipėda trailer firm indexed as Tallinn storage.
  //
  // Service and city are joined with a dash rather than a preposition on purpose.
  // Estonian, Latvian and Lithuanian would need the city in the locative
  // ("Vilniuje", "Klaipėdoje", "Rīgā"), and we hold city names in the nominative,
  // so any "{service} in {city}" template would be ungrammatical in three of the
  // five languages. "Perkraustymas — Vilnius" is correct everywhere.
  const seoSuffix = city ? `${primaryServiceLabel} — ${city}` : primaryServiceLabel;
  const seoTitle = `${partner.name} — ${seoSuffix}`;
  const requestParams = new URLSearchParams();
  if (primarySlug) requestParams.set("category", primarySlug);
  if (city) requestParams.set("city", city);
  const requestTo = `/request${requestParams.toString() ? `?${requestParams.toString()}` : ""}`;
  const conciergeTitle = city
    ? t("partner.directory.conciergeTitle").replace("{service}", primaryServiceLabel).replace("{city}", city)
    : t("partner.directory.conciergeTitleNoCity").replace("{service}", primaryServiceLabel);

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
        className="pt-[96px] pb-10 text-white md:pt-[112px]"
        style={{ background: "linear-gradient(135deg, #0E2156, #173B8D)" }}
      >
        <div className="container-wide flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-0 items-start gap-5">
            {/* 72px rounded-14px logo tile. LogoImage picks the fit per image:
                square-ish logos/photos fill the tile (object-cover, translucent
                bg for transparent PNGs); wide wordmarks contain on a light bg —
                no fat white frame either way. White monogram tile is the
                fallback for missing/broken logos. */}
            <div className={`flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] shadow-card ${partner.logoUrl && !logoFailed ? "bg-white/10" : "bg-white"}`}>
              {partner.logoUrl && !logoFailed ? (
                <LogoImage
                  src={partner.logoUrl}
                  alt={t("partner.logoAlt").replace("{name}", partner.name)}
                  padClass="p-1.5"
                  loading="eager"
                  onError={() => setLogoFailed(true)}
                />
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
                {/* Directory profiles have no listings — a "0 listings" stat
                    would only undermine the profile, so it is hidden. */}
                {!partner.isDirectory && (
                  <span className="inline-flex items-center gap-1.5">
                    <Box className="h-4 w-4" />
                    {partner.listingCount} {t("partner.listingsLabel")}
                  </span>
                )}
                {partner.foundedYear && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {t("partner.since").replace("{{year}}", String(partner.foundedYear))}
                  </span>
                )}
              </div>

              {/* Directory service-type chips — what this company offers */}
              {partner.isDirectory && (partner.serviceTypes ?? []).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(partner.serviceTypes ?? []).map((st) => (
                    <span
                      key={st}
                      className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white"
                    >
                      {serviceTypeLabel(t, st)}
                    </span>
                  ))}
                </div>
              )}

              {/* The provider's own headline rate, set through the claim form.
                  Rendered only when they gave us one — no "price on request"
                  placeholder, because an empty space is honest and an invented
                  placeholder is not. */}
              {partner.priceFrom != null && (
                <div className="mt-3">
                  <span className="text-xs uppercase tracking-wide" style={{ color: "rgba(255,255,255,.65)" }}>
                    {t("partner.priceFromLabel")}
                  </span>
                  <span className="ml-2 text-lg font-bold text-white">
                    {partner.priceFrom.toLocaleString(language, { style: "currency", currency: "EUR", maximumFractionDigits: 2 })}
                    {partner.priceUnit ? <span className="ml-1 text-sm font-medium">{partner.priceUnit}</span> : null}
                  </span>
                  {partner.priceNote && (
                    <p className="mt-1 max-w-2xl text-xs" style={{ color: "rgba(255,255,255,.75)" }}>{partner.priceNote}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions: Website (directory, white) + Contact (white) + Save (green) */}
          <div className="flex shrink-0 flex-wrap gap-3">
            {/* Scheme-guarded: API data must never mint javascript:/data: hrefs. */}
            {partner.isDirectory && partner.websiteUrl && /^https?:\/\//i.test(partner.websiteUrl) && (
              <Button
                asChild
                className="min-h-[44px] bg-white text-navy-ink hover:bg-secondary"
              >
                <a href={partner.websiteUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t("partner.visitWebsite")}
                </a>
              </Button>
            )}
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

      {/* Body — directory note (unclaimed profile: no listings/pricing/booking)
          OR the "Available from {name}" listings grid */}
      {partner.isDirectory ? (
        <section className="container-wide py-14">
          <div className="mx-auto flex max-w-lg flex-col items-center rounded-[14px] border border-accent/30 bg-gradient-to-br from-accent/[0.08] to-teal/[0.06] p-8 text-center shadow-card md:p-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-accent to-teal-deep px-3 py-1 text-xs font-semibold text-white shadow-card">
              <Sparkles className="h-3.5 w-3.5" />
              {t("home.concierge.eyebrow")}
            </span>
            <h2 className="mt-3 font-display text-xl font-bold text-navy-ink md:text-2xl">
              {conciergeTitle}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              {t("partner.directory.conciergeBody")}
            </p>
            <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row">
              <Button asChild className="min-h-[44px] gap-2 bg-accent px-6 font-semibold text-accent-foreground hover:bg-brand-greenDeep">
                <Link to={requestTo}>
                  {t("nav.getOffers")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="min-h-[44px]" onClick={() => setContactOpen(true)}>
                <MessageCircle className="mr-2 h-4 w-4" />
                {t("partner.contact")}
              </Button>
            </div>
          </div>
        </section>
      ) : (
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
      )}

      <PartnerGoogleReviews partner={partner} />

      {/* Claim banner — free takeover pitch for the company that owns this
          unclaimed directory profile. This used to be a mailto: (a human read
          the reply and edited the row by hand); it now opens the real
          verification flow at /{lang}/claim/{slug}. */}
      {partner.isDirectory && (
        <section className="container-wide pb-14">
          <div className="rounded-[14px] border border-line bg-secondary/60 p-8 text-center shadow-card md:p-10">
            <h2 className="font-display text-[22px] font-extrabold text-navy-ink">
              {t("partner.claim.title")}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {t("partner.claim.body")}
            </p>
            <Button
              asChild
              className="mt-5 min-h-[44px] bg-accent px-6 font-semibold text-accent-foreground hover:bg-brand-greenDeep"
            >
              <Link to={`/claim/${partner.slug}`}>
                {t("partner.claim.cta")}
              </Link>
            </Button>
          </div>
        </section>
      )}

      <PartnerContactModal partner={partner} open={contactOpen} onOpenChange={setContactOpen} />
    </div>
  );
}
