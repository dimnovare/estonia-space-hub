import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { useDirectoryCities } from "@/hooks/queries";
import { slugifyCity, type CuratedCity } from "@/lib/cities";

/**
 * City input that suggests real markets as you type.
 *
 * WHY THIS EXISTS — it is a correctness fix wearing a UX hat.
 *
 * The concierge fan-out anchors on the lead's city string. `CityMatcher` is
 * forgiving (case, diacritics, Cyrillic transliteration) but it cannot rescue a
 * genuine typo, and when the anchor resolves to nothing the finder returns ZERO
 * providers — the request saves, the customer sees a success screen, and nobody
 * is ever contacted. That exact failure hit production on 2026-08-13 with
 * "Таллинн", "Harjumaa" and "Riga" without the macron. A plain text box invites
 * it every time.
 *
 * So the list is a spelling aid, not a gate. Free text is still accepted and
 * submitted verbatim: Ruumly wants demand from towns it has no supply in yet —
 * an unmatched lead is a documented demand signal, not an error. What changes is
 * that the easy path now produces a string the matcher recognises, and someone
 * typing an unknown place is told honestly rather than silently dropped.
 *
 * Built as a real combobox (ARIA 1.2 pattern) rather than a `<datalist>`:
 * datalist styling is uncontrollable and its iOS Safari support is poor, which
 * is precisely the platform this has to work on.
 */
export function CitySuggestInput({
  id,
  value,
  onChange,
  placeholder,
  invalid,
  describedBy,
  unknownHint,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  /** Shown when the typed value matches no known market. Honest, not blocking. */
  unknownHint?: string;
}) {
  const { cities } = useDirectoryCities();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const needle = slugifyCity(value.trim());
    if (!needle) return cities.slice(0, 6);
    // Slug comparison, so "Parnu" finds "Pärnu" and "riga" finds "Rīga" — the
    // same diacritic-insensitivity the backend matcher applies.
    const starts: CuratedCity[] = [];
    const contains: CuratedCity[] = [];
    for (const c of cities) {
      if (c.slug === needle) continue;
      if (c.slug.startsWith(needle)) starts.push(c);
      else if (c.slug.includes(needle)) contains.push(c);
    }
    return [...starts, ...contains].slice(0, 6);
  }, [cities, value]);

  /** True once the typed text names a market we actually know. */
  const recognised = useMemo(() => {
    const needle = slugifyCity(value.trim());
    return needle.length > 0 && cities.some((c) => c.slug === needle);
  }, [cities, value]);

  // Close on outside click. Escape is handled on the input itself.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (city: CuratedCity) => {
    onChange(city.name);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); setActive(-1); return; }
    if (!matches.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (e.key === "Enter" && open && active >= 0) {
      // Only swallow Enter when a suggestion is actually highlighted, so it
      // still submits/advances in every other case.
      e.preventDefault();
      choose(matches[active]);
    }
  };

  const showList = open && matches.length > 0;

  // The hint had no id, so aria-describedby could never point at it and the one
  // piece of honest feedback in this control was visible-only. Announced two
  // ways because they cover different moments: describedby reads it when focus
  // lands on the field, role="status" reads it when it appears under a field the
  // visitor is already typing in.
  const hintId = `${listId}-hint`;
  const showUnknownHint = !!unknownHint && value.trim().length > 2 && !recognised && !showList;
  const describedByIds = [describedBy, showUnknownHint ? hintId : null].filter(Boolean).join(" ");

  return (
    <div ref={wrapRef} className="relative">
      <MapPin className="pointer-events-none absolute left-3 top-[26px] h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        aria-invalid={invalid}
        aria-describedby={describedByIds || undefined}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        // text-base below sm: mobile Safari zooms the viewport whenever a focused
        // input renders under 16px, and the user has to pinch back out mid-form.
        className="h-12 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-accent sm:text-sm"
      />

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-card py-1 shadow-lg"
        >
          {matches.map((c, i) => (
            <li
              key={c.slug}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // Pointer-down rather than click: a click fires after blur, which
              // would close the list before the selection landed.
              onMouseDown={(e) => { e.preventDefault(); choose(c); }}
              onMouseEnter={() => setActive(i)}
              className={`flex min-h-[44px] cursor-pointer items-center justify-between gap-3 px-3.5 text-sm ${
                i === active ? "bg-secondary text-foreground" : "text-foreground"
              }`}
            >
              <span>{c.name}</span>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{c.country}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Honest, non-blocking. An unknown town still submits — it is a demand
          signal worth having — but the visitor is told we may have no partner
          there rather than discovering it through silence. */}
      {showUnknownHint && (
        <p id={hintId} role="status" className="mt-1.5 text-xs text-muted-foreground">{unknownHint}</p>
      )}
    </div>
  );
}
