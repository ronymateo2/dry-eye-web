# Design System — NeuroEye Log

## Product Context
- **What this is:** PWA health tracker for neuropathic dry eye disease. Daily symptom logging, medication tracking, and pattern detection for clinical use.
- **Who it's for:** Patients with neuropathic dry eye — a condition involving photophobia and chronic pain radiating to eyelids, temples, and masseter.
- **Space/industry:** Health tech / chronic pain management / patient-reported outcomes
- **Project type:** Mobile-first PWA (installable from Safari, no App Store). Functional tool, not a wellness app.

---

## Aesthetic Direction
- **Direction:** Clinical Precision — focused, trustworthy. The visual language of ophthalmology equipment, not consumer wellness apps.
- **Decoration level:** Minimal — typography and data carry all meaning. No illustrations, no mascots, no gamification badges.
- **Mood:** A tool you trust with your health. Calm, precise, serious. The interface reduces cognitive load, not adds to it. The user may be in pain when they open it.
- **Theme system:** Dual-theme — dark (default, clinical necessity) and light (optional). Switched via `document.documentElement.dataset.theme = "light"`. Dark remains the recommended mode for all photophobia patients.
- **Scientific rationale:** Blue light (400-510nm) maximally activates ipRGC photoreceptors that trigger photophobia in neuropathic dry eye. The FL-41 tint (clinical gold standard for photophobia) attenuates 480-520nm. This palette eliminates blue components throughout and uses an amber accent (~580-600nm) in the lowest-activation wavelength zone. Dark-first is not a style choice — it is clinical necessity.

---

## Typography
- **UI / Body / Headings:** Atkinson Hyperlegible (default) — loaded via `@fontsource/atkinson-hyperlegible` (weights 400, 700 + italics). Designed by the Braille Institute for maximum legibility and character distinctiveness — unambiguous letterforms reduce reading errors, which is critical for patients with visual impairment from dry eye.
  - Stack: `"Atkinson Hyperlegible", -apple-system, "system-ui", "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif`
- **SF Pro (iOS native, opt-in):** When user selects "SF Pro Rounded" in Profile, the stack uses the real iOS system font via `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display"`. Zero download, subpixel precision, works offline. This is the Apple Health look.
- **Data / Numbers:** Geist Mono — all numeric values (pain scores 0-10, drop counts, sleep hours, timestamps, correlation coefficients). Tabular-nums. Makes readings feel like clinical instrument readings, not form inputs. Reinforces the clinical precision aesthetic.
- **Loading:** `@fontsource/atkinson-hyperlegible` (weights 400, 700 + italics) + `@fontsource/geist-mono` (weights 400/500)
- **Scale:**
  - `11-12px / 700 / 0.10em tracking` — section labels (uppercase)
  - `12-13px / 400` — metadata, timestamps, helper text
  - `15px / 400` — body copy
  - `17px / 500-600` — emphasized body, card values, medication names
  - `20px / 600` — headline data (next dose time)
  - `22px / 700` — screen titles
  - `28px / 700 / -0.02em` — display headings (state labels, medication names) — Apple Health style
  - `24px / Geist Mono 400` — primary data values (pain score display in sliders)
  - `32-36px / Geist Mono 400` — stat card values (dashboard)
  - `11-13px / Geist Mono 400` — secondary data (correlation coefficients, timestamps)
- **Apple Health-style CSS utilities** (defined in `globals.css`):
  - `.text-display` — `28px / 700 / -0.02em / 1.1` — state labels, hero medication names
  - `.text-headline` — `20px / 600 / -0.01em / 1.15` — next dose time, emphasized data
  - `.text-body-emphasized` — `17px / 500 / 1.3` — descriptions, secondary actions

---

## Color

> **Evidence-based rationale:** All colors shift away from 400-510nm (blue light, maximum ipRGC activation) toward warmer wavelengths. Background is warm charcoal with zero blue component. Text is warm cream (not cold blue-white). Amber accent sits at ~580-600nm (minimum photosensitive activation zone). Pain gradient uses warm tones throughout.

- **Approach:** Restrained — one amber accent on deep warm charcoal. Color carries semantic meaning (pain severity gradient), not decoration.

