# Production Checklist

Use this checklist before every production release.

## 1) Final env check

- [ ] Backend `.env` has all required keys:
  - [ ] `PORT`
  - [ ] `MONGODB_URI`
  - [ ] `JWTSECRET`
  - [ ] `NODE_ENV=production`
  - [ ] `LUXAND_TOKEN` (if face recognition is enabled)
  - [ ] SMTP keys for OTP/reset email (if email features are enabled)
- [ ] Frontend `.env` has:
  - [ ] `NEXT_PUBLIC_API_URL` set to production API URL
- [ ] No local/dev secrets are hardcoded in source files.
- [ ] Run build check:
  - [ ] `cd backend && npm test`
  - [ ] `cd frontend && npm run build`

## 2) CORS check

- [ ] CORS allows only trusted frontend origin(s) in production.
- [ ] Browser test from production frontend confirms API calls are allowed.
- [ ] Browser test from unknown origin is blocked.

## 3) Rate limit check

- [ ] Confirm global rate limit is active on `/api`.
- [ ] Confirm stricter auth limit is active on `/api/auth`.
- [ ] Trigger repeated requests to verify `429` responses are returned with clear messages.

## 4) Health endpoint check

- [ ] `GET /api/health` returns `200`.
- [ ] Response contains service metadata and timestamp.
- [ ] Use this endpoint in deployment readiness/liveness probes.

## 5) Release notes

Before deploying, write a short release note with:
- [ ] What changed (backend + frontend)
- [ ] Risk areas
- [ ] Database/data impact
- [ ] Manual verification done
- [ ] Known limitations

Template:

```
Release: <version/tag>
Date: <yyyy-mm-dd>

Changes:
- ...

Risk:
- Low/Medium/High
- Notes: ...

Verification:
- [ ] login
- [ ] create member
- [ ] add payment
- [ ] attendance report
- [ ] dashboard summary

Known issues:
- ...
```

## 6) Rollback steps

If production has an issue:

1. Stop rollout / route traffic back to previous version.
2. Redeploy previous stable backend image/build.
3. Redeploy previous stable frontend build.
4. Confirm `GET /api/health` is healthy.
5. Smoke test:
   - [ ] login
   - [ ] members list/create
   - [ ] payment add
   - [ ] attendance report
6. Review logs and root cause before next release attempt.

