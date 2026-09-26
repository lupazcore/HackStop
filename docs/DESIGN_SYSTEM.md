# Design System

This file defines the visual rules for HackStop. Every component, page, and layout follows these decisions. AI agents must read this before generating any UI code.

HackStop is a hackathon submission and judging platform. The UI serves three audiences: organizers managing events, judges scoring projects quickly, and participants browsing a public gallery. The design prioritizes clarity, speed, and function over decoration.

---

## Direction

Professional, clean, dense where needed, spacious where it helps. This is a tool, not a marketing site. Organizers and judges will spend hours in this interface -- it must not tire them out or get in their way.

No gradients. No rounded-everything. No excessive animations. No decorative illustrations. Borders, spacing, and type hierarchy do the structural work.

---

## Colors

### Core Palette

```
--background:       #FAFAFA       /* Page background, light neutral */
--surface:          #FFFFFF       /* Cards, panels, modals */
--surface-hover:    #F5F5F5       /* Hover state on surface elements */
--border:           #E5E5E5       /* Borders, dividers, table lines */
--border-strong:    #D4D4D4       /* Emphasized borders */

--text-primary:     #0A0A0A       /* Headings, primary content */
--text-secondary:   #525252       /* Labels, descriptions, helper text */
--text-tertiary:    #A3A3A3       /* Placeholders, disabled text */
--text-inverse:     #FFFFFF       /* Text on dark/colored backgrounds */
```

### Brand

```
--primary:          #2563EB       /* Primary actions, active states, links */
--primary-hover:    #1D4ED8       /* Hover on primary buttons */
--primary-light:    #EFF6FF       /* Light primary background (badges, highlights) */
```

### Semantic

```
--success:          #16A34A       /* Pass states, completed, approved */
--success-light:    #F0FDF4       /* Success background */
--error:            #DC2626       /* Fail states, errors, destructive actions */
--error-light:      #FEF2F2       /* Error background */
--warning:          #D97706       /* Warnings, incomplete states */
--warning-light:    #FFFBEB       /* Warning background */
--info:             #2563EB       /* Informational states (same as primary) */
--info-light:       #EFF6FF       /* Info background */
```

### Role Colors

Used in badges and indicators to distinguish user roles at a glance.

```
--role-organizer:   #7C3AED       /* Purple */
--role-judge:       #0891B2       /* Cyan */
--role-participant: #059669       /* Green */
--role-admin:       #DC2626       /* Red */
```

### Scoring

Used in the judge scoring interface and results tables.

```
--score-1:          #DC2626       /* Poor */
--score-2:          #EA580C       /* Below average */
--score-3:          #D97706       /* Average */
--score-4:          #16A34A       /* Good */
--score-5:          #059669       /* Excellent */
```

### Acceptance Suite

Used specifically for displaying PASS/FAIL results from the acceptance suite.

```
--pass:             #16A34A       /* PASS */
--fail:             #DC2626       /* FAIL */
```

---

## Typography

Font family: Inter (loaded locally, not from Google Fonts CDN -- the app runs offline).

Fallback stack: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Scale

| Token   | Size  | Line Height | Weight   | Usage                              |
|---------|------:|------------:|---------:|------------------------------------|
| h1      | 36px  | 44px        | 700 Bold | Page titles                        |
| h2      | 28px  | 36px        | 600 Semi | Section headings                   |
| h3      | 22px  | 28px        | 600 Semi | Card titles, subsection headings   |
| h4      | 18px  | 24px        | 600 Semi | Widget titles, form group labels   |
| body    | 16px  | 24px        | 400 Reg  | Paragraphs, descriptions           |
| body-sm | 14px  | 20px        | 400 Reg  | Table cells, secondary content     |
| caption | 12px  | 16px        | 500 Med  | Labels, badges, timestamps, metadata|
| mono    | 14px  | 20px        | 400 Reg  | Code, IDs, session tokens (font: JetBrains Mono or monospace fallback) |

