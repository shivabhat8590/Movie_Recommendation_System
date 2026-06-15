from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.routers import recommendations
from app.utils.data_loader import load_movies_cache

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load movie data on startup."""
    print("\nML Service starting up...")
    try:
        await load_movies_cache()
        print("Movie data loaded into memory")
    except Exception as e:
        print(f"Could not pre-load movie data: {e}")
    yield
    print("ML Service shutting down")

app = FastAPI(
    title="MovieAI ML Service",
    description="Machine Learning recommendation engine for the Movie Recommendation System",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recommendations.router, prefix="/recommendations", tags=["Recommendations"])

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ml-service"}

@app.get("/")
async def root():
    return {"message": "MovieAI ML Service is running", "docs": "/docs"}
