# Backflow AI

Backflow AI is a Smart Logistics platform that matches trucks running an empty
backhaul with shipment demand traveling in the same direction.

## Project structure

- `frontend/` — Next.js web application
- `backend/` — FastAPI service and AI matching engine
- `data/` — synthetic datasets used for development and evaluation
- `docs/` — architecture and product documentation
- `docker/` — application container definitions

## Local development with Docker

1. Copy `.env.example` to `.env` and adjust the values if needed.
2. Run `docker compose up --build`.
3. Open the frontend at http://localhost:3000 and the API docs at
   http://localhost:8000/docs.

## Run without Docker

Backend:

```bash
cd backend
python -m venv .venv
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```