Do not use font sizes outside this scale. If a new size seems needed, the layout is probably wrong.

---

## Spacing

Use a 4px base unit. The working scale:

```
4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96
```

In Tailwind terms: `p-1` through `p-24` using the standard 4px unit.

Rules:

- Page horizontal padding: 24px on mobile, 48px on desktop.
- Card internal padding: 24px.
- Space between form fields: 20px.
- Space between sections on a page: 48px.
- Space between a label and its input: 8px.
- Table cell padding: 12px horizontal, 8px vertical.

---

## Radius and Shadows

### Radius

```
--radius-sm:   4px      /* Buttons, badges, inputs */
--radius-md:   8px      /* Cards, panels */
--radius-lg:   12px     /* Modals, large containers */
--radius-full: 9999px   /* Avatars, pills */
```

Do not use radius values outside this set.

### Shadows

```
--shadow-sm:   0 1px 2px 0 rgba(0,0,0,0.05)       /* Subtle lift: buttons, inputs */
--shadow-md:   0 4px 6px -1px rgba(0,0,0,0.1)      /* Cards */
--shadow-lg:   0 10px 15px -3px rgba(0,0,0,0.1)    /* Modals, dropdowns */
```

Shadows are used sparingly. Most structural separation comes from borders, not elevation.

---

## Components

### Buttons

Three variants:

| Variant   | Background      | Text         | Border       | Usage                        |
|-----------|-----------------|--------------|--------------|------------------------------|
| Primary   | --primary       | --text-inverse | none       | Main actions (Submit, Save, Publish) |
| Secondary | --surface       | --text-primary | --border   | Secondary actions (Cancel, Back) |
| Ghost     | transparent     | --primary    | none         | Tertiary actions (Edit, View) |

All buttons: height 40px, padding 16px horizontal, radius-sm, font body-sm weight 500. Disabled state: opacity 50%, cursor not-allowed.

Destructive variant: same as Primary but uses --error as background. Used only for delete/remove actions.

### Inputs

- Height: 40px.
- Padding: 12px horizontal.
- Border: 1px solid --border.
- Radius: radius-sm.
- Font: body-sm.
- Focus: border changes to --primary, add a 2px ring with --primary at 20% opacity.
- Error: border changes to --error, error message appears below in caption size, --error color.
- Disabled: background --surface-hover, text --text-tertiary, cursor not-allowed.

### Select, Textarea

Same border, radius, and focus behavior as inputs. Textarea has no fixed height; min-height 120px for description fields.

### Cards

- Background: --surface.
- Border: 1px solid --border.
- Radius: radius-md.
- Padding: 24px.
- No shadow by default. Shadow-sm on hover if the card is clickable.

Used for: project cards in the gallery, score summary panels, dashboard widgets.

### Tables

- Header row: background --surface-hover, text --text-secondary, font caption weight 600, uppercase.
- Body rows: alternating background --surface and --background for readability.
- Cell padding: 12px horizontal, 8px vertical.
- Border: 1px solid --border between rows.
- Sortable columns show a sort indicator on hover and on active sort.

Used for: judge progress dashboard, score tables, results tables, CSV preview.

### Badges

- Padding: 4px 8px.
- Radius: radius-full.
- Font: caption.
- Background uses the light semantic color; text uses the strong semantic color.
- Role badges use the role color tokens.

Examples: `PASS` badge (--success-light bg, --success text), `FAIL` badge, `Draft` status, `Submitted` status, `Judge` role, `Organizer` role.

### Navigation

- Top bar: height 64px, background --surface, border-bottom 1px --border.
- Logo/product name on the left.
- Role badge and user name on the right.
- Navigation links in body-sm weight 500.
- Active link: --primary color, underline offset 4px.

### Sidebar (organizer/judge dashboards)