### CSS Variables (copy directly into globals.css)
```css
:root {
  /* Backgrounds */
  --bg:             #121008;  /* deep warm charcoal — primary background */
  --surface:        #1c1810;  /* card / panel surfaces */
  --surface-el:     #252014;  /* elevated surfaces, interactive states */
  --border:         #2e2718;  /* dividers, input borders */

  /* Text */
  --text-primary:   #f0e4c8;  /* warm cream — NOT cold blue-white */
  --text-muted:     #a89375;  /* warm light tan, legible at 50% brightness */
  --text-faint:     #7a6a4f;  /* secondary text, visible on low brightness */

  /* Accent — FL-41 spectrum, ~580-600nm */
  --accent:         #d4a24c;  /* warm amber — primary interactive color */
  --accent-dim:     rgba(212, 162, 76, 0.15);  /* accent backgrounds */
  --accent-bright:  #e8b85e;  /* hover/active states */

  /* Pain severity gradient — all warm tones */
  --pain-low:       #5cb85a;  /* warm green (0-3) — harmonized with amber accent */
  --pain-mid:       #e0932a;  /* amber-orange (4-6) */
  --pain-high:      #cc3f30;  /* warm red (7-10) */

  /* Semantic */
  --success:        #5cb85a;
  --warning:        #e0932a;
  --error:          #cc3f30;
  --info-bg:        rgba(212, 162, 76, 0.12);
  --info-border:    rgba(212, 162, 76, 0.3);
}
```

