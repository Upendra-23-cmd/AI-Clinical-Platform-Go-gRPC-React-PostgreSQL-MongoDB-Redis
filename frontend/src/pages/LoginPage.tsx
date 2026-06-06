import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff, ArrowRight, Shield, Zap, Lock } from 'lucide-react';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@healthos.io');
  const [password, setPassword] = useState('demo1234');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await authApi.login(email, password);
      login(user);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch {
      toast.error('Invalid credentials. Try any email/password for the demo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      {/* Background grid */}
      <div className="login-bg">
        <div className="login-bg-grid" />
        <div className="login-bg-glow login-bg-glow-1" />
        <div className="login-bg-glow login-bg-glow-2" />
      </div>

      {/* Left panel */}
      <div className="login-hero">
        <div className="hero-content animate-fade-in">
          <div className="hero-logo">
            <Activity size={32} />
          </div>
          <h1 className="hero-title">
            The future of<br />
            <span className="gradient-text">clinical care</span><br />
            is here.
          </h1>
          <p className="hero-subtitle">
            AI-powered diagnostics, real-time patient monitoring, and intelligent
            scheduling — all in one unified platform.
          </p>

          <div className="hero-features">
            {[
              { icon: Brain, label: 'AI Symptom Analysis', desc: 'Claude-powered diagnosis assistance' },
              { icon: Shield, label: 'HIPAA Compliant', desc: 'Enterprise-grade data security' },
              { icon: Zap, label: 'Real-time Updates', desc: 'Live patient monitoring & alerts' },
            ].map(({ icon: Icon, label, desc }) => (
              <div className="hero-feature" key={label}>
                <div className="hero-feature-icon">
                  <Icon size={16} />
                </div>
                <div>
                  <div className="hero-feature-label">{label}</div>
                  <div className="hero-feature-desc">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="hero-stats">
            {[
              { value: '99.9%', label: 'Uptime SLA' },
              { value: '<50ms', label: 'API latency' },
              { value: '500K+', label: 'Patients served' },
            ].map(({ value, label }) => (
              <div className="hero-stat" key={label}>
                <span className="hero-stat-value">{value}</span>
                <span className="hero-stat-label">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="login-form-panel">
        <div className="login-form-wrapper animate-fade-in">
          <div className="login-form-header">
            <div className="form-logo">
              <Activity size={22} />
            </div>
            <h2 className="login-title">Sign in to HealthOS</h2>
            <p className="login-subtitle">Access your clinical dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@hospital.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="password-wrapper">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary login-submit"
              disabled={loading}
            >
              {loading ? (
                <span className="login-spinner" />
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="login-demo-hint">
            <Lock size={12} />
            Demo mode: any email/password combination works
          </div>
        </div>
      </div>

      <style>{`
        .login-root {
          display: flex;
          height: 100vh;
          position: relative;
          overflow: hidden;
        }

        .login-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
        }
        .login-bg-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(99,130,199,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,130,199,0.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .login-bg-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
        }
        .login-bg-glow-1 {
          width: 500px; height: 500px;
          top: -200px; left: -100px;
          background: radial-gradient(circle, rgba(79,142,247,0.3) 0%, transparent 70%);
        }
        .login-bg-glow-2 {
          width: 400px; height: 400px;
          bottom: -100px; right: -100px;
          background: radial-gradient(circle, rgba(124,77,255,0.25) 0%, transparent 70%);
        }

        .login-hero {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 80px;
          position: relative;
        }
        @media (max-width: 900px) {
          .login-hero { display: none; }
        }

        .hero-content {
          max-width: 480px;
          animation-delay: 0.1s;
        }
        .hero-logo {
          width: 60px; height: 60px;
          background: var(--gradient-brand);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin-bottom: 32px;
          box-shadow: var(--shadow-glow);
        }
        .hero-title {
          font-size: 52px;
          font-family: var(--font-display);
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 20px;
          letter-spacing: -0.03em;
          color: var(--text-primary);
        }
        .hero-subtitle {
          color: var(--text-secondary);
          font-size: 16px;
          line-height: 1.7;
          margin-bottom: 40px;
        }
        .hero-features {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 48px;
        }
        .hero-feature {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .hero-feature-icon {
          width: 36px; height: 36px;
          background: rgba(79, 142, 247, 0.12);
          border: 1px solid rgba(79, 142, 247, 0.25);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-primary);
          flex-shrink: 0;
        }
        .hero-feature-label {
          font-weight: 600;
          font-size: 14px;
          color: var(--text-primary);
        }
        .hero-feature-desc {
          font-size: 12px;
          color: var(--text-muted);
        }
        .hero-stats {
          display: flex;
          gap: 40px;
        }
        .hero-stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .hero-stat-value {
          font-family: var(--font-display);
          font-size: 26px;
          font-weight: 800;
          background: var(--gradient-brand);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-stat-label {
          font-size: 12px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        /* Form panel */
        .login-form-panel {
          width: 480px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          background: var(--bg-base);
          border-left: 1px solid var(--border-subtle);
          position: relative;
          z-index: 10;
        }
        @media (max-width: 900px) {
          .login-form-panel {
            width: 100%;
            background: transparent;
            border-left: none;
          }
        }

        .login-form-wrapper {
          width: 100%;
          max-width: 380px;
        }

        .login-form-header {
          margin-bottom: 36px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .form-logo {
          width: 52px; height: 52px;
          background: var(--gradient-brand);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin-bottom: 20px;
          box-shadow: var(--shadow-glow-sm);
        }
        .login-title {
          font-size: 24px;
          font-family: var(--font-display);
          margin-bottom: 8px;
        }
        .login-subtitle {
          color: var(--text-muted);
          font-size: 14px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .password-wrapper {
          position: relative;
        }
        .password-toggle {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          padding: 4px;
        }
        .password-toggle:hover { color: var(--text-primary); }

        .login-submit {
          width: 100%;
          justify-content: center;
          padding: 12px;
          font-size: 15px;
          font-weight: 600;
          margin-top: 8px;
          border-radius: var(--radius-md);
        }
        .login-submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .login-spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .login-demo-hint {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 24px;
          font-size: 12px;
          color: var(--text-muted);
          background: var(--bg-surface);
          padding: 10px 16px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
        }
      `}</style>
    </div>
  );
}

// Inline import for icon to avoid circular
function Brain({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.77-3.21A2.5 2.5 0 0 1 6 12a2.5 2.5 0 0 1 .5-4.97A2.5 2.5 0 0 1 9.5 2Z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.77-3.21A2.5 2.5 0 0 0 18 12a2.5 2.5 0 0 0-.5-4.97A2.5 2.5 0 0 0 14.5 2Z"/>
    </svg>
  );
}
