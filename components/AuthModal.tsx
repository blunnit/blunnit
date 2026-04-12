'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

const F = "'Cormorant Garamond', Georgia, serif";

type Props = {
  onClose: () => void;
};

export default function AuthModal({ onClose }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async () => {
    if (!email || !password) return;
    if (mode === 'signup' && !ageConfirmed) return;
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const { error: e } = await supabase.auth.signUp({ email, password });
        if (e) { setError(e.message); setLoading(false); return; }
        const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
        if (e2) { setError(e2.message); setLoading(false); return; }
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password });
        if (e) { setError(e.message); setLoading(false); return; }
      }
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setLoading(false);
    }
  };

  const canSubmit = !loading && !!email && !!password && (mode === 'login' || ageConfirmed);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28, fontFamily: F }}>
      <div style={{ maxWidth: 400, width: '100%', background: '#000', border: '1px solid #1a1a1a', padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <p style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', color: '#7a756f', margin: 0, fontFamily: F }}>
            {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
          </p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#7a756f', cursor: 'pointer', fontSize: 18, padding: 0, fontFamily: F }}>x</button>
        </div>

        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          style={{ width: '100%', padding: '14px 16px', marginBottom: 12, background: '#0e0e0e', border: '1px solid #1a1a1a', color: '#e8e4df', fontSize: 16, outline: 'none', boxSizing: 'border-box', fontFamily: F }} />

        <input type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          style={{ width: '100%', padding: '14px 16px', marginBottom: 20, background: '#0e0e0e', border: '1px solid #1a1a1a', color: '#e8e4df', fontSize: 16, outline: 'none', boxSizing: 'border-box', fontFamily: F }} />

        {error && <p style={{ fontSize: 14, color: '#ff6b6b', marginBottom: 16, fontFamily: F }}>{error}</p>}

        {/* Age gate — signup only */}
        {mode === 'signup' && (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              style={{ marginTop: 3, flexShrink: 0, accentColor: '#e8e4df', width: 14, height: 14 }}
            />
            <span style={{ fontSize: 13, color: '#7a756f', fontFamily: F, lineHeight: 1.6 }}>
              I confirm I am 18 years or older and I agree to the{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#a09a94', textDecoration: 'underline' }}>Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#a09a94', textDecoration: 'underline' }}>Privacy Policy</a>.
            </span>
          </label>
        )}

        <button onClick={handleSubmit} disabled={!canSubmit}
          style={{ width: '100%', padding: '16px 0', background: canSubmit ? '#e8e4df' : '#1a1a1a', color: canSubmit ? '#000' : '#555', border: 'none', fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', cursor: canSubmit ? 'pointer' : 'default', fontWeight: 500, fontFamily: F, transition: 'background 0.2s, color 0.2s' }}>
          {loading ? '...' : mode === 'signup' ? 'Create Account' : 'Log In'}
        </button>

        <button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(null); setAgeConfirmed(false); }}
          style={{ background: 'none', border: 'none', color: '#7a756f', cursor: 'pointer', fontSize: 14, padding: '16px 0 0 0', width: '100%', textAlign: 'center', fontFamily: F }}>
          {mode === 'signup' ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