### Pain Severity Function
```typescript
export function painColor(score: number): string {
  if (score >= 7) return 'var(--pain-high)';
  if (score >= 4) return 'var(--pain-mid)';
  return 'var(--pain-low)';
}

export function painGradient(score: number): string {
  const pct = score * 10;
  const bg = '#252014';
  if (score === 0) return bg;
  if (score <= 3) return `linear-gradient(to right, #7BC67A ${pct}%, ${bg} ${pct}%)`;
  if (score <= 6) return `linear-gradient(to right, #7BC67A 0%, #e0932a ${pct}%, ${bg} ${pct}%)`;
  return `linear-gradient(to right, #7BC67A 0%, #e0932a 40%, #cc3f30 ${pct}%, ${bg} ${pct}%)`;
}
```

### Dark Mode (default)
Dark mode is the **medically recommended default**. Users with neuropathic dry eye have photophobia — a bright interface is physically painful. Dark mode should always be the initial state.

### Light Mode
Light mode is available for users who prefer or require it (e.g., bright environments, visual accessibility needs). Activated via `[data-theme="light"]` on `<html>`. Uses a lavender-tinted palette with violet accent (#7C6DCD) — still warm-spectrum compliant, avoiding blue/cyan components.

```css
[data-theme="light"] {
  --bg:           #F0EFF8;
  --surface:      #FFFFFF;
  --surface-el:   #EAE8F8;
  --border:       #EDEAF5;
  --text-primary: #1E1A3C;
  --text-muted:   #5C5985;
  --text-faint:   #7E7BA2;
  --accent:       #7C6DCD;
  --accent-dim:   rgba(124, 109, 205, 0.12);
  --accent-bright:#9D91D9;
  --pain-low:     #6CD9A0;
  --pain-mid:     #F4A25A;
  --pain-high:    #F47070;
  --btn-primary-text: #ffffff;
}
```

### PWA Manifest Colors
```json
{
  "background_color": "#121008",
  "theme_color": "#121008"
}
```

---

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable (not cramped — users may have motor imprecision when in pain)
- **Scale:**
  ```
  2px  (0.25×) — icon gaps, fine details
  4px  (0.5×)  — tight inline spacing
  8px  (1×)    — base unit, internal component padding
  12px (1.5×)  — between related elements
  16px (2×)    — standard component padding
  20px (2.5×)  — screen section padding
  24px (3×)    — between sections
  32px (4×)    — major layout gaps
  48px (6×)    — minimum touch target (Apple HIG for PWA)
  64px (8×)    — page-level margins
  ```
- **Touch targets:** 48px minimum height for all interactive elements (buttons, sliders, chips, nav items). Non-negotiable — users may be in pain and have reduced motor precision.
- **Screen padding:** 20px horizontal on mobile.

---

## Layout
- **Approach:** Single-column, mobile-first. No sidebar. No persistent header consuming vertical space.
- **Navigation:** Bottom tab bar (5 tabs: Today / Historial / Dashboard / Reporte/Profile). Tabs are 48px minimum height. Active tab uses `--accent` color.
- **Grid:** Single column on mobile (375-430px base). Max content width: 480px on larger screens, centered.
- **FAB:** Floating action button (56px) for quick "+" access to drops/triggers log. Positioned bottom-right, 24px from edges. `background: var(--accent)`, `box-shadow: 0 4px 20px rgba(212,162,76,0.35)`.
- **Border radius:**
  ```
  --radius-sm:   6px   — chips, tags, small elements
  --radius-md:   10px  — inputs, alert banners
  --radius-lg:   16px  — cards, phone frames, major sections
  --radius-full: 9999px — buttons, toggles, sliders
  ```
- **Screens do ONE job.** Check-in screen records pain. Drop screen records drops. Each screen has a single primary action.
- **Safe area:** Respect iOS safe area insets (`env(safe-area-inset-*)`) — critical for PWA home-screen mode.

---

## Motion
- **Approach:** Minimal-functional. Every animation serves comprehension or reduces perceived latency. No decorative motion.
- **Easing:**
  - `enter:  cubic-bezier(0, 0, 0.2, 1)` — ease-out, for elements appearing
  - `exit:   cubic-bezier(0.4, 0, 1, 1)` — ease-in, for elements leaving
  - `move:   cubic-bezier(0.4, 0, 0.2, 1)` — ease-in-out, for repositioning
  - `linear: linear` — for slider track fill
- **Duration:**
  ```
  micro:  50-100ms  — state indicators (chip selected, button pressed)
  short:  150-250ms — slider track fill, toggle switch, chip selection
  medium: 250-400ms — screen transitions (push/pop), sheet presentation
  long:   400-700ms — save confirmation feedback
  ```
- **Spring animations:** Use type: "spring" with duration + bounce for natural, physics-based motion. Keep bounce subtle (0.1–0.2) — never playful or bouncy. Springs feel more organic than fixed-duration curves for sheet presentations and FAB interactions.
- **No celebration animations.** No confetti, no streaks, no achievement badges. This is a medical tool.
- **prefers-reduced-motion:** Respect this media query. All decorative transitions off.

---

## Key Components

### Pain Slider
```css
/* The critical component — displays pain severity as temperature */
.pain-slider {
  /* Track fill = pain gradient, computed via painGradient(score) function */
  /* Thumb: 26px circle, --text-primary fill, 2px --bg border */
  /* Touch target: min 48px height via wrapper */
}
.slider-value {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 400;
  /* Color = painColor(score) */
}
```

### Trigger Chip
Three intensity states:
- State 0 (unselected): `border: var(--border)`, `color: var(--text-muted)`
- State 1 (①): `border: var(--accent)`, `background: var(--accent-dim)`, `color: var(--accent)`
- State 2 (②): `border: var(--warning)`, `background: rgba(224,147,42,0.12)`, `color: var(--warning)`
- State 3 (③): `border: var(--error)`, `background: rgba(204,63,48,0.12)`, `color: var(--error)`
Tap cycles 0→1→2→3→0. Default on first select is State 1 (leve).

### Buttons (Apple HIG taxonomy)

Four styles × three sizes. Classes defined in `globals.css`. Always compose `btn` + style + size (+ `btn-full` for full-width).

```
btn-filled       → var(--accent) bg, dark text          — primary CTA (Save, Confirm)
btn-tinted       → accent-dim bg, accent text            — secondary accent action
btn-tinted-error → error/10 bg, error text               — destructive confirm (Discard, Delete)
btn-tinted-warn  → warning/10 bg, warning text           — warning confirm
btn-gray         → surface-el bg, primary text           — neutral secondary
btn-plain        → no bg, accent text                    — navigation, back, inline links
btn-plain-muted  → no bg, muted text                     — cancel, dismiss

