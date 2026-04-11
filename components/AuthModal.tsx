'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

export default function AuthModal({ onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage('Account created. You can start using BLUNNIT.');
        setTimeout(onSuccess, 1500);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        onSuccess();
      }
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 28,
    }}>
      <div style={{
        maxWidth: 400, width: '100%', background: 'var(--bg)',
        border: '1px solid var(--border)', padding: 32,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <p style={{
            fontSize: 10, letterSpacing: 4, textTransform: 'uppercase',
            color: 'var(--text-dim)', margin: 0, fontFamily: 'var(--font-ui)',
          }}>
            {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
          </p>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-dim)',
            cursor: 'pointer', fontSize: 18, padding: 0,
          }}>x</button>
        </div>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%', padding: '14px 16px', marginBottom: 12,
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-ui)',
            outline: 'none', boxSizing: 'border-box',
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%', padding: '14px 16px', marginBottom: 20,
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-ui)',
            outline: 'none', boxSizing: 'border-box',
          }}
        />

        {error && (
          <p style={{ fontSize: 11, color: 'var(--error)', marginBottom: 16, fontFamily: 'var(--font-ui)' }}>{error}</p>
        )}

        {message && (
          <p style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 16, fontFamily: 'var(--font-ui)' }}>{message}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !email || !password}
          style={{
            width: '100%', padding: '16px 0',
            background: 'var(--btn-bg)', color: 'var(--btn-text)',
            border: '1px solid var(--btn-bg)',
            fontSize: 11, letterSpacing: 4, textTransform: 'uppercase',
            cursor: loading ? 'default' : 'pointer',
            fontFamily: 'var(--font-ui)', fontWeight: 500,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? '...' : mode === 'signup' ? 'Create Account' : 'Log In'}
        </button>

        <button
          onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(null); }}
          style={{
            background: 'none', border: 'none', color: 'var(--text-dim)',
            cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-ui)',
            padding: '16px 0 0 0', width: '100%', textAlign: 'center',
            letterSpacing: 1,
          }}
        >
          {mode === 'signup' ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
