'use client';

import { useState } from 'react';

export default function UpgradePage({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
    }
    setLoading(false);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', textAlign: 'center',
      maxWidth: 520, margin: '0 auto', padding: '0 28px',
      animation: 'fadeIn 0.8s ease',
    }}>
      <button onClick={onBack} style={{
        position: 'absolute', top: 32, left: 28,
        background: 'none', border: 'none', color: 'var(--text-muted)',
        cursor: 'pointer', fontSize: 10, letterSpacing: 2,
        textTransform: 'uppercase', fontFamily: 'var(--font-ui)',
      }}>
        Back
      </button>

      <p style={{
        fontSize: 10, letterSpacing: 4, textTransform: 'uppercase',
        color: 'var(--text-muted)', margin: '0 0 24px 0',
        fontFamily: 'var(--font-ui)',
      }}>
        Full Access
      </p>

      <h2 style={{
        fontSize: 28, fontWeight: 300, margin: '0 0 32px 0',
        fontFamily: 'var(--font-display)', lineHeight: 1.4,
      }}>
        The mirror sharpens with you.<br />
        The longer you practice, the deeper it sees.
      </h2>

      <div style={{
        width: '100%', textAlign: 'left',
        border: '1px solid var(--border)', padding: 28, marginBottom: 28,
      }}>
        <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 16, fontWeight: 300, lineHeight: 1.7 }}>
          Unlimited reflections. Full confrontation dial. Your reflection history, searchable. Pattern tracking over time.
        </p>
        <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 0, fontWeight: 300, lineHeight: 1.7 }}>
          $9.99/month. Cancel anytime. No contracts, no tricks.
        </p>
      </div>

      <button
        onClick={handleUpgrade}
        disabled={loading}
        style={{
          width: '100%', padding: '18px 0',
          background: 'var(--btn-bg)', color: 'var(--btn-text)',
          border: '1px solid var(--btn-bg)',
          fontSize: 11, letterSpacing: 4, textTransform: 'uppercase',
          cursor: loading ? 'default' : 'pointer',
          fontFamily: 'var(--font-ui)', fontWeight: 500,
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Loading...' : 'Get Full Access'}
      </button>

      <p style={{
        fontSize: 10, color: 'var(--text-muted)', marginTop: 20,
        fontFamily: 'var(--font-ui)', lineHeight: 1.6,
      }}>
        This exists. You'll know when you want it.
      </p>
    </div>
  );
}
