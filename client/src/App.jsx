import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { fetchMe } from './store/authSlice';
import { initSocket, disconnectSocket } from './services/socket';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Auth from './pages/Auth';
import MovieDetail from './pages/MovieDetail';
import Search from './pages/Search';
import MoodPicker from './pages/MoodPicker';
import Dashboard from './pages/Dashboard';
import Chatbot from './pages/Chatbot';
import Wishlist from './pages/Wishlist';
import AdminDashboard from './pages/AdminDashboard';
import Toast from './components/Toast';

function ProtectedRoute({ children }) {
  const { user, initialized } = useSelector((s) => s.auth);
  if (!initialized) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" /></div>;
  return user ? children : <Navigate to="/auth" replace />;
}

export default function App() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const kidsMode = useSelector((s) => s.movies.kidsMode);

  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      dispatch(fetchMe());
    }
  }, [dispatch]);

  useEffect(() => {
    if (kidsMode) {
      document.body.classList.add('kids-mode-theme');
    } else {
      document.body.classList.remove('kids-mode-theme');
    }
  }, [kidsMode]);

  useEffect(() => {
    if (user) {
      initSocket();
    } else {
      disconnectSocket();
    }
    return () => {
      disconnectSocket();
    };
  }, [user]);

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/search" element={<Search />} />
        <Route path="/movie/:tmdbId" element={<MovieDetail />} />
        <Route path="/mood" element={<MoodPicker />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/chatbot" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
        <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
    </>
  );
}
