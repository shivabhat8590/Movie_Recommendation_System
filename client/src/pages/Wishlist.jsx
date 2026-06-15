import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api, { BACKDROP } from '../services/api';
import MovieCard from '../components/MovieCard';
import { toast } from '../components/Toast';
import { isMovieKidFriendly } from '../utils/movieHelpers';
import './Wishlist.css';

export default function Wishlist() {
  const { user } = useSelector((s) => s.auth);
  const kidsMode = useSelector((s) => s.movies.kidsMode);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    api.get('/wishlist').then(({ data }) => {
      setWishlist(data.data.wishlist);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const remove = async (tmdbId) => {
    try {
      await api.delete(`/wishlist/${tmdbId}`);
      setWishlist((prev) => prev.filter((m) => m.tmdbId !== tmdbId));
      toast.success('Removed from wishlist');
    } catch { toast.error('Failed to remove'); }
  };

  const activeWishlist = kidsMode
    ? wishlist.filter(isMovieKidFriendly)
    : wishlist;

  const filtered = activeWishlist.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase());
    const matchesGenre = filter === 'All' || m.genres?.includes(filter);
    return matchesSearch && matchesGenre;
  });

  const allGenres = ['All', ...new Set(activeWishlist.flatMap(m => m.genres || []))].slice(0, 15);

  if (loading) return <div className="flex-center" style={{ height: '80vh' }}><div className="spinner" /></div>;

  const firstMovie = activeWishlist[0];
  const coverUrl = firstMovie?.backdropUrl || (firstMovie ? BACKDROP(firstMovie.backdropPath) : '');

  return (
    <div className={`wishlist-page page-enter ${kidsMode ? 'kids-wishlist' : ''}`}>
      {coverUrl && (
        <div className="wishlist-cover" style={{ backgroundImage: `url(${coverUrl})` }}>
          <div className="wishlist-cover-overlay" />
        </div>
      )}
      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        <div className="wishlist-header">
          <div>
            <h1 className="gradient-text">{kidsMode ? '🎈 My Fun List' : 'My Wishlist'}</h1>
            <span className="badge badge-accent">
              {activeWishlist.length} {kidsMode ? 'fun movies saved' : 'movies saved'}
            </span>
          </div>
          
          <div className="wishlist-controls">
            <input 
              type="text" 
              placeholder="Search in wishlist..." 
              className="wishlist-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="genre-filters">
          {allGenres.map(g => (
            <button 
              key={g} 
              className={`filter-pill ${filter === g ? 'active' : ''}`}
              onClick={() => setFilter(g)}
            >
              {g}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '4rem' }}>{kidsMode ? '🎈' : '🎬'}</div>
            <h2>{search || filter !== 'All' ? 'No matches found' : (kidsMode ? 'Your fun list is empty' : 'Your wishlist is empty')}</h2>
            <p>{kidsMode ? 'Start adding fun movies you want to watch!' : 'Start adding movies you want to watch!'}</p>
          </div>
        ) : (
          <div className="wishlist-grid">
            {filtered.map((m) => (
              <div key={m.tmdbId} className="wishlist-item">
                <MovieCard movie={{
                  ...m, 
                  id: m.tmdbId, 
                  poster_path: m.posterPath, 
                  backdrop_path: m.backdropPath,
                  vote_average: m.tmdbRating
                }} />
                <button className="remove-btn" onClick={() => remove(m.tmdbId)}>
                  <span className="remove-icon">✕</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
