# AutoPost Studio — Design System Documentation

## 1. Design Philosophy: Monochrome Engineering

AutoPost Studio is built on a **Monochrome Engineering** design language inspired by modern developer platforms and high-precision software interfaces (e.g. `asnorsumdad.vercel.app`).

### Core Principles
1. **Engineered & Restrained**: Every visual element serves an operational purpose. Hairline 1px borders, subtle surface layer elevations, and crisp data pills replace heavy drop-shadows and decorative ornaments.
2. **High-Contrast Monochrome Base**: The core interface is defined by pure black `#000000`, crisp white `#FFFFFF`, deep charcoal `#111111`, elevated surface slate `#18181B`, and muted steel `#71717A`.
3. **Functional Status Accents**: Color is reserved exclusively for system state:
   - Green (`#16A34A` / `#22C55E`): Ready, published, active, authenticated.
   - Amber (`#D97706` / `#F59E0B`): Generating, queued, rate-limited, warning.
   - Red (`#DC2626` / `#EF4444`): Failed, cancelled, disconnected.
   - Blue (`#2563EB` / `#3B82F6`): Scheduled, connected platform, info.
4. **Information Density with Breathing Room**: Tabular data, key-value inspector drawers, and terminal-inspired monospace badges balance high density with generous whitespace and clear grid alignments.

---

## 2. Color System & Semantic Tokens

Configured via CSS-first Tailwind CSS v4 `@theme inline` inside `app/globals.css`:

### Base Surface & Neutral Hierarchy
| Token Name | Light Value | Dark Value | Purpose |
|:---|:---|:---|:---|
| `--background` | `#FFFFFF` | `#09090B` | Root page canvas background |
| `--foreground` | `#09090B` | `#F4F4F5` | Primary text and high-emphasis elements |
| `--muted` | `#71717A` | `#A1A1AA` | Secondary labels, captions, helper text |
| `--border` | `#E4E4E7` | `#27272A` | Hairline panel borders, divider rules |
| `--surface` | `#FFFFFF` | `#111113` | Base cards, tables, sticky navbars |
| `--surface-raised` | `#F4F4F5` | `#18181B` | Elevated cards, hovering row backgrounds |
| `--surface-strong` | `#E4E4E7` | `#27272A` | High-contrast chips, code container fills |

### Functional Status Tokens
| State | CSS Variable | Hex Value | Usage |
|:---|:---|:---|:---|
| `success` | `--status-success` | `#16A34A` / `#22C55E` | Verified keys, approved posts, active runner |
| `warning` | `--status-warning` | `#D97706` / `#F59E0B` | Background generating progress, retry buffers |
| `error` | `--status-error` | `#DC2626` / `#EF4444` | Expired tokens, dropped jobs, failed posts |
| `info` | `--status-info` | `#2563EB` / `#3B82F6` | Scheduled calendar items, platform badges |

---

## 3. Typography Hierarchy

Fonts are loaded locally via `next/font/google` in `app/layout.tsx`:

- **Display Font**: Space Grotesk (`var(--font-display)`) — Headings, metric numbers, hero statements.
- **Body Font**: Inter (`var(--font-body)`) — Paragraphs, captions, button labels, documentation.
- **Monospace Font**: JetBrains Mono (`var(--font-mono)`) — Code snippets, IDs, quotas, latency metrics, prompt tokens.

### Scale
- `text-display-2xl`: `3.5rem` / `56px` (`font-bold`, tracking tight)
- `text-display-xl`: `2.75rem` / `44px` (`font-bold`, tracking tight)
- `text-display-lg`: `2rem` / `32px` (`font-bold`)
- `text-headline-md`: `1.25rem` / `20px` (`font-semibold`)
- `text-body-md`: `0.9375rem` / `15px` (`font-normal`, `leading-relaxed`)
- `text-body-sm`: `0.8125rem` / `13px` (`font-normal`)
- `text-label-sm`: `0.6875rem` / `11px` (`font-mono`, uppercase tracking wider)

---

## 4. Motion & Animation Tokens

Standardized in `app/_design-system/motion.ts`:
- **Curves**:
  - `easeInOutCubic`: `[0.65, 0, 0.35, 1]`
  - `easeOutCubic`: `[0.33, 1, 0.68, 1]`
  - `springSnappy`: `type: "spring", stiffness: 400, damping: 30`
- **Durations**:
  - Micro-interactions (hover, toggle): `150ms`
  - Overlays (dialogs, drawers, command palette): `250ms`
  - Page transitions & review deck swipes: `350ms`
- **Accessibility**: All animated components wrap transitions in `useMotionSafe()` to respect `prefers-reduced-motion: reduce`.

---

## 5. UI Primitives Inventory

All components reside in `app/_components/ui/`:

1. **`Button`** (`button.tsx`): Variants (`primary`, `secondary`, `outline`, `ghost`, `danger`), sizes (`sm`, `md`, `lg`), link and native button modes, leading and trailing icon support.
2. **`SectionHeader`** (`section-header.tsx`): Consistent section heading with numeric counter pill, uppercase eyebrow, title, and descriptive body.
3. **`Dialog`** (`dialog.tsx`): Modal overlay with focus trap, backdrop blur, keyboard `Escape` dismiss, and smooth scale transitions.
4. **`Drawer`** (`drawer.tsx`): Right-side slide-over sheet for inspecting prompt metadata, queue parameters, and schedule details.
5. **`Toast`** (`toast.tsx`): Global reactive notification dispatch with stacking, auto-dismiss timers, and status variants.
6. **`CommandPalette`** (`command-palette.tsx`): Keyboard-first (`⌘K`) instant navigation and quick actions launcher.
7. **`Tooltip`** (`tooltip.tsx`): Floating label on hover/focus with directional positioning.
8. **`DropdownMenu`** (`dropdown.tsx`): Contextual action menus with keyboard selection.
9. **`Accordion`** (`accordion.tsx`): Collapsible FAQ and disclosure panels with animating content height.
10. **`Skeleton`** (`skeleton.tsx`): Pulse placeholder shapes for loading states.
11. **`ThemeToggle`** (`theme-toggle.tsx`): Clean system/light/dark switcher with mounting hydration safety.
12. **`StatusBadge`** (`status-badge.tsx`): Functional color pills for pipeline stages (`queued`, `generating`, `ready`, `scheduled`, `posted`, `failed`).
13. **`PostGraphic`** (`post-graphic.tsx`): Deterministic SVG post media generator matching selected aspect ratios (`4:5`, `1:1`, `16:9`).

---

## 6. Layout Shells

- **Marketing Layout**: Fixed top navigation with dynamic scroll blur and reading progress hairline, high-contrast footer with system status pill and theme switcher.
- **Onboarding Layout**: Continuous stepper progress bar, platform selection grid, simulated OAuth modal, key validation tester.
- **Dashboard Layout**: Collapsible sidebar with icon rail mode, active runner indicator, global command palette trigger, interactive review deck, queue inspector drawers, and calendar scheduler.
