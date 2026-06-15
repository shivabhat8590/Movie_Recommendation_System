import math
from typing import List, Dict, Any

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import linear_kernel
    import pandas as pd
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


def get_content_based_recommendations(target_ids: List[int], all_movies: List[Dict], exclude_ids: List[int] = [], top_n: int = 10) -> List[Dict]:
    """Get recommendations based on plot similarity."""
    if not all_movies:
        return []

    # If sklearn is available, use it for high-quality TF-IDF
    if SKLEARN_AVAILABLE:
        try:
            df = pd.DataFrame(all_movies)
            df['content'] = df['title'] + " " + df['overview']
            
            tfidf = TfidfVectorizer(stop_words='english')
            tfidf_matrix = tfidf.fit_transform(df['content'])
            
            # Find indices of target movies
            indices = [df.index[df['id'] == tid].tolist()[0] for tid in target_ids if tid in df['id'].values]
            if not indices:
                return []
                
            # Compute average similarity across all target movies
            cosine_sim = linear_kernel(tfidf_matrix[indices], tfidf_matrix).mean(axis=0)
            
            # Get sorted indices
            sim_scores = list(enumerate(cosine_sim))
            sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
            
            recommendations = []
            for idx, score in sim_scores:
                m_id = df.iloc[idx]['id']
                if m_id not in target_ids and m_id not in exclude_ids:
                    movie = df.iloc[idx].to_dict()
                    movie['matchScore'] = float(score) * 100
                    recommendations.append(movie)
                    if len(recommendations) >= top_n:
                        break
            return recommendations
        except Exception as e:
            print(f"  ⚠️  Sklearn recommendation failed: {e}")

    # Pure Python Fallback (Jaccard Similarity on keywords/genres)
    def simple_sim(m1, m2):
        s1 = set(m1.get('overview', '').lower().split()) | set(m1.get('title', '').lower().split())
        s2 = set(m2.get('overview', '').lower().split()) | set(m2.get('title', '').lower().split())
        if not s1 or not s2: return 0
        return len(s1 & s2) / len(s1 | s2)

    targets = [m for m in all_movies if m['id'] in target_ids]
    if not targets: return []

    scored_movies = []
    for m in all_movies:
        if m['id'] in target_ids or m['id'] in exclude_ids: continue
        score = sum(simple_sim(t, m) for t in targets) / len(targets)
        m_copy = m.copy()
        m_copy['matchScore'] = score * 100
        scored_movies.append(m_copy)

    scored_movies.sort(key=lambda x: x['matchScore'], reverse=True)
    return scored_movies[:top_n]
