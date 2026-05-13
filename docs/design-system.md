# Bloc-UAT Design System

Reference for all visual tokens, typography, and component classes. Update this file when tokens change.

---

## Fonts

| Variable | Family | Usage |
|---|---|---|
| `--font-sans` | Inter Tight | All UI: body, labels, headings, buttons |
| `--font-display` | Newsreader (italic only) | Large stat numbers on public pages (`.stat-number`) |
| `--font-mono` | System mono | Code, tokens, technical strings |

Loaded via `next/font/google` in [src/app/layout.tsx](../src/app/layout.tsx). Variables are set on `<html>` as CSS custom properties.

---

## Color Tokens

### Brand — Sky (primary institutional teal)

| Token | Hex | Usage |
|---|---|---|
| `--sky` / `sky-600` | `#1d6e7e` | Primary buttons, active nav, links |
| `--sky-mid` / `sky-500` | `#228ba0` | Hover state for primary buttons |
| `--sky-light` / `sky-50` | `#f0f9fa` | Tinted backgrounds |

Use Tailwind `sky-{n}` for utility classes or CSS var `--sky` for component overrides.

### Accent — Coral (public portal only)

| Token | Hex | Usage |
|---|---|---|
| `--coral` / `coral-500` | `#f06b56` | Kicker labels, section accents on `/asociatii` |
| `--coral-light` / `coral-50` | `#fef4f2` | Tinted backgrounds |

> Do **not** use coral in the dashboard admin panel — it is reserved for public-facing pages.

### Status — Amber (warning / pending)

| Token | Hex | Usage |
|---|---|---|
| `--amber` / `amber-500` | `#b58c0a` | `.badge-asteptare`, pending status chips |
| `--amber-light` / `amber-50` | `#fdf8ee` | Chip backgrounds |

### Status — Forest (active / conform)

| Token | Hex | Usage |
|---|---|---|
| `forest-5` / `--forest-dark` | `#217a3a` | Active, conform, completed status |
| `forest-3` / `--forest-3` | `#5fc9a3` | Mint decorative accents, score bars |
| `forest-1` / `--forest-light` | `#d6ede0` | Status chip backgrounds |

### Text (Ink)

| Token | Tailwind | Usage |
|---|---|---|
| `--ink-1` | `ink-1` | Headings, strong labels |
| `--ink-2` | `ink-2` | Body text |
| `--ink-3` | `ink-3` | Secondary, captions |
| `--ink-4` | `ink-4` | Placeholder, disabled |

### Backgrounds (Paper)

| Token | Tailwind | Usage |
|---|---|---|
| `--paper-1` | `paper-1` | Card surfaces, white |
| `--paper-2` | `paper-2` | Page background |
| `--paper-3` | `paper-3` | Section fills, hover backgrounds |
| `--paper-4` | `paper-4` | Dividers, strong borders |

### Borders

Prefer CSS var over Tailwind `border-slate-*`:

| Token | Value | Usage |
|---|---|---|
| `--border` | `rgba(0,0,0,0.07)` | Default card, input, divider border |
| `--border-strong` | `rgba(0,0,0,0.12)` | Focused inputs, emphasized containers |

Alpha-based borders adapt automatically on coloured backgrounds.

---

## Border Radius

| Token | Value | Class |
|---|---|---|
| `--radius-xs` | `4px` | Tags, chips |
| `--radius-sm` | `8px` | Buttons, small cards |
| `--radius-md` | `12px` | Inputs, nav items |
| `--radius-lg` | `16px` | Cards (default) |
| `--radius-xl` | `20px` | Panels |
| `--radius-2xl` | `28px` | Modal overlays, hero cards |

---

## Shadows

| Token | Usage |
|---|---|
| `--shadow-xs` | Subtle lift (buttons, small chips) |
| `--shadow-card` | Default card elevation |
| `--shadow-card-hover` | Card on hover |
| `--shadow-modal` | Modals, popovers |

---

## Typography Utilities

Defined in [src/styles/typography.css](../src/styles/typography.css).

| Class | Size | Font | Usage |
|---|---|---|---|
| `.kicker` | 11px, 600, 0.1em spacing | Inter Tight | Section label above a heading, coral colour |
| `.eyebrow` | 11px, 500, 0.08em spacing | Inter Tight | Subdued category label, `--ink-3` colour |
| `.section-title` | 22px, 700, −0.02em | Inter Tight | Major section headings on public pages |
| `.stat-number` | 40px, 400, italic | Newsreader | Large numbers on public portal only |
| `.body-lg` | 17px, 400, 1.65 leading | Inter Tight | Intro paragraphs on public pages |

---

## Component Classes (globals.css)

### Buttons

| Class | Appearance |
|---|---|
| `.btn-primary` | Filled sky teal — primary actions |
| `.btn-secondary` | White + border — secondary actions |
| `.btn-danger` | Red — destructive actions |
| `.btn-ghost` | Transparent — tertiary / icon areas |
| `.btn-success` | Emerald — confirm / approve |
| `.btn-outline` | White + border — same as secondary |
| `.btn-icon` | Square, padding only — icon buttons |

### Cards

| Class | Notes |
|---|---|
| `.card` | Base: white, `--border`, `--shadow-card`, `--radius-lg` |
| `.card-hover` | Adds lift on hover |
| `.card-header` | px-6 py-4, bottom border, flex row |
| `.card-body` | px-6 py-5 |
| `.card-accent-sky` | Left teal border |
| `.card-accent-{color}` | Left border in red/amber/blue/green/yellow |

### Badges

`.badge-activ` · `.badge-asteptare` · `.badge-verificare` · `.badge-completare` · `.badge-respins` · `.badge-inactiv` · `.badge-eroare` · `.badge-info` · `.badge-purple`

### Inputs

`.input` — full-width, sky focus ring. `.label` / `.label-text` — field label.

### Status dots

`.status-dot-green` · `.status-dot-amber` · `.status-dot-blue` · `.status-dot-red` · `.status-dot-gray`

### Icon badges

`.icon-badge-sky` · `.icon-badge-red` · `.icon-badge-amber` · `.icon-badge-blue` · `.icon-badge-green` · `.icon-badge-gray` · `.icon-badge-purple`

---

## Migration notes (uat-* → sky-*)

`uat-*` Tailwind classes and `card-accent-uat` / `icon-badge-uat` were renamed:

| Old | New |
|---|---|
| `uat-{n}` | `sky-{n}` |
| `.card-accent-uat` | `.card-accent-sky` |
| `.icon-badge-uat` | `.icon-badge-sky` |
| `.badge-info` (uat-*) | `.badge-info` (sky-*) |
| `focus:ring-uat-500` | focus ring uses `--sky` CSS var |

Search for remaining `uat-` references: `grep -r "uat-" src/`
