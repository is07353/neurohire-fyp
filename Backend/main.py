from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/candidate/overview")
def candidate_overview():
    return {
        "name": "Ali Khan",
        "phone": "03001234567",
        "email": "ali@example.com",
        "address": "Karachi, Pakistan"
    }
