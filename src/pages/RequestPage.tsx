import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "@/i18n/routing";
import {
  ArrowRight, ArrowLeft, CheckCircle, Check,
  MapPin, CalendarDays, Loader2, AlertCircle, ShieldCheck, Mail,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { SEO } from "@/components/SEO";
import { leadService, type ConciergeCategory } from "@/services";
import { trackEvent } from "@/lib/analytics";
import { getAttribution } from "@/lib/attribution";
import {
  PUBLIC_SERVICE_TYPE_SLUGS, SERVICE_TYPE_ICONS, visibleServiceSlugs,
  isRetiredServiceSlug, RETIRED_SEARCH_TYPE,
} from "@/lib/serviceTypes";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Parse ?category=… (repeatable or comma-separated) into valid category slugs.
 *  Deep links come from the homepage need-chips / service grid and the navbar.
 *  `allowed` gates the result to the platform-visible set — a stale
 *  ?category=moving with moving disabled must NOT prefill a category whose
 *  tile isn't rendered (invisible, undeselectable, would still submit).
 *
 *  Retired categories (packing / insurance) still exist as indexed deep links,
 *  so they are REMAPPED rather than dropped: ?category=packing selects moving
 *  (a mover is who quotes packing) and ?category=insurance falls away, leaving
 *  the visitor on a normal, answerable step 1 instead of an empty selection. */
function parseCategoryParams(
  params: URLSearchParams,
  allowed: readonly string[],
): ConciergeCategory[] {
  const raw = params.getAll("category").flatMap((v) => v.split(","));
  const valid = raw
    .map((v) => v.trim().toLowerCase())
    .map((v) => (isRetiredServiceSlug(v) ? RETIRED_SEARCH_TYPE[v] : v))
    .filter((v): v is ConciergeCategory => !!v && allowed.includes(v));
  return [...new Set(valid)];
}

/** True when the visitor arrived from a retired packing deep link — we preselect
 *  the moving flow AND its packing add-on so the intent survives the remap. */
function cameFromPackingLink(params: URLSearchParams): boolean {
  return params
    .getAll("category")
    .flatMap((v) => v.split(","))
    .some((v) => v.trim().toLowerCase() === "packing");
}

/**
 * Scoping questions asked in step 2, one set per selected service.
 *
 * Everything past the city used to be optional, so requests arrived with no
 * size, duration or scope — and the lead's `details` is exactly what
 * ProviderOutreachComposer pastes into the email we send providers. It printed
 * "—", which nobody can quote against, so the concierge could not return the
 * 2-3 offers the funnel promises.
 *
 * These are required, but they are one-tap chips and the LAST option of every
 * group means "not sure". Nobody is ever hard-blocked: "not sure" is itself a
 * fact the concierge can work with, unlike a blank field.
 */
interface ScopeQuestion { id: string; options: number }

const SCOPE_QUESTIONS: Partial<Record<ConciergeCategory, ScopeQuestion[]>> = {
  warehouse: [{ id: "warehouseSize", options: 6 }, { id: "warehouseDuration", options: 5 }],
  // Floors and a lift are the single biggest price driver in a Baltic move —
  // a mover who has the size but not this cannot give a number, only a range.
  moving:    [{ id: "movingSize", options: 6 }, { id: "movingAccess", options: 5 }],
  // "How long" alone does not describe a trailer. What is being hauled decides
  // whether the provider even owns the right one.
  trailer:   [{ id: "trailerDuration", options: 5 }, { id: "trailerType", options: 5 }],
  vanrental: [{ id: "vanrentalDuration", options: 5 }, { id: "vanrentalSize", options: 4 }],
  // Cleaning asked only WHAT KIND, never HOW BIG — so no cleaner could quote it.
  // Size is the whole basis of a cleaning price.
  cleaning:  [{ id: "cleaningType", options: 5 }, { id: "cleaningSize", options: 5 }],
};

/**
 * Services whose providers cannot quote at all without a date — a van, a
 * trailer and a moving crew are booked capacity on a specific day, and a
 * cleaner's calendar works the same way. Storage is the exception: a unit is
 * available continuously, so "I'm not sure yet" is a genuine answer there.
 *
 * The date used to be labelled "(optional)" for everything, and requests
 * arrived with no date at all. `ProviderOutreachComposer` then printed "as soon
 * as possible", which is not something a provider can price — so we spent the
 * one cold contact we get with each of them on an unquotable ask.
 *
 * Nobody is hard-blocked: the flexible chip below is always available and is
 * itself a fact a provider can work with, unlike a blank field.
 */
const DATE_REQUIRED_FOR: readonly ConciergeCategory[] = ["moving", "trailer", "vanrental", "cleaning"];

/** sessionStorage key for the in-progress request (see `restoreDraft`). */
const DRAFT_KEY = "ruumly-request-draft";

/**
 * OPTIONAL add-on shown inside the moving flow only.
 *
 * Packing is never sold standalone in the Baltics — it is a line item in a
 * mover's offer — so it is no longer a top-level category. Asking it here means
 * the mover we contact can price the packing in the same quote, and the answer
 * rides along in `details` exactly like the required scoping answers do.
 *
 * Deliberately NOT part of `activeQuestions`: it must never block Next.
 */
const PACKING_ADDON: ScopeQuestion = { id: "packingHelp", options: 4 };

/**
 * Everything the visitor has typed so far, kept in `sessionStorage`.
 *
 * All of this lived in `useState` and nowhere else, so a refresh, a Back tap or
 * a mis-swipe destroyed a completed three-step form. On mobile — where most of
 * this traffic arrives — Back is a reflex, and the person who loses the form is
 * the person who was one tap from becoming a request.
 *
 * Session-scoped, not local: this is a half-finished form, not a preference. It
 * closes with the tab, and it is cleared the moment the request is submitted so
 * the next visitor on a shared machine never inherits it.
 */
interface RequestDraft {
  categories: ConciergeCategory[];
  city: string;
  toCity: string;
  needDate: string;
  dateFlexible: boolean;
  details: string;
  scope: Record<string, number>;
  name: string;
  phone: string;
  // Deliberately NOT the email address: a restored form that pre-fills someone
  // else's address on a shared device is worse than one extra field to retype.
}

function readDraft(): Partial<RequestDraft> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<RequestDraft>) : {};
  } catch {
    return {};
  }
}

