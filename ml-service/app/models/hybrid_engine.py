import random
from typing import List, Dict, Any

def get_collaborative_recommendations(user_id: str, all_movies: List[Dict], exclude_ids: List[int] = [], top_n: int = 10) -> List[Dict]:
    """
    Mock Collaborative Filtering (Matrix Factorization / SVD).
    In a real app, this would use the 'surprise' library or a neural network.
    """
    if not all_movies:
        return []
        
    # Mock: Randomly select movies but assign 'confidence' based on popularity
    # This simulates finding what 'similar users' liked
    potential = [m for m in all_movies if m['id'] not in exclude_ids]
    if not potential:
        return []
        
    shuffled = sorted(potential, key=lambda x: random.random() * x.get('popularity', 50), reverse=True)
    
    recommendations = []
    for m in shuffled[:top_n]:
        movie = m.copy()
        # Confidence score for collaborative filtering
        movie['confidence'] = random.randint(65, 98)
        movie['matchType'] = 'Collaborative'
        recommendations.append(movie)
        
    return recommendations

def get_hybrid_recommendations(content_recs: List[Dict], collab_recs: List[Dict], top_n: int = 10) -> List[Dict]:
    """Merge content and collaborative recommendations into a hybrid list."""
    seen_ids = set()
    hybrid = []
    
    # Alternate between content and collab for variety
    for i in range(max(len(content_recs), len(collab_recs))):
        if i < len(content_recs):
            m = content_recs[i]
            if m['id'] not in seen_ids:
                m['matchScore'] = m.get('matchScore', 70)
                m['confidence'] = int(m['matchScore'])
                hybrid.append(m)
                seen_ids.add(m['id'])
                
        if i < len(collab_recs):
            m = collab_recs[i]
            if m['id'] not in seen_ids:
                hybrid.append(m)
                seen_ids.add(m['id'])
                
        if len(hybrid) >= top_n:
            break
            
    return sorted(hybrid, key=lambda x: x.get('confidence', 0), reverse=True)
