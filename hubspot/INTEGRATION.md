# HubSpot integration — record of what exists and what was done

Concise log of the Ophthalytics ↔ HubSpot setup. Code changes live in git history;
this file records the **portal-side** state and actions, which git can't see.
Update it when the portal changes.

## The app

| | |
|---|---|
| Portal | 40170226 |
| App | Ophthalytics Site Integration (app id 49877479) |
| Platform | Developer projects, 2026.03 — this `hubspot/` directory is the source |
| Auth | Static access token. Lives in `.env` (`HUBSPOT_ACCESS_TOKEN`) — **never commit it** |
| Rotate | HubSpot → Connected apps → this app → Auth. Update `.env` after |
| Change scopes | Edit `src/app/app-hsmeta.json`, `hs project upload`, then re-approve the install in the portal |

Scopes: `forms`, `crm.objects.contacts` (r/w), `deals/companies/owners/lists` (read).
`business-intelligence` and `marketing.campaigns.read` are **optional** — gated behind
Marketing Hub Pro; they auto-grant if the plan ever includes them. (Making them required
blocks the install — that was the first install failure.)

## The forms

Created 2026-08-19 via the Forms API. Site wiring: `src/data/hubspot.ts` (portal + GUIDs,
public by design) and `src/components/interactive/FormBlock.astro` (submission, field
mapping, honeypot). Submissions go client-side to HubSpot's public endpoint — no server,
no secret in the site.

| Form | GUID | Site surface | Notifies |
|---|---|---|---|
| Website — Contact (Connect With Us) | `b896bd2d-98df-4e71-81f9-6c2b80aeb5c7` | Contact modal | awais@ |
| Website — Book a Demo | `77fea900-8769-4498-a69d-0dff4107ca5d` | Demo modal | awais@ |
| Website — Newsletter Signup | `5c100e3b-5cd8-4c12-a1e4-f869f826f144` | Footer | silent |

Field mapping (in FormBlock): `firstName→firstname`, `lastName→lastname`,
`organization→company`, `role→jobtitle`; the Contact modal's single "Name" splits on
first space; the demo `product` select folds into `message`.

## Portal actions log

- **2026-08-19** — App created/deployed via `hs` CLI; installed by owner in UI (CLI
  install blocked: personal access key lacks the app's scopes).
- **2026-08-19** — Three forms created via API. Test submissions to all three returned
  200; produced a fully-mapped CRM contact (verified via contacts search).
- **2026-08-20** — `notifyRecipients` set via API on Contact + Demo forms → founder
  (awais@ophthalytics.com, userId 52524198). Newsletter intentionally silent.
- **2026-08-20** — Test contacts archived (Alex Test, Integration Test).
- **2026-08-20** — "Website Leads" dashboard created in UI (form submissions by page /
  by form, contacts created) with a **recurring Monday email** to the founder.

## Conventions adopted

- **Lead status**: New → Attempting → Connected → Qualified / Unqualified.
- **Lifecycle**: form fill = *Lead*; demo booked = *Opportunity*.
- **No PHI in HubSpot, ever** — sales/marketing contacts only (Trust Center posture).

## Deferred / open

- **CC Alex on notifications** — needs Alex's HubSpot userId (Settings → Users & Teams)
  or adding `settings.users.read` to the app (requires re-approval). Parked.
- **Contact-owner auto-assignment** — a Workflows (UI) task; leads currently land
  unowned.
- **Meeting scheduler in demo flow** — deferred by owner decision 2026-08-20.
- **HubSpot tracking script** — deliberately not installed; ship only together with a
  cookie-consent banner.
