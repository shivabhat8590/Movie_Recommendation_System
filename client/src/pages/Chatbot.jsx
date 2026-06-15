import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { getSocket } from '../services/socket';
import MovieCard from '../components/MovieCard';
import './Chatbot.css';

export default function Chatbot() {
  const { user } = useSelector((s) => s.auth);
  const kidsMode = useSelector((s) => s.movies.kidsMode);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const isMovieChildSafe = (m) => {
    if (!m) return false;
    if (m.adult) return false;
    const genres = m.genres || [];
    const hasMatureGenre = genres.some(g => {
      const name = typeof g === 'string' ? g : g?.name;
      return ['Horror', 'Thriller', 'Crime'].includes(name);
    });
    return !hasMatureGenre;
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const { data } = await api.get('/chatbot/history');
        if (data?.data?.messages?.length > 0) {
          setMessages(data.data.messages);
        } else {
          setMessages([
            { 
              role: 'assistant', 
              content: kidsMode 
                ? "🎈 Hi there! I'm KidsAI, your magical movie buddy! 🧸 Tell me what kind of fun cartoons or magical adventures you feel like watching today!" 
                : "🎬 Hi! I'm MovieAI, your personal movie assistant. Tell me your mood, a genre you love, or ask me to recommend something specific!" 
            }
          ]);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
        setMessages([
          { 
            role: 'assistant', 
            content: kidsMode 
              ? "🎈 Hi there! I'm KidsAI, your magical movie buddy! 🧸 Tell me what kind of fun cartoons or magical adventures you feel like watching today!" 
              : "🎬 Hi! I'm MovieAI, your personal movie assistant. Tell me your mood, a genre you love, or ask me to recommend something specific!" 
          }
        ]);
      }
    };
    loadHistory();
  }, [kidsMode]);

  const clearChat = async () => {
    if (!window.confirm('Are you sure you want to clear your chat history?')) return;
    try {
      await api.delete('/chatbot/history');
      setMessages([
        { 
          role: 'assistant', 
          content: kidsMode 
            ? "🎈 Hi there! I'm KidsAI, your magical movie buddy! 🧸 Tell me what kind of fun cartoons or magical adventures you feel like watching today!" 
            : "🎬 Hi! I'm MovieAI, your personal movie assistant. Tell me your mood, a genre you love, or ask me to recommend something specific!" 
        }
      ]);
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  };

  // Socket.io event listeners for real-time chat
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Handle real-time incoming message
    socket.on('chat:message', ({ message, movieSuggestions }) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: message.content,
          movieSuggestions: movieSuggestions || [],
        },
      ]);
      setLoading(false);
    });

    // Handle real-time typing indicators
    socket.on('chat:typing', ({ typing }) => {
      setLoading(typing);
    });

    // Handle real-time socket errors
    socket.on('chat:error', ({ message }) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: message || 'Sorry, I encountered an error. Please try again!',
        },
      ]);
      setLoading(false);
    });

    return () => {
      socket.off('chat:message');
      socket.off('chat:typing');
      socket.off('chat:error');
    };
  }, []);

  const sendMessageToBot = async (messageContent) => {
    if (!messageContent.trim() || loading) return;

    const userMsg = { role: 'user', content: messageContent };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('chat:message', { message: messageContent, kidsMode });
    } else {
      // Fallback if socket is not connected
      try {
        const { data } = await api.post('/chatbot/message', { message: messageContent, kidsMode });
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.data.message.content,
            movieSuggestions: data.data.movieSuggestions || [],
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Sorry, I encountered an error. Please try again!',
          },
        ]);
      }
      setLoading(false);
    }
  };

  const send = (e) => {
    e.preventDefault();
    sendMessageToBot(input);
  };

  const suggestions = kidsMode
    ? [
        {
          id: 'magical',
          icon: '🪄',
          title: 'Magical & Cozy',
          text: 'Recommend cozy comfort movies for kids',
          desc: 'Magical comedies and sweet family musicals',
          color: 'linear-gradient(135deg, #a855f7, #ec4899)'
        },
        {
          id: 'superhero',
          icon: '🦸‍♂️',
          title: 'Superheroes & Action',
          text: 'Recommend cool cartoon superhero movies',
          desc: 'Exciting animated battles and brave heroes',
          color: 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
        },
        {
          id: 'adventure',
          icon: '🦁',
          title: 'Jungle & Animals',
          text: 'Recommend fun animal adventures',
          desc: 'Brave animals, exploration and fun travels',
          color: 'linear-gradient(135deg, #10b981, #059669)'
        }
      ]
    : [
        {
          id: 'thriller',
          icon: '⛓️',
          title: 'Best Thrillers',
          text: 'Recommend the best thriller movies',
          desc: 'High-suspense, gripping action & crime blockbusters',
          color: 'linear-gradient(135deg, #ff4b4b, #ff8533)'
        },
        {
          id: 'mind-bending',
          icon: '🌀',
          title: 'Mind-Bending',
          text: 'Recommend mind-bending movies',
          desc: 'Reality-challenging stories & insane plot twists',
          color: 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
        },
        {
          id: 'emotional',
          icon: '🎭',
          title: 'Emotional Drama',
          text: 'Recommend emotional movies',
          desc: 'Deeply touching, reflective & heart-warming tales',
          color: 'linear-gradient(135deg, #a855f7, #ec4899)'
        },
        {
          id: 'horror',
          icon: '🧟',
          title: 'Horror with Friends',
          text: 'Recommend horror movies for friends',
          desc: 'Terrifying jump scares & group slasher classics',
          color: 'linear-gradient(135deg, #10b981, #059669)'
        },
        {
          id: 'top-imdb',
          icon: '🏆',
          title: 'Top IMDb Rated',
          text: 'Recommend top IMDb movies',
          desc: 'Highest rated, legendary cinema masterpieces',
          color: 'linear-gradient(135deg, #f59e0b, #d97706)'
        },
        {
          id: 'underrated-scifi',
          icon: '🛸',
          title: 'Underrated Sci-Fi',
          text: 'Recommend underrated sci-fi films',
          desc: 'Hidden stellar gems, tech thrillers & space epics',
          color: 'linear-gradient(135deg, #06b6d4, #0891b2)'
        }
      ];

  const moodChips = kidsMode
    ? [
        { id: 'magical', label: '🪄 Magical Tales', text: 'Recommend cozy comfort movies for kids' },
        { id: 'superhero', label: '🦸‍♂️ Superhero Fun', text: 'Recommend cool cartoon superhero movies' },
        { id: 'adventure', label: '🦁 Animal Adventures', text: 'Recommend fun animal adventures' },
        { id: 'funny', label: '🎈 Funny Cartoons', text: 'Recommend happy funny cartoons and animation' }
      ]
    : [
        { id: 'thriller', label: '⛓️ Thrillers', text: 'Recommend the best thriller movies' },
        { id: 'mind-bending', label: '🌀 Mind-Bending', text: 'Recommend mind-bending movies' },
        { id: 'emotional', label: '🎭 Emotional', text: 'Recommend emotional movies' },
        { id: 'horror-friends', label: '🧟 Horror for Friends', text: 'Recommend horror movies for friends' },
        { id: 'top-imdb', label: '🏆 Top IMDb', text: 'Recommend top IMDb movies' },
        { id: 'underrated-scifi', label: '🛸 Underrated Sci-Fi', text: 'Recommend underrated sci-fi films' },
        { id: 'comedy', label: '🌈 Comedy & Joy', text: 'Recommend happy funny movies' }
      ];

  return (
    <div className="chatbot-page page-enter">
      <div className="container chatbot-container">
        <div className="chatbot-header">
          <div className="chatbot-header-info">
            <div className="chatbot-avatar">{kidsMode ? '🧸' : '🤖'}</div>
            <div>
              <h1 className="chatbot-title gradient-text">{kidsMode ? 'KidsAI Chat' : 'MovieAI Chat'}</h1>
              <p className="chatbot-sub">{kidsMode ? 'Find magical movies & fun cartoons!' : 'Your personal AI movie recommender'}</p>
            </div>
          </div>
          <button className="clear-chat-btn" onClick={clearChat} title="Clear Chat History">
            🗑️ Clear Chat
          </button>
        </div>

        <div className="chat-window glass">
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className="message-wrapper">
                <div className={`message ${m.role}`}>
                  {m.role === 'assistant' && <div className="msg-avatar">🤖</div>}
                  <div className="msg-bubble">{m.content}</div>
                  {m.role === 'user' && <div className="msg-avatar user-av">{user?.name?.[0]?.toUpperCase() || 'U'}</div>}
                </div>
                {m.role === 'assistant' && m.movieSuggestions && m.movieSuggestions.length > 0 && (
                  (() => {
                    const filteredSuggestions = kidsMode 
                      ? m.movieSuggestions.filter(isMovieChildSafe)
                      : m.movieSuggestions;
                    
                    if (filteredSuggestions.length === 0) return null;

                    return (
                      <div className="movie-suggestions-container">
                        {filteredSuggestions.map((movie) => (
                          <MovieCard key={movie.id || movie._id} movie={movie} />
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            ))}
            {loading && (
              <div className="message assistant">
                <div className="msg-avatar">🤖</div>
                <div className="msg-bubble typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Rich Suggestions */}
          {messages.length <= 1 && (
            <div className="suggestions-grid">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  className="suggestion-card"
                  onClick={() => sendMessageToBot(s.text)}
                  style={{ '--card-accent': s.color }}
                  disabled={loading}
                >
                  <div className="suggestion-card-icon" style={{ background: s.color }}>{s.icon}</div>
                  <div className="suggestion-card-content">
                    <h3 className="suggestion-card-title">{s.title}</h3>
                    <p className="suggestion-card-desc">{s.desc}</p>
                  </div>
                  <span className="suggestion-card-arrow">➔</span>
                </button>
              ))}
            </div>
          )}

          {/* Quick Mood Chips Selector (Always accessible above form input for maximum flexibility) */}
          <div className="mood-chips-carousel">
            <span className="mood-chips-label">Quick Moods:</span>
            <div className="mood-chips-container">
              {moodChips.map((chip) => (
                <button
                  key={chip.id}
                  className={`mood-chip ${chip.id}`}
                  onClick={() => sendMessageToBot(chip.text)}
                  disabled={loading}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <form className="chat-input-form" onSubmit={send}>
            <input
              className="chat-input"
              placeholder="Ask for a recommendation..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button className="btn btn-primary chat-send" type="submit" disabled={loading || !input.trim()}>
              Send ➤
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
