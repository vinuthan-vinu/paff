import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser, registerUser, googleLogin as apiGoogleLogin } from '../api/authApi';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import './LoginPage.css';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = isRegister
        ? await registerUser(formData)
        : await loginUser({ email: formData.email, password: formData.password });

      login(res.data);
      toast.success(`Welcome${isRegister ? '' : ' back'}, ${res.data.name}!`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const res = await apiGoogleLogin(credentialResponse.credential);
      login(res.data);
      toast.success(`Welcome, ${res.data.name}!`);
      navigate('/');
    } catch (err) {
      toast.error('Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  // Mock google login for local development without actual client id
  const handleMockGoogleLogin = async () => {
    setLoading(true);
    try {
      const randomId = Math.floor(Math.random() * 1000);
      const res = await apiGoogleLogin(`mock-google-token-student${randomId}@gmail.com`);
      login(res.data);
      toast.success(`Welcome via Google, ${res.data.name}!`);
      navigate('/');
    } catch (err) {
      toast.error('Mock Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-gradient" />
      <div className="login-card glass-card">
        <div className="login-header">
          <span className="login-logo">🏛️</span>
          <h1 className="login-title">SmartCampus</h1>
          <p className="login-subtitle">
            {isRegister ? 'Create your account' : 'Welcome back! Sign in to continue'}
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full Name</label>
              <input
                id="name"
                className="form-input"
                type="text"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              className="form-input"
              type="email"
              name="email"
              placeholder="you@university.edu"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="form-input"
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          <button className="btn btn-primary btn-lg login-submit" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 'var(--space-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>
            — Or continue with —
          </div>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error('Google Login connection failed')}
            useOneTap
            shape="rectangular"
            theme="filled_black"
          />
          {/* Using a mock button since standard Google Login requires configured localhost origins */}
          <button className="btn btn-secondary btn-sm" onClick={handleMockGoogleLogin} style={{ width: '100%' }}>
            Mock Google Sign-In (Dev Only)
          </button>
        </div>

        <div className="login-footer">
          <p>
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
            <button className="login-toggle" onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? 'Sign In' : 'Register'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
