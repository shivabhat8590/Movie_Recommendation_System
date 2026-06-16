import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from '../components/Toast';
import './UserReport.css';

export default function UserReport() {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [banLoading, setBanLoading] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [userId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/users/${userId}/report`);
      setReport(data.data);
    } catch (err) {
      toast.error('Failed to load user activity report');
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!report?.user || banLoading) return;
    setBanLoading(true);
    try {
      const newStatus = !report.user.isActive;
      await api.patch(`/admin/users/${report.user._id}`, { isActive: newStatus });
      toast.success(newStatus ? 'User activated successfully' : 'User banned successfully');
      setReport(prev => ({
        ...prev,
        user: { ...prev.user, isActive: newStatus }
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user status');
    } finally {
      setBanLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="report-loading-container">
        <div className="spinner" />
        <p>Analyzing user historical logs & generating AI insights...</p>
      </div>
    );
  }

  if (!report) return null;

  const { user, summary, weekly, genreAnalysis, aiInsights, activities } = report;

  // Filter activities
  const filteredActivities = activities.filter(act => {
    if (activeTab === 'all') return true;
    if (activeTab === 'views') return act.activityType === 'movie_view';
    if (activeTab === 'clicks') return act.activityType === 'movie_click';
    if (activeTab === 'watchlist') return act.activityType === 'watchlist_add' || act.activityType === 'watchlist_remove';
    if (activeTab === 'ratings') return act.activityType === 'rating_submit' || act.activityType === 'review_post';
    if (activeTab === 'chatbot') return act.activityType === 'chatbot_conversation';
    if (activeTab === 'searches') return act.activityType === 'search_perform';
    return true;
  });

  // Calculate SVG weekly engagement values
  const maxWeeklyCount = Math.max(...weekly.activitiesPerDay.map(d => d.count), 1);
  const chartHeight = 160;
  const chartWidth = 500;
  const barWidth = 40;
  const barGap = 24;

  const getActivityIcon = (type) => {
    switch (type) {
      case 'movie_view': return '👁️';
      case 'movie_click': return '🖱️';
      case 'watchlist_add': return '➕';
      case 'watchlist_remove': return '➖';
      case 'rating_submit': return '⭐';
      case 'review_post': return '✍️';
      case 'search_perform': return '🔍';
      case 'chatbot_conversation': return '🤖';
      default: return '📝';
    }
  };

  const getActivityTitle = (act) => {
    const title = act.metadata?.movieTitle || 'Movie';
    switch (act.activityType) {
      case 'movie_view': return `Viewed movie: "${title}"`;
      case 'movie_click': return `Clicked movie: "${title}"`;
      case 'watchlist_add': return `Added "${title}" to watchlist`;
      case 'watchlist_remove': return `Removed "${title}" from watchlist`;
      case 'rating_submit': return `Rated "${title}" a ${act.metadata.score}/10`;
      case 'review_post': return `Posted a review for "${title}"`;
      case 'search_perform': return `Searched for: "${act.metadata.searchQuery}"`;
      case 'chatbot_conversation': return `Asked chatbot: "${act.metadata.chatMessage}"`;
      default: return 'User Action';
    }
  };

  return (
    <div className="user-report-page page-enter">
      <div className="container">
        
        {/* Back and title */}
        <div className="report-header-nav">
          <button className="back-btn" onClick={() => navigate('/admin')}>
            ← Back to Admin Panel
          </button>
          <div className="report-badge">Intelligence Report</div>
        </div>

        {/* Profile Card */}
        <div className="report-user-card glass">
          <div className="user-card-info">
            <div className="user-avatar-large">{user.name[0]}</div>
            <div className="user-meta-details">
              <h1>{user.name}</h1>
              <p className="user-email">{user.email}</p>
              <div className="user-badges">
                <span className={`role-tag ${user.role}`}>{user.role}</span>
                {user.isSuperAdmin && <span className="role-tag superadmin">Super Admin</span>}
                <span className={`status-tag ${user.isActive ? 'active' : 'banned'}`}>
                  {user.isActive ? 'Active' : 'Banned'}
                </span>
              </div>
            </div>
          </div>
          <div className="user-dates-actions">
            <div className="user-dates-grid">
              <div className="date-item">
                <span className="date-label">Registration Date</span>
                <span className="date-value">{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="date-item">
                <span className="date-label">Last Login</span>
                <span className="date-value">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>
            {!user.isSuperAdmin && (
              <button 
                className={`ban-toggle-btn ${user.isActive ? 'ban' : 'unban'}`}
                onClick={handleToggleActive}
                disabled={banLoading}
              >
                {banLoading ? 'Saving...' : user.isActive ? 'Ban Account' : 'Unban Account'}
              </button>
            )}
          </div>
        </div>

        {/* Summary Grid */}
        <div className="report-metrics-grid">
          <div className="metric-card glass">
            <span className="m-icon">👁️</span>
            <div className="m-info">
              <h3>Total Views</h3>
              <p className="m-value">{summary.totalViews}</p>
            </div>
          </div>
          <div className="metric-card glass">
            <span className="m-icon">🖱️</span>
            <div className="m-info">
              <h3>Clicks</h3>
              <p className="m-value">{summary.totalClicks}</p>
            </div>
          </div>
          <div className="metric-card glass">
            <span className="m-icon">💝</span>
            <div className="m-info">
              <h3>Watchlist</h3>
              <p className="m-value">{summary.totalWatchlistAdds}</p>
            </div>
          </div>
          <div className="metric-card glass">
            <span className="m-icon">⭐</span>
            <div className="m-info">
              <h3>Ratings</h3>
              <p className="m-value">{summary.totalRatings}</p>
            </div>
          </div>
          <div className="metric-card glass">
            <span className="m-icon">🤖</span>
            <div className="m-info">
              <h3>AI Chat Chats</h3>
              <p className="m-value">{summary.totalChatbot}</p>
            </div>
          </div>
        </div>

        {/* Extra Summary Insights */}
        <div className="metric-favorites-grid">
          <div className="fav-card glass">
            <span className="fav-icon">🎬</span>
            <div className="fav-content">
              <h4>Most Viewed Movie</h4>
              <p className="fav-val">{summary.mostViewedMovie}</p>
            </div>
          </div>
          <div className="fav-card glass">
            <span className="fav-icon">🍿</span>
            <div className="fav-content">
              <h4>Most Watched Genre</h4>
              <p className="fav-val">{summary.mostWatchedGenre}</p>
            </div>
          </div>
        </div>

        {/* AI Insights Container */}
        <div className="ai-insights-container glass">
          <div className="ai-insights-header">
            <div className="ai-title-wrap">
              <span className="ai-insights-icon">✨</span>
              <h2>AI Behavioral Assessment</h2>
            </div>
            <span className="ai-badge">Gemini AI</span>
          </div>
          <div className="ai-insights-body">
            <p className="ai-text">{aiInsights}</p>
          </div>
        </div>

        {/* Weekly & Genre Analysis */}
        <div className="report-double-columns">
          
          {/* Weekly Engagement */}
          <div className="analysis-card glass">
            <h3>Weekly Engagement Analysis</h3>
            
            <div className="analysis-summary-row">
              <div className="a-sub-item">
                <span className="a-label">Most Active Day</span>
                <span className="a-val accent-blue">{weekly.mostActiveDay}</span>
              </div>
              <div className="a-sub-item">
                <span className="a-label">Favorite Genre This Week</span>
                <span className="a-val accent-purple">{weekly.favoriteGenreThisWeek}</span>
              </div>
              <div className="a-sub-item">
                <span className="a-label">Weekly Engagement Trend</span>
                <span className={`a-val trend-badge ${weekly.weeklyEngagementTrend.toLowerCase()}`}>
                  {weekly.weeklyEngagementTrend}
                </span>
              </div>
            </div>

            {/* Custom SVG Bar Chart */}
            <div className="chart-wrapper">
              <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
                {weekly.activitiesPerDay.map((d, index) => {
                  const barHeight = (d.count / maxWeeklyCount) * 110;
                  const x = index * (barWidth + barGap) + 40;
                  const y = chartHeight - barHeight - 30;
                  return (
                    <g key={d.day} className="chart-bar-group">
                      {/* Bar Background Glow */}
                      <rect 
                        x={x} 
                        y={y} 
                        width={barWidth} 
                        height={barHeight} 
                        rx="4" 
                        fill="url(#barGlow)" 
                        opacity="0.15" 
                      />
                      {/* Actual Bar */}
                      <rect 
                        x={x} 
                        y={y} 
                        width={barWidth} 
                        height={barHeight} 
                        rx="4" 
                        fill="url(#barGradient)" 
                        className="chart-rect"
                      />
                      {/* Value Text */}
                      <text 
                        x={x + barWidth/2} 
                        y={y - 8} 
                        textAnchor="middle" 
                        className="chart-value-text"
                      >
                        {d.count}
                      </text>
                      {/* Day Label */}
                      <text 
                        x={x + barWidth/2} 
                        y={chartHeight - 10} 
                        textAnchor="middle" 
                        className="chart-label-text"
                      >
                        {d.day}
                      </text>
                    </g>
                  );
                })}
                {/* Gradients definition */}
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                  <linearGradient id="barGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Genre Analysis */}
          <div className="analysis-card glass">
            <h3>Genre Analysis</h3>
            
            <div className="analysis-summary-row">
              <div className="a-sub-item">
                <span className="a-label">Most Engaged Genre</span>
                <span className="a-val accent-pink">{genreAnalysis.mostEngagedGenre}</span>
              </div>
              <div className="a-sub-item">
                <span className="a-label">Target Recommendations</span>
                <div className="rec-pills">
                  {genreAnalysis.recommendationPreferences.map((pref, i) => (
                    <span key={i} className="rec-pill">{pref}</span>
                  ))}
                  {genreAnalysis.recommendationPreferences.length === 0 && <span className="rec-pill-none">—</span>}
                </div>
              </div>
            </div>

            {/* Distribution progress bars */}
            <div className="genre-bars-list">
              {genreAnalysis.distribution.slice(0, 4).map((item) => (
                <div key={item.genre} className="genre-bar-item">
                  <div className="genre-bar-meta">
                    <span className="genre-name">{item.genre}</span>
                    <span className="genre-count">{item.count} items ({item.percentage}%)</span>
                  </div>
                  <div className="progress-bg">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
              {genreAnalysis.distribution.length === 0 && (
                <div className="no-genres-message">No genre interaction logs found for this user yet.</div>
              )}
            </div>
          </div>

        </div>

        {/* Timeline Activities */}
        <div className="report-timeline-container glass">
          <div className="timeline-header">
            <h3>Detailed Activity Log</h3>
            
            {/* Filters */}
            <div className="timeline-filters">
              <button className={`filter-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All</button>
              <button className={`filter-btn ${activeTab === 'views' ? 'active' : ''}`} onClick={() => setActiveTab('views')}>Views</button>
              <button className={`filter-btn ${activeTab === 'clicks' ? 'active' : ''}`} onClick={() => setActiveTab('clicks')}>Clicks</button>
              <button className={`filter-btn ${activeTab === 'watchlist' ? 'active' : ''}`} onClick={() => setActiveTab('watchlist')}>Watchlist</button>
              <button className={`filter-btn ${activeTab === 'ratings' ? 'active' : ''}`} onClick={() => setActiveTab('ratings')}>Ratings</button>
              <button className={`filter-btn ${activeTab === 'chatbot' ? 'active' : ''}`} onClick={() => setActiveTab('chatbot')}>Chatbot</button>
              <button className={`filter-btn ${activeTab === 'searches' ? 'active' : ''}`} onClick={() => setActiveTab('searches')}>Searches</button>
            </div>
          </div>

          <div className="timeline-body">
            {filteredActivities.length > 0 ? (
              <div className="timeline-flow">
                {filteredActivities.map((act) => (
                  <div key={act._id} className={`timeline-item ${act.activityType}`}>
                    <div className="timeline-indicator">
                      <span className="timeline-icon">{getActivityIcon(act.activityType)}</span>
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-details">
                        <span className="act-title">{getActivityTitle(act)}</span>
                        {act.metadata?.reviewText && (
                          <div className="review-quote-block">
                            "{act.metadata.reviewText}"
                          </div>
                        )}
                      </div>
                      <span className="timeline-time">
                        {new Date(act.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="timeline-empty">
                <span>📭</span>
                <p>No activity log matching this filter.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
