import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { loginUser, registerUser, googleLogin as apiGoogleLogin } from '../api/authApi';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { 
  HiOutlineUser, 
  HiOutlineIdentification, 
  HiOutlineMail, 
  HiOutlineLockClosed, 
  HiOutlineShieldCheck, 
  HiOutlineLightningBolt,
  HiOutlineEye
} from 'react-icons/hi';
import './LoginPage.css';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', sliitId: '' });
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
        ? await registerUser({ name: formData.name, email: formData.email, password: formData.password }) // Omitting sliitId as backend doesn't take it currently
        : await loginUser({ email: formData.email, password: formData.password });

      login(res.data);
      toast.success(`Welcome${isRegister ? '' : ' back'}, ${res.data.name}!`);
      navigate(res.data.role === 'ADMIN' ? '/admin' : '/');
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
      navigate(res.data.role === 'ADMIN' ? '/admin' : '/');
    } catch {
      toast.error('Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleMockGoogleLogin = async (role = 'student') => {
    setLoading(true);
    try {
      const randomId = Math.floor(Math.random() * 1000);
      const email = role === 'admin' 
        ? `mock-google-token-admin${randomId}@university.edu` 
        : `mock-google-token-student${randomId}@gmail.com`;
        
      const res = await apiGoogleLogin(email);
      login(res.data);
      toast.success(`Welcome via Google, ${res.data.name}!`);
      navigate(res.data.role === 'ADMIN' ? '/admin' : '/');
    } catch {
      toast.error('Mock Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-page-container">
      {/* Left Info Panel */}
      <div className="split-left">
        <div className="split-bg-decor" />
        <div className="split-left-content">
          <div className="admin-badge">Official Student Hub</div>
          
          <h1>
            Unlock the power of your <br/>
            <span className="orange-text">Campus Network.</span>
          </h1>
          
          <p className="desc">
            Join thousands of SLIIT students reporting issues, booking facilities, and 
            managing academic services in a trusted environment.
          </p>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon"><HiOutlineShieldCheck /></div>
              <div className="feature-title">Secure Platform</div>
              <div className="feature-text">Exclusive to verified SLIIT students only.</div>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><HiOutlineLightningBolt /></div>
              <div className="feature-title">Instant Access</div>
              <div className="feature-text">Report incidents & book facilities in seconds.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="split-right">
        <div className="auth-form-container">
          <h2 className="auth-title">{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
          <p className="auth-subtitle">
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <button onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? 'Login' : 'Create Account'}
            </button>
          </p>

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="name">Full Name</label>
                  <div className="input-with-icon">
                    <HiOutlineUser className="input-icon" />
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
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="sliitId">SLIIT ID Number</label>
                  <div className="input-with-icon">
                    <HiOutlineIdentification className="input-icon" />
                    <input
                      id="sliitId"
                      className="form-input"
                      type="text"
                      name="sliitId"
                      placeholder="IT21XXXXXX"
                      value={formData.sliitId}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">University Email</label>
              <div className="input-with-icon">
                <HiOutlineMail className="input-icon" />
                <input
                  id="email"
                  className="form-input"
                  type="email"
                  name="email"
                  placeholder="it21000000@my.sliit.lk"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="input-with-icon">
                <HiOutlineLockClosed className="input-icon" />
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
                <HiOutlineEye className="input-icon" style={{ left: 'auto', right: '14px', cursor: 'pointer' }} />
              </div>
              {isRegister && (
                <p className="password-note">Must be at least 6 characters.</p>
              )}
            </div>

            {isRegister && (
              <label className="terms-checkbox">
                <input type="checkbox" required />
                <span>
                  I agree to the <strong>Terms of Service</strong> and <strong>Privacy Policy</strong> of SmartCampus Hub.
                </span>
              </label>
            )}

            <button className="btn-orange" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'} 
            </button>
          </form>

          <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              — Or continue with —
            </div>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google Login connection failed')}
              useOneTap
              shape="rectangular"
              theme="outline"
            />
            {/* Using a mock button since standard Google Login requires configured localhost origins */}
            <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => handleMockGoogleLogin('student')} style={{ flex: 1 }} type="button">
                Mock Student (Dev)
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleMockGoogleLogin('admin')} style={{ flex: 1, border: '1px solid var(--accent-orange)' }} type="button">
                Mock Admin (Dev)
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
