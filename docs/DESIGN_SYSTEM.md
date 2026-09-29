# HackStop Design System

Version 2.0 · 28 September 2026 · Intended repository path: `docs/DESIGN_SYSTEM.md`

This document is the visual source of truth for HackStop. It replaces the previous white/blue design system, including its blanket prohibition on gradients. It specifies a warm, technical interface with amber actions, violet accents, quiet dotted backgrounds, restrained ambient light, and precise interaction feedback. Operational screens remain calm, legible, and efficient during long judging sessions.

**Scope: presentation only.** Implement these rules using the existing Next.js App Router, React, TypeScript, Tailwind CSS, local Inter fonts, and Lucide icons. Add no dependencies. Preserve routes, server rendering, permissions, request contracts, data, and working product behavior.

## 1. Sources, authority, and interpretation

The implementation baseline is [lupazcore/HackStop at commit `5db353033a8d724d4da82dd5d4fbf6b5c7b1b0b6`](https://github.com/lupazcore/HackStop/tree/5db353033a8d724d4da82dd5d4fbf6b5c7b1b0b6). The six uploaded files were inspected and match that revision: `docs/AGENTS.md`, the previous `docs/DESIGN_SYSTEM.md`, `package.json`, `src/app/globals.css`, `src/app/layout.tsx`, and `src/components/ProjectCard.tsx`. Navigation, gallery, judging, scoring, voting, community activity, and existing form components were also inspected.

Visual reference: [Finalize Figma Design — Figma Make](https://www.figma.com/make/Bh3ctdA67uFgiwWs2tr0q4/Finalize-Figma-Design?t=gU6HHQa9X6WRicIF-6), plus the supplied final screenshots dated 2026-09-28 at 22:38:58, 22:39:13, 22:39:50, and 22:40:03. Those screenshots show the dark gallery, amber card glow, transparent track-dropdown defect, and organizer sidebar/dashboard. They establish dark neutral surfaces, restrained geometry, amber/violet emphasis, dense metadata, and quiet operational panels.

**Evidence boundary:** Figma's connector returned a source-file inventory, but those resource links could not be read in this review; browser access required login. No editable source or light-theme screenshot was recovered. Exact colors, light-theme values, spacing, and engineering behaviors below are normative production decisions based on the visible design and requested direction, not claimed measurements extracted from Figma. The finished specification is implementable without further Figma access; pixel-identical fidelity to uninspected screens is not asserted.

Resolve conflicts in this order:

1. Existing security, acceptance, data, and route contracts remain authoritative. Follow `docs/AGENTS.md` for coding conventions.
2. This document governs visual presentation and accessibility, superseding the old visual rules.
3. Figma supplies visual intent. Prototype routes, mock data, dependencies, labels, and defects do not override working HackStop behavior.

Do not port the Figma application wholesale. In particular, `/gallery`, `/organizer`, and `/organizer/judges` shown in the prototype are not replacement routes. Do not reproduce mock project counts, track names, users, role switching, or “real-time” claims.

## 2. Engineering boundaries

### Verified stack

| Area | Repository baseline | Implementation rule |
| --- | --- | --- |
| Application | Next.js 16.3.6, React/React DOM 19.3.0, TypeScript 6.0.3 | Keep App Router and existing server/client boundaries. |
| Styling | Tailwind CSS 3.4.19, PostCSS, Autoprefixer | Extend `tailwind.config.ts`; retain the three `@tailwind` directives. No Tailwind 4 migration or `@theme` syntax. |
| Fonts | `@fontsource/inter` 5.3.0 | Keep local 400/500/600/700 imports in the root layout. |
| Icons | `lucide-react` 1.48.0 | Reuse this library; no second icon package. |
| Existing primitives | `.button`, `.button-secondary`, `.panel`, `.badge`, `.field`; `Field`, `TextField`, `FormError`, `SubmitButton` | Update shared primitives before restyling callers. |
| Interactions | React state, browser APIs, CSS | No Motion/Framer Motion, GSAP, Radix, Headless UI, shadcn installation, `next-themes`, or progress-bar package. |

Server Components remain the default. Keep the root layout asynchronous, retain `getSession()`, `dynamic = "force-dynamic"`, metadata, local font imports, skip link, and a single `main#main`. A small client theme controller, navigation drawer, or decorative card wrapper may surround server-rendered children. Never import Prisma, database access, session helpers, or full privileged records into a client interaction module.

Use Tailwind utilities for layout and ordinary states. Put shared theme variables, radial gradients, keyframes, and interaction media queries in `globals.css`; these are justified custom CSS. Do not scatter hex values or duplicate animation definitions across component files. Use explicit class maps rather than dynamically assembled Tailwind names.

### Protected behavior

- Do not change `src/app/api/**`, route-handler aliases, Prisma schema/migrations/seeding, Docker files, package/lockfile dependencies, auth/session handling, ownership checks, role isolation, normalization, scoring calculations, ballot ordering, deadlines, or acceptance configuration/checker.
- Do not move database queries into the browser, expose additional data, or add a new endpoint to support a visual feature.
- Keep existing mutation endpoints, methods, payloads, error handling, pending guards, refreshes, and redirects. Styling a form is not authorization to rewrite its submission logic.
- Preserve optional media and external links; no remote fonts, stock-image services, analytics, or new network calls for decoration. Existing participant-supplied media may be unavailable offline, and the layout must tolerate this.
- Do not add publishing, live updates, admin dashboards, new sorting/ranking modes, uploads, notifications, or other prototype-only features.

## 3. Product language and route contract

Retain **HackStop**, **Project gallery**, **Community vote** in navigation, **Community voting** on its landing page, **My teams**, **My submissions**, **My events**, **My reviews**, **Judge progress**, **Project assignments**, **Normalized rankings**, **Calculate rankings**, **Export normalized CSV**, and **Save review**. Preserve existing labels when moving their controls. Use “project” for gallery entries and “submission” for the participant workflow. A team and an event remain distinct entities.

| Existing route | Presentation and behavior to preserve |
| --- | --- |
| `/` | Existing redirect to `/projects`; no new marketing landing page. |
| `/projects` | Public server-rendered gallery, GET filters, result count, duplicate labels, plain-text titles in initial HTML. |
| `/projects/[projectId]` | Public submitted-project detail, existing media/links/custom answers and comments behavior. Preserve access restrictions for other records. |
| `/login`, `/register` | Existing authentication forms and redirect behavior; registration role rules remain server controlled. |
| `/participant/teams` | Create/join/manage existing team workflow. |
| `/teams/[teamId]/invite` | Existing invite workflow and membership/access rules. |
| `/participant/submissions` | Existing submission list and state/actions. |
| `/participant/submissions/new` | Existing new-submission form, team eligibility, required fields, and deadlines. |
| `/participant/submissions/[submissionId]/edit` | Existing editable fields, save/submit actions, and closed-state behavior. |
| `/organizer/events` | My events, creation, and owner-scoped event access. |
| `/organizer/events/[eventId]` | Event overview/configuration and existing event links. |
| `/organizer/events/[eventId]/judging` | Existing judge invitations, rubric, manual/automatic assignments, progress, calculated rankings, and export. |
| `/organizer/events/[eventId]/community` | Existing Community activity and organizer/admin authorization as implemented. |
| `/judge/assignments` | My reviews, current judge's queue and real completion counts. |
| `/judge/scoring/[projectId]` | Assigned project, own saved scores, partial saves, optional comment, previous/next queue links, and judging-window restrictions. |
| `/vote` and `/vote?event_id=…` | Existing sign-in requirement, event selection, voting window, eligibility, ratings, and session-stable ballot order. |

There are no standalone `/organizer/progress` or `/organizer/results` pages at the baseline. The previous design document's Publish action and raw/normalized ranking toggle are not implemented product requirements. Keep progress and rankings in the existing event judging route. Sidebar shortcuts may target sections using fragments such as `#judge-progress`, `#scoring-rubric`, and `#normalized-rankings`; add matching section IDs without inventing routes or data workflows.

Preserve these exact acceptance targets and all existing `/api/v1/` contracts:

| Checker target | Existing path |
| --- | --- |
| Public gallery | `/projects` |
| Submission POST alias | `/projects/new` — a route handler, not the new-submission UI |
| Own judge scores | `/api/judge/scores` |
| Peer-score isolation | `/api/judge/scores?judge=judge_a` |
| CSV export | `/api/export.csv` |

Navigation must be derived from the existing authenticated actor. Visitors retain Project gallery and Sign in; authenticated users retain Community vote and Sign out; participants retain My teams/My submissions; organizers retain My events; judges retain My reviews. Do not broaden role access because a Figma sidebar contains a link. Preserve exceptional route-level permissions already present, including the community activity page; do not infer a general admin workspace from them.

## 4. Theme contract

Expose three explicit choices: **Light**, **Dark**, **System**. Default to System when no valid preference exists. System is a preference that resolves to Light or Dark, not a third color palette.

- Store only `light`, `dark`, or `system` in local storage under `hackstop-theme`.
- Apply the resolved theme as `data-theme="light"` or `data-theme="dark"` on `<html>`. Set `color-scheme` accordingly so native controls match.
- Resolve stored preference and `prefers-color-scheme` before first paint with a small first-party bootstrap in the root layout. It must not contain user data, read authentication, or require a dependency. If deployment CSP restricts inline scripts, use its existing approved mechanism; do not weaken CSP for a theme switch.
- Initialize client state consistently from the resolved document state. A deliberately mutated root attribute may use narrowly scoped `suppressHydrationWarning` on `<html>`; never suppress hydration warnings across the page or hide content until mounted.
- Listen for system changes only while System is selected. Switching to an explicit theme must stop OS changes from overriding it. Respond to the `storage` event for another tab and clean up listeners.
- Treat unavailable storage as a recoverable preference limitation: retain an in-memory choice and use the system fallback on future loads. It must never block rendering or sign-in.
- CSS without JavaScript defaults to light, with a `prefers-color-scheme: dark` fallback only when no explicit `data-theme` exists. Avoid a second independent Tailwind `dark` state; semantic variables should handle color switching.
- Put the control in public navigation and the workspace navigation/footer, including the mobile drawer. Give an icon trigger an accessible name such as “Appearance”; visibly label all three choices and the selected preference. “System” remains selected even when its resolved colors are dark.
- Theme changes are immediate. Do not globally animate every color or put a full-page transition over the interface.

## 5. Semantic color tokens

The following exact values are the production palette. Both themes use opaque structural surfaces. Amber communicates primary action; violet communicates secondary emphasis and focus. Green/red communicate success/error. Amber decoration must not be confused with warning status: warnings always include text and, where useful, an icon.

### Core and brand

| CSS token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| `--background` | `#FAFAF7` | `#11130F` | Page canvas |
| `--surface` | `#FFFFFF` | `#1B1E18` | Cards, panels, navigation |
| `--surface-hover` | `#F1F2EB` | `#24281F` | Hover/subtle table rows |
| `--surface-raised` | `#FFFFFF` | `#23271F` | Opaque menus, dialogs, drawer |
| `--border` | `#DCDFD3` | `#343A2E` | Decorative dividers and panel borders |
| `--border-strong` | `#7A806D` | `#727A65` | Control boundaries that must remain discernible |
| `--text-primary` | `#1A1D16` | `#F4F3E9` | Main text |
| `--text-secondary` | `#535A47` | `#B5BBA9` | Supporting text |
| `--text-tertiary` | `#666D59` | `#929A83` | Metadata/placeholder text; not invisible gray |
| `--text-inverse` | `#FFFFFF` | `#11130F` | Explicit inverse surfaces only |
| `--primary` | `#E9B949` | `#E9B949` | Amber action fill |
| `--primary-hover` | `#DDAA32` | `#F2C65B` | Hover action fill |
| `--primary-light` | `#FFF4D4` | `#332B17` | Amber soft state |
| `--on-primary` | `#211A0B` | `#211A0B` | Text/icons on amber fills |
| `--primary-ink` | `#805200` | `#F2C65B` | Readable amber links and text |
| `--accent` | `#6D3BC5` | `#B69AF2` | Violet text, selection and focus |
| `--accent-light` | `#F2ECFF` | `#2A233A` | Violet soft state |
| `--focus` | `#6D3BC5` | `#B69AF2` | Keyboard outline |
| `--overlay` | `#11130F` at 48% | `#000000` at 64% | Modal backdrop only |

**Do not use amber fill as body/link text in light mode.** Use `primary-ink` for text and `on-primary` on an amber button. The old `.button` uses `text-ink-inverse`; replace that with `text-on-primary`. Likewise migrate old link/badge uses of `text-primary` to `text-primary-ink`. Keep `bg-primary` for the action fill. Default text links should be underlined, or receive another persistent non-color cue within prose.

### Status, roles, and scores

| CSS token | Light foreground / soft background | Dark foreground / soft background |
| --- | --- | --- |
| `--success` / `--success-light` | `#166534` / `#F0FDF4` | `#86EFAC` / `#142D1C` |
| `--error` / `--error-light` | `#B91C1C` / `#FEF2F2` | `#FCA5A5` / `#351B1B` |
| `--warning` / `--warning-light` | `#854D0E` / `#FEFCE8` | `#FDE68A` / `#332C16` |
| `--info` / `--info-light` | `#5B21B6` / `#F5F3FF` | `#C4B5FD` / `#29213C` |

Use `--danger-fill: #B91C1C`, `--danger-hover: #991B1B`, and `--on-danger: #FFFFFF` in both themes for a destructive filled button. Do not reuse the dark theme's pale error text as a fill behind white text.

Role tokens: organizer uses `accent`, judge uses `#0E7490` light / `#67E8F9` dark, participant uses `success`, admin uses `error`. Role badges use a neutral surface, the role-colored text/border, and a written role name. Roles never depend on color alone.

Score foreground tokens for a five-point display: `score-1 = error`, `score-2 = #9A3412` light / `#FDBA74` dark, `score-3 = warning`, `score-4 = success`, `score-5 = #047857` light / `#6EE7B7` dark. These are optional display cues, not a fixed scoring scale. Actual rubric maxima are dynamic, up to the existing supported limits. Never convert scores to stars, invent labels such as “Poor,” or map normalized scores onto this five-point palette. `pass` aliases success and `fail` aliases error if acceptance output is displayed; this is not a request for a new acceptance dashboard.

### Tailwind 3 integration

Retain existing utility names. Store CSS color variables as **space-separated RGB channels** for Tailwind opacity modifiers. Example: `--primary: 233 185 73`, not a hex string, when using the mapping below. The tables above are the readable hex specification; convert every row consistently to channels.

```ts
// Integrate into theme.extend.colors in tailwind.config.ts.
// Retain content globs, font settings, and other existing configuration.
const color = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const colors = {
  background: color("background"),
  surface: {
    DEFAULT: color("surface"),
    hover: color("surface-hover"),
    raised: color("surface-raised"),
  },
  border: { DEFAULT: color("border"), strong: color("border-strong") },
  ink: {
    DEFAULT: color("text-primary"),
    secondary: color("text-secondary"),
    tertiary: color("text-tertiary"),
    inverse: color("text-inverse"),
  },
  primary: {
    DEFAULT: color("primary"), hover: color("primary-hover"),
    light: color("primary-light"), ink: color("primary-ink"),
  },
  "on-primary": color("on-primary"),
  accent: { DEFAULT: color("accent"), light: color("accent-light") },
  focus: color("focus"),
  success: { DEFAULT: color("success"), light: color("success-light") },
  error: { DEFAULT: color("error"), light: color("error-light") },
  warning: { DEFAULT: color("warning"), light: color("warning-light") },
  info: { DEFAULT: color("info"), light: color("info-light") },
  danger: { DEFAULT: color("danger-fill"), hover: color("danger-hover") },
  "on-danger": color("on-danger"),
  role: {
    organizer: color("role-organizer"), judge: color("role-judge"),
    participant: color("role-participant"), admin: color("role-admin"),
  },
};
```

Define all referenced variables in both palettes. Put the light palette on `:root`, dark on `:root[data-theme="dark"]`, and repeat the dark variable assignments under `@media (prefers-color-scheme: dark) { :root:not([data-theme]) { … } }` for the no-script fallback. Set light/dark `color-scheme` in the same selectors. Aliases such as `--role-organizer: var(--accent)` must also resolve to channels. Custom CSS must consume them as `rgb(var(--surface))`, not `var(--surface)`.

Use `text-ink`, `text-ink-secondary`, `bg-background`, `bg-surface`, and `border-border` throughout. Reserve `border-strong` for inputs and boundaries needed to identify controls. Do not confuse the `ink` Tailwind namespace with the `--text-*` variable names.

## 6. Typography, geometry, and density

Keep locally bundled **Inter** as the only proportional font. Use the existing 400, 500, 600, and 700 weights. The prototype's heavier-looking headings do not justify another font download. Use `ui-monospace, SFMono-Regular, Consolas, monospace` for IDs, technical tags, and compact counts; do not add JetBrains Mono. Numbers in tables and progress labels use tabular numerals.

| Style | Size / line height | Weight | Application |
| --- | --- | --- | --- |
| Page title | 28/36px mobile; 36/44px at `sm` | 700 | One `h1` per page |
| Section title | 22/28px mobile; 28/36px at `sm` | 600 | Form/table sections |
| Card title | 22/28px | 600 or 700 | Project cards |
| Group title | 18/24px | 600 | Form groups |
| Body | 16/24px | 400 | Descriptions and form input values |
| Compact | 14/20px | 400 or 500 | Tables, navigation, help text |
| Caption | 12/16px | 500 | Tags, timestamps, brief metadata |

Keep semantic heading levels independent of visual size. Use modest uppercase tracking only for brief eyebrows/table labels. Do not uppercase long labels or truncate essential statuses. Long titles, team names, and email addresses must wrap without pushing actions off-screen. Use `min-w-0` and `break-words` where needed.

Spacing uses the existing 4px grid: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96px. Page gutters are 16px below `sm`, 24px at `sm`, and 48px at `lg`; page vertical padding is 32px mobile and 48px desktop. Panels use 16px mobile / 24px desktop. Field gaps are 20px, label-to-control gaps 8px, section gaps 32px mobile / 48px desktop, and gallery gaps 24px. Keep the existing `max-w-7xl` public content width.

Geometry is restrained and close to square. Tokens: `radius-none = 0`, `radius-sm = 4px` for controls/tags, `radius-md = 8px` for cards/panels, `radius-lg = 12px` for dialogs, `radius-full = 9999px` for avatars and compact status pills. Use neutral rectangular tags for technologies, not pill shapes everywhere. Map these explicitly in Tailwind; avoid arbitrary large radii.

Panels have a 1px neutral border and no shadow by default. Shadows are reserved for interactive elevation and overlays: `shadow-sm = 0 1px 2px rgb(0 0 0 / 0.08)`; menu shadow `0 8px 24px rgb(0 0 0 / 0.14)` light / `0 12px 32px rgb(0 0 0 / 0.32)` dark; dialog shadow `0 20px 60px rgb(0 0 0 / 0.22)` light / `0 20px 60px rgb(0 0 0 / 0.45)` dark. A dark shadow never substitutes for a visible border.

## 7. Background atmosphere

Use a subtle 1px radial-dot texture on a 24px grid, plus two large amber/violet ambient fields behind public-page content. Keep the dot layer static, with text-primary channels at 4% opacity light / 6% dark. Amber and violet fields use at most 5% opacity light / 7% dark, fading fully to transparent. Fields should be roughly 480–720px across and remain decoration, not large colored blocks.

Implement the texture and fields using CSS gradients on at most two decorative layers owned by a page shell. Make them `aria-hidden`, `pointer-events: none`, and isolate their stacking context. Avoid negative z-index that drops them behind the page canvas. Use a clipped decoration-only layer; never clip an ancestor containing menus, focus outlines, or sticky content. Content stays above decoration on opaque panels.

Keep the full-width ambient layers static on mount and navigation. Moving them exposes a temporary strip between the persistent header and page background.

Organizer and judge pages use static decoration at no more than half public intensity. Scoring forms, tables, menus, drawers, and dialogs have opaque surfaces and no moving background inside them. On narrow/coarse-pointer devices, keep ambient fields static. Hide decorative layers for reduced motion where appropriate and in forced-colors mode. Gradients never carry essential information.

## 8. Navigation, sidebar, and mobile drawer

### Desktop shell

The public header remains 64px high with HackStop on the left and available navigation/actions on the right. Use an opaque surface, bottom border, and no generic glow. A dashboard sidebar is 240px wide at `lg` (1024px) and above; use a two-column grid with `minmax(0, 1fr)` content, not a hardcoded content offset combined with another nested sidebar.

Reuse the existing Navigation link/role logic. Introduce a shared workspace shell only where useful, within the existing layout/component structure. Do not turn the root layout into a client component or duplicate headers/main landmarks. For organizer event pages, sidebar entries may link to the existing event pages and judging section anchors. For judges, link to My reviews; do not introduce organizer sections. Participants retain their existing links rather than receiving a judging sidebar.

Active items use an amber 3px vertical marker, a subtle neutral or amber-soft background, and readable text. Reserve the marker's width to avoid layout shifts. `aria-current="page"` belongs only on the most specific current page link; for same-page section navigation use an appropriate location indication. Do not mark Overview active simultaneously with a more specific destination as the prototype screenshot does. Hover, current location, and keyboard focus must remain distinguishable.

The scoring route keeps the full content area **without a persistent sidebar**. Retain its My reviews link and previous/next navigation. Do not squeeze the scoring form into a generic dashboard template.

### Mobile/tablet drawer: below 1024px

Below `lg`, remove the sidebar from document flow and show a clearly visible Menu button in the 64px header. Use the same breakpoint for the trigger, desktop nav/sidebar, and drawer; the baseline's `md` header collapse is insufficient for the longer navigation plus theme control. Never render a shrunk desktop sidebar alongside mobile content.

- Use a 44×44px minimum trigger with a Lucide Menu icon, `aria-label="Open navigation"`, `aria-expanded`, and `aria-controls`.
- Open a left-side modal drawer, width `min(20rem, calc(100vw - 3rem))`, full `100dvh` with a `100vh` fallback, safe-area padding, and its own vertical scroll. Keep a 44px Close navigation button visible.
- Prefer a small native `<dialog>` implementation opened with `showModal()` for modal focus/inert behavior. Style its panel and backdrop; do not merely toggle the `open` attribute, which does not provide equivalent modality. If a custom dialog is used, implement focus containment and background inertness explicitly.
- Label the dialog, move focus to its close button or first navigation item, contain Tab/Shift+Tab, and support Escape, backdrop click, and explicit close. Clicking inside the panel must not dismiss it.
- Lock background scroll while open and restore the previous scroll/overflow state on close/unmount. Drawer content must remain scrollable when the phone keyboard is open.
- Close after navigation and on transition to desktop width. Explicit dismissal restores trigger focus; successful navigation follows the destination's focus behavior rather than forcing focus back to the old trigger. Handle a trigger that no longer exists after resize/navigation.
- Keep sign-in/sign-out, current role, and appearance choices reachable. Long names wrap or abbreviate visually with an accessible full name; they must not hide the Menu button.
- At 320px width, the header may hide the decorative PORTAL text and move secondary account details into the drawer. Do not hide navigation access or shrink touch targets.
- Reduced motion opens/closes instantly. Without JavaScript, preserve ordinary navigation links in a fallback such as `<noscript>`; do not make essential navigation depend exclusively on a nonfunctional button.

## 9. Component contracts

### Buttons and links

Primary: amber fill, `on-primary` text, modest radius, 500/600 weight. Secondary: opaque surface, ink text, neutral border. Ghost: transparent background with readable `primary-ink` or neutral ink. Destructive: danger fill with on-danger text, only for actual existing destructive actions.

Use at least 44px height for principal/touch controls, 16px horizontal padding, 8px icon gap, and 16–20px icons. Dense desktop controls may be visually 40px if their effective target remains at least 44px without overlapping neighbors. Primary actions are solid; amber/violet gradients belong to decoration, not ordinary button fills. Avoid movement/scaling on press; use a fill/border change.

Preserve link semantics for navigation and `<button>` for actions. Provide visible `:focus-visible` outlines: 2px focus color, 3px offset, not a low-opacity glow. Pending buttons keep their label width, prevent duplicate submission using existing pending state, and expose clear text such as Saving… or Calculating…. Do not disable unrelated navigation while one mutation runs. Disabled controls have explicit disabled semantics, a subdued surface, and no hover effect; surrounding explanatory text remains fully readable.

### Inputs and form feedback

Keep associated labels, help text, required indicators, original names/IDs and input semantics. Use 44px text/select height, 12px horizontal padding, `surface` background, `border-strong`, and 16px input text on mobile. Textareas have at least 128px height and vertical resize. Scope text-input sizing so checkbox/radio controls retain their intended size and a large associated label target.

Focus uses the shared visible outline/ring. Errors use error border, an associated specific message, `aria-invalid`, and `aria-describedby` including both hint and error IDs. Preserve existing server error detail. Do not rely on placeholders, color, a toast, or browser validation alone to explain failure. Keep entered data after failure. A closed deadline remains visibly explained; never reopen it because a form looks editable.

Reuse `Field.tsx`, `FormError`, `SubmitButton`, and existing `useMutation`. Reuse inline success notices with `role="status"`; announce errors without duplicating them in several live regions. Toasts are optional presentation supplements, not replacements for form feedback. If used, keep errors/actionable notices until dismissed; brief success toasts may dismiss after 5 seconds and pause while hovered/focused. Fit them within `calc(100vw - 2rem)` and do not cover the active field or drawer close button.

### Dropdowns, menus, and selects

Fix the reported All tracks defect explicitly: **the trigger and open option panel must be fully opaque** in both themes. Text and cards behind the panel must never show through, including during opening. Animate a wrapper's translation/scale or use a solid backing layer if text fades; do not fade the entire panel to transparency over content. Blur is not a substitute for an opaque background.

Native `<select>` remains the default for track and score inputs. Its operating-system popup is not consistently animatable; style its closed trigger and honor native behavior instead of importing a library. The requested menu motion applies to authored appearance/action menus and any fully implemented custom picker. Do not replace the score select just to animate its popup.

If a custom single-select is introduced, it must preserve native form submission values/names and the no-JavaScript form fallback, and implement a complete accessible select/listbox interaction: current selection, Arrow navigation, Home/End, typeahead, Enter/Space selection, Escape dismissal, and correct focus restoration. An action menu uses menu semantics; a form picker uses select/listbox semantics. Do not apply `role="menu"` to ordinary navigation links or a filter listbox by habit.

Anchor the panel 8px from its trigger, with at least trigger width, an 8px viewport margin, and a maximum height of `min(20rem, 60dvh)` with internal scrolling. Flip upward when needed, keep long labels readable, and close on outside interaction/Escape. Use a portal for panels subject to ancestor clipping, or choose a layout that avoids clipping. Recalculate placement on relevant scroll/resize without introducing a positioning package. Theme variables on `<html>` ensure portal content receives the same palette.

### Project cards

Preserve the existing `ProjectCard` data shape and fields: optional thumbnail, track, Duplicate badge, title link, team, `tagline || summary || "Explore this team's submission."`, technology tags, and View project link. Keep `/projects/${project.id}` destinations and IDs as stable keys. Do not replace actual records with the six prototype cards or add fake card indices as ranks.

Cards use opaque surface, 1px border, radius-md, 24px padding (16px mobile), flexible vertical layout, and a consistent footer position. Clamp the preview to three lines while leaving the full content on detail pages. Titles wrap; technologies wrap. Existing optional thumbnails retain aspect-video, lazy loading, descriptive alt text, and referrer policy. Missing media has a neutral fallback without fetched placeholder art. Do not force a blank image block onto every text-only card.

**Cursor glow is the signature interaction:**

- Enable pointer tracking only for `(hover: hover) and (pointer: fine)` and when reduced motion is off. No glow follows a touch gesture or scroll.
- Use one clipped decorative radial gradient inside the hovered card, radius approximately 280px. Amber center opacity is at most 8% light / 10% dark, fading to zero. On hover, a 1px amber/violet border response and readable title brightening accompany it. No orange underline, card translation, scale, tilt, or bounce.
- Keep glow behind card text and above its opaque fill. The decoration has `pointer-events: none`; use an inner clipped layer so the card/link focus outline is never clipped. A static violet/amber border overlay is sufficient; do not animate a gradient angle continuously.
- A small client wrapper may accept server-rendered card children. Pass no Prisma payload solely for the effect. Preserve initial HTML, link semantics, and all content when scripts are disabled.
- Read the active card's rectangle, store local pointer coordinates in a ref, and batch CSS custom property updates (`--pointer-x`, `--pointer-y`) into at most one `requestAnimationFrame`. Do not run React `setState` on every pointer event or attach document-wide tracking to every card. Cancel pending work/reset opacity on leave and unmount; refresh geometry as needed after scrolling.
- Keyboard `:focus-within` gets a static emphasis and the normal visible link outline, with no cursor tracking. Touch devices retain clear static cards and ordinary link feedback. Never add a tab stop to the article merely to make it glow, and never nest action buttons inside a whole-card anchor.

### Tables, badges, and progress

Tables use semantic `<table>`, a caption or associated section label, column headers with `scope="col"`, 14/20px body text, and 12px horizontal / 12px vertical cell padding. Header labels may be 12px/600 uppercase. Neutral row hover is sufficient; do not animate or reorder rows for decoration. Right-align numeric columns and use tabular numerals. Keep all existing columns and review counts.

Wrap wide tables in a labeled horizontal scroll region without causing page-level overflow. Make the region keyboard reachable where scrolling would otherwise be inaccessible. Sticky headers use opaque backgrounds and must not cover focused controls. Do not add sort affordances unless that sorting actually exists. If a later separately scoped sort is added, it requires proper buttons and `aria-sort`.

Badges pair text with appropriate foreground/soft background tokens. Keep Draft, Submitted, Duplicate, Not started, In progress, Complete, and existing assignment status wording. Do not replace them with prototype “Active”/“Done” labels or classify partial reviews as complete. Technology tags are neutral; track labels use restrained violet. Long labels wrap.

Progress visualization supplements the existing completed/assigned counts and percentages. Use a neutral 6px track and amber fill; retain the numeric label even at zero. Animate only the visual fill with `scaleX` and left transform origin over up to 700ms; expose the actual value immediately through native `<progress>` or correctly labeled progressbar semantics. Zero assignments remains the existing 0%/status, not invented completion. Never use a progress bar to imply a normalized score is a percentage. Server/no-script output must show the real value; animate only when an enhancement is active, not by shipping an initially empty essential value.

### Dialogs and overlays

Use native dialog where suitable. Opaque raised surface, radius-lg, shadow, 24px padding (16px mobile), and widths up to 480/640/800px according to content. Constrain to the viewport, scroll the dialog body, label the title, and provide a close action. Manage initial focus, Escape, return focus, and background inertness. Never introduce a Publish results dialog because the old document mentioned one.

Use a consistent ordinary stacking scale: decoration 0, content 10, sticky navigation 20, popovers 40, custom backdrop 50, custom dialog/drawer 60, toasts 70. Native dialog's top layer sits above ordinary z-index; menus opened inside it must be rendered inside that dialog/top-layer context, not portaled behind it to `body`. Avoid escalating arbitrary z-index values to mask stacking bugs.

## 10. Motion and reduced motion

Motion explains interaction; it never delays work or implies data has changed. Use `cubic-bezier(0.2, 0, 0, 1)` for entrances and ordinary `ease-out` for brief feedback. Do not use `transition-all`.

| Interaction | Default | Reduced motion |
| --- | --- | --- |
| Hover/focus border and fill | 120ms, no position change | Immediate |
| Card glow visibility | 160ms; pointer location updated within one frame | Glow disabled; static border/focus |
| Authored menu | 150ms, translateY 4px to 0, scale 0.98 to 1; solid backing | Immediate, opaque |
| Drawer | 200ms translateX; backdrop may fade | Immediate |
| Dialog | 160ms, up to 4px translation | Immediate |
| Route content entrance | 220ms opacity fade, no position change; sign-in retains its own entrance | None |
| Progress fill | At most 700ms to actual value | Actual value immediately |
| Skeleton | Subtle pulse while actually pending | Static placeholder plus loading text |

Keep content visible in base CSS. Add entrance effects as progressive enhancement only; do not leave server content at opacity zero awaiting hydration. Do not stagger every card or table row. No exit animation may postpone navigation, block keyboard input, or delay a mutation/redirect. Use route-specific App Router loading boundaries only when the fallback matches the route; do not wire obsolete Pages Router `router.events` or intercept all links to fake progress.

A route transition may be attached to a small route-content boundary without remounting the persistent shell or resetting forms on `router.refresh()`. Never key an entire workspace by a constantly changing value. Back/forward navigation, query filters, focus, and scroll restoration must remain normal. Skip navigation animation rather than discard unsaved input.

Do not add a fake top loading bar or timers that claim completion. If a genuine pending navigation indicator is needed, connect it to actual pending/loading state, keep it indeterminate, and ensure error/cancellation ends it. Mutation indicators continue to use existing pending state; completed/assigned bars display measured progress, not loading estimates.

Use a shared, scoped reduced-motion override for all introduced effects, for example:

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .ambient-field, .card-glow { display: none; }
  .route-enter, .menu-panel, .drawer-panel, .dialog-panel,
  .progress-fill, .loading-skeleton, .interactive-surface {
    animation: none !important;
    transition: none !important;
  }
}
```

Apply the shared hooks consistently, including the existing `animate-pulse` skeletons, or use Tailwind `motion-reduce:animate-none`/`motion-reduce:transition-none`. Disabling animation must leave final visible content and correct progress geometry intact. Also stop JavaScript pointer work when reduced motion becomes enabled at runtime; CSS hiding alone does not stop handlers. Do not rely on `animationend` to unlock interaction or remove an inaccessible overlay.

## 11. Responsive page rules

Use Tailwind's standard breakpoints: base below 640px, `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px. The sidebar transition is precisely at 1024px. Responsive layout must be implemented; it will not emerge automatically from the Figma preview.

- Gallery: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, 24px gaps, content width capped by the public shell. Filters stack on narrow screens and use the existing multi-column pattern where space permits. Preserve separate Search projects, Track, Technology tag, and Team name controls plus Apply filters and Clear. Keep GET field names `q`, `track`, `tag`, `team` and existing exact-tag semantics. Retain the access-denied notice driven by the existing `access` parameter. A custom track picker must submit its UUID value, not its label.
- Gallery titles and records remain server-rendered in the unfiltered response; keep all 41 baseline fixture records, including the labeled duplicate. Do not add client-only loading, pagination, virtualization, or visual deduplication that removes records from the initial response. Dynamic count comes from actual results.
- Project detail: use readable text measure, wrapped technology/media links, and responsive optional images. Keep comments and authentication/eligibility states. No auto-playing video or remote embed is needed to implement the visual system.
- Judge scoring: stack details and score form below `lg`; at `lg` retain the existing `minmax(0, 1fr)` plus 24rem form layout if space permits. No sidebar. Score controls remain integers 1 through each criterion's `max_score`, with “Not scored yet,” existing normalized display of relative weights, saved values, and optional comment. Partial review saving and its distinct success message remain intact. Do not add autosave or auto-advance.
- My reviews: show existing queue order, completed count, assignment status, and Score project/Review scores actions. It may use quiet panels but not a public-gallery spotlight on every operational item.
- Organizer judging: group existing controls into sections and give sidebar anchors clear targets. Keep invitations, all track checkboxes, rubric name/weights/maxima, manual assignment, automatic balancing, progress, assignments, and rankings. Preserve locked criterion/scale behavior once scores exist and recalculation messages. Do not fabricate dashboard totals or per-track progress from unavailable data.
- Rankings: preserve current ranked, nonduplicate rows and columns Rank, Project, Team, Track, Reviews, Raw average, Weighted score. Preserve existing display precision, negative values, ordering, and empty-state guidance. Keep Calculate rankings and the existing event-scoped CSV link. Do not recompute or reinterpret scores in a client component.
- Participant/event forms: retain every current field, validation message, public-answer disclosure, and all required/optional distinctions. URLs remain URLs, not file-upload widgets. Long multi-field rows stack before controls become cramped.
- Voting/community: use quiet, accessible controls and preserve session-stable order, eligibility notices, already-rated state, and voting-window feedback. Keep community activity separate from judging results. No visible leaderboard or vote totals where the current UI withholds them.
- Auth pages: compact readable form, explicit labels/errors, theme-consistent panel, no new provider options or role selector. Keep existing return-path behavior.

At 320px, there must be no page-level horizontal scrollbar, hidden Menu button, off-screen submit action, or overlapping labels. Wide data tables may scroll within their own region. Test 200% browser zoom and text wrapping; do not use fixed page heights or clip forms to make screenshots fit.

## 12. Accessibility, loading, and failure states

Target WCAG AA contrast: 4.5:1 for normal text, 3:1 for large text and essential control/state indicators. Verify rendered combinations in both themes, including hover, soft badges, input borders, and actual glow overlays. Decorative low-contrast dividers are acceptable only when they are not the sole way to identify a control. The palette is a starting contract, not a claim that every arbitrary combination is accessible.

Preserve the skip link and make it clearly visible above navigation when focused. Use real landmarks, one main region, a logical heading hierarchy, keyboard-operable controls, and predictable focus order. Decorative Lucide icons are `aria-hidden`; icon-only actions have accessible names. Status colors always accompany written states or numbers. In forced-colors mode retain native/system outlines and borders, suppress gradients, and let controls use system colors.

Every data region supports real content, loading, empty, and error states:

- Where a route has a loading boundary, use shape-matched placeholders without a visible loading label. Skeletons are decorative to assistive technology and static under reduced motion. Do not replace ordinary page navigation with a global progress bar or blank fallback.
- Empty states explain the condition using current product behavior: no filter matches, no assigned reviews, no calculated results, no teams, no open voting event, or no community activity. Offer only existing valid actions and retain current explanatory copy where accurate.
- Failures retain useful content/form values and show specific existing error feedback. Preserve `error.tsx` retry behavior and `not-found.tsx`; restyle them consistently. Do not turn authorization failure into a blank dashboard or optimistic success.
- Announce completed actions politely; use alerts for errors needing immediate attention. Do not announce pointer motion, every progress animation frame, or decorative changes.
- Never force animation, hover, imagery, color perception, or JavaScript decoration as a prerequisite for reading or navigating the public gallery.

## 13. Implementation sequence and ownership

Implement in reviewable stages, keeping the application functional after each:

1. **Foundations:** add both palettes and token mappings in `globals.css`/`tailwind.config.ts`; update shared buttons, links, focus, inputs, panels, badges, and semantic statuses. Audit existing `text-primary`, `text-ink-inverse`, hardcoded white/black, and pale error usages for their intended roles.
2. **Theme:** add the minimal bootstrap/controller and appearance choices. Verify first paint, persistence, System changes, storage failure, no-script fallback, and hydration before page redesign.
3. **Shell:** update `Navigation.tsx` and appropriate existing page/layout wrappers. Implement the mobile drawer, role-appropriate links, active states, and event section anchors. Keep server session/data logic intact.
4. **Gallery:** adapt `ProjectCard.tsx`, add an isolated glow enhancement, and introduce the ambient public shell. Preserve all filters and initial HTML content. Fix overlay opacity/stacking.
5. **Operational pages:** restyle current forms/tables/progress using shared tokens. Keep ScoreForm, ResultsActions, JudgingControls, ProjectForm, TeamForm, EventForm, AuthForm, VoteForm, CommentForm, and InviteForm behavior unchanged.
6. **Motion and resilience:** add only the bounded effects in this specification; exercise keyboard, touch, reduced motion, no-script gallery, loading, empty, and failure states.
7. **Verification:** run relevant existing checks and the acceptance suite, record actual results, and fix presentation regressions without changing protected behavior to make tests pass.

Possible new modules are small theme, drawer, authored-menu, and card-glow components within the existing `src/components/` hierarchy. These are implementation choices, not claims that such files already exist. Keep components modular and follow the existing under-200-line guidance. Do not create a second parallel component system, duplicate forms, or reorganize the repository.

## 14. Definition of done

### Visual and interaction checks

- [ ] Light, Dark, and System work on public, participant, organizer, judge, auth, voting, error, and empty screens.
- [ ] Initial paint and hydration are stable; explicit theme persists; System responds to OS changes; blocked storage does not break the page.
- [ ] Amber primary buttons use dark on-primary text. Light-mode links use primary-ink. Both themes pass contrast checks for actual component states.
- [ ] Dots and ambient fields are subtle; operational surfaces are calm; no external decoration request is introduced.
- [ ] Project-card glow follows a fine pointer smoothly without React rerenders per movement, card movement, or page scrolling side effects; keyboard and touch remain fully usable.
- [ ] All tracks and other open panels are opaque throughout interaction, aligned to triggers, unclipped, and reachable by keyboard. Native select behavior remains valid where retained.
- [ ] Drawer works at 320, 375, 640, 768, and 1023px; desktop sidebar/nav work at 1024, 1280, and 1440px. Test portrait/landscape, resize while open, Escape, backdrop, focus return, and scroll restoration.
- [ ] Scoring stays full width without a sidebar; long labels, variable rubric maxima, partial scores, closed deadlines, and server errors remain clear.
- [ ] Reduced motion disables ambient drift, cursor tracking, entrances, progress interpolation, and skeleton pulsing. Actual state stays visible. Forced-colors and 200% zoom remain usable.
- [ ] No continuous decorative timers, leaked pointer/media listeners, hydration errors, duplicate landmark IDs, unexpected form resets, or broken back/forward navigation.

### Product regression checks

- [ ] Public gallery and detail retain existing access behavior. Gallery titles appear as plain text in the server response; all baseline records and Duplicate labeling are preserved.
- [ ] `q`, `track`, `team`, and `tag` filters, Apply filters, Clear, result count, and access-denied notice work with unchanged semantics.
- [ ] Existing team/invite/submission/event flows, required fields, deadlines, and role-specific navigation behave as before.
- [ ] Judge sees only assigned work and own saved scores; partial and complete save messages remain distinct; next/previous links and judging closure work.
- [ ] Organizer can use existing invitation, rubric, assignment, Calculate rankings, and Export normalized CSV actions. No invented publish action, score transformation, or new results route appears.
- [ ] Voting, comments, community activity, eligibility, and existing result visibility remain unchanged.
- [ ] Dependency manifest/lockfile, API handlers/aliases, auth, Prisma, normalization, Docker, fixtures, and acceptance definitions have no redesign-driven changes.

### Existing commands to run after implementation

Use the repository's documented environment and installed dependencies; do not change Docker or install extra tools for this redesign:

```text
npm run lint
npm run test
npm run build
docker compose up --build
python docs/run.py .dogfood.toml
```

The build script runs Prisma generation as already configured; this does not authorize schema changes. Run the checker against the configured running local application. Preserve all seven official acceptance outcomes: public gallery, fixture title visibility, closed submissions rejected, judge own-score access, peer isolation, participant isolation, and valid organizer CSV export. Existing tests and the HTTP checker do not replace the visual/keyboard/mobile checks above.

For this document-only delivery, application tests and visual implementation checks are future acceptance requirements, not reported as executed. Record actual commands/results and screenshots when the frontend is implemented. A successful redesign changes how HackStop looks and feels while preserving what its working product does.
