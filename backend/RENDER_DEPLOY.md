# Deploying backend to Render

If the build fails with npm usage menu, the **Build Command** was wrong.

## Required settings (Render Dashboard)

| Setting | Value |
|--------|--------|
| **Root Directory** | `backend` |
| **Build Command** | `npm install` or `npm ci` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/api/health` |

- **Root Directory** must be `backend` so Render runs commands inside the backend folder (where `package.json` lives).
- **Build Command** must be `npm install` or `npm ci`, **not** `npm` alone.

If your repo root is the parent of `gym-management-app`, set **Root Directory** to `gym-management-app/backend`.
