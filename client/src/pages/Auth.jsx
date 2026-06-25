import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser, clearError } from '../store/authSlice';
import { toast } from '../components/Toast';
import './Auth.css';

export default function Auth() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, user } = useSelector((s) => s.auth);
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});

  if (user) { navigate('/'); return null; }

  const handleEmailClick = (e) => {
    e.preventDefault();
    window.open('https://mail.google.com/mail/?view=cm&fs=1&to=admin@movieai.com', '_blank');
  };

  const checkPasswordRules = (pwd) => {
    return {
      minLength: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    };
  };

  const validateField = (field, value) => {
    let err = '';
    if (field === 'name') {
      if (!value || !value.trim()) {
        err = 'Enter a valid username';
      } else if (value.trim().length < 3) {
        err = 'Username must contain at least 3 characters';
      } else if (value.trim().length > 50) {
        err = 'Username must contain at most 50 characters';
      } else if (!/^[a-zA-Z\s]+$/.test(value.trim())) {
        err = 'Username cannot contain numbers or special characters';
      }
    } else if (field === 'email') {
      if (!value || !value.trim()) {
        err = 'Enter a valid email';
      } else if (!/^\S+@\S+\.\S+$/.test(value.trim())) {
        err = 'Please enter a valid mail(e.g. example@gmail.com)';
      }
    } else if (field === 'password') {
      if (!value) {
        err = 'Enter a valid password';
      } else {
        const rules = checkPasswordRules(value);
        if (!rules.minLength) {
          err = 'Password must be at least 8 characters long';
        } else if (!rules.uppercase) {
          err = 'Password must contain one uppercase letter';
        } else if (!rules.lowercase) {
          err = 'Password must contain one lowercase letter';
        } else if (!rules.number) {
          err = 'Password must contain one number';
        } else if (!rules.specialChar) {
          err = 'Password must contain one special character';
        }
      }
    } else if (field === 'confirmPassword') {
      if (value !== form.password) {
        err = 'Passwords do not match';
      }
    }
    setErrors((prev) => ({ ...prev, [field]: err }));
    return err;
  };

  const set = (field) => (e) => {
    dispatch(clearError());
    const val = e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
    // Validate field live on change
    validateField(field, val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (mode === 'register') {
      if (!form.name || !form.name.trim()) {
        newErrors.name = 'Enter a valid username';
      } else if (form.name.trim().length < 3) {
        newErrors.name = 'Username must contain at least 3 characters';
      } else if (form.name.trim().length > 50) {
        newErrors.name = 'Username must contain at most 50 characters';
      } else if (!/^[a-zA-Z\s]+$/.test(form.name.trim())) {
        newErrors.name = 'Username cannot contain numbers or special characters';
      }

      if (!form.email || !form.email.trim()) {
        newErrors.email = 'Enter a valid email';
      } else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
        newErrors.email = 'Please enter a valid mail(e.g. example@gmail.com)';
      }

      if (!form.password) {
        newErrors.password = 'Enter a valid password';
      } else {
        const rules = checkPasswordRules(form.password);
        if (!rules.minLength) {
          newErrors.password = 'Password must be at least 8 characters long';
        } else if (!rules.uppercase) {
          newErrors.password = 'Password must contain one uppercase letter';
        } else if (!rules.lowercase) {
          newErrors.password = 'Password must contain one lowercase letter';
        } else if (!rules.number) {
          newErrors.password = 'Password must contain one number';
        } else if (!rules.specialChar) {
          newErrors.password = 'Password must contain one special character';
        }
      }

      if (form.confirmPassword !== form.password) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else {
      if (!form.email || !form.email.trim()) {
        newErrors.email = 'Enter a valid email';
      } else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
        newErrors.email = 'Please enter a valid mail(e.g. example@gmail.com)';
      }

      if (!form.password) {
        newErrors.password = 'Enter a valid password';
      }
    }

    setErrors(newErrors);

    if (Object.values(newErrors).some(x => x)) {
      return;
    }

    if (mode === 'login') {
      const result = await dispatch(loginUser({ email: form.email, password: form.password }));
      if (!result.error) {
        toast.success('Login successful');
        navigate('/');
      } else {
        toast.error(result.payload || 'Login failed');
      }
    } else {
      const result = await dispatch(registerUser({ name: form.name, email: form.email, password: form.password }));
      if (!result.error) {
        toast.success('User account created successfully');
        setTimeout(() => {
          setMode('login');
          setForm({ name: '', email: '', password: '', confirmPassword: '' });
          setErrors({});
          dispatch(clearError());
        }, 2500);
      } else {
        toast.error(result.payload || 'Registration failed');
      }
    }
  };

  const passwordRules = checkPasswordRules(form.password || '');
  const metCount = Object.values(passwordRules).filter(Boolean).length;
  
  let strengthText = 'Weak';
  let strengthClass = 'weak';
  if (form.password) {
    if (metCount >= 5) {
      strengthText = 'Strong';
      strengthClass = 'strong';
    } else if (metCount >= 3) {
      strengthText = 'Medium';
      strengthClass = 'medium';
    }
  }

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

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {mode === 'register' && (
            <div className="form-group">
              <label>Full Name</label>
              <input 
                className={`input ${errors.name ? 'input-error' : ''}`} 
                type="text" 
                placeholder="John Doe" 
                value={form.name} 
                onChange={set('name')} 
                onBlur={() => validateField('name', form.name)}
                required 
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>
          )}
          
          <div className="form-group">
            <label>Email</label>
            <input 
              className={`input ${errors.email ? 'input-error' : ''}`} 
              type="email" 
              placeholder="you@example.com" 
              value={form.email} 
              onChange={set('email')} 
              onBlur={() => validateField('email', form.email)}
              required 
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              className={`input ${errors.password ? 'input-error' : ''}`} 
              type="password" 
              placeholder="••••••••" 
              value={form.password} 
              onChange={set('password')} 
              onBlur={() => validateField('password', form.password)}
              required 
            />
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          {mode === 'register' && form.password && (
            <div className="password-strength-container">
              <div className="password-strength-header">
                <span>Password Strength:</span>
                <span className={`strength-label ${strengthClass}`}>{strengthText}</span>
              </div>
              <div className="strength-bar-track">
                <div className={`strength-bar-fill ${strengthClass}`} style={{ width: `${(metCount / 5) * 100}%` }} />
              </div>
              
              <div className="password-rules-checklist">
                <p className="rules-header">Password must contain:</p>
                <ul>
                  <li className={passwordRules.minLength ? 'valid' : 'invalid'}>
                    <span className="bullet-icon">{passwordRules.minLength ? '✓' : '✗'}</span> Minimum 8 characters
                  </li>
                  <li className={passwordRules.uppercase ? 'valid' : 'invalid'}>
                    <span className="bullet-icon">{passwordRules.uppercase ? '✓' : '✗'}</span> One uppercase letter
                  </li>
                  <li className={passwordRules.lowercase ? 'valid' : 'invalid'}>
                    <span className="bullet-icon">{passwordRules.lowercase ? '✓' : '✗'}</span> One lowercase letter
                  </li>
                  <li className={passwordRules.number ? 'valid' : 'invalid'}>
                    <span className="bullet-icon">{passwordRules.number ? '✓' : '✗'}</span> One number
                  </li>
                  <li className={passwordRules.specialChar ? 'valid' : 'invalid'}>
                    <span className="bullet-icon">{passwordRules.specialChar ? '✓' : '✗'}</span> One special character
                  </li>
                </ul>
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div className="form-group">
              <label>Confirm Password</label>
              <input 
                className={`input ${errors.confirmPassword ? 'input-error' : ''}`} 
                type="password" 
                placeholder="••••••••" 
                value={form.confirmPassword} 
                onChange={set('confirmPassword')} 
                onBlur={() => validateField('confirmPassword', form.confirmPassword)}
                required 
              />
              {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
            </div>
          )}

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
            <>Don't have an account? <button onClick={() => { setMode('register'); setForm({ name: '', email: '', password: '', confirmPassword: '' }); setErrors({}); dispatch(clearError()); }}>Register</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode('login'); setForm({ name: '', email: '', password: '', confirmPassword: '' }); setErrors({}); dispatch(clearError()); }}>Sign In</button></>
          )}
        </div>

        <div className="auth-help-section">
          <div className="auth-help-divider" />
          <h4 className="auth-help-title">Need Help?</h4>
          <p className="auth-help-desc">
            If you're experiencing login or registration issues, or need assistance accessing your account, please contact the administrator.
          </p>
          <a href="mailto:admin@movieai.com" onClick={handleEmailClick} className="auth-help-email">
            📧 admin@movieai.com
          </a>
        </div>
      </div>
    </div>
  );
}
