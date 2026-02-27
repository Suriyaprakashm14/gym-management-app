# Backend API Contract v1 (Baseline)

This document defines the Sprint 1 API baseline for the Gym App backend.
It is a contract target for backend and frontend teams while legacy endpoints are still supported.

## Base URL

- Primary: `/api`
- Legacy compatibility: `/api/legacy` (temporary)

## Standard Response Envelope

New and migrated endpoints should use:

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-01-01T10:00:00.000Z"
  }
}
```

Error response:

```json
{
  "success": false,
  "error": {
    "code": "REQUEST_FAILED",
    "message": "Human readable message",
    "details": null
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-01-01T10:00:00.000Z"
  }
}
```

## Request Correlation

- Every response includes `x-request-id` header.
- If client sends `x-request-id`, backend preserves it.

## Health Endpoint

- `GET /api/health`
- Purpose: uptime, deployment probes, and diagnostics.

## Authentication Endpoints

Primary routes:

- `POST /api/auth/login`
- `POST /api/auth/create-first-admin`
- `POST /api/auth/forgot-password`
- `POST /api/auth/verify-otp`
- `POST /api/auth/reset-password`
- `POST /api/auth/resend-otp`
- Protected:
  - `GET /api/auth/profile`
  - `PUT /api/auth/profile`
  - `PUT /api/auth/change-password`
  - `POST /api/auth/logout`
  - `POST /api/auth/create-admin`
  - `POST /api/auth/create-gym-owner`
  - `POST /api/auth/create-manager`

## Domain Endpoints (Current)

- Gyms: `/api/gyms/*`
- Branches: `/api/branches/*`
- Members: `/api/members/*`
- Members Personal Details: `/api/members-personal-details/*`
- Membership Prices: `/api/membership-prices/*`
- Payments: `/api/payments/*`
- Attendance: `/api/attendance/*`
- Fingerprints: `/api/fingerprints/*`

## Migration Policy (Sprint 1)

1. Do not break legacy payloads used by existing frontend screens.
2. Any newly touched endpoint should prefer the standard envelope.
3. Frontend must tolerate both legacy raw payload and standard envelope.
4. Contract-breaking changes require frontend PR in same sprint.

