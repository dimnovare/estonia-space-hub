import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  AlertCircle, ArrowRight, CheckCircle, Clock, LinkIcon, Loader2, MailCheck,
  RotateCcw, Save, Send, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { SEO } from "@/components/SEO";
import {
  claimService,
  type ClaimEditableProfile,
  type PublicClaimProfile,
} from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { PUBLIC_SERVICE_TYPE_SLUGS, serviceTypeLabel } from "@/lib/serviceTypes";

/**
 * /{lang}/claim/{slug} — the public "claim your profile" page.
 *
 * Ruumly's directory holds 1,186 providers added from public research. The
 * introduction campaign tells them they can claim their profile to correct
 * their details; this page is where that happens. Anonymous, noindex, minimal
 * chrome (the global Navbar is suppressed for /claim/ routes in AppContent,
 * like /offer/ and /quote/).
 *
 * Three states, one route:
 *   1. ASK      — enter the business email. The response is identical whether
 *                 or not it matches the address on file, so this screen must
 *                 never claim (or imply) that the address was recognised.
 *   2. VERIFY   — ?token=… from the email is redeemed once, then stripped from
 *                 the URL so a spent credential does not linger in history.
 *   3. EDIT     — the small allowed set of fields, saved against a session that
 *                 is scoped server-side to this supplier alone.
 */

/** Where the redeemed session lives. sessionStorage, not localStorage: a claim
 *  session is a credential and has no business surviving the browser tab. */
const sessionKey = (slug: string) => `ruumly-claim:${slug}`;

interface StoredSession { token: string; expiresAt: string }

