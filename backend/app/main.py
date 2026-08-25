from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.db.connection import init_db

app = FastAPI(title="Backflow AI API", description="Smart logistics API for empty backhaul matching.", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
