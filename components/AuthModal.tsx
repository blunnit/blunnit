'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

type Props = {
  onClose: () => void;
};

export default function AuthModal({ onClose }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async () => {
    if (!email || !password) return;
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

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <div style={{ maxWidth: 400, width: '100%', background: '#000', border: '1px solid #1a1a1a', padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <p style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', color: '#7a756f', margin: 0 }}>
            {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
          </p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#7a756f', cursor: 'pointer', fontSize: 18, padding: 0 }}>x</button>
        </div>

        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          style={{ width: '100%', padding: '14px 16px', marginBottom: 12, background: '#0e0e0e', border: '1px solid #1a1a1a', color: '#e8e4df', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />

        <input type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          style={{ width: '100%', padding: '14px 16px', marginBottom: 20, background: '#0e0e0e', border: '1px solid #1a1a1a', color: '#e8e4df', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />

        {error && <p style={{ fontSize: 13, color: '#ff6b6b', marginBottom: 16 }}>{error}</p>}

        <button onClick={handleSubmit} disabled={loading || !email || !password}
          style={{ width: '100%', padding: '16px 0', background: '#e8e4df', color: '#000', border: 'none', fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', cursor: loading ? 'default' : 'pointer', fontWeight: 500, opacity: loading ? 0.6 : 1 }}>
          {loading ? '...' : mode === 'signup' ? 'Create Account' : 'Log In'}
        </button>

        <button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(null); }}
          style={{ background: 'none', border: 'none', color: '#7a756f', cursor: 'pointer', fontSize: 13, padding: '16px 0 0 0', width: '100%', textAlign: 'center' }}>
          {mode === 'signup' ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}