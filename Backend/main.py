"""
App entry point. Wire CORS, DB pool, and routers.
"""
import sys
from pathlib import Path

# Ensure Backend is on path so imports work when run as "uvicorn main:app" from Backend/
_backend_dir = Path(__file__).resolve().parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from database import create_pool
from routes import candidate_routes, seed_routes, company_routes, recruiter_routes

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    app.state.db_pool = await create_pool()


@app.get("/health")
def health():
    """Lightweight health check (no DB). Use to verify backend is up."""
    return {"status": "ok"}


@app.get("/health/ready")
async def health_ready(request: Request):
    """Readiness: check DB connection. Slightly slower but confirms DB is reachable."""
    pool = getattr(request.app.state, "db_pool", None)
    if not pool:
        return {"status": "no pool"}, 503
    try:
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
    except Exception:
        return {"status": "db error"}, 503
    return {"status": "ok"}


@app.on_event("shutdown")
async def shutdown_event():
    await app.state.db_pool.close()


app.include_router(candidate_routes.router)
app.include_router(seed_routes.router)
app.include_router(company_routes.router)
app.include_router(recruiter_routes.router)
