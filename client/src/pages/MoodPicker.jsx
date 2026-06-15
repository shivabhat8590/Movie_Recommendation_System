import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';
import MovieCard from '../components/MovieCard';
import { isMovieKidFriendly } from '../utils/movieHelpers';
import './MoodPicker.css';

const MOODS = [
  { key: 'happy', emoji: '😊', label: 'Happy' },
  { key: 'sad', emoji: '😢', label: 'Sad' },
  { key: 'excited', emoji: '🤩', label: 'Excited' },
  { key: 'scared', emoji: '😱', label: 'Scared' },
  { key: 'romantic', emoji: '💕', label: 'Romantic' },
  { key: 'inspired', emoji: '🌟', label: 'Inspired' },
  { key: 'adventurous', emoji: '🗺️', label: 'Adventurous' },
  { key: 'relaxed', emoji: '😌', label: 'Relaxed' },
  { key: 'angry', emoji: '😤', label: 'Angry' },
  { key: 'nostalgic', emoji: '🕰️', label: 'Nostalgic' },
];

const GENRES = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller'];

export default function MoodPicker() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { kidsMode } = useSelector((s) => s.movies);
  const [selected, setSelected] = useState(searchParams.get('mood') || 'happy');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const resultsRef = useRef(null);

  useEffect(() => {
    fetchMood(selected);
  }, [selected]);

  const fetchMood = async (mood) => {
    setLoading(true);
    try {
      // If it's a genre, we might want to fetch by genre instead, 
      // but for now we'll use the mood endpoint which handles fallbacks
      const { data } = await api.get('/recommendations/mood', { params: { mood } });
      setMovies(data.data.recommendations || []);
    } catch { 
      setMovies([]); 
    }
    setLoading(false);
  };

  const handleSelect = (key) => {
    setSelected(key);
    setSearchParams({ mood: key });
    resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="mood-page page-enter">
      <div className="mood-hero">
        <div className="container">
          <div className="mood-hero-content">
            <h1 className="gradient-text">Mood Discovery</h1>
            <p>Tell us how you feel, and we'll find the perfect cinema for your vibe.</p>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Mood Selector Row */}
        <div className="mood-selector-wrap">
          <h2 className="mood-cat-title">Or Pick an Emotion</h2>
          <div className="mood-row-scroll">
            {MOODS.map((m) => (
              <button
                key={m.key}
                className={`mood-bubble ${selected === m.key ? 'active' : ''}`}
                onClick={() => handleSelect(m.key)}
              >
                <span className="bubble-emoji">{m.emoji}</span>
                <span className="bubble-label">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mood-results-area" ref={resultsRef}>
          <div className="results-header">
            <h2 className="results-title">
              {MOODS.find(m => m.key === selected)?.emoji || '🎬'} 
              Showing <span>{selected}</span> movies
            </h2>
          </div>

          {loading ? (
            <div className="movie-grid">
              {Array(10).fill(0).map((_, i) => (
                <div key={i} className="skeleton" style={{ aspectRatio: '2/3', borderRadius: '12px' }} />
              ))}
            </div>
          ) : movies.length > 0 ? (
            <div className="mood-sections">
              {(() => {
                // Filter mature titles in Kids Mode
                const filteredMovies = kidsMode
                  ? movies.filter(isMovieKidFriendly)
                  : movies;

                // Grouping by sub-genre for extra detail
                const groups = {};
                filteredMovies.forEach(m => {
                  const g = m.genres?.[0]?.name || m.genres?.[0] || 'Recommended';
                  if (!groups[g]) groups[g] = [];
                  groups[g].push(m);
                });

                if (filteredMovies.length === 0) {
                  return (
                    <div className="no-results" style={{ padding: '40px 0', textAlign: 'center' }}>
                      <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🎈</div>
                      <h3>No kids-friendly movies for this mood</h3>
                      <p>Try picking a different fun mood to explore safe adventures!</p>
                    </div>
                  );
                }

                return Object.keys(groups).map(groupName => (
                  <div key={groupName} className="mood-section-row">
                    <h3 className="section-subtitle"><span className="dot" /> {groupName}</h3>
                    <div className="movie-grid">
                      {groups[groupName].map(movie => (
                        <MovieCard key={movie.id || movie.tmdbId} movie={movie} />
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : (
            <div className="no-results">
              <div className="empty-icon">🎞️</div>
              <h3>No movies found for this selection</h3>
              <p>Try picking a different mood or genre to explore more.</p>
              <button className="btn btn-outline" onClick={() => handleSelect('happy')}>Back to Happy</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
