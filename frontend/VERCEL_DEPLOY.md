# Deploy frontend on Vercel

## 1. Connect the repo

- Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
- Import your Git repository (e.g. GitHub/GitLab/Bitbucket).
- If the repo contains both `frontend` and `backend`, set **Root Directory** to **`frontend`** and click **Edit** next to it to save.

## 2. Project settings (optional)

Vercel usually detects Next.js. You can leave defaults or set:

| Setting           | Value           |
|-------------------|-----------------|
| **Framework**     | Next.js         |
| **Build Command** | `npm run build` |
| **Output Directory** | (auto)       |
| **Install Command**  | `npm install` |

## 3. Environment variables

In **Project → Settings → Environment Variables**, add:

| Name                     | Value                    | Notes |
|--------------------------|--------------------------|--------|
| **NEXT_PUBLIC_API_URL**  | `https://your-backend.onrender.com/api` | Your deployed backend API base URL **including** `/api`. Required in production so the app talks to the real backend. |
| **NEXT_PUBLIC_API_TIMEOUT_MS** | `5000` (optional) | Request timeout in ms; default 5000. |

Use **Production**, and optionally **Preview** if you want the same API for preview deployments.

## 4. Deploy

- Push to the connected branch or trigger **Redeploy** from the Vercel dashboard.
- After build, the app will be at `https://your-project.vercel.app` (or your custom domain).

## 5. CORS on the backend

Ensure the backend (e.g. Render) allows the Vercel frontend origin:

- Set **FRONTEND_URL** (or **ALLOWED_ORIGINS**) to your Vercel URL, e.g. `https://your-project.vercel.app`, so the API accepts requests from the browser.

## Summary

- **Root Directory**: `frontend` (if the repo is the full monorepo).
- **NEXT_PUBLIC_API_URL**: backend API base URL including `/api`.
- Backend CORS must include the Vercel deployment URL.
