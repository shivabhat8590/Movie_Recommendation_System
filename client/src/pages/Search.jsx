import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { searchMovies } from '../store/moviesSlice';
import MovieCard from '../components/MovieCard';
import { isMovieKidFriendly } from '../utils/movieHelpers';
import api from '../services/api';
import './Search.css';

export default function Search() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { searchResults, searchLoading, searchQuery, kidsMode } = useSelector((s) => s.movies);
  const [input, setInput] = useState(searchParams.get('q') || '');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      dispatch(searchMovies({ q }));
      api.post('/activities/log', { activityType: 'search_perform', metadata: { searchQuery: q } }).catch(() => {});
    }
  }, [searchParams.get('q')]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (input.trim()) setSearchParams({ q: input.trim() });
  };

  const filteredResults = kidsMode
    ? (searchResults || []).filter(isMovieKidFriendly)
    : searchResults;

  return (
    <div className={`search-page page-enter ${kidsMode ? 'kids-search' : ''}`}>
      <div className="container">
        <h1 className="search-heading gradient-text">{kidsMode ? '🎈 Search Fun Movies' : 'Search Movies'}</h1>
        <form className="search-bar-form" onSubmit={handleSearch}>
          <div className="search-bar-wrap">
            <span>🔍</span>
            <input
              className="search-bar-input"
              placeholder={kidsMode ? "Type name, animation, fun..." : "Search by title, genre, or actor..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
            />
          </div>
          <button className="btn btn-primary" type="submit">Search</button>
        </form>

        {searchLoading && (
          <div className="movie-grid">
            {Array(12).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '2/3' }} />)}
          </div>
        )}

        {!searchLoading && searchQuery && (
          <>
            <p className="search-count">
              {filteredResults?.length || 0} results for "<strong>{searchQuery}</strong>"
            </p>
            {filteredResults?.length > 0 ? (
              <div className="movie-grid">
                {filteredResults.map((m) => <MovieCard key={m.id || m.tmdbId} movie={m} />)}
              </div>
            ) : (
              <div className="no-results">
                <div style={{ fontSize: '3rem' }}>🍿</div>
                <p>No safe movies found for "{searchQuery}"</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Try searching something else like "Poppins" or "Spider-Man"</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
