# Noor Zakat Calculator

Noor Zakat Calculator is a full-stack web app to calculate Zakat using live gold/silver rates (INR), with Nisab threshold support for both gold and silver basis.

## Live Demo

- Frontend: https://zakatnoor.netlify.app/

## Features

- Live gold and silver rates (with cache and fallback)
- Nisab calculation (gold or silver basis)
- Zakat calculation (2.5% on eligible net wealth)
- Asset and liability based calculation flow
- Responsive frontend UI

## Tech Stack

- Frontend: React + CRACO + Tailwind CSS
- Backend: FastAPI + Uvicorn + HTTPX
- Optional DB: MongoDB (not required for current calculation flow)
- Deployment: Render (backend), Netlify (frontend)

## Project Structure

```text
Zakatdost/
  backend/
    server.py
    requirements.txt
    .env
  frontend/
    src/
    package.json
    .env
  render.yaml
  netlify.toml
  docker-compose.yml
  DEPLOYMENT.md
```

## Local Development

### 1) Backend setup

```bash
cd backend
python3 -m venv ../.venv
source ../.venv/bin/activate
pip install -r requirements.txt
python server.py
```

Backend runs on:

`http://localhost:5055`

### 2) Frontend setup

```bash
cd frontend
npm install
npm start
```

Frontend runs on:

`http://localhost:3000` (or next available port)

## Environment Variables

### Backend (`backend/.env`)

```env
MONGO_URL=
DB_NAME=zakat
CORS_ORIGINS=http://localhost:3000
GOLD_API_KEY=your_goldapi_key
PORT=5055
```

### Frontend (`frontend/.env`)

```env
REACT_APP_BACKEND_URL=http://localhost:5055
```

## API Endpoints

Base URL: `/api`

- `GET /api/`  
  Returns API message.

- `GET /api/rates/current`  
  Returns current gold and silver rates.

- `GET /api/nisab/thresholds`  
  Returns Nisab thresholds in INR (gold/silver basis).

- `POST /api/zakat/calculate`  
  Calculates Zakat from assets and liabilities.

Sample request:

```json
{
  "assets": {
    "gold_24k_grams": 0,
    "gold_22k_grams": 0,
    "gold_18k_grams": 0,
    "silver_grams": 0,
    "cash_in_hand": 0,
    "bank_savings": 0,
    "business_inventory": 0,
    "investments": 0,
    "receivables": 0,
    "other_assets": 0
  },
  "liabilities": {
    "short_term_debts": 0,
    "immediate_expenses": 0,
    "other_liabilities": 0
  },
  "nisab_basis": "silver"
}
```

## Deployment

### Backend on Render

- Create Render web service from `backend/`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- Set env vars:
  - `GOLD_API_KEY`
  - `CORS_ORIGINS=https://your-frontend.netlify.app`
  - Optional: `MONGO_URL`, `DB_NAME`

### Frontend on Netlify

- Connect repository
- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `build`
- Set env var:
  - `REACT_APP_BACKEND_URL=https://your-backend.onrender.com`

## Troubleshooting

- White screen in frontend:
  - Check browser console for runtime errors.
  - Ensure Netlify env var `REACT_APP_BACKEND_URL` is correct.
  - Clear cache and redeploy.

- Rates not loading:
  - Verify backend endpoint works: `https://your-backend.onrender.com/api/rates/current`
  - Ensure backend `CORS_ORIGINS` includes exact frontend domain.

- CORS errors:
  - Set `CORS_ORIGINS` to your exact frontend origin, for example:  
    `https://zakatnoor.netlify.app`

## License

For personal and educational use. Add a formal license file if needed for public/open-source distribution.
