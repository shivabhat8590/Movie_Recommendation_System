"""Mood-to-genre mapping with popularity-based recommendations."""
from typing import List, Dict
import random

MOOD_GENRE_IDS = {
    "happy":       [35, 10402, 16, 10751],   # Comedy, Music, Animation, Family
    "sad":         [18, 10749],               # Drama, Romance
    "excited":     [28, 12, 878, 53],         # Action, Adventure, Sci-Fi, Thriller
    "scared":      [27, 53, 9648],            # Horror, Thriller, Mystery
    "romantic":    [10749, 35, 18],           # Romance, Comedy, Drama
    "inspired":    [99, 36, 18],              # Documentary, History, Drama
    "adventurous": [12, 28, 14, 878],         # Adventure, Action, Fantasy, Sci-Fi
    "relaxed":     [35, 16, 10751, 9648],     # Comedy, Animation, Family, Mystery
    "angry":       [28, 12, 53],              # Action, Adventure, Thriller
    "nostalgic":   [36, 99, 18],             # History, Documentary, Drama
}

GENRE_NAME_TO_ID = {
    "Action": 28, "Adventure": 12, "Animation": 16, "Comedy": 35, "Crime": 80,
    "Documentary": 99, "Drama": 18, "Family": 10751, "Fantasy": 14, "History": 36,
    "Horror": 27, "Music": 10402, "Mystery": 9648, "Romance": 10749, "Sci-Fi": 878,
    "Science Fiction": 878, "TV Movie": 10770, "Thriller": 53, "War": 10752, "Western": 37
}

MOOD_DESCRIPTIONS = {
    "happy":       "Feel-good movies to brighten your day",
    "sad":         "Emotionally rich stories for a reflective evening",
    "excited":     "High-octane thrillers and adventures",
    "scared":      "Spine-chilling horror and mystery",
    "romantic":    "Love stories to warm your heart",
    "inspired":    "Stories that will motivate and move you",
    "adventurous": "Epic quests and grand adventures",
    "relaxed":     "Light, fun movies to unwind with",
    "angry":       "Intense action to channel your energy",
    "nostalgic":   "Timeless classics and historical epics",
}


def get_mood_recommendations(mood: str, all_movies: List[Dict], top_n: int = 20) -> Dict:
    """Return movies matching a mood-based genre filter, sorted by popularity."""
    mood = mood.lower()
    genre_ids = MOOD_GENRE_IDS.get(mood, [35, 28])
    description = MOOD_DESCRIPTIONS.get(mood, "Movies matching your mood")

    # Filter movies that match at least one mood genre
    matched = []
    print(f"Analyzing mood: {mood} (Looking for genres: {genre_ids})")
    print(f"Total movies in cache: {len(all_movies)}")

    for movie in all_movies:
        raw_genres = movie.get("genres", [])
        movie_genre_ids = []
        for g in raw_genres:
            if isinstance(g, dict):
                gid = g.get("id")
                if gid: movie_genre_ids.append(int(gid))
            elif isinstance(g, int):
                movie_genre_ids.append(g)
            elif isinstance(g, str):
                # Try name lookup first, then try numeric string
                if g in GENRE_NAME_TO_ID:
                    movie_genre_ids.append(GENRE_NAME_TO_ID[g])
                else:
                    try:
                        movie_genre_ids.append(int(g))
                    except:
                        pass
        
        movie_genres_set = set(movie_genre_ids)
        overlap = movie_genres_set & set(genre_ids)
        if overlap:
            # Ensure vote_average and popularity are numbers to avoid TypeError
            vote_avg = movie.get("vote_average") or 0
            popularity = movie.get("popularity") or 0
            
            try:
                score = len(overlap) * 30 + float(vote_avg) * 5 + float(popularity) * 0.1
                matched.append({**movie, "matchScore": round(min(score, 99), 1), "mood": mood})
            except (ValueError, TypeError):
                # Fallback score if data is truly malformed
                matched.append({**movie, "matchScore": 50, "mood": mood})

    print(f"Found {len(matched)} matches for {mood}")
    matched.sort(key=lambda x: x["matchScore"], reverse=True)

    # Add some randomness to avoid showing same results every time
    top = matched[:top_n * 2]
    if len(top) > top_n:
        top = random.sample(top, top_n)
        top.sort(key=lambda x: x["matchScore"], reverse=True)

    return {
        "mood": mood,
        "description": description,
        "genre_ids": genre_ids,
        "recommendations": top[:top_n],
    }


def get_available_moods() -> List[str]:
    return list(MOOD_GENRE_IDS.keys())
