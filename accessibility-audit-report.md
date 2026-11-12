# Web Accessibility Audit — HR Help Desk frontend

**Site:** https://hr-help-desk-frontend.onrender.com (dashboard tested at `/dashboard`, plus `/hr-dashboard`, `/inbox`, `/login`)
**Date:** 2026-11-09
**Target conformance:** WCAG 2.1 Level AA
**Bundle audited:** `index-Cbu89s3F.js` / `index-44BTn_O0.css` (live deployment)

## Method

- Rendered inspection of the live app in a Chromium-based preview pane: accessibility-tree snapshots, DOM/ARIA attribute extraction, and computed-style sampling.
- Contrast: WCAG relative-luminance math computed on effective (alpha-blended) foreground/background pairs from `getComputedStyle`.
- Keyboard: tab order derived from the visibility-filtered DOM order; focus-ring styles read from the stylesheet and computed styles.
- Responsive: 320 px reflow test (1.4.10 equivalent), 375 px mobile layout, dark and light themes.
- Static checks: document `<head>`, and greps of the deployed bundle/CSS for `aria-live`, `role:"alert"`, `aria-modal`, `prefers-reduced-motion`, etc.

### Limitations

- No hardware screen reader (NVDA/VoiceOver/JAWS) session; findings are from the accessibility tree, not assistive-tech output.
- The dashboard was audited **signed in via a seeded session** (Alicia Gomez, agent, read-only use of the app) because the demo-account password in the repo README does not work on the live deployment. The site's backend serves the read endpoints unauthenticated, so layout and markup are the production ones; live data was sparse (1 ticket), so some data-rich states (sortable column sorted-state, chart with many points, error states on the table) are inferred.
- `priya@acme.com` / the credentials provided were rejected by the live API (401 "Invalid email or password"), verified with the actual request body captured at the proxy.
- Contrast was computed for the unique text styles present; per-pixel/gradient interactions were not sampled.

## Executive summary

The site is in **reasonable shape for WCAG 2.1 AA** — document basics, landmarks, headings, labels, and dark-theme contrast are largely correct, and there are no color-only status indicators, no keyboard traps found, and reflow works. However, it does **not fully conform**. The main failures:

1. Contrast failures for white text on teal surfaces in **light theme** (sign-in button, Search button, notification badge).
2. The keyboard focus ring is the same teal as the primary buttons' background — invisible focus on those controls.
3. The **charts have no accessible name or text alternative** (1.1.1).
4. Client-side **form validation errors are not programmatically announced** or associated with their fields (3.3.1/3.3.3).
5. Server returns **404 for deep links** (`/dashboard` direct navigation or refresh) — not a numbered WCAG criterion, but it produces an unstyled "Not Found" page with no guidance, which breaks every signposted route for AT users.

| Area              | Result                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| WCAG 2.1 Level A  | Near-conformant; gaps in 1.1.1 (charts), 3.3.1 (validation), 4.1.2 (sort state, dialog)                                                     |
| WCAG 2.1 Level AA | Near-conformant; failures in 1.4.3 (light theme, teal surfaces), 2.4.7 (focus on teal controls), 4.1.3 (no live regions for status updates) |
| Overall           | **Partial conformance** — fixable with small CSS/ARIA changes                                                                               |

## What passes already (keep these)

- `lang="en"`, descriptive `<title>`, viewport, `theme-color`, favicon all set.
- **Skip link** ("Skip to main content") with proper `main`/`nav`/`aside` landmarks and an `h1` per page (`Hello, Alicia.` / `My performance` / `Tickets`).
- Every interactive control examined has an **accessible name** (icon buttons included: "Open menu", "Close menu", "Switch to dark theme", "Notifications, 1 unread", "Collapse sidebar").
- Sidebar nav marks the active page with `aria-current="page"`; collapsible sidebar and notifications button expose `aria-expanded`.
- Sign-in inputs have **explicit `<label for>`** plus `autocomplete="email"` / `"current-password"` (1.3.5 pass).
- All `<img>`/decorative inline SVGs are named or `aria-hidden="true"` respectively.
- Data table uses a real `<table>`/`<th>` structure; status ("In Progress") and priority ("Medium") are **text, not color-only** (1.4.1 pass).
- **Dark theme text contrast passes everywhere sampled** (lowest ratio 5.97:1; priority/status badges 10:1+).
- Light-theme regular text passes (lowest sampled 4.93:1; most ≥ 6.99:1).
- API/error messages use `role="alert"` (screen-reader announced), e.g. "Invalid email or password."
- `prefers-reduced-motion` handled by Tailwind's `motion-reduce` utilities in the deployed CSS.
- 320 px reflow: no horizontal scrolling, no offscreen content (1.4.10 pass).
- Filter selects are native `<select>` with visible labels.

## Findings

### 1. [High] Deep links return an HTTP 404 ("Not Found")

