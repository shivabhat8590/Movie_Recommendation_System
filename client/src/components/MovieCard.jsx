import { useNavigate } from 'react-router-dom';
import { IMG } from '../services/api';
import './MovieCard.css';

export default function MovieCard({ movie, onClick }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) onClick(movie);
    else navigate(`/movie/${movie.tmdbId || movie.tmdb_id || movie.id}`);
  };

  const id = movie.tmdbId || movie.tmdb_id || movie.id;
  const poster = movie.poster_path || movie.posterPath;
  const title = movie.title;
  const year = String(movie.release_date || movie.releaseDate || '').split('-')[0];
  const rating = movie.vote_average || movie.tmdbRating;
  const matchScore = movie.matchScore;
  const confidence = movie.confidence || matchScore;

  return (
    <div className="movie-card" onClick={handleClick}>
      <div className="movie-card-poster">
        <img
          src={IMG(poster)}
          alt={title}
          loading="lazy"
          onError={(e) => { e.target.src = 'https://placehold.co/300x450/1a1a2e/6c63ff?text=🎬'; }}
        />
        <div className="movie-card-overlay">
          <button className="play-btn">▶ Watch Now</button>
          {confidence && (
            <div className={`match-badge ${confidence > 80 ? 'high' : confidence > 50 ? 'medium' : 'low'}`}>
              {Math.round(confidence)}% Match
            </div>
          )}
          {movie.matchType && (
            <div className="match-type-tag">{movie.matchType}</div>
          )}
        </div>
        {rating > 0 && (
          <div className="rating-badge">⭐ {Number(rating).toFixed(1)}</div>
        )}
        {movie.leavingDate && (
          <div className="leaving-badge">⏳ {movie.leavingDate}</div>
        )}
      </div>
      <div className="movie-card-info">
        <h3 className="movie-card-title" title={title}>{title}</h3>
        <div className="movie-card-meta">
          {year && <span>{year}</span>}
        </div>
      </div>
    </div>
  );
}
