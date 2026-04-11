'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

type Props = {
  email: string;
  tier: string;
  onUpgrade: () => void;
};

export default function UserMenu({ email, tier, onUpgrade }: Props) {
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'none', border: '1px solid var(--border)',
          color: 'var(--text-dim)', padding: '6px 12px',
          fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
          cursor: 'pointer', fontFamily: 'var(--font-ui)',
        }}
      >
        {tier === 'paid' ? '◆' : '○'} Account
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 8,
          background: 'var(--bg)', border: '1px solid var(--border)',
          padding: 16, minWidth: 200, zIndex: 50,
        }}>
          <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '0 0 4px 0', fontFamily: 'var(--font-ui)' }}>
            {email}
          </p>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: '0 0 16px 0', fontFamily: 'var(--font-ui)', letterSpacing: 2, textTransform: 'uppercase' }}>
            {tier === 'paid' ? 'Full Access' : 'Free'}
          </p>

          {tier !== 'paid' && (
            <button
              onClick={() => { setOpen(false); onUpgrade(); }}
              style={{
                width: '100%', padding: '10px 0', marginBottom: 8,
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: 10, letterSpacing: 2,
                textTransform: 'uppercase', cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
              }}
            >
              Upgrade
            </button>
          )}

          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '10px 0',
              background: 'none', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 10, letterSpacing: 2,
              textTransform: 'uppercase', cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
