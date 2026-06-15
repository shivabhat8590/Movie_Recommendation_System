import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import api from '../services/api';
import MovieCard from '../components/MovieCard';
import './Dashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function Dashboard() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [tab, setTab] = useState('history');
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);

  const fetchDailyActivity = async (dayName) => {
    setLoadingDay(true);
    setShowModal(true);
    try {
      const { data } = await api.get(`/history/stats/day/${dayName}`);
      setSelectedDayData(data.data);
    } catch (err) {
      console.error(err);
      alert('Failed to load daily activity details');
      setShowModal(false);
    } finally {
      setLoadingDay(false);
    }
  };

  useEffect(() => {
    api.get('/history/stats').then(({ data }) => setStats(data.data)).catch(() => { });
    api.get('/history').then(({ data }) => setHistory(data.data.history || [])).catch(() => { });
    api.get('/ratings/my').then(({ data }) => setRatings(data.data.ratings || [])).catch(() => { });
  }, []);

  const removeRating = async (tmdbId) => {
    try {
      await api.delete(`/ratings/${tmdbId}`);
      setRatings((prev) => prev.filter((r) => r.tmdbId !== tmdbId));
    } catch {
      alert('Failed to remove rating');
    }
  };

  const removeHistory = async (tmdbId) => {
    try {
      await api.delete(`/history/${tmdbId}`);
      setHistory((prev) => prev.filter((m) => m.tmdbId !== tmdbId));
      if (stats) {
        setStats(prev => ({
          ...prev,
          totalWatched: Math.max(0, prev.totalWatched - 1)
        }));
      }
    } catch {
      alert('Failed to remove from watch history');
    }
  };

  const statCards = [
    { label: 'Movies Watched', value: stats?.totalWatched ?? user?.watchedCount ?? 0, icon: '🎬' },
    { label: 'Total Ratings', value: stats?.totalRatings ?? user?.totalRatings ?? 0, icon: '⭐' },
    { label: 'Points Earned', value: stats?.totalPoints ?? user?.points ?? 0, icon: '🏆' },
    { label: 'Top Genre', value: stats?.topGenres?.[0]?.genre || '—', icon: '🎭' },
  ];

  return (
    <div className="dashboard-page page-enter">
      <div className="container">
        {/* Profile Header */}
        <div className="dash-profile glass">
          <div className="dash-avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div className="dash-user-info">
            <h1 className="dash-name">{user?.name}</h1>
            <p className="dash-email">{user?.email}</p>
            <div className="dash-badges">
              {user?.role === 'admin' && <span className="badge badge-accent">Admin</span>}
              <span className="badge badge-gold">🏆 {user?.points || 0} pts</span>
            </div>
          </div>
          <button className="btn btn-outline" style={{ marginLeft: 'auto' }} onClick={() => { dispatch(logout()); navigate('/'); }}>
            Logout
          </button>
        </div>

        {/* Stats */}
        <div className="dash-stats">
          {statCards.map((s) => {
            const isLongText = typeof s.value === 'string' && s.value.length > 8;
            const customFontSize = isLongText ? (s.value.length > 12 ? '1.25rem' : '1.45rem') : '2rem';
            return (
              <div key={s.label} className="stat-card glass">
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-value" style={{ fontSize: customFontSize }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Weekly Taste Insight */}
        {stats?.insight && (
          <div className="dash-insight-card glass" style={{ marginBottom: '32px', padding: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ fontSize: '2.2rem' }}>💡</div>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontFamily: 'Outfit, sans-serif', fontSize: '1.1rem', fontWeight: '700', color: 'var(--accent)' }}>
                  Weekly Taste Insight
                </h3>
                <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                  {stats.insight}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Section */}
        <div className="dash-section dash-analytics-row">
          <div className="dash-chart-card glass">
            <h2 className="section-title">Genre Distribution</h2>
            {stats?.topGenres?.length > 0 ? (
              <div style={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
                <Doughnut
                  data={{
                    labels: stats.topGenres.map(g => g.genre),
                    datasets: [{
                      data: stats.topGenres.map(g => g.count),
                      backgroundColor: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444'],
                      borderWidth: 0
                    }]
                  }}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } }
                  }}
                />
              </div>
            ) : <p className="empty-msg">Watch more movies to see analytics!</p>}
          </div>

          <div className="dash-chart-card glass">
            <h2 className="section-title">Weekly Engagement</h2>
            <div style={{ height: '300px' }}>
              <Bar
                data={{
                  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                  datasets: [{
                    label: 'Watch Activity',
                    data: stats?.weeklyActivity || [0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: '#6366f1'
                  }]
                }}
                 options={{
                  maintainAspectRatio: false,
                  onClick: (event, elements) => {
                    if (elements && elements.length > 0) {
                      const index = elements[0].index;
                      const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][index];
                      fetchDailyActivity(dayName);
                    }
                  },
                  scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                  },
                  plugins: { legend: { display: false } }
                }}
              />
            </div>
          </div>
        </div>


        {/* Tabs */}
        <div className="dash-tabs">
          <button className={`dash-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            🎬 Watch History ({history.length})
          </button>
          <button className={`dash-tab ${tab === 'ratings' ? 'active' : ''}`} onClick={() => setTab('ratings')}>
            ⭐ My Ratings ({ratings.length})
          </button>
        </div>

        {tab === 'history' && (
          history.length > 0 ? (
            <div className="movie-grid">
              {history.map((m) => (
                <div key={m.tmdbId} className="history-item">
                  <MovieCard movie={{ ...m, id: m.tmdbId, poster_path: m.posterPath }} />
                  <button className="remove-btn" onClick={() => removeHistory(m.tmdbId)}>
                    <span className="remove-icon">✕</span>
                  </button>
                </div>
              ))}
            </div>
          ) : <div className="empty-tab">No movies watched yet. Start exploring!</div>
        )}

        {tab === 'ratings' && (
          ratings.length > 0 ? (
            <div className="ratings-list">
              {ratings.map((r) => (
                <div key={r._id} className="rating-row glass">
                  <div className="rating-movie-title">{r.movieTitle || `Movie #${r.tmdbId}`}</div>
                  <div className="rating-score">⭐ {r.score}/10</div>
                  <div className="rating-date">{new Date(r.createdAt).toLocaleDateString()}</div>
                  <button className="remove-rating-dash" onClick={() => removeRating(r.tmdbId)}>✕</button>
                </div>
              ))}
            </div>
          ) : <div className="empty-tab">No ratings yet. Rate movies to see them here!</div>
        )}
      </div>

      {/* Daily Activity Detail Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content glass page-enter" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            {loadingDay ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
                <span className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading daily activity...</p>
              </div>
            ) : selectedDayData ? (
              <div>
                <h2 className="modal-title" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.8rem', marginBottom: '8px', color: '#fff' }}>
                  {selectedDayData.day} Activity Detail
                </h2>
                
                <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Summary</h4>
                  <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                    {selectedDayData.summary}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--accent)', fontWeight: '700', fontFamily: 'Outfit, sans-serif' }}>Activities</h4>
                    <ul style={{ paddingLeft: 0, margin: 0, fontSize: '0.92rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '10px', listStyleType: 'none' }}>
                      <li>• <strong>Viewed:</strong> {selectedDayData.viewed.length > 0 ? selectedDayData.viewed.join(', ') : 'None'}</li>
                      <li>• <strong>Added to Watchlist:</strong> {selectedDayData.addedToWatchlist.length > 0 ? selectedDayData.addedToWatchlist.join(', ') : 'None'}</li>
                      <li>• <strong>Rated:</strong> {selectedDayData.rated.length > 0 ? selectedDayData.rated.join(', ') : 'None'}</li>
                      <li>• <strong>Searched For:</strong> {selectedDayData.searchedFor.length > 0 ? selectedDayData.searchedFor.join(', ') : 'None'}</li>
                      <li>• <strong>AI Assistant Queries:</strong> {selectedDayData.aiAssistantQueries.length > 0 ? selectedDayData.aiAssistantQueries.map(q => `"${q}"`).join(', ') : 'None'}</li>
                    </ul>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--accent)', fontWeight: '700', fontFamily: 'Outfit, sans-serif' }}>Insights</h4>
                    <ul style={{ paddingLeft: 0, margin: 0, fontSize: '0.92rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '10px', listStyleType: 'none' }}>
                      <li>• <strong>Favorite Genre:</strong> {selectedDayData.favoriteGenre}</li>
                      <li>• <strong>Most Interacted Movie:</strong> {selectedDayData.mostInteractedMovie}</li>
                      <li>• <strong>Engagement Level:</strong> {selectedDayData.engagementLevel}</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No day data loaded</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
