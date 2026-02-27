# Gym Management Frontend Routing (Current Baseline)

This document reflects the actual Next.js App Router routes currently implemented in the codebase.

## Base Navigation Flow

- `/` redirects to `/landing`
- Landing page CTA routes to `/login`
- Successful login routes to `/dashboard`

## Implemented Route Map

### Top-level

- `/` -> redirect page (`app/page.tsx`)
- `/landing`
- `/login`
- `/forgot-password`
- `/dashboard`
- `/revenue`
- `/members`
- `/members/add-members`
- `/members/check-in`
- `/members/memberships`
- `/members/freeze`
- `/branches`
- `/billing`

### Component namespace routes

- `/components/landingPage`
- `/components/login`
- `/components/dashboard`
- `/components/revenue`
- `/components/billing`

## Layouts

- Root app layout: `app/layout.tsx`
- Global providers: `app/providers.tsx`
- Members nested layout: `app/members/layout.tsx` -> `components/members/MembersLayout.tsx`

## Route Notes for Sprint 1

1. Canonical routes now use clean paths (`/login`, `/dashboard`, `/revenue`, etc.).
2. Old `/components/*` routes still exist for backward compatibility.
3. `ProtectedRoute` is wired in key layouts and role-gated pages.

## Target Direction (for upcoming sprints)

- Keep existing routes stable for compatibility in Sprint 1.
- In Sprint 2, decide and execute one canonical route style:
  - either keep `/components/*`, or
  - migrate to clean product routes with redirects for backward compatibility.

