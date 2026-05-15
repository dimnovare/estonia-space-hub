# Mobile-first design upgrade — Ruumly

Your current design is solid (clean tokens, semantic colors, decent typography pairing of Manrope + DM Sans). The biggest wins are mobile-first: navbar height, hero density, search affordance, listing cards, and a more modern tactile feel (motion, surfaces, focus states). Below are concrete, scoped changes — grouped by impact.

## 1. Navbar — reclaim mobile screen space (high impact)

**Problem:** header is `h-20` (80px) on mobile and `h-[88px]` on desktop. With the iOS URL bar that's ~140px of chrome before the user sees anything. Logo is `h-[42px]` on mobile.

**Change:**
- Mobile header height → `h-14` (56px), logo `h-8`. Desktop stays `h-20`.
- Add subtle scroll-state: solid `bg-card` + `shadow-sm` once scrolled (use `useScrollPosition` hook), translucent at top only on home.
- Mobile menu: replace the in-flow expanding panel with a `Sheet` (shadcn) sliding from the right — feels native, doesn't push content, supports swipe-to-close.
- Bottom action bar (mobile only, on Home + Search): sticky `Search` CTA button — current standard for marketplaces (Airbnb, Booking).

## 2. Hero — denser, more functional above the fold

**Problem:** hero is `py-20 md:py-28` plus a tall headline. On a 390×844 viewport you can barely see the search box without scrolling. Trust badges + value hint + trust strip + provider CTA + contact info stack 5 deep below the search.

**Change:**
- Mobile padding `py-10`, desktop `py-20`. Headline `text-3xl` on mobile (currently `text-4xl`).
- Collapse trust badges + value hint into a single inline row with `·` separators.
- Move "contact info" (phone/email/hours) out of hero into the footer — it dilutes the primary CTA.
- Category chips: convert to horizontally scrollable pill row with `snap-x` — currently they `flex-wrap` and break the search card on narrow screens.
- Search input: `h-12` (48px), bigger touch target, inset shadow for "input depth". Add a subtle gradient halo around the active card (`shadow-2xl shadow-accent/20`).

## 3. Listing cards — modernize

**Problem:** cards are functional but flat. Title is `text-sm` (14px) — small for a primary content element. Discount badge is bottom-stacked, easy to miss. Verified/founding-partner badges stack vertically on the image and overlap with favorite button on small cards.

**Change:**
- Title `text-base font-semibold`, address smaller (`text-xs`) and on its own line.
- Move the price savings badge **on top of the image** as a colored ribbon (top-left), and remove the duplicated bottom one.
- Combine `Verified` + `Founding partner` into a single trust pill row beneath the title (less visual noise on the image).
- Heart button: enlarge to `h-9 w-9` (touch target), give it `bg-card/95 backdrop-blur` always (current `bg-card/80` looks dim on light images).
- Image aspect: `aspect-[4/3]` on mobile, `aspect-[16/10]` on `sm+` — taller looks more substantial in single-column mobile lists.
- Hover: keep `translateY(-1px)`, add `ring-1 ring-accent/20` on hover for a more refined feel.

## 4. Spacing & rhythm system

**Problem:** sections jump from `py-10` to `py-16` to `py-20` somewhat ad-hoc. Mobile feels airy, desktop feels cramped in some places.

**Change:** standardize section padding via two utility classes in `index.css`:
```css
.section-y { @apply py-12 md:py-20; }
.section-y-sm { @apply py-8 md:py-12; }
```
Apply across HomePage and other landing-style pages. Reduces cognitive load and makes pages feel coherent.

## 5. Typography polish

- Headlines: bump letter-spacing slightly tight (`tracking-tight` already common; add `tracking-tighter` on h1 only).
- Body line-height: add `leading-relaxed` on long descriptive paragraphs (FAQ answers, hero subtitle).
- Numerals: add `tabular-nums` to all price displays so `€` prices align in lists.

## 6. Motion — modern, restrained

Currently you have `fadeIn` and `slideUp` keyframes but they're not widely applied.

- Add `prefers-reduced-motion` guard already in App.css partially.
- Wrap featured listings grid in a staggered fade-in (apply `animate-slide-up` with `style={{ animationDelay: ${i*60}ms }}`).
- Hero CTA: subtle `transition-transform active:scale-[0.97]` on all primary buttons — modern tactile feedback.
- Skeleton cards: shimmer instead of plain pulse (1 keyframe addition).

## 7. Accessibility & touch targets (current standards)

- All icon buttons → ensure `min-h-11 min-w-11`. Right now the hero `size="icon"` variants are 36px.
- Focus states: add `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2` to interactive cards (`ListingCard` `<Link>` currently has no visible focus ring).
- Lang switcher dropdown: it's a custom widget — replace with shadcn `DropdownMenu` for proper ARIA + keyboard navigation. Same for user menu.
- Color: `text-primary-foreground/60` for contact strip on hero gradient is borderline AA — bump to `/75`.

## 8. Surfaces & depth

- Add a soft elevation token: hovering cards currently have shadow + translateY. Add a subtle `border-accent/0` → `border-accent/30` transition for a "selectable" hint.
- `surface-sunken` used on Featured section — extend to FAQ for visual rhythm (alternate sunken/elevated).
- Introduce a `--surface-glass` token for sticky elements (mobile bottom CTA, sticky filter bar on Search) — `bg-card/85 backdrop-blur-md border-t border-border/60`.

## 9. Forms & inputs (across booking/search)

- All inputs `min-h-11`, rounded-lg, border-input, with `focus-visible:ring-2 ring-accent ring-offset-1` — single consistent style.
- Replace native `<select>` (where present) with shadcn `Select` for consistent styling.
- Currency / date inputs: right-align numerals, `tabular-nums`.

## 10. Mobile bottom-sheet patterns

For Search filters and detail-page booking form on mobile, use shadcn `Drawer` (vaul) — already installed. Replaces full-screen modals which feel heavy on mobile. Aligns with iOS/Android marketplace standards (Airbnb, Booking, Idealo).

---

## Suggested rollout order

```
phase 1 (high impact, low risk)
  ├─ Navbar mobile compaction + Sheet menu
  ├─ Hero density (padding, headline size, scrollable chips)
  └─ ListingCard refinements (typography, ribbons, focus ring)

phase 2 (system-wide polish)
  ├─ Section spacing utilities
  ├─ tabular-nums + focus-visible defaults
  └─ Active-state scale on buttons (button.tsx variants)

phase 3 (broader UX)
  ├─ Sticky mobile search CTA
  ├─ Drawer-based filters on Search
  └─ Staggered list animations + shimmer skeletons
```

## Out of scope (intentionally)

- No color/brand change — your Deep Blue + Teal identity is in memory and works.
- No font swap — Manrope/DM Sans pairing is solid and on-brand.
- No backend or data changes.
- No removal of features, only re-arrangement and visual polish.

---

**Want me to proceed with phase 1 only**, all phases, or pick specific items? I can also generate 2–3 visual prototype directions for the **Navbar + Hero** on mobile so you can compare before implementing.