function readSession(slug: string): StoredSession | null {
  if (!slug) return null;
  try {
    const raw = sessionStorage.getItem(sessionKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.token || !parsed?.expiresAt) return null;
    // Expired locally — do not even try the request.
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      sessionStorage.removeItem(sessionKey(slug));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Whether a failure means this claim session is finished, as opposed to merely
 * unlucky. Everything behind it was bought with a single-use magic link, so the
 * distinction is expensive: discarding a session costs the provider a whole new
 * email, and most will not go and ask for one.
 *
 * 401 = expired or missing, 403 = a session scoped to a different profile,
 * 404 = a row that stopped being claimable. None of those improve by holding on
 * to the credential. A 502 mid-deploy or a 429 from the shared search limiter
 * say nothing about the session at all.
 *
 * An anonymous 401 arrives as a bare Error("Unauthorized") carrying no status —
 * the api client only attaches one on the logged-in refresh-and-retry path — so
 * the message has to be read when the status is absent.
 */
export function isClaimSessionRejection(err: unknown): boolean {
  const e = err as (Error & { status?: number }) | null | undefined;
  const status = e?.status;
  if (typeof status === "number") return status === 401 || status === 403 || status === 404;
  return /unauthor/i.test(e?.message ?? "");
}

/**
 * Both claim reads sit behind the "search" rate limiter, so a failure must not
 * turn into a burst: a 429 answered with more requests is the one thing that
 * guarantees it stays 429. Never retry a 4xx; give a 5xx or a dropped
 * connection — what a Railway restart looks like from here — one more try.
 */
export function claimRetryPolicy(failureCount: number, err: unknown): boolean {
  if (isClaimSessionRejection(err)) return false;
  const status = (err as (Error & { status?: number }) | null)?.status;
  if (typeof status === "number" && status >= 400 && status < 500) return false;
  return failureCount < 2;
}

const inputCls =
  "h-11 w-full rounded-md border border-border bg-background px-3 text-base sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

export default function ClaimPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { t, language } = useLanguage();
  const settings = usePlatformSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const linkToken = searchParams.get("token");

  const [session, setSession] = useState<StoredSession | null>(() => readSession(slug));
  const [email, setEmail] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [linkDead, setLinkDead] = useState(false);
  const verifiedRef = useRef(false);

  // ── Public profile (name/city) — all an unverified visitor may see ──
  const { data: profile, isLoading, isError, error, refetch, isFetching } =
    useQuery<PublicClaimProfile>({
      queryKey: queryKeys.claims.bySlug(slug),
      queryFn: () => claimService.get(slug),
      enabled: slug.length > 0,
      staleTime: 60_000,
      retry: claimRetryPolicy,
    });
  const getStatus = (error as (Error & { status?: number }) | null)?.status;

  // ── Redeem the magic link, exactly once ──
  const verifyMutation = useMutation({
    mutationFn: (token: string) => claimService.verify(token),
    onSuccess: (result) => {
      const stored = { token: result.sessionToken, expiresAt: result.expiresAt };
      try { sessionStorage.setItem(sessionKey(slug), JSON.stringify(stored)); } catch { /* private mode */ }
      setSession(stored);
      seedForm(result.profile);
      // Strip the spent token from the URL — it is single-use, so leaving it in
      // history/referrers only risks a confusing "link expired" on a refresh.
      setSearchParams({}, { replace: true });
    },
    onError: () => {
      setLinkDead(true);
      setSearchParams({}, { replace: true });
    },
  });

  useEffect(() => {
    if (!linkToken || verifiedRef.current || session) return;
    verifiedRef.current = true;
    verifyMutation.mutate(linkToken);
  }, [linkToken, session, verifyMutation]);

  // ── Editable form ──
  const [form, setForm] = useState<ClaimEditableProfile | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const savedRef = useRef<HTMLDivElement>(null);

  // The confirmation and the account offer both render above a form that is
  // about a full screen tall on a phone, so the provider who taps Save is
  // several hundred pixels below the only two things that answer them — and the
  // save button's own label is the same before and after. Failures render at
  // the button, so without this the one person who sees nothing happen is
  // precisely the one whose save worked. Same move as the contact form makes
  // when it sends you to your first invalid field.
  useEffect(() => {
    if (!saved) return;
    savedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [saved]);

  // ── Optional provider account, offered after a successful save ──
  const [password, setPassword] = useState("");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountDone, setAccountDone] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const accountMutation = useMutation({
    mutationFn: async () => {
      const created = await claimService.createAccount(slug, session!.token, password);
      // Sign in with the address the SERVER bound the account to. It is the one
      // the magic link reached, which is not necessarily the contact email now
      // on the profile — this same session is allowed to have changed that.
      await login(created.user.email, password);
      return created;
    },
    onSuccess: () => {
      setAccountDone(true);
      setPassword("");
      navigate("/provider/dashboard");
    },
    onError: (err: Error) => setAccountError(err.message || t("claim.account.failed")),
  });
  const seededRef = useRef(false);

  function seedForm(p: ClaimEditableProfile) {
    seededRef.current = true;
    setForm(p);
  }

  // A returning tab has a session but no form yet — re-read it.
  const {
    data: editable, error: editableError, isError: editableFailed,
    refetch: refetchEditable, isFetching: editableFetching,
  } = useQuery<ClaimEditableProfile>({
    queryKey: [...queryKeys.claims.bySlug(slug), "profile"],
    queryFn: () => claimService.getProfile(slug, session!.token),
    enabled: Boolean(session) && !seededRef.current && slug.length > 0,
    retry: claimRetryPolicy,
  });

  useEffect(() => {
    if (editable && !seededRef.current) seedForm(editable);
  }, [editable]);

  const sessionRejected = editableFailed && isClaimSessionRejection(editableError);

  // The stored session no longer works (expired, scoped elsewhere, or the
  // profile changed state). Drop it so the page falls back to "ask for a link"
  // instead of sitting on a credential that will only fail again on the next
  // load — but ONLY for an answer that is actually about the session. The
  // backend redeploys several times a day and this endpoint is rate limited,
  // and a provider who verified thirty seconds ago must not be thrown out by a
  // 502 or a 429; the link that got them here is spent.
  useEffect(() => {
    if (!sessionRejected) return;
    try { sessionStorage.removeItem(sessionKey(slug)); } catch { /* private mode */ }
    setSession(null);
  }, [sessionRejected, slug]);

  const saveMutation = useMutation({
    mutationFn: (body: ClaimEditableProfile) =>
      claimService.updateProfile(slug, session!.token, {
        name:         body.name.trim(),
        contactPhone: body.contactPhone?.trim() || null,
        contactEmail: (body.contactEmail ?? "").trim(),
        websiteUrl:   body.websiteUrl?.trim() || null,
        address:      body.address?.trim() || null,
        serviceTypes: body.serviceTypes,
        description:  body.description?.trim() || null,
        // "" clears the price; a blank input must not read as "leave unchanged",
        // or a provider who deletes a wrong figure would find it still there.
        priceFrom:    body.priceFrom ?? null,
        priceUnit:    body.priceUnit?.trim() ?? "",
        priceNote:    body.priceNote?.trim() ?? "",
      }),
    onSuccess: (result) => {
      setForm(result);
      setFormError(null);
      setSaved(true);
    },
    onError: (err: Error & { status?: number }) => {
      setSaved(false);
      // A dead session must read as "ask for a new link", never as a mysterious
      // save failure. Shares one rule with the profile read above so the two
      // cannot drift into disagreeing about what counts as expired.
      if (isClaimSessionRejection(err)) {
        try { sessionStorage.removeItem(sessionKey(slug)); } catch { /* private mode */ }
        setSession(null);
        setForm(null);
        seededRef.current = false;
        setFormError(t("claim.sessionExpired"));
        return;
      }
      if (err?.status === 400) { setFormError(err.message || t("claim.saveError")); return; }
      setFormError(t("claim.saveError"));
    },
  });

  const requestMutation = useMutation({
    mutationFn: (address: string) => claimService.requestLink(slug, address, language),
    onSuccess: () => { setRequestError(null); setRequestSent(true); },
    onError: (err: Error & { status?: number; retryAfter?: number }) => {
      if (err?.status === 429) {
        const secs = err.retryAfter;
        setRequestError(secs && secs > 0
          ? t("claim.rateLimitRetryAfter").replace("{seconds}", String(Math.ceil(secs)))
          : t("claim.rateLimitError"));
        return;
      }
      if (err?.status === 400) { setRequestError(err.message || t("claim.emailInvalid")); return; }
      setRequestError(t("claim.requestError"));
    },
  });

  // The provider's own already-stored slugs stay offered even when retired
  // (a mover tagged "packing" must not silently lose it on save).
  const serviceOptions = useMemo(() => {
    const base = [...PUBLIC_SERVICE_TYPE_SLUGS] as string[];
    for (const s of form?.serviceTypes ?? []) if (!base.includes(s)) base.push(s);
    return base;
  }, [form?.serviceTypes]);

  const supportEmail = settings.siteEmail || "info@ruumly.eu";

  const header = (
    <header className="border-b border-border bg-card">
      <div className="container-wide flex h-14 items-center">
        <Link to="/" aria-label="Ruumly" className="flex items-center gap-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <img src="/ruumly-mark.png" alt="" aria-hidden="true" width={30} height={30} decoding="async" className="h-[30px] w-[30px] object-contain" />
          <span className="brand-word text-[20px]">Ruumly</span>
        </Link>
      </div>
    </header>
  );

  const helpFooter = (
    <p className="mt-10 text-center text-sm text-muted-foreground">
      {t("claim.help").replace("{email}", "")}
      <a href={`mailto:${supportEmail}`} className="font-medium text-teal-text hover:underline">{supportEmail}</a>
    </p>
  );

  const shell = (title: string, description: string, children: React.ReactNode) => (
    <div className="min-h-screen surface-sunken">
      <SEO title={title} description={description} path={`/claim/${slug}`} noindex />
      {header}
      {children}
    </div>
  );

  const centered = (icon: React.ReactNode, title: string, body: string, action?: React.ReactNode) => (
    <div className="container-wide flex min-h-[60vh] items-center justify-center py-16">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary">{icon}</div>
        <h1 className="mt-5 font-display text-2xl font-bold text-navy-ink">{title}</h1>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
        {action}
        {helpFooter}
      </div>
    </div>
  );

  // ── Loading ──
  // A held session with no form yet means the profile read is still in flight
  // (it is the only thing that can be, since the query is enabled exactly
  // then). Show the skeleton rather than falling through to "enter your
  // business email" — asking a verified provider to re-prove themselves for the
  // duration of a round trip, or of a retry after a blip, invites them to spend
  // a second magic link they do not need.
  if (isLoading || (linkToken && verifyMutation.isPending) || (session && !form && !editableFailed)) {
    return shell(t("claim.seo.title"), t("claim.subtitle"), (
      <div className="container-wide mx-auto max-w-xl py-10">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="mt-3 h-4 w-1/2" />
        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-4 h-11 w-full rounded-md" />
          <Skeleton className="mt-3 h-11 w-full rounded-md" />
        </div>
      </div>
    ));
  }

  // ── Unknown / unclaimable profile ──
  if (isError && getStatus === 404) {
    return shell(t("claim.notFoundTitle"), t("claim.notFoundBody"),
      centered(<LinkIcon className="h-7 w-7 text-muted-foreground" />,
        t("claim.notFoundTitle"), t("claim.notFoundBody"),
        <Button asChild className="mt-6 h-12 bg-primary px-6 font-display text-primary-foreground hover:bg-primary/90">
          <Link to="/">{t("claim.backHome")}<ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>));
  }

  if (isError && getStatus === 429) {
    return shell(t("claim.rateLimitTitle"), t("claim.rateLimitBody"),
      centered(<Clock className="h-7 w-7 text-warning-text" />,
        t("claim.rateLimitTitle"), t("claim.rateLimitBody"),
        <Button className="mt-6 h-12 gap-2 bg-primary px-6 font-display text-primary-foreground hover:bg-primary/90"
          disabled={isFetching} onClick={() => refetch()}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          {t("claim.retry")}
        </Button>));
  }

  if (isError || !profile) {
    return shell(t("claim.errorTitle"), t("claim.errorBody"),
      centered(<AlertCircle className="h-7 w-7 text-muted-foreground" />,
        t("claim.errorTitle"), t("claim.errorBody"),
        <Button className="mt-6 h-12 gap-2 bg-primary px-6 font-display text-primary-foreground hover:bg-primary/90"
          disabled={isFetching} onClick={() => refetch()}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          {t("claim.retry")}
        </Button>));
  }

  // A live session whose profile read failed for a reason that was not about
  // the session. The credential is still good, so offer the read again rather
  // than dropping them on the "ask for a link" screen holding a link they
  // already spent.
  if (session && !form && editableFailed && !sessionRejected) {
    return shell(t("claim.errorTitle"), t("claim.errorBody"),
      centered(<AlertCircle className="h-7 w-7 text-muted-foreground" />,
        t("claim.errorTitle"), t("claim.errorBody"),
        <Button className="mt-6 h-12 gap-2 bg-primary px-6 font-display text-primary-foreground hover:bg-primary/90"
          disabled={editableFetching} onClick={() => refetchEditable()}>
          {editableFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          {t("claim.retry")}
        </Button>));
  }

  // ── EDIT: a verified session is live ──
  if (session && form) {
    const toggleService = (slugValue: string) => {
      setSaved(false);
      setForm((f) => f && ({
        ...f,
        serviceTypes: f.serviceTypes.includes(slugValue)
          ? f.serviceTypes.filter((s) => s !== slugValue)
          : [...f.serviceTypes, slugValue],
      }));
    };
    const set = (patch: Partial<ClaimEditableProfile>) => {
      setSaved(false);
      setForm((f) => f && ({ ...f, ...patch }));
    };
    const submit = () => {
      if (!form.name.trim()) { setFormError(t("claim.nameRequired")); return; }
      if (!(form.contactEmail ?? "").trim()) { setFormError(t("claim.emailRequiredForm")); return; }
      if (form.serviceTypes.length === 0) { setFormError(t("claim.servicesRequired")); return; }
      setFormError(null);
      saveMutation.mutate(form);
    };

    return shell(t("claim.editTitle"), t("claim.editSubtitle"), (
      <div className="container-wide mx-auto max-w-xl py-8 md:py-12">
        <span className="font-mono-label inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-teal-text">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          {t("claim.verifiedEyebrow")}
        </span>
        <h1 className="mt-1.5 font-display text-2xl font-bold leading-tight text-navy-ink md:text-3xl">
          {t("claim.editTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("claim.editSubtitle")}</p>

        {saved && (
          <div ref={savedRef} role="status" className="mt-5 flex items-start gap-3 rounded-xl border border-success/25 bg-success/5 p-4">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
            <div>
              <p className="font-display text-sm font-bold text-navy-ink">{t("claim.savedTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("claim.savedBody")}</p>
              <Link to={`/partner/${profile.slug}`} className="mt-1.5 inline-flex items-center gap-1 text-sm font-medium text-teal-text hover:underline">
                {t("claim.viewProfile")}<ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Offered only AFTER a successful save, never before: the provider has
            just done the work, which is the one moment an account reads as
            "keep what I did" rather than a hurdle. Entirely optional — the
            introduction letter promises "no account to create" to 754
            businesses, and claiming without one keeps working. */}
        {saved && !accountDone && (
          <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-4">
            <h2 className="font-display text-sm font-bold text-navy-ink">{t("claim.account.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("claim.account.body")}</p>
            <form
              className="mt-3 flex flex-wrap items-end gap-3"
              onSubmit={(e) => { e.preventDefault(); accountMutation.mutate(); }}
            >
              <label className="block text-xs font-medium text-muted-foreground">
                {t("claim.account.password")}
                <input
                  type="password" autoComplete="new-password" minLength={8}
                  className="mt-1 w-56 rounded-md border border-border bg-background px-3 py-2 text-base sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setAccountError(null); }} />
              </label>
              <Button type="submit" disabled={password.length < 8 || accountMutation.isPending}>
                {accountMutation.isPending
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  : <ShieldCheck className="mr-2 h-4 w-4" aria-hidden />}
                {t("claim.account.cta")}
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">{t("claim.account.hint")}</p>
            {accountError && (
              <p role="alert" className="mt-2 flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{accountError}
              </p>
            )}
          </div>
        )}

        <form className="mt-5 rounded-xl border border-border bg-card p-4"
          onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <label className="block text-xs font-medium text-muted-foreground">
            {t("claim.form.name")}
            <input className={`mt-1 ${inputCls}`} value={form.name} required
              onChange={(e) => set({ name: e.target.value })} />
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-muted-foreground">
              {t("claim.form.phone")}
              <input className={`mt-1 ${inputCls}`} value={form.contactPhone ?? ""} inputMode="tel"
                onChange={(e) => set({ contactPhone: e.target.value })} />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              {t("claim.form.email")}
              <input className={`mt-1 ${inputCls}`} type="email" required value={form.contactEmail ?? ""}
                onChange={(e) => set({ contactEmail: e.target.value })} />
            </label>
          </div>

          <label className="mt-4 block text-xs font-medium text-muted-foreground">
            {t("claim.form.website")}
            <input className={`mt-1 ${inputCls}`} value={form.websiteUrl ?? ""} placeholder="https://"
              onChange={(e) => set({ websiteUrl: e.target.value })} />
          </label>

          <label className="mt-4 block text-xs font-medium text-muted-foreground">
            {t("claim.form.address")}
            <input className={`mt-1 ${inputCls}`} value={form.address ?? ""}
              onChange={(e) => set({ address: e.target.value })} />
          </label>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t("claim.form.cityNote").replace("{city}", form.city ?? profile.city ?? "—")}
          </p>

          <fieldset className="mt-4">
            <legend className="text-xs font-medium text-muted-foreground">{t("claim.form.services")}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {serviceOptions.map((s) => {
                const on = form.serviceTypes.includes(s);
                return (
                  <button key={s} type="button" aria-pressed={on} onClick={() => toggleService(s)}
                    className={`min-h-[40px] rounded-full border px-3.5 text-sm font-medium transition-colors ${
                      on ? "border-teal-deep bg-teal-deep text-white" : "border-border bg-background text-foreground hover:bg-secondary"
                    }`}>
                    {serviceTypeLabel(t, s)}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="mt-4 block text-xs font-medium text-muted-foreground">
            {t("claim.form.description")}
            <textarea className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-base sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3} maxLength={160} value={form.description ?? ""}
              onChange={(e) => set({ description: e.target.value })} />
          </label>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t("claim.form.descriptionHint").replace("{count}", String(160 - (form.description ?? "").length))}
          </p>

          {/* Price. Set apart from the contact fields because it is the only thing
              on this form we could not have filled in ourselves, and the only one
              that changes whether we can answer a customer straight away. */}
          <fieldset className="mt-6 rounded-lg border border-border bg-secondary/30 p-4">
            <legend className="px-1 text-sm font-semibold text-foreground">{t("claim.form.priceLegend")}</legend>
            <p className="mb-3 text-xs text-muted-foreground">{t("claim.form.priceIntro")}</p>

            <div className="flex flex-wrap gap-3">
              <label className="block text-xs font-medium text-muted-foreground">
                {t("claim.form.priceFrom")}
                <input
                  type="number" inputMode="decimal" min={0} step="0.01"
                  className="mt-1 w-32 rounded-md border border-border bg-background px-3 py-2 text-base sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.priceFrom ?? ""}
                  onChange={(e) => set({ priceFrom: e.target.value === "" ? null : Number(e.target.value) })} />
              </label>
              <label className="block text-xs font-medium text-muted-foreground">
                {t("claim.form.priceUnit")}
                <input
                  type="text" maxLength={40} placeholder={t("claim.form.priceUnitPlaceholder")}
                  className="mt-1 w-44 rounded-md border border-border bg-background px-3 py-2 text-base sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.priceUnit ?? ""}
                  onChange={(e) => set({ priceUnit: e.target.value })} />
              </label>
            </div>

            <label className="mt-3 block text-xs font-medium text-muted-foreground">
              {t("claim.form.priceNote")}
              <textarea
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-base sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                rows={2} maxLength={500} placeholder={t("claim.form.priceNotePlaceholder")}
                value={form.priceNote ?? ""}
                onChange={(e) => set({ priceNote: e.target.value })} />
            </label>
          </fieldset>

          {formError && (
            <p role="alert" className="mt-3 flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />{formError}
            </p>
          )}

          <Button type="submit" disabled={saveMutation.isPending}
            className="mt-5 h-12 w-full justify-center gap-2 bg-primary font-display text-primary-foreground hover:bg-primary/90">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("claim.saveCta")}
          </Button>
          <p className="mt-2.5 text-center text-xs text-muted-foreground">{t("claim.publicNote")}</p>
        </form>

        {helpFooter}
      </div>
    ));
  }

  // ── ASK: request the magic link ──
  const askTitle = t("claim.title").replace("{name}", profile.name);

  return shell(t("claim.seo.title"), t("claim.subtitle"), (
    <div className="container-wide mx-auto max-w-xl py-8 md:py-12">
      <span className="font-mono-label text-[11px] font-medium uppercase tracking-[0.16em] text-teal-text">
        {t("claim.eyebrow")}
      </span>
      <h1 className="mt-1.5 font-display text-2xl font-bold leading-tight text-navy-ink md:text-3xl">{askTitle}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("claim.subtitle")}</p>

      {/* A spent or stale link is a distinct, non-alarming state: the link is
          the problem, not the person. Offer a fresh one right here. */}
      {linkDead && !requestSent && (
        <p role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-warning/25 bg-warning/5 px-4 py-3 text-sm text-warning-text">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {t("claim.linkDead")}
        </p>
      )}

      {profile.isClaimed && !requestSent && (
        <p className="mt-5 flex items-start gap-2 rounded-xl border border-info/25 bg-info/5 px-4 py-3 text-sm text-info">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {t("claim.alreadyClaimed")}
        </p>
      )}

      {requestSent ? (
        <div role="status" className="mt-6 rounded-xl border border-success/25 bg-success/5 p-5">
          <div className="flex items-start gap-3">
            <MailCheck className="mt-0.5 h-6 w-6 shrink-0 text-success" aria-hidden />
            <div>
              <h2 className="font-display text-lg font-bold text-navy-ink">{t("claim.sentTitle")}</h2>
              {/* Deliberately says nothing about whether the address matched —
                  the API answers identically either way and so must the UI. */}
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t("claim.sentBody")}</p>
            </div>
          </div>
        </div>
      ) : (
        <form className="mt-6 rounded-xl border border-border bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const value = email.trim();
            if (!value) { setRequestError(t("claim.emailInvalid")); return; }
            setRequestError(null);
            requestMutation.mutate(value);
          }}>
          <label className="block text-xs font-medium text-muted-foreground">
            {t("claim.emailLabel")}
            <input className={`mt-1 ${inputCls}`} type="email" required value={email}
              placeholder={t("claim.emailPlaceholder")}
              onChange={(e) => setEmail(e.target.value)} />
          </label>
          <p className="mt-2 text-xs text-muted-foreground">{t("claim.emailHint")}</p>

          {requestError && (
            <p role="alert" className="mt-3 flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />{requestError}
            </p>
          )}

          <Button type="submit" disabled={requestMutation.isPending}
            className="mt-4 h-12 w-full justify-center gap-2 bg-primary font-display text-primary-foreground hover:bg-primary/90">
            {requestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {t("claim.sendCta")}
          </Button>
          <p className="mt-2.5 text-center text-xs text-muted-foreground">{t("claim.privacyNote")}</p>
        </form>
      )}

      <div className="mt-6 rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("claim.whatYouGet")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("claim.whatYouGetBody")}</p>
        <Link to={`/partner/${profile.slug}`} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-teal-text hover:underline">
          {t("claim.viewProfile")}<ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {helpFooter}
    </div>
  ));
}
