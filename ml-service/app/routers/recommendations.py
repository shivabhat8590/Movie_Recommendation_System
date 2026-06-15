from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from app.utils.data_loader import get_movies
from app.models.content_based import get_content_based_recommendations
from app.models.mood_analyzer import get_mood_recommendations, get_available_moods
from app.models.hybrid import get_hybrid_recommendations

router = APIRouter()


class PersonalizedRequest(BaseModel):
    user_id: str
    watched_ids: List[int] = []
    highly_rated_ids: List[int] = []
    preferences: Dict[str, Any] = {}


class MoodRequest(BaseModel):
    mood: str
    genre_ids: List[int] = []


@router.post("/personalized")
async def personalized(req: PersonalizedRequest):
    movies = get_movies()
    if not movies:
        return {"recommendations": [], "source": "no_data"}

    recs = get_hybrid_recommendations(
        liked_ids=req.highly_rated_ids,
        watched_ids=req.watched_ids,
        all_movies=movies,
        preferences=req.preferences,
        top_n=20,
    )
    return {"recommendations": recs, "source": "hybrid", "count": len(recs)}


@router.post("/mood")
async def mood_based(req: MoodRequest):
    movies = get_movies()
    if not movies:
        return {"mood": req.mood, "recommendations": [], "source": "no_data"}

    result = get_mood_recommendations(req.mood, movies, top_n=20)
    result["source"] = "mood_analyzer"
    return result


@router.get("/similar/{tmdb_id}")
async def similar(tmdb_id: int, top_n: int = 20):
    movies = get_movies()
    if not movies:
        return {"tmdb_id": tmdb_id, "recommendations": []}

    recs = get_content_based_recommendations(
        target_ids=[tmdb_id],
        all_movies=movies,
        exclude_ids=[tmdb_id],
        top_n=top_n,
    )
    return {"tmdb_id": tmdb_id, "recommendations": recs, "count": len(recs)}


@router.get("/moods")
async def list_moods():
    return {"moods": get_available_moods()}


@router.get("/status")
async def status():
    movies = get_movies()
    return {"movie_count": len(movies), "models": ["content_based", "mood_analyzer", "hybrid"]}
