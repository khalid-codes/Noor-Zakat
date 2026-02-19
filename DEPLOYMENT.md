# Deployment Guide

## Option 1: Docker (recommended)

### 1) Prepare env
From project root:

```bash
cp .env.example .env
```

Edit `.env` and set at least:
- `GOLD_API_KEY`
- `REACT_APP_BACKEND_URL` (your public backend URL after deployment)
- `CORS_ORIGINS` (your public frontend URL)

### 2) Build and run

```bash
docker compose --env-file .env up -d --build
```

### 3) Verify
- Frontend: `http://localhost:8080`
- Backend health/API root: `http://localhost:5055/api/`
- Rates endpoint: `http://localhost:5055/api/rates/current`

## Option 2: Render (no Docker required)

### One-click with `render.yaml` (recommended)
1. Push this repository to GitHub.
2. In Render, click `New +` -> `Blueprint`.
3. Select your repo. Render will detect `/render.yaml`.
4. Set secret env vars when prompted:
   - `GOLD_API_KEY`
   - `CORS_ORIGINS` = your frontend Render URL (for example `https://zakatdost-frontend.onrender.com`)
   - `REACT_APP_BACKEND_URL` = your backend Render URL (for example `https://zakatdost-backend.onrender.com`)
5. Deploy blueprint.

### Backend Web Service
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- Environment variables:
  - `GOLD_API_KEY`
  - `MONGO_URL` (optional)
  - `DB_NAME` (optional, default `zakat`)
  - `CORS_ORIGINS` (set to your frontend domain)

### Frontend Static Site
- Root directory: `frontend`
- Build command: `npm ci && npm run build`
- Publish directory: `build`
- Environment variable:
  - `REACT_APP_BACKEND_URL=https://<your-backend-domain>`

## Notes
- The frontend API base URL is baked at build time via `REACT_APP_BACKEND_URL`.
- This app can run without MongoDB right now (Mongo is optional in current code).
