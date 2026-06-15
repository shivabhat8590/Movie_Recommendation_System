"""
Data loader: fetches movies from the Node.js API or TMDB directly to build ML model inputs.
"""
import os
import httpx
import asyncio
from typing import List, Dict, Any

_movies_cache: List[Dict[str, Any]] = []

import json

TMDB_BASE = os.getenv("TMDB_BASE_URL", "https://api.themoviedb.org/3")
TMDB_KEY = os.getenv("TMDB_API_KEY", "")

# Path to the mock data generated in the server
SERVER_MOCK_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "server", "src", "data", "mockMovies.json")

def load_static_mock():
    # Try multiple possible paths for the mock data
    possible_paths = [
        SERVER_MOCK_PATH,
        os.path.join(os.getcwd(), "server", "src", "data", "mockMovies.json"),
        os.path.join(os.getcwd(), "..", "server", "src", "data", "mockMovies.json"),
        "../server/src/data/mockMovies.json"
    ]
    
    for path in possible_paths:
        try:
            if os.path.exists(path):
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    print(f"  Successfully loaded {len(data)} movies from {path}")
                    return data
        except Exception as e:
            print(f"  Failed to load from {path}: {e}")
            
    print("  WARNING: All mock paths failed. Using fallback (1 movie).")
    return [
        {
            "id": 27205, "title": "Inception", "overview": "Dreams within dreams.", 
            "genres": [28, 878, 12], "popularity": 100, "vote_average": 8.4, "original_language": "en"
        }
    ]

MOCK_MOVIES = load_static_mock()


async def fetch_tmdb_movies(pages: int = 3) -> List[Dict]:
    if not TMDB_KEY or TMDB_KEY == "your_tmdb_api_key_here":
        return MOCK_MOVIES

    movies = []
    async with httpx.AsyncClient(timeout=15.0) as client:
        for page in range(1, pages + 1):
            try:
                resp = await client.get(
                    f"{TMDB_BASE}/trending/movie/week",
                    params={"api_key": TMDB_KEY, "page": page}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    movies.extend(data.get("results", []))
            except Exception as e:
                print(f"  TMDB fetch page {page}: {e}")
    return movies if movies else MOCK_MOVIES

async def load_movies_cache():
    global _movies_cache
    raw = await fetch_tmdb_movies(pages=5)
    _movies_cache = [
        {
            "id": m.get("id"),
            "title": m.get("title", ""),
            "overview": m.get("overview", ""),
            "genres": m.get("genre_ids", m.get("genres", [])),
            "popularity": m.get("popularity", 0),
            "vote_average": m.get("vote_average", 0),
            "vote_count": m.get("vote_count", 0),
            "poster_path": m.get("poster_path") or m.get("posterPath", ""),
            "backdrop_path": m.get("backdrop_path") or m.get("backdropPath", ""),
            "release_date": m.get("release_date") or m.get("releaseDate", ""),
            "original_language": m.get("original_language") or m.get("language", "en"),
        }
        for m in raw
        if m.get("id") and m.get("title")
    ]
    # Deduplicate
    seen = set()
    unique = []
    for m in _movies_cache:
        if m["id"] not in seen:
            seen.add(m["id"])
            unique.append(m)
    _movies_cache = unique
    print(f"  Loaded {len(_movies_cache)} movies into ML cache")

def get_movies() -> List[Dict]:
    return _movies_cache

