import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser, clearError } from '../store/authSlice';
import './Auth.css';

export default function Auth() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, user } = useSelector((s) => s.auth);
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  if (user) { navigate('/'); return null; }

  const set = (field) => (e) => {
    dispatch(clearError());
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'login') {
      const result = await dispatch(loginUser({ email: form.email, password: form.password }));
      if (!result.error) navigate('/');
    } else {
      const result = await dispatch(registerUser({ name: form.name, email: form.email, password: form.password }));
      if (!result.error) navigate('/');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-shapes">
        <div className="shape shape-1" />
        <div className="shape shape-2" />
      </div>
      <div className="auth-card glass page-enter">
        <div className="auth-logo">🎬 <span className="gradient-text">MovieAI</span></div>
        <h1 className="auth-title">{mode === 'login' ? 'Welcome Back' : 'Join MovieAI'}</h1>
        <p className="auth-sub">{mode === 'login' ? 'Sign in to your account' : 'Create your free account'}</p>

        {error && <div className="auth-error">⚠️ {error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label>Full Name</label>
              <input className="input" type="text" placeholder="John Doe" value={form.name} onChange={set('name')} required />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required minLength={6} />
          </div>

          {mode === 'login' && (
            <div className="form-group">
              <label>Login As</label>
              <select className="input" value={form.role || 'user'} onChange={set('role')}>
                <option value="user">Login as User</option>
                <option value="admin">Login as Admin</option>
              </select>
            </div>
          )}

          <button className="btn btn-primary auth-btn" type="submit" disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>Don't have an account? <button onClick={() => { setMode('register'); dispatch(clearError()); }}>Register</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode('login'); dispatch(clearError()); }}>Sign In</button></>
          )}
        </div>
      </div>
    </div>
  );
}
