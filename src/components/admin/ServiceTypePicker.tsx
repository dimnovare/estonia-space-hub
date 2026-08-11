import { AlertTriangle } from "lucide-react";
import {
  PUBLIC_SERVICE_TYPE_SLUGS,
  SERVICE_TYPE_ICONS,
  isRetiredServiceSlug,
} from "@/lib/serviceTypes";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * Which services a partner sells — the field that decides whether they can ever
 * be matched to a customer request at all.
 *
 * This exists because a partner added by hand used to be saved with an empty
 * service list and then silently never appeared as a candidate for any lead: the
 * row looked complete in admin (name, address, coordinates) and was simply
 * invisible. At least one service is required, and the backend refuses the write
 * without one too — the form is the convenience, not the guarantee.
 *
 * Only consumer-selectable slugs are offerable. `packing` / `insurance` were
 * retired as consumer categories in 2026-08 but are still stored on imported
 * rows as supplier metadata, so they are shown read-only rather than dropped —
 * saving never strips them.
 */
export default function ServiceTypePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  const selected = new Set(value);
  const retained = value.filter(isRetiredServiceSlug);
  const empty = value.filter((s) => !isRetiredServiceSlug(s)).length === 0;

  const toggle = (slug: string) => {
    onChange(selected.has(slug) ? value.filter((s) => s !== slug) : [...value, slug]);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PUBLIC_SERVICE_TYPE_SLUGS.map((slug) => {
          const Icon = SERVICE_TYPE_ICONS[slug];
          const on = selected.has(slug);
          return (
            <label
              key={slug}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 ${
                on
                  ? "border-accent bg-accent/10 text-accent-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-accent/50"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                disabled={disabled}
                onChange={() => toggle(slug)}
              />
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {t(`serviceType.${slug}`)}
            </label>
          );
        })}
      </div>

      {retained.length > 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("admin.partner.serviceTypesRetained").replace(
            "{types}",
            retained.map((s) => t(`serviceType.${s}`)).join(", "),
          )}
        </p>
      )}

      <p className={`mt-2 flex items-start gap-1.5 text-[11px] ${empty ? "text-destructive-text" : "text-muted-foreground"}`}>
        {empty && <AlertTriangle className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />}
        {empty ? t("admin.partner.serviceTypesRequired") : t("admin.partner.serviceTypesHint")}
      </p>
    </div>
  );
}