btn-lg   → 50px / 17px / 600   — prominent sheet CTAs (use with btn-full)
btn-md   → 48px / 15px / 500   — standard interactive buttons
btn-sm   → 34px / 13px / 500   — small inline, non-critical actions
btn-full → width: 100%
```

**Use `<Button>` component** (`src/components/ui/button.tsx`) — never raw CSS classes in JSX. CSS classes in `globals.css` are the internal foundation only.

```tsx
import { Button } from "@/components/ui/button";

// Primary CTA (sheet footer)
<Button size="lg" className="w-full">Guardar</Button>

// Destructive confirm (sheet footer)
<Button variant="tinted-error" size="lg" className="w-full">Sí, descartar</Button>

// Cancel / dismiss (sheet footer)
<Button variant="plain-muted" size="lg" className="w-full">Cancelar</Button>

// Inline secondary
<Button variant="tinted" size="sm">Añadir</Button>

// Inline destructive (small confirm dialogs)
<Button variant="tinted-error" size="sm" className="flex-1">Sí, descartar</Button>
<Button variant="plain-muted" size="sm" className="flex-1">Cancelar</Button>
```

**Rules:**
- Sheet footer actions: `size="lg"` + `className="w-full"`, always paired (confirm + cancel)
- `size="sm"` for inline confirm dialogs within cards/forms
- `variant="plain-muted"` for cancel/dismiss — never `plain` (accent on cancel draws too much attention)
- Icon-only buttons: raw `<button>` with `size="icon"` class or manual sizing — do not use `<Button>`

### Toast
- Position: top of screen, below safe area inset, full width
- Background: always `var(--surface-el)` (#252014) — never solid color backgrounds (high luminance = harmful for photophobia)
- Border: colored at 50% opacity — success `rgba(123,198,122,0.5)`, error `rgba(204,63,48,0.5)`, warning `rgba(224,147,42,0.5)`, info `var(--border)`
- Icon: full color — success `#7BC67A`, error `#cc3f30`, warning `#e0932a`, info `var(--accent)`
- Text: `color: var(--text-primary)`, 13px 500
- Duration: 4 seconds, then fade out
- Do not auto-dismiss error toasts that require user action (e.g., retry)
- **Rationale:** Solid colored backgrounds flash high luminance on a dark UI. Users with neuropathic dry eye have photophobia. The colored border + icon communicates severity without a luminance spike.