function writeDraft(draft: RequestDraft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Private mode / quota. Losing the draft is bad; breaking the form is worse.
  }
}

function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch { /* ignore */ }
}

/**
 * A single-choice chip group, with the semantics a single choice actually has.
 *
 * These were `<button aria-pressed>` inside a `fieldset`, which a screen reader
 * announces as a row of independent toggle buttons — so nothing conveyed that
 * picking one clears the others, how many options there are, or which position
 * you are at. Keyboard users also had to Tab through every chip individually.
 *
 * `role="radiogroup"` + `role="radio"` fixes the announcement, and the roving
 * tabindex below is what the pattern requires: the group is ONE tab stop, and
 * arrows move within it. Arrow keys select as they move, which is standard radio
 * behaviour and safe here because every group's last option means "not sure" —
 * there is no destructive choice to land on by accident.
 *
 * Deliberately NOT used for the optional packing add-on: that one is clearable
 * by tapping the active chip again, and a radio group cannot be un-set. It stays
 * a toggle-button group, which is what it genuinely is.
 */
function ScopeRadioGroup({
  id, options, value, label, optionLabel, onSelect, required = false,
}: {
  id: string;
  options: number;
  value: number | undefined;
  label: string;
  optionLabel: (n: number) => string;
  onSelect: (n: number) => void;
  required?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const choices = Array.from({ length: options }, (_, i) => i + 1);
  // The group's single tab stop: the chosen chip, or the first one when nothing
  // is chosen yet.
  const tabStop = value ?? 1;

  const move = (to: number) => {
    const next = ((to - 1 + options) % options) + 1;
    onSelect(next);
    refs.current[next - 1]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, n: number) => {
    const key = event.key;
    if (key === "ArrowRight" || key === "ArrowDown") { event.preventDefault(); move(n + 1); }
    else if (key === "ArrowLeft" || key === "ArrowUp") { event.preventDefault(); move(n - 1); }
    else if (key === "Home") { event.preventDefault(); move(1); }
    else if (key === "End") { event.preventDefault(); move(options); }
  };

  return (
    <div>
      <p id={`${id}-label`} className="mb-1.5 text-sm font-medium text-foreground">
        {label}{required && <span className="text-destructive"> *</span>}
      </p>
      <div role="radiogroup" aria-labelledby={`${id}-label`} aria-required={required || undefined} className="flex flex-wrap gap-2">
        {choices.map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              ref={(el) => { refs.current[n - 1] = el; }}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={tabStop === n ? 0 : -1}
              onKeyDown={(e) => onKeyDown(e, n)}
              onClick={() => onSelect(n)}
              className={`min-h-[44px] rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                active
                  ? "border-navy-ink bg-navy-ink text-white"
                  : "border-line-2 bg-card text-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {optionLabel(n)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * /request — the concierge demand funnel ("tell us what you need, we contact
 * the providers that fit"). Three steps: what → details → contact. Submits to
 * POST /leads/request; the admin match queue works the lead from there.
 */
export default function RequestPage() {
  const { t, language } = useLanguage();
  const settings = usePlatformSettings();
  const { showMovingService, showTrailerService } = settings;

  // Prefill from deep-link params (?category=moving&city=Tallinn) — the
  // homepage popular-need chips and service-grid "Get offers" links use these.
  // Lazy initializers: read once on mount, then the user owns the state.
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  // Read once on mount. A deep link always wins over a restored draft: someone
  // who just clicked "storage in Tartu" means that, not what they abandoned
  // twenty minutes ago.
  const draft = useMemo(() => readDraft(), []);

  // ── The step lives in the URL ──
  //
  // It used to be plain component state, so the browser Back button left the
  // funnel entirely from step 2 or 3 — on mobile, where Back is a reflex and
  // most of this traffic arrives, that reads as "the form threw me out". The
  // draft made the answers survive, but the visitor still landed on step 1 and
  // had to tap forward twice to find them.
  //
  // As a search param rather than a route segment: /request is one page and one
  // canonical URL (the prerendered <head> and the sitemap both point at it), and
  // a step is a position within it, not a resource. `replace` is deliberately
  // NOT used — pushing is the whole point, since each push is what gives Back
  // something to go back to.
  const stepFromUrl = (() => {
    const raw = Number(searchParams.get("step"));
    return Number.isInteger(raw) && raw >= 1 && raw <= 3 ? raw - 1 : 0;
  })();
  const [step, setStep] = useState(stepFromUrl);
  const [categories, setCategories] = useState<ConciergeCategory[]>(() => {
    const fromLink = parseCategoryParams(searchParams, visibleServiceSlugs(showMovingService, showTrailerService));
    return fromLink.length > 0 ? fromLink : (draft.categories ?? []);
  });
  const [city, setCity] = useState(() => searchParams.get("city")?.trim() || draft.city || "");
  const [toCity, setToCity] = useState(() => draft.toCity ?? "");
  const [needDate, setNeedDate] = useState(() => draft.needDate ?? "");
  const [dateFlexible, setDateFlexible] = useState(() => draft.dateFlexible ?? false);
  const [details, setDetails] = useState(() => draft.details ?? "");
  // questionId → 1-based index of the chosen option. A ?category=packing deep
  // link lands on moving with the packing add-on already answered "yes".
  const [scope, setScope] = useState<Record<string, number>>(
    () => (cameFromPackingLink(searchParams) ? { [PACKING_ADDON.id]: 1 } : (draft.scope ?? {})));
  const [name, setName] = useState(() => draft.name ?? "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(() => draft.phone ?? "");
  const [stepError, setStepError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  // Guards the one-per-visit funnel-start event against React re-renders.
  const startedRef = useRef(false);
  // Honeypot. Never shown, never focusable, never autofilled (see the input at
  // the bottom of the form) — a value here means something automated filled it.
  const [website, setWebsite] = useState("");
  // When this visitor opened the funnel. Submitting a three-step form seconds
  // later is not something a person does. Deliberately NOT persisted with the
  // draft: someone who comes back to a restored form and finishes it in four
  // seconds is a returning human, not a bot, and must not be penalised for it.
  const openedAtRef = useRef(Date.now());

  const movingSelected = categories.includes("moving");

  /** True when at least one selected service cannot be quoted without a date. */
  const dateRequired = useMemo(
    () => categories.some((c) => DATE_REQUIRED_FOR.includes(c)),
    [categories],
  );

  /** Move to a step and push it onto history, so Back returns here. */
  const goToStep = (next: number) => {
    setStep(next);
    const params = new URLSearchParams(searchParams);
    if (next === 0) params.delete("step");
    else params.set("step", String(next + 1));
    setSearchParams(params);
  };

  // Browser Back/Forward changes the URL without going through goToStep, so the
  // rendered step follows the URL rather than the other way round.
  useEffect(() => {
    setStep(stepFromUrl);
    setStepError(null);
  }, [stepFromUrl]);

  // ── Draft persistence ──
  useEffect(() => {
    writeDraft({ categories, city, toCity, needDate, dateFlexible, details, scope, name, phone });
  }, [categories, city, toCity, needDate, dateFlexible, details, scope, name, phone]);

  // ── Funnel analytics ──
  // Until now the concierge funnel — the primary product — emitted nothing at
  // all, while every GA event in the app belonged to the deprecated marketplace
  // flow. That made "cost per qualified request" and every step-conversion
  // question unanswerable, on the exact funnel we are about to buy traffic for.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackEvent("request_started", { deep_linked: categories.length > 0 });
    // Intentionally mount-only: this is the funnel-entry event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Required scoping questions — these gate the Next button. */
  const activeQuestions = useMemo(
    () => categories.flatMap((c) => SCOPE_QUESTIONS[c] ?? []),
    [categories],
  );

  /** Everything that may end up in `details`: the required questions plus the
   *  optional moving add-on. Deselecting moving drops the add-on answer from
   *  the summary even if the chip was tapped earlier. */
  const detailQuestions = useMemo(
    () => (movingSelected ? [...activeQuestions, PACKING_ADDON] : activeQuestions),
    [activeQuestions, movingSelected],
  );

  /** Fold the chip answers into `details`, above whatever the visitor wrote.
   *  No migration needed — the outreach email already prints this field, so a
   *  readable "question: answer" summary reaches providers as-is. */
  const composeDetails = (): string | undefined => {
    const answered = detailQuestions
      .filter((q) => scope[q.id])
      .map((q) => `${t(`request.scope.${q.id}.label`)} ${t(`request.scope.${q.id}.opt${scope[q.id]}`)}`);
    return [answered.join("\n"), details.trim()].filter(Boolean).join("\n\n") || undefined;
  };

  const mutation = useMutation({
    mutationFn: () =>
      leadService.requestConcierge({
        name: name.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        categories,
        city: city.trim(),
        toCity: movingSelected && toCity.trim() ? toCity.trim() : undefined,
        // "Flexible" is an answer, not a date — send nothing and let the
        // provider email say so in their own language.
        needDate: dateFlexible ? undefined : (needDate || undefined),
        details: composeDetails(),
        language,
        attribution: getAttribution(),
        website,
        elapsedMs: Date.now() - openedAtRef.current,
      }),
    onSuccess: () => {
      // The request is filed — the half-finished copy must not outlive it.
      clearDraft();
      trackEvent("request_submitted", {
        services: categories.join(","),
        service_count: categories.length,
        has_date: !dateFlexible && !!needDate,
        date_flexible: dateFlexible,
        has_phone: !!phone.trim(),
      });
    },
    // Global mutation onError shows a toast; we render an inline error instead.
    onError: (error: Error & { status?: number }) => {
      // A submit that fails is the most expensive event in the funnel: the
      // visitor did all the work and Ruumly got nothing. It has to be visible
      // in the reports, not just in the console.
      trackEvent("request_failed", { status: error?.status ?? 0 });
    },
  });

  // Canonical service copy (overhaul §4): the step-1 cards use the SAME
  // serviceType.{slug}(.desc) keys + icons as the navbar mega-menu, homepage
  // grid, search chips and footer — one name + one-liner per service, verbatim.
  const needOptions: {
    key: ConciergeCategory;
    icon: LucideIcon;
    title: string;
    desc: string;
    show: boolean;
  }[] = PUBLIC_SERVICE_TYPE_SLUGS.map((slug) => ({
    key: slug,
    icon: SERVICE_TYPE_ICONS[slug],
    title: t(`serviceType.${slug}`),
    desc: t(`serviceType.${slug}.desc`),
    // moving/trailer honor the admin platform toggles; cleaning and van rental
    // are always visible (worked manually by the concierge loop).
    show: slug === "moving" ? showMovingService : slug === "trailer" ? showTrailerService : true,
  }));

  const toggleCategory = (key: ConciergeCategory) => {
    setStepError(null);
    setCategories((prev) => {
      const next = prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key];
      trackEvent("request_service_selected", { service: key, selected: !prev.includes(key) });
      return next;
    });
  };

  const goNext = () => {
    if (step === 0 && categories.length === 0) {
      setStepError(t("request.errors.category"));
      return;
    }
    if (step === 1) {
      if (!city.trim()) {
        setStepError(t("request.errors.required"));
        return;
      }
      // Every scoping question needs an answer — "not sure" counts as one.
      if (activeQuestions.some((q) => !scope[q.id])) {
        setStepError(t("request.errors.scope"));
        return;
      }
      // A mover, a van, a trailer and a cleaner all sell a specific day. Asking
      // for one of those without saying when is a request nobody can price —
      // so either name a day or say plainly that you're flexible.
      if (dateRequired && !needDate && !dateFlexible) {
        setStepError(t("request.errors.date"));
        return;
      }
    }
    setStepError(null);
    trackEvent("request_step_completed", { step: step + 1 });
    goToStep(Math.min(2, step + 1));
  };

  // Back uses browser history rather than setStep, so the in-page Back button
  // and the browser's own Back button do the same thing — otherwise the two
  // would drift apart and the history stack would fill with dead forward
  // entries. Falls back to a direct move when there is nothing to pop (a visitor
  // who deep-linked straight to ?step=2).
  const goBack = () => {
    setStepError(null);
    if (stepFromUrl > 0) navigate(-1);
    else setStep((s) => Math.max(0, s - 1));
  };

  const handleSubmit = () => {
    if (!email.trim()) {
      setEmailError(t("request.errors.required"));
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError(t("request.errors.email"));
      return;
    }
    setEmailError(null);
    mutation.mutate();
  };

  const submitErrorMessage = mutation.isError
    ? ((mutation.error as Error & { status?: number })?.status === 429
        ? t("request.errors.rateLimited")
        : t("request.errors.generic"))
    : null;

  const stepTitles = [t("request.steps.step1"), t("request.steps.step2"), t("request.steps.step3")];

  // ── Success screen ──
  if (mutation.isSuccess) {
    return (
      <div className="container-wide flex min-h-[70vh] items-center justify-center py-16">
        {/* request.seo.title already ends in "| Ruumly", so appending the brand
            again produced "… | Ruumly — Ruumly" in the tab and in every SERP
            snippet. The SEO component only appends when the title lacks it. */}
        <SEO title={t("request.seo.title")} description={t("request.seo.desc")} path="/request" />
        <div className="mx-auto max-w-md text-center animate-slide-up">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold text-navy-ink">{t("request.success.title")}</h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">{t("request.success.body")}</p>

          {/* The receipt is the real next step, not a link.
              This screen's only outbound action used to be "browse the
              directory" — sending someone who had just told us exactly what
              they need back to self-serve search, which is the proposition
              undercutting itself. Point at their inbox instead: it proves the
              request landed, names the address so a typo is caught here rather
              than in silence, and opens the reply channel the concierge depends
              on when a date moves. */}
          <p className="mt-6 flex items-start gap-2.5 rounded-xl border border-line bg-secondary/40 p-4 text-left text-sm leading-relaxed text-foreground">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-teal-deep" aria-hidden />
            <span>{t("request.success.emailed").replace("{email}", email.trim())}</span>
          </p>

          {/* Browsing stays available, but as the quiet secondary it is. */}
          <Link
            to="/search"
            className="mt-6 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-accent hover:underline"
          >
            {t("request.success.browse")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-sunken min-h-[calc(100vh-4rem)]">
      {/* request.seo.title already ends in "| Ruumly", so appending the brand
            again produced "… | Ruumly — Ruumly" in the tab and in every SERP
            snippet. The SEO component only appends when the title lacks it. */}
        <SEO title={t("request.seo.title")} description={t("request.seo.desc")} path="/request" />
      <div className="container-wide py-10 md:py-16">
        <div className="mx-auto max-w-xl">
          {/* Head */}
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold leading-tight text-navy-ink md:text-3xl">
              {t("request.hero.title")}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
              {t("request.hero.subtitle")}
            </p>
          </div>

          {/* Progress */}
          <div className="mt-8">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span className="font-mono-label uppercase tracking-[0.16em] text-teal-deep">
                {t("request.stepOf").replace("{current}", String(step + 1)).replace("{total}", "3")}
              </span>
              <span>{stepTitles[step]}</span>
            </div>
            <div className="mt-2 flex gap-1.5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-accent" : "bg-border"}`}
                />
              ))}
            </div>
          </div>

          {/* Card */}
          <div className="card-elevated mt-4 p-5 md:p-7">
            {/* Step 1 — what do you need */}
            {step === 0 && (
              <fieldset>
                <legend className="font-display text-lg font-semibold text-navy-ink">
                  {t("request.steps.step1")}
                </legend>
                {/* Multi-select nudge — bundling is the funnel's superpower. */}
                <p className="mt-1.5 text-sm text-muted-foreground">{t("request.need.hint")}</p>
                {/* Compact 2-col multi-select grid (also 2-col on mobile, so the
                    step never scrolls past the fold). */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {needOptions.filter((o) => o.show).map((opt) => {
                    const Icon = opt.icon;
                    const selected = categories.includes(opt.key);
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => toggleCategory(opt.key)}
                        aria-pressed={selected}
                        className={`relative flex min-h-[104px] flex-col items-start gap-2.5 rounded-xl border p-3.5 pr-9 text-left transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                          selected
                            ? "border-accent bg-accent/5 ring-1 ring-accent"
                            : "border-border bg-card hover:border-accent/40"
                        }`}
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-accent/15" : "bg-teal/[0.14]"}`}>
                          <Icon className={`h-5 w-5 ${selected ? "text-accent" : "text-teal-deep"}`} />
                        </div>
                        <div>
                          <div className="font-display text-[14px] font-semibold leading-tight text-foreground">{opt.title}</div>
                          <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{opt.desc}</div>
                        </div>
                        <div
                          aria-hidden
                          className={`absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                            selected ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card"
                          }`}
                        >
                          {selected && <Check className="h-3 w-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {/* Step 2 — details */}
            {step === 1 && (
              <div>
                <h2 className="font-display text-lg font-semibold text-navy-ink">{t("request.steps.step2")}</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="req-city" className="mb-1.5 block text-sm font-medium text-foreground">
                      {t("request.city.label")} <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="req-city"
                        type="text"
                        value={city}
                        onChange={(e) => { setCity(e.target.value); setStepError(null); }}
                        placeholder={t("request.city.placeholder")}
                        // Only when the city is the thing that's wrong. Flagging
                        // it for a missing scope answer sends a screen-reader
                        // user to correct a field that was already fine.
                        aria-invalid={!!stepError && !city.trim()}
                        className="h-12 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    {settings.conciergeCities && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {t("request.city.hint").replace("{cities}", settings.conciergeCities)}
                      </p>
                    )}
                  </div>
                  {movingSelected && (
                    <div>
                      <label htmlFor="req-tocity" className="mb-1.5 block text-sm font-medium text-foreground">
                        {t("request.toCity.label")}
                      </label>
                      <input
                        id="req-tocity"
                        type="text"
                        value={toCity}
                        onChange={(e) => setToCity(e.target.value)}
                        placeholder={t("request.toCity.placeholder")}
                        className="h-12 w-full rounded-lg border border-border bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  )}
                  {/* Scoping questions — one set per selected service. Required,
                      but one tap each, and every group ends in "not sure". */}
                  {activeQuestions.length > 0 && (
                    <div className="space-y-4 rounded-xl border border-line bg-secondary/30 p-4">
                      <p className="text-xs text-muted-foreground">{t("request.scope.hint")}</p>
                      {activeQuestions.map((q) => (
                        <ScopeRadioGroup
                          key={q.id}
                          id={q.id}
                          options={q.options}
                          value={scope[q.id]}
                          label={t(`request.scope.${q.id}.label`)}
                          optionLabel={(n) => t(`request.scope.${q.id}.opt${n}`)}
                          required
                          onSelect={(n) => {
                            setScope((s) => ({ ...s, [q.id]: n }));
                            setStepError(null);
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {/* Optional packing add-on — moving only. Packing is never
                      sold standalone here, so we ask it where a mover can price
                      it. No asterisk, not in the required gate: skipping it
                      just leaves the line out of the provider outreach. */}
                  {movingSelected && (
                    <div className="space-y-4 rounded-xl border border-line bg-secondary/30 p-4">
                      <fieldset>
                        <legend className="mb-1.5 text-sm font-medium text-foreground">
                          {t(`request.scope.${PACKING_ADDON.id}.label`)}
                        </legend>
                        <p className="mb-2 text-xs text-muted-foreground">{t("request.scope.packingHelp.hint")}</p>
                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: PACKING_ADDON.options }, (_, i) => i + 1).map((n) => {
                            const active = scope[PACKING_ADDON.id] === n;
                            return (
                              <button
                                key={n}
                                type="button"
                                aria-pressed={active}
                                onClick={() =>
                                  // Second tap on the active chip clears it — the
                                  // question is optional, so "no answer" must stay
                                  // reachable once something has been picked.
                                  setScope((s) => {
                                    const next = { ...s };
                                    if (next[PACKING_ADDON.id] === n) delete next[PACKING_ADDON.id];
                                    else next[PACKING_ADDON.id] = n;
                                    return next;
                                  })
                                }
                                className={`min-h-[40px] rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                                  active
                                    ? "border-navy-ink bg-navy-ink text-white"
                                    : "border-line-2 bg-card text-foreground hover:border-primary hover:text-primary"
                                }`}
                              >
                                {t(`request.scope.${PACKING_ADDON.id}.opt${n}`)}
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>
                    </div>
                  )}
                  {/* Date. Required whenever a selected service is sold by the
                      day (moving / trailer / van / cleaning) — a provider
                      cannot quote those without one. "I'm flexible" is an
                      explicit answer rather than a blank field, so nobody is
                      ever hard-blocked and the concierge still knows which it
                      was. Storage keeps the date optional: a unit is available
                      continuously. */}
                  <div>
                    <label htmlFor="req-date" className="mb-1.5 block text-sm font-medium text-foreground">
                      {dateRequired ? t("request.date.labelRequired") : t("request.date.label")}
                      {dateRequired && <span className="text-destructive"> *</span>}
                    </label>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="req-date"
                        type="date"
                        value={needDate}
                        min={new Date().toLocaleDateString("sv-SE")}
                        aria-describedby={dateRequired ? "req-date-hint" : undefined}
                        onChange={(e) => {
                          setNeedDate(e.target.value);
                          // Naming a day supersedes "flexible" — they cannot both be true.
                          if (e.target.value) setDateFlexible(false);
                          setStepError(null);
                        }}
                        className="h-12 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    {dateRequired && (
                      <>
                        <p id="req-date-hint" className="mt-1.5 text-xs text-muted-foreground">
                          {t("request.date.hint")}
                        </p>
                        <button
                          type="button"
                          aria-pressed={dateFlexible}
                          onClick={() => {
                            setDateFlexible((prev) => {
                              if (!prev) setNeedDate("");
                              return !prev;
                            });
                            setStepError(null);
                          }}
                          className={`mt-2 min-h-[40px] rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                            dateFlexible
                              ? "border-navy-ink bg-navy-ink text-white"
                              : "border-line-2 bg-card text-foreground hover:border-primary hover:text-primary"
                          }`}
                        >
                          {t("request.date.flexible")}
                        </button>
                      </>
                    )}
                  </div>
                  <div>
                    <label htmlFor="req-details" className="mb-1.5 block text-sm font-medium text-foreground">
                      {t("request.details.label")}
                    </label>
                    <textarea
                      id="req-details"
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder={t("request.details.placeholder")}
                      rows={3}
                      className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 — contact */}
            {step === 2 && (
              <div>
                <h2 className="font-display text-lg font-semibold text-navy-ink">{t("request.steps.step3")}</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="req-name" className="mb-1.5 block text-sm font-medium text-foreground">
                      {t("request.name.label")}
                    </label>
                    <input
                      id="req-name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("request.name.placeholder")}
                      className="h-12 w-full rounded-lg border border-border bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label htmlFor="req-email" className="mb-1.5 block text-sm font-medium text-foreground">
                      {t("request.email.label")} <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="req-email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                      placeholder={t("request.email.placeholder")}
                      aria-invalid={!!emailError}
                      className="h-12 w-full rounded-lg border border-border bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    {emailError && <p role="alert" className="mt-1 text-xs text-destructive">{emailError}</p>}
                  </div>
                  <div>
                    <label htmlFor="req-phone" className="mb-1.5 block text-sm font-medium text-foreground">
                      {t("request.phone.label")}
                    </label>
                    <input
                      id="req-phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("request.phone.placeholder")}
                      className="h-12 w-full rounded-lg border border-border bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
                {/* The highest-hesitation moment in the funnel: three personal
                    fields, no account, no idea who ends up holding them. It
                    said nothing at all here. This states the one fact that
                    actually answers the worry — and it is a fact, guarded by a
                    test: ProviderOutreachComposer never puts the customer's
                    name, email or phone in a provider email. */}
                <p className="mt-4 flex items-start gap-2 rounded-lg border border-line bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-deep" aria-hidden />
                  {t("request.contact.reassure")}
                </p>

                {/* Honeypot. Since auto fan-out shipped, one submit emails up to
                    six real businesses, so ordinary form spam became outbound-mail
                    amplification pointed at the supply base. A bot fills this;
                    a person never sees it.

                    Hidden with absolute positioning rather than `display:none` or
                    `type="hidden"`, both of which the better bots skip. It is
                    removed from the accessibility tree, from the tab order and
                    from autofill, so no screen-reader or keyboard user can reach
                    it by accident and be silently flagged. */}
                <div aria-hidden="true" className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
                  <label htmlFor="req-website">Website</label>
                  <input
                    id="req-website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
                {submitErrorMessage && (
                  <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive/5 p-3.5 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {submitErrorMessage}
                  </div>
                )}
              </div>
            )}

            {/* Step-level validation error (category / city) */}
            {stepError && (
              <p role="alert" className="mt-4 text-sm font-medium text-destructive">{stepError}</p>
            )}

            {/* Nav buttons */}
            <div className="mt-6 flex items-center gap-3">
              {step > 0 && (
                <Button
                  variant="outline"
                  onClick={goBack}
                  disabled={mutation.isPending}
                  className="h-12 gap-1.5 px-5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("request.back")}
                </Button>
              )}
              {step < 2 ? (
                <Button
                  onClick={goNext}
                  className="h-12 flex-1 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90 active:scale-[0.99]"
                >
                  {t("request.next")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={mutation.isPending}
                  className="h-12 flex-1 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90 active:scale-[0.99]"
                >
                  {mutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <>{t("request.submit")}<ArrowRight className="h-4 w-4" /></>}
                </Button>
              )}
            </div>
          </div>

          {/* Escape hatch to the marketplace */}
          <p className="mt-6 text-center">
            <Link to="/search" className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-accent hover:underline">
              {t("request.hero.browse")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
