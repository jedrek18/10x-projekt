# AI Flashcards (MVP)

![version](https://img.shields.io/badge/version-0.0.1-blue)
![node](https://img.shields.io/badge/node-22.14.0-339933)
![astro](https://img.shields.io/badge/Astro-5.5.5-purple)
![react](https://img.shields.io/badge/React-19-61DAFB)
![license](https://img.shields.io/badge/license-TBD-lightgrey)

> Generate high-quality study flashcards from pasted text and learn them with spaced repetition. Desktop-first, lightweight accounts, and an efficient review flow.

---

## Table of contents

- [Project name](#ai-flashcards-mvp)
- [Project description](#project-description)
- [Tech stack](#tech-stack)
- [Getting started locally](#getting-started-locally)
- [Available scripts](#available-scripts)
- [Project scope](#project-scope)
- [Project status](#project-status)
- [License](#license)

---

## Project description

**AI Flashcards** is a web MVP that lets learners quickly convert source text into a clean deck of flashcards and study them using a spaced-repetition system (SRS).

**Core capabilities**

- **AI card generation from pasted text** (recommended input: **1,000–10,000 characters**).
  The UI enforces limits and clearly shows counters when the text is too short or too long.
- **Card format quality by design**:
  front ≤ **200** chars, back ≤ **500** chars, **one concept per card**, text-only.
- **Review & curate before saving**:
  request **10–50** proposals via a slider; proposals stream in with skeleton loading; actions unlock after the batch completes; you can **accept / edit / delete** each proposal.
- **Local caching for safety**:
  proposals, decisions, and slider settings are cached in **LocalStorage** (**TTL 24h**) and auto-restored; only **accepted** cards are persisted to the backend.
- **“My Flashcards”**:
  server-paginated list (**25/page**, newest → oldest) with edit/delete; manual add modal with the same limits.
- **Learning powered by Open Spaced Repetition**:
  backend maintains due/ease/interval/reps/lapses; daily queue shows **all due first**, then up to **10 new**; daily target **20**. Anki-style grading updates the schedule on the backend. Short network issues won’t lose progress: grades are queued locally and retried.
- **Accounts & sessions**:
  email + password; sessions last **7 days**; multi-session allowed; password change revokes all sessions. Auth required for saving cards and learning.
- **Internationalization & accessibility**:
  UI available in **EN** and **PL**; card language follows source language (no forced translation). Keyboard navigation, visible focus, and ARIA states for loading/errors.
- **Telemetry & KPIs**:
  generation batches recorded; saves labeled **manual / ai / ai_edited**. Global KPIs (no time window):
  – AI acceptance ≥ **75%** of generated proposals
  – AI share ≥ **75%** of saved cards

---

## Tech stack

- **Frontend:** Astro 5, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth)
- **AI:** OpenRouter.ai (access to multiple model providers with budget limits)
- **CI/CD & Hosting:** GitHub Actions, Cloudflare Pages
- **Tooling:** ESLint 9, Prettier, prettier-plugin-astro, Husky + lint-staged, lucide-react, class-variance-authority, tailwind-merge

---

## Getting started locally

### Prerequisites

- **Node.js 22.14.0** (repo includes `.nvmrc`)
- A **Supabase** project (URL + anon key)
- An **OpenRouter** API key

### 1) Clone & install

```bash
git clone <your-repo-url>
cd <your-repo-folder>
nvm use         # ensures Node 22.14.0
npm install
```

### 2) Configure environment

Create a `.env` file at the repo root. Example:

```bash
# Public (exposed to the browser via Astro). Use PUBLIC_ prefix for client use.
PUBLIC_SUPABASE_URL="https://<your-project>.supabase.co"
PUBLIC_SUPABASE_ANON_KEY="<your-anon-key>"

# Server-only
OPENROUTER_API_KEY="<your-openrouter-api-key>"
# Optional overrides
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
OPENROUTER_MODEL="<e.g. openai/gpt-4o-mini or anthropic/claude-3-haiku>"
```

> Supabase: create a project, then copy the **Project URL** and **anon** key from Settings → API. Ensure your local dev origin (default Astro: `http://localhost:4321`) is allowed by Supabase CORS if needed.

> Database schema & migrations: the MVP expects tables for flashcards, user accounts, and SRS state. The exact schema will be provided separately; until then, create equivalent structures in your Supabase instance.

### 3) Run the app

```bash
npm run dev
```

- Astro dev server starts and prints the local URL (by default `http://localhost:4321`).

### 4) Build & preview

```bash
npm run build
npm run preview
```

### 5) Lint & format (optional but recommended)

```bash
npm run lint
npm run format
```

> Pre-commit checks are configured via **husky** and **lint-staged** for staged files.

---

## Available scripts

From `package.json`:

- **`npm run dev`** – start the Astro dev server.
- **`npm run build`** – production build.
- **`npm run preview`** – preview the production build locally.
- **`npm run astro`** – run Astro CLI directly.
- **`npm run lint`** – run ESLint across the project.
- **`npm run lint:fix`** – ESLint with automatic fixes.
- **`npm run format`** – Prettier format (incl. Astro via `prettier-plugin-astro`).

---

## Admin API (development)

Endpoints require an authenticated session and admin rights (`profiles.is_admin = true`). Use a browser session cookie or a service role token in dev.

### GET `/api/admin/audit-logs`

Query params:

- `limit` (1..100, default 50)
- `offset` (>=0, default 0)
- `action` (optional)
- `user_id` (UUID, optional)
- `card_id` (UUID, optional)

Response: `{ items: AdminAuditLogDTO[] }`

### GET `/api/admin/kpi-totals`

Response: `AdminKpiTotalsDTO`

### Manual testing (cURL)

Assumes a cookie-based session. Replace the cookie value with your browser cookie for the dev origin.

```bash
curl -i \
  -H "Cookie: sb:token=<your-dev-cookie>" \
  "http://localhost:4321/api/admin/audit-logs?limit=25&offset=0"

curl -i \
  -H "Cookie: sb:token=<your-dev-cookie>" \
  "http://localhost:4321/api/admin/kpi-totals"
```

Edge cases to verify:

- 401 when not authenticated
- 403 when authenticated but not admin
- Filters: by `action`, `user_id`, `card_id`
- Pagination boundaries: `limit=1`, `offset=0`, `offset` beyond range

---

## Project scope

### In scope (MVP)

- AI generation from pasted text (**1,000–10,000** chars), proposals cap **10–50**, streaming with skeletons.
- Card constraints: front ≤ **200**, back ≤ **500**, single concept, text-only; validation on FE/BE/DB.
- Proposal review actions: accept / edit / delete; bulk actions (save accepted, save all, reject all, select all).
- Local durability: proposals/decisions/slider cached for **24h**, auto-restored; cleared after save or TTL.
- “My Flashcards”: server pagination **25/page**, newest first; edit/delete; manual add modal.
- Learning flow: due-first then up to **10 new**; daily target **20**; Anki-style grading; backend SRS state; offline-safe grade queue & retry.
- Auth: email+password; 7-day sessions; multi-session; password change revokes sessions; logout.
- Telemetry: generation batch size; save labels **manual / ai / ai_edited**.
- Accessibility & i18n: keyboard navigation, visible focus/ARIA; UI in **EN/PL**.

### Out of scope (MVP)

- Custom SRS algorithm (uses **Open Spaced Repetition** library).
- File import (PDF/DOCX/etc.), sharing/invitations, external edu integrations.
- Native mobile apps (web only).
- Email verification and “forgot password”.
- Automatic deduplication of proposals.

---

## Project status

**Stage:** MVP (in progress / pre-alpha)

- **Known risks:** proposal quality & consistency affect KPIs; inference cost/latency; no password reset may increase support load; potential duplicate fronts in proposals.
- **CI/CD & hosting:** target **GitHub Actions** pipelines and **Cloudflare Pages** deployment.
- **KPIs:**
  – AI acceptance (accepted + accepted after edit) ≥ **75%** of generated proposals
  – AI share of saved cards (ai + ai_edited) ≥ **75%**

---

## License

**TBD.** This repository currently has no declared license.
To enable reuse, add a `LICENSE` file (e.g., MIT, Apache-2.0, or other).

---

## API

- See `docs/flashcards-api.md` for flashcards endpoints
- See `docs/progress-api.md` for daily progress endpoints
- See `docs/srs-api.md` for SRS (study) endpoints