### Skeleton Loader
- Background: `var(--surface-el)` (#252014)
- Shimmer: `var(--surface)` (#1c1810) animated left→right, 1.5s linear loop
- Shape matches the content it replaces — rect for charts, rows for lists. Not a generic spinner.

### Bottom Sheet Modal
Used for Gotas and Triggers screens (launched from FAB).
- Height: 80% viewport. Drag handle top-center (32px wide, 4px tall, `--border` color).
- Swipe-down to dismiss. Background dim: `rgba(0,0,0,0.6)`.
- `border-radius: var(--radius-lg)` top corners only — bottom corners are 0.
- Z-index: above bottom tab bar. FAB hidden when sheet is open.

---

## Anti-Patterns — Never Do This

- **Never default to light mode.** Dark mode must be the initial state — photophobia patients open the app in pain. Light mode is opt-in only.
- **No blue or cyan accents.** `#06b6d4`, `#0ea5e9`, `#3b82f6` — all activate photosensitive receptors. Even the original manifest `#0f172a` navy is too blue for this product.
- **No custom UI web fonts unless user opts in.** Default is system font stack (`-apple-system`). Users can switch via Profile → Fuente. Atkinson Hyperlegible (Braille Institute) and Manrope are available as optional downloads.
- **No purple/violet gradients.** Generic wellness app slop.
- **No gamification.** No streaks, no badges, no progress bars with encouragement messages. Medical tool.
- **No bright illustrations or mascots.**
- **No 3-column feature grids.** Mobile-first, single-column.
- **No reduced touch targets.** 48px minimum, always.

---

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-29 | Dark-only, no light mode | Neuropathic dry eye causes photophobia — bright UI is physically painful. Medical necessity. |
| 2026-03-29 | Amber accent (#d4a24c) over cyan/teal | Blue light (cyan range 480-510nm) maximally activates ipRGC photoreceptors. Amber sits at ~580-600nm, minimum photosensitive activation. FL-41 clinical research supports warm spectrum for photophobia. |
| 2026-03-29 | Warm charcoal background (#121008) over navy | Navy blue has significant blue component. Pure warm charcoal eliminates blue entirely from the dominant screen area. |
| 2026-03-29 | Geist Mono for all numeric values | Makes pain scores feel like clinical instrument readings, not subjective form inputs. Reinforces medical credibility for doctor reports. |
| 2026-04-08 | SF Pro (system font) over DM Sans / Inter | System font renders natively on iOS with subpixel precision, zero download cost, works offline without any caching config. |
| 2026-03-29 | Pain gradient on sliders (temperature metaphor) | Users can read severity before consciously processing the number. Important when cognitive load is impaired by pain. |
| 2026-03-29 | 48px minimum touch targets | Per Apple HIG for PWA. Users may have reduced motor precision during high-pain episodes. |
| 2026-03-29 | No gamification | This is a medical monitoring tool used by people in chronic pain. Achievement badges are inappropriate and insulting. |
| 2026-03-29 | Bottom sheet for Gotas/Triggers (not full screens) | These are quick-add flows that should not interrupt the user's current context. Sheet dismisses back to whatever tab launched it. |
| 2026-03-29 | Error toasts don't auto-dismiss if action required | If the user needs to retry or re-auth, the toast stays visible. Silent error recovery is the worst UX for a health tracker. |
| 2026-03-29 | Skeleton shape matches content (not generic spinner) | Charts get rect skeletons, lists get row skeletons. Reduces layout shift and helps the user understand what's loading before data arrives. |
| 2026-04-16 | Aumento de contraste base y pesos tipográficos mínimos (`var(--text-faint)` y `font-weight: 400` en *Geist Mono*) | Pacientes con fotofobia y ojo seco usan el dispositivo con **50-60% de brillo**. Tonos muy tenues (`#5a4e3a`) o pesos finos (`300`) desaparecen. Todo elemento requiere legibilidad clínica bajo atenuación extrema de luminancia, sin migrar a tonos azules. |
| 2026-04-27 | Toast: dark surface + colored border + colored icon (no solid color bg) | Solid color backgrounds (bright green/red) flash high luminance against the dark UI — a direct photophobia trigger. Severity still readable via border and icon color. Consistent with how info toasts already worked. |
| 2026-04-27 | Added opt-in light theme (`[data-theme="light"]`) | Some users operate in bright environments or have accessibility needs not related to photophobia. Dark remains default; light is user-selectable. Violet accent (#7C6DCD) chosen to stay out of the blue/cyan photosensitive zone while providing sufficient contrast on light backgrounds. |
| 2026-05-07 | Spring animations permitted for sheet presentations and FAB | After user testing, subtle springs (duration-based with bounce 0.1–0.2) feel more natural and responsive than fixed-duration curves. Bounce is kept intentionally low to avoid playful motion. `prefers-reduced-motion` still honored. |
| 2026-05-12 | Font selector in Profile: Atkinson Hyperlegible / Manrope / SF Pro Rounded | iOS-only PWA. SF Pro Rounded is native (0 download). Atkinson Hyperlegible (Braille Institute) offers maximum character distinctiveness for patients with visual impairment. Manrope retained for users who prefer the original aesthetic. Preference persisted to server via `api.updateMe({ font })`. |
| 2026-05-13 | Green changed `#5cb85a` → `#7BC67A` (dark), `#5CC8A0` → `#6CD9A0` (light) | The old green was Bootstrap's cold `#5cb85a` which clashed with the warm amber accent and was hard to read on warm charcoal. `#7BC67A` has a yellow component that harmonizes with the FL-41 palette. Better legibility at 50% brightness. |
| 2026-05-13 | Typography scale expanded with Apple Health-style display sizes | Added `28px display` for state labels and medication names, `20px headline` for dose times, `17px emphasized` for descriptions. Creates dramatic hierarchy like Apple Health: big numbers, small labels. |
| 2026-05-13 | SF Pro stack fixed to use real iOS system fonts | The old `data-font="sf-pro-rounded"` used a string `"SF Pro Rounded"` that resolved to nothing. Replaced with `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display"` which actually renders native SF Pro on iOS. |
