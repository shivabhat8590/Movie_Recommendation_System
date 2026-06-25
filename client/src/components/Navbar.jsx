import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { searchMovies, clearSearch, toggleKidsMode } from '../store/moviesSlice';
import { IMG } from '../services/api';
import { isMovieKidFriendly } from '../utils/movieHelpers';
import './Navbar.css';

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((s) => s.auth);
  const { searchResults, searchLoading, kidsMode } = useSelector((s) => s.movies);

  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);
  const userMenuRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (val.trim().length < 2) { dispatch(clearSearch()); setShowResults(false); return; }
    debounceRef.current = setTimeout(() => {
      dispatch(searchMovies({ q: val.trim() }));
      setShowResults(true);
    }, 400);
  };

  const handleResultClick = (id) => {
    setQuery('');
    setShowResults(false);
    dispatch(clearSearch());
    navigate(`/movie/${id}`);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''} ${kidsMode ? 'kids-navbar' : ''}`}>
      <div className="container navbar-inner">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">{kidsMode ? '🎈' : '🎬'}</span>
          <span className={`logo-text ${kidsMode ? 'kids-logo' : 'gradient-text'}`}>
            {kidsMode ? 'KidsAI' : 'MovieAI'}
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="navbar-links">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Link>
          <Link to="/search" className={location.pathname === '/search' ? 'active' : ''}>Search</Link>
          <Link to="/mood" className={location.pathname === '/mood' ? 'active' : ''}>{kidsMode ? 'Fun Moods' : 'Mood'}</Link>
          {user && <Link to="/wishlist" className={location.pathname === '/wishlist' ? 'active' : ''}>Wishlist</Link>}
          {user && <Link to="/chatbot" className={location.pathname === '/chatbot' ? 'active' : ''}>{kidsMode ? 'KidsAI Chat 🧸' : 'AI Chat'}</Link>}
          {user?.role === 'admin' && !kidsMode && <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>Admin Panel</Link>}
        </div>

        {/* Search */}
        <div className="navbar-search" ref={searchRef}>
          <form className="search-input-wrap" onSubmit={(e) => { e.preventDefault(); if (query.trim()) { navigate(`/search?q=${encodeURIComponent(query.trim())}`); setShowResults(false); } }}>
            <button type="submit" className="search-icon-btn">🔍</button>
            <input
              className="search-input"
              placeholder={kidsMode ? "Find fun movies..." : "Search movies..."}
              value={query}
              onChange={handleSearch}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
            />
          </form>
          {showResults && searchResults?.length > 0 && (
            <div className="search-dropdown">
              {searchResults
                .filter(m => !kidsMode || isMovieKidFriendly(m))
                .slice(0, 7)
                .map((m) => (
                  <div key={m.id || m.tmdbId} className="search-result-item" onClick={() => handleResultClick(m.id || m.tmdbId)}>
                    <img
                      src={IMG(m.poster_path || m.posterPath, 'w92')}
                      alt={m.title}
                    />
                    <div>
                      <div className="result-title">{m.title}</div>
                      <div className="result-year">{String(m.release_date || m.releaseDate || '').split('-')[0] || m.releaseYear || 'N/A'} · ⭐ {Number(m.vote_average || m.tmdbRating || 0).toFixed(1)}</div>
                    </div>
                  </div>
                ))}
              <div className="search-footer" onClick={() => { navigate(`/search?q=${encodeURIComponent(query)}`); setShowResults(false); }}>
                See all results for "<strong>{query}</strong>" →
              </div>
            </div>
          )}
        </div>

        {/* Kids Mode Toggle */}
        <div className="kids-toggle-container">
          <button
            onClick={() => dispatch(toggleKidsMode())}
            className={`kids-toggle-btn ${kidsMode ? 'active' : ''}`}
            title={kidsMode ? "Switch to Normal Mode" : "Switch to Kids Mode"}
          >
            <span className="toggle-emoji">{kidsMode ? '👶' : '🎬'}</span>
            <span className="toggle-text">{kidsMode ? 'Kids Mode' : 'Adult Mode'}</span>
          </button>
        </div>

        {/* Auth */}
        <div className="navbar-auth">
          {user ? (
            <div className="user-menu" ref={userMenuRef}>
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)} 
                className="user-avatar-btn"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none' }}
              >
                <div className="user-avatar">{user.name?.[0]?.toUpperCase()}</div>
              </button>
              {dropdownOpen && (
                <div className="user-dropdown show">
                  <Link to="/dashboard" onClick={() => setDropdownOpen(false)}>Dashboard</Link>
                  {user?.role === 'admin' && !kidsMode && (
                    <>
                      <Link to="/admin" onClick={() => setDropdownOpen(false)}>Admin Panel</Link>
                      <Link to="/admin/credentials" onClick={() => setDropdownOpen(false)}>Admin Credentials</Link>
                    </>
                  )}
                  <button onClick={() => { handleLogout(); setDropdownOpen(false); }}>Logout</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/auth" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>Sign In</Link>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button className="mobile-toggle" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="mobile-menu">
          <Link to="/">Home</Link>
          <Link to="/search">Search</Link>
          <Link to="/mood">{kidsMode ? 'Fun Moods' : 'Mood Picker'}</Link>
          {user && <Link to="/wishlist">Wishlist</Link>}
          {user && !kidsMode && <Link to="/chatbot">AI Chat</Link>}
          {user && <Link to="/dashboard">Dashboard</Link>}
          {user?.role === 'admin' && !kidsMode && (
            <>
              <Link to="/admin">Admin Panel</Link>
              <Link to="/admin/credentials">Admin Credentials</Link>
            </>
          )}
          
          {/* Kids Mode Toggle in Mobile */}
          <div className="mobile-kids-toggle-wrap" style={{ padding: '10px 0' }}>
            <button
              onClick={() => dispatch(toggleKidsMode())}
              className={`kids-toggle-btn ${kidsMode ? 'active' : ''}`}
              style={{ width: '100%', justifyContext: 'center' }}
            >
              <span>{kidsMode ? '👶 Kids Mode: ON' : '🎬 Kids Mode: OFF'}</span>
            </button>
          </div>
          
          {user ? <button onClick={handleLogout}>Logout</button> : <Link to="/auth">Sign In</Link>}
        </div>
      )}
    </nav>
  );
}
