'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

const FONT = "'Cormorant Garamond', Georgia, serif";

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
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === 'signup') {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) {
        setError(signUpError.message);
      } else {
        // Try to sign in immediately after signup
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setMessage('Account created. Check your email to confirm, then sign in.');
        } else {
          window.location.reload();
        }
      }
    } else {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
      } else if (data?.session) {
        window.location.reload();
      } else {
        setError('Login failed. Please try again.');
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
          <p style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-dim)', margin: 0, fontFamily: FONT }}>
            {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
          </p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18, padding: 0, fontFamily: FONT }}>x</button>
        </div>

        <input
          type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} onKeyDown={handleKeyDown}
          style={{ width: '100%', padding: '14px 16px', marginBottom: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 15, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' }}
        />

        <input
          type="password" placeholder="Password (min 6 characters)" value={password}
          onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKeyDown}
          style={{ width: '100%', padding: '14px 16px', marginBottom: 20, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 15, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' }}
        />

        {error && <p style={{ fontSize: 13, color: 'var(--error)', marginBottom: 16, fontFamily: FONT }}>{error}</p>}
        {message && <p style={{ fontSize: 13, color: 'var(--accent)', marginBottom: 16, fontFamily: FONT }}>{message}</p>}

        <button onClick={handleSubmit} disabled={loading || !email || !password}
          style={{ width: '100%', padding: '16px 0', background: 'var(--btn-bg)', color: 'var(--btn-text)', border: '1px solid var(--btn-bg)', fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', cursor: loading ? 'default' : 'pointer', fontFamily: FONT, fontWeight: 500, opacity: loading ? 0.6 : 1 }}>
          {loading ? '...' : mode === 'signup' ? 'Create Account' : 'Log In'}
        </button>

        <button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(null); setMessage(null); }}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13, fontFamily: FONT, padding: '16px 0 0 0', width: '100%', textAlign: 'center' }}>
          {mode === 'signup' ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
