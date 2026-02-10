import os
import asyncpg
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    app.state.db_pool = await asyncpg.create_pool(DATABASE_URL)


@app.on_event("shutdown")
async def shutdown_event():
    await app.state.db_pool.close()


@app.get("/db-health")
async def db_health():
    """
    Simple endpoint to verify that the backend can talk to Neon.
    """
    async with app.state.db_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT 1 AS ok;")
        return {"ok": row["ok"]}

# TESTING OF DATABASE CONNECTION
@app.get("/test/candidates")
async def list_test_candidates():
    """
    Read a few rows from the existing `candidates` table.
    Does not modify any data.
    """
    async with app.state.db_pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT candidate_id, full_name, email, phone, address
            FROM candidates
            ORDER BY candidate_id
            LIMIT 5;
            """
        )

    return [dict(row) for row in rows]


@app.post("/test/candidates")
async def create_test_candidate():
    """
    Insert a new row into the existing `candidates` table to verify writes.
    This uses dummy data and returns the inserted row.
    """
    async with app.state.db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO candidates (full_name, email, phone, address)
            VALUES ($1, $2, $3, $4)
            RETURNING candidate_id, full_name, email, phone, address;
            """,
            "Khawar Mehmood",
            "khawar@gmail.com",
            "0000000000",
            "Lahore, Pakistan",
        )

    return dict(row)

# TILL HERE IS WORKING FINE

@app.get("/candidate/overview")
def candidate_overview():
    return {
        "name": "Ali Khan",
        "phone": "03001234567",
        "email": "ali@example.com",
        "address": "Karachi, Pakistan",
    }
