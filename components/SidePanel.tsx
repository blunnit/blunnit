'use client';

import { useState } from 'react';

const F = "'Cormorant Garamond', Georgia, serif";

type SavedConvo = { id: string; title: string; updated_at: string; confrontation_level: string };
type UserState = { id: string; email: string; tier: string } | null;

type Props = {
  open: boolean;
  user: UserState;
  savedConvos: SavedConvo[];
  onClose: () => void;
  onLoadConvo: (id: string) => void;
  onShowSafety: () => void;
  onLogout: () => void;
};

export default function SidePanel({ open, user, savedConvos, onClose, onLoadConvo, onShowSafety, onLogout }: Props) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelDone, setCancelDone] = useState(false);

  const handleCancelSubscription = async () => {
    if (!window.confirm("Cancel your subscription? You'll keep full access until the end of your billing period.")) return;
    setCancelling(true);
    try {
      const res = await fetch('/api/cancel-subscription', { method: 'POST' });
      const data = await res.json();
      if (data.ok) setCancelDone(true);
    } catch {}
    setCancelling(false);
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.6)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 300, zIndex: 201,
        background: '#000', borderLeft: '1px solid var(--border)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease',
        display: 'flex', flexDirection: 'column',
        padding: '24px 20px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexShrink: 0 }}>
          <span style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: F }}>
            Account
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 22, fontFamily: F, lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {user && (
            <>
              {/* Account info */}
              <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 15, color: 'var(--text)', margin: '0 0 8px 0', fontFamily: F, wordBreak: 'break-all', fontWeight: 300 }}>
                  {user.email}
                </p>
                <p style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0, fontFamily: F }}>
                  {user.tier === 'paid' ? '◆  Full Access' : '○  Free'}
                </p>
              </div>

              {/* Past reflections */}
              {savedConvos.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 12px 0', fontFamily: F }}>
                    Past Reflections
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {savedConvos.slice(0, 30).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { onLoadConvo(c.id); onClose(); }}
                        style={{
                          textAlign: 'left', padding: '12px 14px',
                          background: 'transparent', border: '1px solid var(--border)',
                          color: 'var(--text)', cursor: 'pointer', fontFamily: F, width: '100%',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.title || 'Untitled reflection'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontFamily: F }}>
                          {new Date(c.updated_at).toLocaleDateString()}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom actions */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          {user?.tier === 'paid' && !cancelDone && (
            <button
              onClick={handleCancelSubscription}
              disabled={cancelling}
              style={{
                padding: '12px 0', background: 'none',
                border: '1px solid rgba(255,107,107,0.3)',
                color: '#ff6b6b', fontSize: 11, letterSpacing: 2,
                textTransform: 'uppercase', cursor: cancelling ? 'default' : 'pointer',
                fontFamily: F, opacity: cancelling ? 0.5 : 1,
              }}
            >
              {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
            </button>
          )}

          {cancelDone && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', fontFamily: F, margin: '4px 0' }}>
              Subscription cancelled. Access continues until period end.
            </p>
          )}

          <button
            onClick={() => { onClose(); onShowSafety(); }}
            style={{
              padding: '12px 0', background: 'none',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 11, letterSpacing: 2,
              textTransform: 'uppercase', cursor: 'pointer', fontFamily: F,
            }}
          >
            Safety & Disclaimer
          </button>

          <button
            onClick={onLogout}
            style={{
              padding: '12px 0', background: 'none',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 11, letterSpacing: 2,
              textTransform: 'uppercase', cursor: 'pointer', fontFamily: F,
            }}
          >
            Log Out
          </button>
        </div>
      </div>
    </>
  );
}
