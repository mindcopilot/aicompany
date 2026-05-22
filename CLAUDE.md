# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev            # Run both client (:5173) and server (:8787) concurrently
npm run dev:client     # Client only: Vite dev server with HMR
npm run dev:server     # Server only: Express with tsx watch + hot reload
```

### Build & Typecheck
```bash
npm run build          # Build server → client (server builds to dist/, client to dist/)
npm run typecheck      # Typecheck both workspaces
```

### Database (PostgreSQL)
```bash
npm run db:reset       # Drop schema, recreate tables, re-seed data (destructive)
```

Database connection via `DATABASE_URL` env var (defaults to localhost). Schema auto-initializes on first run if `company` table is empty — see `server/src/db/init.ts`.

## Architecture

### Monorepo Structure
```
client/   # Vite + React 18 + TypeScript frontend
server/   # Express + TypeScript backend
```
Root package.json uses npm workspaces. Frontend proxies `/api/*` to `localhost:8787` (see `client/vite.config.ts`).

### Type Sharing
`client/src/types/api.ts` mirrors `server/src/types.ts` — these are the source of truth for API contracts. Keep them in sync when modifying interfaces.

### Auth Flow
- **Client**: `lib/auth.tsx` provides `AuthProvider` context + `useAuth()` hook; stores JWT in `localStorage` under `lumenedu.token.v1`
- **Server**: `routes/auth.ts` handles WeChat QR (with polling mock) and phone SMS (verification code fixed to `123456` in dev)
- Default user: `林桓` (id: `user-lin-huan`), created on first seed

### Data Layer
- **Database**: PostgreSQL with `pg` pool; queries in `server/src/db/queries.ts`, pool in `server/src/db/pool.ts`
- **Mock Data**: `server/src/data/` contains static seed data (core.ts, intelligence.ts, content.ts) that `init.ts` loads on fresh install
- **Schema**: `server/src/db/schema.sql` is idempotent; `init.ts` checks if company table is empty before seeding

### Frontend Patterns
- **API Client**: `lib/api.ts` wraps `fetch` with auth headers, exports `api` object with namespaced methods
- **Navigation**: `components/Shell.tsx` defines `ViewId` union type and `NAV` groups; `App.tsx` uses `active` state to switch views
- **Primitives**: `components/primitives.tsx` exports shared UI: `KPI`, `AgentTag`, `SignalCell`, `Profile`, `th`, `td`
- **Icons**: `components/Icon.tsx` uses SVG path strings; name prop maps to icon definitions

### Copilot
- **Component**: `components/Copilot.tsx` — floating chat panel with context-aware suggestions per view
- **Backend**: `server/src/copilot.ts` exports `buildReply()` for mock AI responses; routes in `api.ts` under `/copilot/*`

### Tweaks Panel
- `components/TweaksPanel.tsx` stores user preferences (`accent`, `density`, `layout`) in `localStorage` as `lumenedu.tweaks.v1`
- Applies CSS classes to `body` for density, and `data-accent` attribute for theme switching

## Modules (Views)
Each view in `client/src/views/` corresponds to a module in the LumenEdu founder OS:
- `Dashboard.tsx` — home with AI digest, KPIs, module grid
- `Direction.tsx`, `Validation.tsx` — strategy modules with AI badge
- `Product.tsx`, `Content.tsx`, `Traffic.tsx`, `Reach.tsx` — execution modules
- `Data.tsx` — measurement/metrics
- `Knowledge.tsx`, `Prompts.tsx`, `Skills.tsx`, `Agents.tsx`, `Automations.tsx` — AI assets

## Agent Names (Typed)
`AgentName = "Atlas" | "Nova" | "Helix" | "Aria"` — used throughout for color coding, role assignment, and activity attribution. Colors defined in `primitives.tsx` (`AGENT_COLOR`).
