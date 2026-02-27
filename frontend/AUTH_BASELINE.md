# Frontend Auth Baseline (Updated)

This document captures the current frontend authentication behavior and API contract.

## Current Auth Sources

- Context: `app/contexts/AuthContext.tsx`
- Storage: `localStorage` keys
  - `token`
  - `user`
- API client token injection: `app/utils/api.ts`

## Current Flow

1. App loads and `AuthProvider` reads token/user from localStorage.
2. User goes to `/login` and submits credentials.
3. Frontend calls `POST /api/auth/login`.
4. Token and user are stored in context + localStorage.
5. User is redirected to `/dashboard`.
6. Logout calls `POST /api/auth/logout`, clears local auth state, and redirects to `/login`.

## Route Protection

- `ProtectedRoute` is active and used in key layouts/pages.
- Role-based guards are enabled where needed (for example members, branches, billing, revenue sections).
- Legacy `/components/*` pages still exist for compatibility, while clean routes are the canonical flow.

## API Contract in Frontend

- Shared client is `app/utils/api.ts`.
- Success envelope from backend is normalized and frontend receives `payload.data`.
- Error messages are normalized from `error.message` or fallback message.
- Direct screen-level API calls should use `api.request` (or helper methods under `api.*`).

## Decisions

- No public signup flow is implemented.
- Account creation is admin/gym-owner/manager driven through backend role-based endpoints.
- Frontend supports login/logout and protected access only for now.

