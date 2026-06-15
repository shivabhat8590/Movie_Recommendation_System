import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchTrending, fetchGenres } from '../store/moviesSlice';
import MovieCard from '../components/MovieCard';
import api, { BACKDROP } from '../services/api';
import { isMovieKidFriendly } from '../utils/movieHelpers';
import './Home.css';

export default function Home() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { trending, genres, loading, kidsMode } = useSelector((s) => s.movies);
  const { user } = useSelector((s) => s.auth);

  const [heroIndex, setHeroIndex] = useState(0);
  const [personalized, setPersonalized] = useState([]);
  const [genreMovies, setGenreMovies] = useState({});
  const [adultMovies, setAdultMovies] = useState([]);
  const [childMovies, setChildMovies] = useState([]);
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [leavingMovies, setLeavingMovies] = useState([]);

  // Fetch baseline trending and genres
  useEffect(() => {
    dispatch(fetchTrending());
    dispatch(fetchGenres());
  }, [dispatch]);

  // Fetch all specific sections
  useEffect(() => {
    api.get('/movies/child?limit=24').then(({ data }) => {
      setChildMovies(data.data.movies || []);
    }).catch(() => {});

    api.get('/movies/adult?limit=24').then(({ data }) => {
      setAdultMovies(data.data.movies || []);
    }).catch(() => {});

    api.get('/movies/upcoming').then(({ data }) => {
      setUpcomingMovies(data.data.movies || []);
    }).catch(() => {});

    api.get('/movies/leaving').then(({ data }) => {
      setLeavingMovies(data.data.movies || []);
    }).catch(() => {});
  }, []);

  // Filter trending list if kids mode is enabled
  const activeTrending = kidsMode
    ? trending.filter(isMovieKidFriendly)
    : trending;

  // Select appropriate hero list
  const heroList = activeTrending.length > 0 ? activeTrending : (childMovies.length > 0 ? childMovies : trending);
  const hero = heroList[heroIndex];

  // Rotate hero every 6 seconds
  useEffect(() => {
    if (heroList.length === 0) return;
    const t = setInterval(() => setHeroIndex((i) => (i + 1) % Math.min(heroList.length, 8)), 6000);
    return () => clearInterval(t);
  }, [heroList]);

  // Fetch personalized recs if logged in
  useEffect(() => {
    if (user) {
      api.get('/recommendations/personalized').then(({ data }) => {
        setPersonalized(data.data.recommendations || []);
      }).catch(() => {});
    }
  }, [user]);

  // Fetch genre rows
  useEffect(() => {
    if (genres.length === 0) return;
    const featuredGenres = genres.slice(0, 10);
    featuredGenres.forEach(async (g) => {
      try {
        const { data } = await api.get(`/movies/genre/${g.id}`);
        setGenreMovies((prev) => ({ ...prev, [g.name]: data.data.movies?.slice(0, 18) || [] }));
      } catch {}
    });
  }, [genres]);

  // Filter upcoming & leaving lists in Kids Mode
  const filteredUpcoming = kidsMode
    ? upcomingMovies.filter(isMovieKidFriendly)
    : upcomingMovies;

  const filteredLeaving = kidsMode
    ? leavingMovies.filter(isMovieKidFriendly)
    : leavingMovies;

  return (
    <div className={`home-page ${kidsMode ? 'kids-home' : ''}`}>
      {/* Hero Banner */}
      {hero && (
        <div
          className="hero"
          style={{ backgroundImage: `url(${BACKDROP(hero.backdrop_path || hero.backdropPath)})` }}
        >
          <div className="hero-overlay" />
          <div className="container hero-content page-enter">
            <div className="hero-badges">
              <span className={`badge ${kidsMode ? 'badge-gold' : 'badge-accent'}`}>
                {kidsMode ? '✨ Kids Favorite' : '🔥 Trending Now'}
              </span>
              <span className="badge badge-gold">✨ 1000+ Movies</span>
            </div>
            <h1 className="hero-title">{hero.title}</h1>
            <p className="hero-overview">{hero.overview?.slice(0, 200)}...</p>
            <div className="hero-meta">
              <span>⭐ {(hero.vote_average || hero.tmdbRating)?.toFixed(1)}</span>
              <span>•</span>
              <span>{String(hero.release_date || hero.releaseDate || '').split('-')[0] || hero.releaseYear}</span>
              <span>•</span>
              <span className="badge-accent" style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem' }}>HD</span>
            </div>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => navigate(`/movie/${hero.id || hero.tmdbId}`)}>
                ▶ Watch Now
              </button>
              {!kidsMode && (
                <button className="btn btn-outline" onClick={() => navigate('/mood')}>
                  🎭 Mood Discovery
                </button>
              )}
            </div>
          </div>
          {/* Hero dots */}
          <div className="hero-dots">
            {heroList.slice(0, 8).map((_, i) => (
              <button
                key={i}
                className={`hero-dot ${i === heroIndex ? 'active' : ''}`}
                onClick={() => setHeroIndex(i)}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: hero ? '0' : '40px' }}>
        {/* Playful Kids Mode Welcome Banner */}
        {kidsMode && (
          <div className="container kids-welcome-banner page-enter" style={{ marginBottom: '40px' }}>
            <div className="kids-welcome-inner">
              <span className="kids-welcome-emoji">🎈🍿🎉</span>
              <div>
                <h2 className="kids-welcome-title">Welcome to the Kids Playground!</h2>
                <p className="kids-welcome-subtitle">All your favorite animation, magic, and family adventures in one safe place!</p>
              </div>
            </div>
          </div>
        )}

        {/* Child Friendly Section (Kids & Family Favorites) */}
        {childMovies.length > 0 && (
          <div className="container section kids-section-row page-enter">
            <h2 className="section-title">👶 Kids & Family Favorites</h2>
            <div className="movie-grid">
              {childMovies.slice(0, 12).map((m) => <MovieCard key={m.id || m.tmdbId} movie={m} />)}
            </div>
          </div>
        )}

        {/* Personalized Section */}
        {user && personalized.length > 0 && (
          <div className="container section">
            <h2 className="section-title">{kidsMode ? '✨ Magical Picks For You' : 'Personalized Picks'}</h2>
            <div className="movie-grid">
              {personalized
                .filter(m => !kidsMode || isMovieKidFriendly(m))
                .slice(0, 12)
                .map((m) => <MovieCard key={m.id || m.tmdbId} movie={m} />)}
            </div>
          </div>
        )}

        {/* Trending Section */}
        <div className="container section">
          <h2 className="section-title">{kidsMode ? '⭐ Popular with Kids' : '🔥 Trending This Week'}</h2>
          {loading ? (
            <div className="movie-grid">
              {Array(12).fill(0).map((_, i) => (
                <div key={i} className="skeleton" style={{ aspectRatio: '2/3' }} />
              ))}
            </div>
          ) : (
            <div className="movie-grid">
              {heroList.slice(0, kidsMode ? 12 : 24).map((m) => <MovieCard key={m.id || m.tmdbId} movie={m} />)}
            </div>
          )}
        </div>

        {/* Upcoming Section */}
        {filteredUpcoming.length > 0 && (
          <div className="container section upcoming-section-row page-enter">
            <h2 className="section-title">🚀 {kidsMode ? 'Upcoming Magic & Wonders' : 'Upcoming Blockbusters'}</h2>
            <div className="movie-grid">
              {filteredUpcoming.map((m) => <MovieCard key={m.id || m.tmdbId} movie={m} />)}
            </div>
          </div>
        )}

        {/* Leaving Soon Section */}
        {filteredLeaving.length > 0 && (
          <div className="container section leaving-section-row page-enter">
            <h2 className="section-title">⏳ {kidsMode ? 'Hurry! Leaving Soon' : 'Leaving Streaming Soon'}</h2>
            <div className="movie-grid">
              {filteredLeaving.map((m) => <MovieCard key={m.id || m.tmdbId} movie={m} />)}
            </div>
          </div>
        )}

        {/* Mature/Adult Section - Hidden completely under Kids Mode */}
        {!kidsMode && adultMovies.length > 0 && (
          <div className="container section adult-section-row page-enter">
            <h2 className="section-title">🔞 Mature & Thrilling (Adult)</h2>
            <div className="movie-grid">
              {adultMovies.slice(0, 12).map((m) => <MovieCard key={m.id || m.tmdbId} movie={m} />)}
            </div>
          </div>
        )}

        {/* Indian Cinema Section */}
        {(!kidsMode || heroList.some(m => m.genres?.some(g => (g?.name || g) === 'Bollywood'))) && (
          <div className="container section">
            <h2 className="section-title">{kidsMode ? '🇮🇳 Indian Tales & Wonders' : '🇮🇳 Bollywood & Indian Cinema'}</h2>
            <div className="movie-grid">
              {heroList
                .filter(m => m.genres?.some(g => (g?.name || g) === 'Bollywood'))
                .filter(m => !kidsMode || isMovieKidFriendly(m))
                .slice(0, 12)
                .map(m => <MovieCard key={m.id || m.tmdbId} movie={m} />)
              }
            </div>
          </div>
        )}

        {/* Genre Rows */}
        {Object.entries(genreMovies).map(([genre, movies]) => {
          const isKidGenre = ['Animation', 'Family', 'Fantasy', 'Comedy', 'Adventure'].includes(genre);
          if (kidsMode && !isKidGenre) return null;

          const filteredMovies = movies.filter(
            (m) => !kidsMode || isMovieKidFriendly(m)
          );

          return filteredMovies.length > 0 && (
            <div key={genre} className="container section">
              <h2 className="section-title">{genre}</h2>
              <div className="movie-grid">
                {filteredMovies.slice(0, 12).map((m) => <MovieCard key={m.id || m.tmdbId} movie={m} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