`GET /dashboard` (or any client route other than `/`) returns a bare `Not Found` text response from Render. Refresh on any signed-in page, bookmark, or shared link breaks with no guidance or way back.

- **Why it matters for a11y:** screen-reader users get an unlabeled text node; no `main`/`h1`, no way to recover (no "go home" link). Undermines 2.4.2/3.2 expectations even though no single SC covers SPA hosting errors.
- **Fix:** add a SPA fallback (Render rewrite `/* → /index.html` with 200, or a `redirects`/`rewrites` rule in the deployment config). Verify `curl -I https://…/dashboard` returns 200.

### 2. [High] Chart has no accessible name and no text alternative (WCAG 1.1.1, Level A)

The "Created vs resolved (7d)" Recharts SVG (`recharts-surface`, ≈493 px wide, non-hidden) has `role=null`, no `aria-label`/`aria-labelledby`, no `<title>`, no `tabindex`, and no data-table fallback. The trend series is available only visually. The legend does expose "Created"/"Resolved" as an HTML list, which is good, but the series values are lost to non-visual users.

- **Fix (pick one):** `role="img"` + `aria-label` summarizing the data ("Created vs resolved, last 7 days: 3 created, 1 resolved…"), or a visually-hidden `<table>` of the plotted values next to the chart, or Recharts `accessible` tooltip with `tabindex` on the surface plus a summary line.

### 3. [High] Client-side validation errors are not announced or associated (WCAG 3.3.1 A, 3.3.3 AA; related 4.1.2)

On the login page, submitting empty fields renders "Enter your work email." / "Enter your password." as plain `<p>` elements:

- no `aria-invalid="true"` on the inputs,
- no `aria-describedby` linking error text to each field,
- no `role="alert"`/`aria-live` region, so screen readers announce nothing when the errors appear (focus stays on the submit button).

Server-side login errors do use `role="alert"` — apply the same pattern. Note the error text itself passes contrast (6.47:1).

- **Fix:** set `aria-invalid` + `aria-describedby="login-email-error"` on the input when the field has an error, give the error `<p id="login-email-error" role="alert">` (or a single live region above the form), and move keyboard focus to the first invalid field on submit.

### 4. [Medium] Focus indicator invisible on teal controls (WCAG 2.4.7, Level AA)

The global stylesheet defines `:focus-visible { outline: 2px solid var(--app-teal) }` and `--app-teal = #0d9488` — identical to the background of primary buttons ("Sign in", "Search") and the same-family badge/floating action surfaces. Programmatic keyboard focus on the submit button computes `outline: none` + a teal outline rule that yields a **1:1 teal-on-teal** indicator. Keyboard users cannot see where focus is on those controls. On white/near-white surfaces the same ring passes non-text contrast, so the fix is limited to the teal components.

- **Fix:** give teal buttons a two-tone focus style, e.g. `:focus-visible { outline: 2px solid #0f766e; outline-offset: 2px; box-shadow: 0 0 0 4px #FAFAFA }` or invert (dark outline with white gap so it contrasts against both the button and the page).

### 5. [Medium] White-on-teal text fails AA in light theme (WCAG 1.4.3, Level AA)

Measured (light theme):

| Element                          | fg / bg            | Size      | Ratio    | Needed |
| -------------------------------- | ------------------ | --------- | -------- | ------ |
| "Sign in" submit button          | #FAFAFA on #0D9488 | 14 px/500 | **3.59** | 4.5    |
| "Search" button (knowledge base) | #FAFAFA on #0D9488 | 14 px/500 | **3.59** | 4.5    |
| Notification badge "1"           | #FAFAFA on #0D9488 | 10 px/500 | **3.59** | 4.5    |

