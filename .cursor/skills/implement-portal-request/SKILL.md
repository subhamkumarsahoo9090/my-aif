---
name: implement-portal-request
description: Implements Hindi, Hinglish, or English change requests on the Wealth Discovery AIF portal (screens, UI, PWA, reports, clients, PDFs). Use when the user names a localhost URL, asks to change a screen, or says rakho, dikhao, hatao, beautify, or simple.
---

# Implement a portal request

## 1. Read the ask

Treat Hindi/Hinglish as an implementation request. Map:

- `simple rakho` / `simple karo` → white cards, small icons, no full-panel tints
- `beautify` / `design thik karo` → same layout language as nearby pages, not a new theme
- `hatao` / `lagao` / `dikhao` → remove / add / show
- A `localhost:3000/...` URL → that route’s component, not a new page

If they attach a screenshot: copy **layout and colors**, not the sample person’s data.

## 2. Find the screen

| URL | Start here |
| --- | --- |
| `/` | `aif-front/app/(public)/page.tsx`, `PageChrome.tsx` |
| `/login` | `components/auth/LoginScreen.tsx` |
| `/dashboard` | `components/dashboard/ClientDashboard.tsx`, `PortfolioCharts.tsx` |
| `/profile` | `components/profile/ProfileCard.tsx` |
| `/ledger` | `components/ledger/LedgerTable.tsx` |
| `/holdings` | `components/holdings/HoldingsTable.tsx` |
| `/statements` | `components/reports/StatementHistory.tsx` |
| `/admin/reports` | `components/admin/ReportsPanel.tsx`, `aif-back` report + PDF files |
| `/admin/clients/...` | `components/admin/Client360.tsx` |

Investor chrome (menu, logout): `DashboardShell.tsx`, `SideNav.tsx`. Admin chrome: `AdminShell.tsx`.

## 3. Change only what they asked

- Keep front and back separate.
- Keep Trading code vs bank Trading Code (`dpOrderId`) as two fields.
- Do not commit unless asked.
- Frontend-only: do not restart the API.

## 4. Check

Hit the URL with `curl.exe` (or the running Next log) so the page compiles. If UI changed and a browser is available, click the flow. If not, say what you could not click.
