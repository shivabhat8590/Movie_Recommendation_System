import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api, { IMG, BACKDROP } from '../services/api';
import { toast } from '../components/Toast';
import MovieCard from '../components/MovieCard';
import './MovieDetail.css';

export default function MovieDetail() {
  const { tmdbId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const kidsMode = useSelector((s) => s.movies.kidsMode);

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inWishlist, setInWishlist] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/movies/${tmdbId}`)
      .then(({ data }) => {
        const m = data.data;
        // Restrict mature titles in Kids Mode
        const isMature = m.adult || (m.genres && m.genres.some(g => ['Horror', 'Thriller', 'Crime'].includes(g?.name || g)));
        const isKidFriendly = m.genres && m.genres.some(g => ['Animation', 'Family'].includes(g?.name || g));
        if (kidsMode && (isMature || !isKidFriendly)) {
          toast.error("Oops! That movie is too mature for Kids Mode! 👶");
          navigate('/');
          return;
        }
        setMovie(m);
        setLoading(false);
      })
      .catch(() => { setLoading(false); navigate('/'); });

    if (user) {
      api.get(`/wishlist/check/${tmdbId}`).then(({ data }) => setInWishlist(data.data.inWishlist)).catch(() => {});
      api.get(`/ratings/check/${tmdbId}`).then(({ data }) => setUserRating(data.data.score)).catch(() => {});
      api.get(`/recommendations/${tmdbId}/explain`).then(({ data }) => setExplanation(data.data.explanation)).catch(() => {});
    }

    window.scrollTo(0, 0);
  }, [tmdbId, user, kidsMode]);

  const toggleWishlist = async () => {
    if (!user) { navigate('/auth'); return; }
    if (wishlistLoading) return;
    
    // Optimistic Update
    const prevInWishlist = inWishlist;
    setInWishlist(!prevInWishlist);
    setWishlistLoading(true);

    try {
      if (prevInWishlist) {
        await api.delete(`/wishlist/${tmdbId}`);
        toast.info('Removed from your wishlist');
      } else {
        await api.post('/wishlist', {
          tmdbId: parseInt(tmdbId),
          title: movie.title,
          posterPath: movie.posterPath,
          backdropPath: movie.backdropPath,
          releaseYear: movie.releaseYear,
          genres: movie.genres?.map((g) => g?.name || g) || [],
          overview: movie.overview,
          tmdbRating: movie.tmdbRating || movie.vote_average,
          runtime: movie.runtime
        });
        toast.success('Added to your wishlist! 💝');
      }
    } catch (err) {
      // Rollback on error
      setInWishlist(prevInWishlist);
      const msg = err.response?.data?.message || 'Failed to update wishlist';
      if (msg.toLowerCase().includes('already in') || msg.toLowerCase().includes('already exists')) {
        setInWishlist(true); // Sync state if it was already there
      } else {
        toast.error(msg);
      }
    } finally {
      setWishlistLoading(false);
    }
  };

  const submitRating = async (score) => {
    if (!user) { navigate('/auth'); return; }
    if (ratingLoading) return;
    
    setRatingLoading(true);
    setUserRating(score);
    try {
      await api.post('/ratings', { tmdbId: parseInt(tmdbId), title: movie.title, score });
      // Also mark as watched automatically when rating
      await api.post('/history', { 
        tmdbId: parseInt(tmdbId), 
        title: movie.title, 
        posterPath: movie.posterPath, 
        genres: movie.genres?.map((g) => g?.name || g) 
      });
      toast.success(`Rated ${score}/10! 🏆 +15 XP`);
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed to save rating'); 
    } finally {
      setRatingLoading(false);
    }
  };

  const removeRating = async () => {
    if (ratingLoading) return;
    setRatingLoading(true);
    try {
      await api.delete(`/ratings/${tmdbId}`);
      setUserRating(0);
      toast.success('Rating removed');
    } catch (err) {
      toast.error('Failed to remove rating');
    } finally {
      setRatingLoading(false);
    }
  };

  const handlePlayTrailer = async () => {
    setShowTrailer(true);
    if (user) {
      try {
        await api.post('/history', {
          tmdbId: parseInt(tmdbId),
          title: movie.title,
          posterPath: movie.posterPath,
          genres: movie.genres?.map((g) => g?.name || g) || [],
          releaseYear: movie.releaseYear
        });
      } catch (err) {
        console.error('Failed to add to watch history:', err);
      }
    }
  };

  if (loading) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" style={{ width: 60, height: 60 }} /></div>;
  if (!movie) return null;

  const posterUrl = movie.posterUrl || IMG(movie.posterPath);
  const backdropUrl = movie.backdropUrl || BACKDROP(movie.backdropPath);

  const UPCOMING_IDS = [1061474, 1003596, 1241982, 911916, 617126, 83533, 1234821, 402431, 414906, 950387];
  const isUpcoming = UPCOMING_IDS.includes(movie.tmdbId) || (movie.status && movie.status.toLowerCase() !== 'released');

  return (
    <div className="detail-page page-enter">
      {/* Backdrop */}
      <div className="detail-backdrop" style={{ backgroundImage: `url(${backdropUrl})` }}>
        <div className="detail-backdrop-overlay" />
      </div>

      <div className="container detail-main">
        {/* Poster + Info */}
        <div className="detail-hero">
          <div className="detail-poster">
            <img 
              src={posterUrl} 
              alt={movie.title} 
              className="detail-poster-img"
              onError={(e) => { 
                e.target.onerror = null; 
                e.target.src = 'https://placehold.co/500x750/1a1a2e/6c63ff?text=🎬+No+Poster'; 
              }}
            />
            {movie.trailerKey && !isUpcoming && (
              <button className="trailer-btn" onClick={handlePlayTrailer}>▶ Play Trailer</button>
            )}
          </div>
          <div className="detail-info">
            <h1 className="detail-title">{movie.title}</h1>
            
            <div className="external-ratings">
              <div className="rating-pill imdb">
                <span className="pill-label">IMDb</span>
                <span className="pill-value">{movie.imdbRating || 'N/A'}</span>
              </div>
              <div className="rating-pill rt">
                <span className="pill-label">Rotten Tomatoes</span>
                <span className="pill-value">{movie.rottenTomatoesRating || 'N/A'}</span>
              </div>
              <div className="rating-pill meta">
                <span className="pill-label">Metacritic</span>
                <span className="pill-value">{movie.metacriticRating || 'N/A'}</span>
              </div>
            </div>

            <div className="detail-meta-list">
              <div className="meta-item"><strong>Year:</strong> {movie.releaseYear}</div>
              <div className="meta-item"><strong>Genres:</strong> {movie.genres?.map(g => g?.name || g).join(', ')}</div>
              <div className="meta-item"><strong>Runtime:</strong> {movie.runtime} min</div>
              <div className="meta-item"><strong>Status:</strong> {movie.status}</div>
              <div className="meta-item"><strong>Director:</strong> {movie.director}</div>
              <div className="meta-item"><strong>Cast:</strong> {movie.cast?.slice(0, 5).map(c => c?.name).join(', ')}</div>
              <div className="meta-item"><strong>Budget:</strong> {movie.budget > 0 ? `$${movie.budget.toLocaleString('en-US')}` : 'N/A'}</div>
              <div className="meta-item"><strong>Revenue:</strong> {movie.revenue > 0 ? `$${movie.revenue.toLocaleString('en-US')}` : 'N/A'}</div>
            </div>

            {/* Streaming Platforms */}
            {movie.streamingPlatforms?.length > 0 && (
              <div className="streaming-section">
                <h3>Available On</h3>
                <div className="platform-list">
                  {movie.streamingPlatforms.map((p, i) => (
                    <a key={i} href={p.link} target="_blank" rel="noopener noreferrer" className="platform-link">
                      <div className={`platform-icon ${p.platform.toLowerCase().replace(' ', '-')}`}>
                        {p.platform}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="detail-synopsis">
              <h3>Storyline</h3>
              <p>{movie.overview}</p>
            </div>

            {/* Actions */}
            <div className="detail-actions">
              <button 
                className={`btn btn-wishlist ${inWishlist ? 'active' : 'btn-primary'}`} 
                onClick={toggleWishlist}
                disabled={wishlistLoading}
              >
                {wishlistLoading ? (
                  <><span className="mini-spinner" /> Processing...</>
                ) : (
                  inWishlist ? '💝 In Your Wishlist' : '🤍 Add to Wishlist'
                )}
              </button>
              {movie.trailerKey && !isUpcoming && (
                <button className="btn btn-outline" onClick={handlePlayTrailer}>🎬 Trailer</button>
              )}
            </div>

            <div className="detail-rating">
              <h3>Rate this movie:</h3>
              <div className="stars">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                  <span
                    key={star}
                    className={`star ${star <= (hoverRating || userRating) ? 'active' : ''} ${ratingLoading ? 'loading' : ''}`}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => submitRating(star)}
                  >
                    ★
                  </span>
                ))}
              </div>
              {userRating > 0 && (
                <div className="user-rating-info">
                  <p className="your-rating">Your rating: {userRating}/10</p>
                  <button className="remove-rating-btn" onClick={removeRating} disabled={ratingLoading}>
                    {ratingLoading ? '...' : 'Remove'}
                  </button>
                </div>
              )}
            </div>

            {/* AI Explanation */}
            {explanation && (
              <div className="ai-explanation">
                <span className="ai-label">🤖 Why you'll love this:</span>
                <p>{explanation}</p>
              </div>
            )}
          </div>
        </div>

        {/* Cast */}
        {movie.cast?.length > 0 && (
          <div className="detail-section">
            <h2 className="section-title">Cast</h2>
            <div className="cast-row">
              {movie.cast.slice(0, 8).map((c) => (
                <div key={c.id} className="cast-card">
                  <img
                    src={c.profilePath ? `https://image.tmdb.org/t/p/w185${c.profilePath}` : 'https://placehold.co/92x138/1a1a2e/white?text=?'}
                    alt={c.name}
                  />
                  <div className="cast-name">{c.name}</div>
                  <div className="cast-character">{c.character}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Similar */}
        {movie.similar?.length > 0 && (
          <div className="detail-section">
            <h2 className="section-title">Similar Movies</h2>
            <div className="movie-grid">
              {movie.similar.slice(0, 12).map((m) => <MovieCard key={m.id} movie={m} />)}
            </div>
          </div>
        )}
      </div>

      {/* Trailer Modal */}
      {showTrailer && (
        <div className="trailer-modal" onClick={() => setShowTrailer(false)}>
          <div className="trailer-wrap" onClick={(e) => e.stopPropagation()}>
            <button className="trailer-close" onClick={() => setShowTrailer(false)}>✕</button>
            {movie.trailerKey ? (
              <iframe
                src={`https://www.youtube.com/embed/${movie.trailerKey}?autoplay=1`}
                title="Trailer" allow="autoplay; encrypted-media" allowFullScreen
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="flex-center" style={{ height: '100%', color: '#fff', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '3rem' }}>🎥</span>
                <p>Trailer not available for this title</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
