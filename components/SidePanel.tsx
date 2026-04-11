'use client';

import { useState, useEffect } from 'react';

const F = "'Cormorant Garamond', Georgia, serif";

type SavedConvo = { id: string; title: string; updated_at: string; confrontation_level: string };
type UserState = { id: string; email: string; tier: string } | null;

type Props = {
  open: boolean;
  user: UserState;
  savedConvos: SavedConvo[];
  onClose: () => void;
  onLoadConvo: (id: string) => void;
  onDeleteConvo: (id: string) => void;
  onRenameConvo: (id: string, title: string) => void;
  onShowSafety: () => void;
  onLogout: () => void;
  onUpgrade: () => void;
  onNewReflection: () => void;
};

export default function SidePanel({
  open, user, savedConvos, onClose, onLoadConvo, onDeleteConvo, onRenameConvo,
  onShowSafety, onLogout, onUpgrade, onNewReflection,
}: Props) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelDone, setCancelDone] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 520);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('blunnit_pinned_convos');
      if (stored) setPinnedIds(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  const togglePin = (id: string) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try { localStorage.setItem('blunnit_pinned_convos', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this reflection? This cannot be undone.')) return;
    await fetch(`/api/conversations?id=${id}`, { method: 'DELETE' });
    onDeleteConvo(id);
    setPinnedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      try { localStorage.setItem('blunnit_pinned_convos', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const startEdit = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle || '');
  };

  const commitEdit = async (id: string) => {
    const trimmed = editTitle.trim();
    if (trimmed) {
      await fetch('/api/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: id, title: trimmed }),
      });
      onRenameConvo(id, trimmed);
    }
    setEditingId(null);
  };

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

  const isPaid = user?.tier === 'paid';

  const sortedConvos = [...savedConvos].sort((a, b) => {
    const ap = pinnedIds.has(a.id) ? 1 : 0;
    const bp = pinnedIds.has(b.id) ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const panelWidth = isMobile ? '100vw' : 300;

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

      {/* Panel - slides from LEFT */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: panelWidth, zIndex: 201,
        background: '#000', borderRight: isMobile ? 'none' : '1px solid var(--border)',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        display: 'flex', flexDirection: 'column',
        padding: '24px 20px',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexShrink: 0 }}>
          <span style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: F }}>
            Account
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 20, fontFamily: F, lineHeight: 1, padding: 0 }}
          >
            x
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {user && (
            <>
              {/* Account info */}
              <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <p style={{ fontSize: 14, color: 'var(--text)', margin: '0 0 6px 0', fontFamily: F, wordBreak: 'break-all', fontWeight: 300 }}>
                  {user.email}
                </p>
                <p style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0, fontFamily: F }}>
                  {isPaid ? '◆ Full Access' : 'Free'}
                </p>
              </div>

              {/* History: paid only */}
              {isPaid ? (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 10px 0', fontFamily: F, flexShrink: 0 }}>
                    Past Reflections
                  </p>

                  {sortedConvos.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: F, fontWeight: 300, margin: 0 }}>
                      No reflections yet.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {sortedConvos.slice(0, 30).map((c) => {
                        const pinned = pinnedIds.has(c.id);

                        if (editingId === c.id) {
                          return (
                            <div key={c.id} style={{ border: '1px solid var(--border-hover)', padding: '8px 10px' }}>
                              <input
                                autoFocus
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onBlur={() => commitEdit(c.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitEdit(c.id);
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                                style={{
                                  width: '100%', background: 'transparent', border: 'none',
                                  color: 'var(--text)', fontSize: 12, fontFamily: F,
                                  fontWeight: 300, outline: 'none', padding: 0,
                                }}
                              />
                            </div>
                          );
                        }

                        return (
                          <div
                            key={c.id}
                            style={{
                              display: 'flex', alignItems: 'stretch',
                              border: `1px solid ${pinned ? 'var(--border-hover)' : 'var(--border)'}`,
                            }}
                          >
                            <button
                              onClick={() => { onLoadConvo(c.id); onClose(); }}
                              style={{
                                flex: 1, textAlign: 'left', padding: '9px 10px',
                                background: 'transparent', border: 'none',
                                color: 'var(--text)', cursor: 'pointer', fontFamily: F,
                                minWidth: 0,
                              }}
                            >
                              <div style={{ fontSize: 12, fontWeight: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {pinned && <span style={{ marginRight: 4, fontSize: 8, color: 'var(--text-dim)' }}>+</span>}
                                {c.title || 'Untitled reflection'}
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                {new Date(c.updated_at).toLocaleDateString()}
                              </div>
                            </button>

                            <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', flexShrink: 0 }}>
                              <button
                                onClick={() => startEdit(c.id, c.title)}
                                title="Rename"
                                style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 7px', fontSize: 11, fontFamily: F }}
                              >
                                e
                              </button>
                              <button
                                onClick={() => togglePin(c.id)}
                                title={pinned ? 'Unpin' : 'Pin'}
                                style={{ flex: 1, background: 'none', border: 'none', color: pinned ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer', padding: '0 7px', fontSize: 9, fontFamily: F }}
                              >
                                p
                              </button>
                              <button
                                onClick={() => handleDelete(c.id)}
                                title="Delete"
                                style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 7px', fontSize: 13, fontFamily: F }}
                              >
                                x
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ marginBottom: 20, padding: '16px', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 14px 0', fontFamily: F, fontWeight: 300, lineHeight: 1.7 }}>
                    Upgrade to Full Access to save and revisit your reflections.
                  </p>
                  <button
                    onClick={() => { onClose(); onUpgrade(); }}
                    style={{
                      width: '100%', padding: '10px 0',
                      background: 'none', border: '1px solid var(--border-hover)',
                      color: 'var(--text)', fontSize: 10, letterSpacing: 2,
                      textTransform: 'uppercase', cursor: 'pointer', fontFamily: F,
                    }}
                  >
                    Get Full Access
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Fixed bottom section */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 7, paddingTop: 14, borderTop: '1px solid var(--border)' }}>

          {/* New Reflection */}
          <button
            onClick={() => { onClose(); onNewReflection(); }}
            style={{
              padding: '11px 0', background: 'none',
              border: '1px solid var(--border-hover)',
              color: 'var(--text)', fontSize: 10, letterSpacing: 2,
              textTransform: 'uppercase', cursor: 'pointer', fontFamily: F,
            }}
          >
            New Reflection
          </button>

          {/* Pattern Report (paid only) */}
          {isPaid && (
            <div style={{ padding: '12px 14px', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 4px 0', fontFamily: F }}>
                Pattern Report
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, fontFamily: F, fontWeight: 300, fontStyle: 'italic' }}>
                Pattern reports coming soon.
              </p>
            </div>
          )}

          {/* 7-Day Protocol */}
          <a
            href="https://blunnit.gumroad.com/l/protocol"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', padding: '11px 0',
              border: '1px solid rgba(212, 207, 200, 0.25)',
              color: 'var(--accent)', fontSize: 10, letterSpacing: 2,
              textTransform: 'uppercase', textDecoration: 'none',
              textAlign: 'center', fontFamily: F,
            }}
          >
            7-Day Protocol
          </a>

          {/* Safety */}
          <button
            onClick={() => { onClose(); onShowSafety(); }}
            style={{
              padding: '11px 0', background: 'none',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 10, letterSpacing: 2,
              textTransform: 'uppercase', cursor: 'pointer', fontFamily: F,
            }}
          >
            Safety & Disclaimer
          </button>

          {/* Cancel Subscription (paid only) */}
          {isPaid && !cancelDone && (
            <button
              onClick={handleCancelSubscription}
              disabled={cancelling}
              style={{
                padding: '11px 0', background: 'none',
                border: '1px solid rgba(255,107,107,0.3)',
                color: '#ff6b6b', fontSize: 10, letterSpacing: 2,
                textTransform: 'uppercase', cursor: cancelling ? 'default' : 'pointer',
                fontFamily: F, opacity: cancelling ? 0.5 : 1,
              }}
            >
              {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
            </button>
          )}

          {cancelDone && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', fontFamily: F, margin: '2px 0' }}>
              Subscription cancelled. Access continues until period end.
            </p>
          )}

          {/* Log Out */}
          <button
            onClick={onLogout}
            style={{
              padding: '11px 0', background: 'none',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 10, letterSpacing: 2,
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