Everything else sampled passes (lowest: "Try:" chip label 4.93). The **dark theme passes** because it swaps to teal-400 (#2DD4BF) with near-black text (9.96:1) — the light theme is the outlier.

- **Fix:** darken the light-theme button fill to teal-700/800 (#0F766E gives ≈ 4.9 with white), or render text in #0E0E0E on the teal like the dark theme already does.

### 6. [Medium] Sortable table headers don't expose sort state (WCAG 1.3.1 / 4.1.2, Level A)

Inbox table: sort controls are `<button>`s inside `<th>`s, but the `<th>`s carry no `scope`, no `aria-sort`, and the buttons' names are just the column text ("Ticket", "Employee", "Priority", "Status", "Updated"). Screen-reader users can't tell which column is sorted or in which direction, and the sort buttons are ambiguous.

- **Fix:** set `aria-sort="ascending|descending|none"` on the header cell (update on click), and name the buttons "Sort by Updated (currently ascending)" or add a visually hidden direction word. Adding `scope="col"` is cheap while you're there. Also consider a table `<caption>` or visually hidden description.

### 7. [Medium] "HR assistant" dialog is not modal (WCAG 2.4.3 / 4.1.2, Level A)

The assistant opens with `role="dialog"`, a good name ("HR assistant"), and focus moved to "Close HR assistant" — well done. But the dialog lacks `aria-modal="true"`/focus containment/inert backdrop: background controls remain in the tab order, and there are two "Close HR assistant" buttons in the tree. The deployed bundle contains no ARIA dialog wrappers (`aria-modal` appears only twice, none rendered) and no focus-trap implementation, in contrast to the `useFocusTrap` hook that exists in the current repo source.

- **Fix:** since the panel visually covers content, make it a true modal: `aria-modal="true"` on the dialog, focus trap on Tab/Shift-Tab, Escape to close (Escape handling: 16 references exist in the bundle — verify it closes this panel), and `inert`/`aria-hidden` on the background while open. Select the single Close button and label the × decoratively.

### 8. [Low] No status announcements for result-changing actions (WCAG 4.1.3, Level AA)

Filtering/sorting the inbox, tab switches on "My performance", the notification unread badge, and assistant replies produce **no `aria-live` regions** while rendered (verified: zero `[aria-live]` elements on any audited page). Visual users see the list/count change silently for SR users except where `role="alert"` fires.

- **Fix:** add `aria-live="polite"` to (a) the results summary ("1 ticket · page 1 of 1", already visible text), (b) the assistant conversation transcript, (c) the notifications panel content.

### 9. [Low] Two `<h1>`s on the login page

"Outcomes you can track." (hero) and "Sign in" (form card) are both `h1`. Not a failsafe criterion violation, but it flattens the outline; marketing heading → `h2`/"p", keep "Sign in" as the only `h1` (matches the app pages which use exactly one).

### 10. [Low] Title and landmarks don't change per route

`<title>` stays "HR Desk / Emids" on `/dashboard`, `/hr-dashboard`, `/inbox`. No `<header>`/`<footer>` landmarks exist (nav is inside `<aside>`, acceptable). For 2.4.2, appending the view ("— My performance") to the document title on route change is a two-line improvement; the current value technically includes the site identity, so this is best practice rather than a hard failure.

### 11. [Low] Tabs pattern is incomplete (informational)

`role="tablist" aria-label="Period"` with `role="tab"` + `aria-selected` is present and the tabs are real `<button>`s (keyboard focusable — good), but there is no `tabpanel`/`aria-controls`, and all tabs are `type="submit"` (harmless outside a form, but fragile if one ever moves into one). Either complete the pattern or drop to a labelled radiogroup/segmented control. Arrow-key activation is not implemented (not required for buttons).

## WCAG 2.1 quick scorecard (audited pages)

| Criterion                        | Level | Result                                                                 |
| -------------------------------- | ----- | ---------------------------------------------------------------------- |
| 1.1.1 Non-text Content           | A     | **Fail** — charts lack name/alternative (F2)                           |
| 1.3.1 Info and Relationships     | A     | Partial — sort state missing (F6), validation association missing (F3) |
| 1.3.5 Identify Input Purpose     | AA    | Pass                                                                   |
| 1.4.1 Use of Color               | A     | Pass (status/priority are text)                                        |
| 1.4.3 Contrast (Minimum)         | AA    | **Fail** (light theme, teal surfaces) — F5                             |
| 1.4.10 Reflow                    | AA    | Pass                                                                   |
| 2.1.1 Keyboard                   | A     | Pass (no traps found; everything reachable)                            |
| 2.2.2 Pause, Stop, Hide / motion | A/AAA | Pass (`prefers-reduced-motion` handled)                                |
| 2.4.2 Page Titled                | A     | Borderline pass — static title (F10)                                   |
| 2.4.3 Focus Order                | A     | Pass with risk on non-modal dialog (F7)                                |
| 2.4.7 Focus Visible              | AA    | **Fail** on teal controls — F4                                         |
| 3.2.4 Consistent Identification  | AA    | Pass                                                                   |
| 3.3.1 Error Identification       | A     | **Fail** for client-side validation — F3                               |
| 3.3.2 Labels or Instructions     | A     | Pass                                                                   |
| 3.3.3 Error Suggestion           | AA    | Partial — errors shown, not announced (F3)                             |
| 4.1.2 Name, Role, Value          | A     | Partial — sort state, dialog modality (F6, F7)                         |
| 4.1.3 Status Messages            | AA    | **Fail** — no live regions — F8                                        |

## Recommended fix order

1. Add the SPA deep-link fallback (deployment config) — F1.
2. One CSS edit: light-theme teal tokens for buttons/badges + a distinct focus ring — F4, F5.
3. Wire validation errors to inputs with `aria-invalid`/`aria-describedby`/`role="alert"` — F3.
4. Chart `role="img"` + `aria-label` (or hidden data table) — F2.
5. `aria-sort` + button names in the table header, `aria-live="polite"` on results summary, dialog modality (the repo already has `useFocusTrap`) — F6–F8.
6. Route-level `document.title` updates and login-page heading cleanup — F9, F10.
