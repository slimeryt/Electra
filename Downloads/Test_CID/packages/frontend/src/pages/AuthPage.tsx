import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

interface AuthPageProps {
  mode: 'login' | 'register';
}

export default function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate();
  const { login, register } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ username, display_name: displayName, email, password });
      }
      navigate('/app');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const features = ['Voice & Video', 'Servers', 'Real-time Chat', 'File Sharing'];

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      minHeight: '100dvh',
      width: '100%',
      maxWidth: '100vw',
      background: 'var(--bg-base)',
      overflowX: 'hidden',
      overflowY: 'auto',
    }}>
      {/* Left decorative panel */}
      <div style={{
        flex: '0 0 45%',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative gradient blobs */}
        <div style={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(88,101,242,0.25) 0%, transparent 70%)',
          top: -150, right: -150, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 350, height: 350, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)',
          bottom: -80, left: -80, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(235,69,158,0.1) 0%, transparent 70%)',
          top: '60%', right: '10%', pointerEvents: 'none',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}
        >
          <div style={{ fontSize: 64, marginBottom: 16, lineHeight: 1 }}>⚡</div>
          <h1 style={{
            fontSize: 48, fontWeight: 800, color: '#fff',
            marginBottom: 12, letterSpacing: '-0.03em', lineHeight: 1,
          }}>
            Electra
          </h1>
          <p style={{
            fontSize: 16, color: 'rgba(255,255,255,0.55)',
            maxWidth: 300, lineHeight: 1.6, margin: '0 auto 32px',
          }}>
            Private, fast, and open source. A better way to connect with your community.
          </p>

          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8,
            justifyContent: 'center', maxWidth: 320, margin: '0 auto',
          }}>
            {features.map((f, i) => (
              <motion.div
                key={f}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.3 }}
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 100, padding: '5px 14px',
                  fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500,
                }}
              >
                {f}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right form panel */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 48,
      }}>
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ width: '100%', maxWidth: 400 }}
        >
          <h2 style={{
            fontSize: 28, fontWeight: 700, color: 'var(--text-primary)',
            marginBottom: 8, letterSpacing: '-0.02em',
          }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32, lineHeight: 1.5 }}>
            {mode === 'login'
              ? 'Sign in to your Electra account to continue.'
              : "Join Electra — it's free and takes less than a minute."}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'register' && (
              <>
                <Input
                  label="Display Name"
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your full name"
                  required
                  autoComplete="name"
                  autoFocus
                />
                <Input
                  label="Username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="cooluser123"
                  required
                  autoComplete="username"
                />
              </>
            )}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              autoFocus={mode === 'login'}
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  color: 'var(--danger)', fontSize: 13, margin: 0,
                  padding: '8px 12px', background: 'rgba(239,68,68,0.1)',
                  borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.2)',
                  lineHeight: 1.4,
                }}
              >
                {error}
              </motion.p>
            )}

            <Button type="submit" isLoading={isLoading} size="lg" style={{ width: '100%', marginTop: 4 }}>
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text-muted)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <Link
              to={mode === 'login' ? '/register' : '/login'}
              style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}
              onMouseEnter={e => { (e.target as HTMLAnchorElement).style.textDecoration = 'underline'; }}
              onMouseLeave={e => { (e.target as HTMLAnchorElement).style.textDecoration = 'none'; }}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