- Width: 240px on desktop, collapsible on tablet/mobile.
- Background: --surface.
- Border-right: 1px --border.
- Nav items: padding 12px 16px, body-sm, full width.
- Active item: background --primary-light, text --primary, left border 3px --primary.

### Modals

- Backdrop: rgba(0,0,0,0.5).
- Container: max-width 480px for small, 640px for medium, 800px for large.
- Radius: radius-lg.
- Shadow: shadow-lg.
- Padding: 32px.
- Close button: top right, Ghost style.

### Toast / Notifications

- Position: top right, stacked.
- Width: 360px.
- Padding: 16px.
- Border-left: 4px solid (--success, --error, --warning, --info depending on type).
- Auto-dismiss after 5 seconds. Manual dismiss with close button.

---

## States

Every interactive component must handle these states:

| State    | Visual treatment                                      |
|----------|-------------------------------------------------------|
| Default  | Normal appearance                                     |
| Hover    | Slight background shift or border emphasis             |
| Focus    | Ring or border highlight using --primary               |
| Active   | Darker background or scale-down for tactile feel       |
| Disabled | 50% opacity, cursor not-allowed, no hover/focus effect |
| Loading  | Spinner or skeleton. Never a blank area.               |
| Empty    | Message explaining what would be here and how to get it|
| Error    | Red border/text, specific error message                |

### Skeleton loading

For pages that fetch data: show skeleton placeholders matching the layout shape. Do not show a blank page with a centered spinner.

---

## Responsive Breakpoints

```
Mobile:   < 640px    (single column, stacked layout, collapsed sidebar)
Tablet:   640-1024px (two columns where useful, collapsible sidebar)
Desktop:  > 1024px   (full layout, sidebar visible, multi-column grids)
```

Rules:

- The gallery uses a responsive grid: 1 column on mobile, 2 on tablet, 3 on desktop.
- Tables scroll horizontally on mobile rather than stacking.
- The scoring interface is full-width on all breakpoints (judges need space).
- Navigation collapses to a hamburger menu on mobile.

---

## Accessibility

- Color contrast: all text meets WCAG 2.1 AA minimum (4.5:1 for body text, 3:1 for large text).
- All interactive elements are keyboard accessible. Tab order follows visual order.
- Focus states are always visible. Do not remove outline without replacing it.
- Form inputs have associated `<label>` elements. Use `htmlFor` / `id` pairing.
- Images and icons have alt text or `aria-label`.
- ARIA roles used only when semantic HTML elements are insufficient.
- Do not use color alone to convey meaning. PASS/FAIL badges include text, not just green/red.
- Score indicators (1-5) use both color and the number itself.

---

## Icons

Use Lucide React icons. They are lightweight, tree-shakable, and have a consistent style.

Do not mix icon libraries. If Lucide does not have a needed icon, check twice. It probably does.

---

## Page-Specific Notes

### Gallery (`/projects`)

- Project cards in a responsive grid.
- Each card shows: title, team name, track badge, tagline, tech tags.
- Search bar at the top. Filter dropdown for tracks.
- No authentication required.
- Project titles must render as plain text in the HTML (the acceptance suite searches for fixture titles in the response body).

### Judge Scoring (`/judge/scoring/[projectId]`)

- Full-width layout. No sidebar.
- Project details on the left or top.
- Scoring form on the right or bottom.
- Each criterion shows: name, weight, score input (1 to max), current value if previously saved.
- Comment textarea at the bottom.
- Save button. Clear feedback on save (success toast).
- Navigation to next/previous assigned project.

### Organizer Progress (`/organizer/progress`)

- Table of judges: name, assigned count, completed count, percentage, status badge.
- Status: "Not started" (warning), "In progress" (info), "Complete" (success).
- Sortable by any column.

### Results (`/organizer/results`)

- Table of projects: rank, title, team, track, review count, raw avg, normalized score, weighted total.
- Toggle between raw and normalized rankings.
- Export CSV button.
- Publish button (with confirmation modal).
