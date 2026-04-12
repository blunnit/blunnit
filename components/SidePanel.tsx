'use client';

import { useState, useEffect, useRef } from 'react';

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
  onDeleteAccount: () => void;
};

const hoverMuted = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
  const el = e.currentTarget as HTMLElement;
  el.style.color = 'var(--text-dim)';
  el.style.borderColor = 'var(--border-hover)';
};
const unhoverMuted = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
  const el = e.currentTarget as HTMLElement;
  el.style.color = 'var(--text-muted)';
  el.style.borderColor = 'var(--border)';
};

export default function SidePanel({
  open, user, savedConvos, onClose, onLoadConvo, onDeleteConvo, onRenameConvo,
  onShowSafety, onLogout, onUpgrade, onNewReflection, onDeleteAccount,
}: Props) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelDone, setCancelDone] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!openMenuId) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
        setConfirmDeleteId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuId]);

  const togglePin = (id: string) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try { localStorage.setItem('blunnit_pinned_convos', JSON.stringify([...next])); } catch {}
      return next;
    });
    setOpenMenuId(null);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/conversations?id=${id}`, { method: 'DELETE', headers: { 'x-user-id': user?.id || '' } });
    onDeleteConvo(id);
    setPinnedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      try { localStorage.setItem('blunnit_pinned_convos', JSON.stringify([...next])); } catch {}
      return next;
    });
    setOpenMenuId(null);
    setConfirmDeleteId(null);
  };

  const startEdit = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle || '');
    setOpenMenuId(null);
  };

  const commitEdit = async (id: string) => {
    const trimmed = editTitle.trim();
    if (trimmed) {
      await fetch('/api/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
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

      {/* Panel */}
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
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 20, fontFamily: F, lineHeight: 1, padding: 0, transition: 'color 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; }}
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
                        const menuOpen = openMenuId === c.id;
                        const confirmingDelete = confirmDeleteId === c.id;

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
                              position: 'relative',
                              border: `1px solid ${pinned ? 'var(--border-hover)' : 'var(--border)'}`,
                              transition: 'border-color 0.2s ease',
                            }}
                            ref={menuOpen ? menuRef : undefined}
                            onMouseEnter={e => { if (!pinned) e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
                            onMouseLeave={e => { if (!pinned) e.currentTarget.style.borderColor = 'var(--border)'; }}
                          >
                            <div style={{ display: 'flex', alignItems: 'stretch' }}>
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
                                  {pinned && <span style={{ marginRight: 5, fontSize: 9, color: 'var(--text-dim)', verticalAlign: 'middle' }}>◆</span>}
                                  {c.title || 'Untitled reflection'}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                  {new Date(c.updated_at).toLocaleDateString()}
                                </div>
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(menuOpen ? null : c.id);
                                  setConfirmDeleteId(null);
                                }}
                                style={{
                                  background: 'none', border: 'none', borderLeft: '1px solid var(--border)',
                                  color: menuOpen ? 'var(--text)' : 'var(--text-muted)',
                                  cursor: 'pointer', padding: '0 10px', fontSize: 16,
                                  fontFamily: F, flexShrink: 0, lineHeight: 1,
                                  transition: 'color 0.2s ease',
                                }}
                                onMouseEnter={e => { if (!menuOpen) e.currentTarget.style.color = 'var(--text-dim)'; }}
                                onMouseLeave={e => { if (!menuOpen) e.currentTarget.style.color = 'var(--text-muted)'; }}
                              >
                                ⋮
                              </button>
                            </div>

                            {/* Dropdown */}
                            {menuOpen && (
                              <div style={{
                                position: 'absolute', right: 0, top: '100%',
                                zIndex: 10, minWidth: 150,
                                background: '#000', border: '1px solid var(--border)',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
                              }}>
                                {!confirmingDelete ? (
                                  <>
                                    <button
                                      onClick={() => startEdit(c.id, c.title)}
                                      style={{
                                        display: 'block', width: '100%', textAlign: 'left',
                                        padding: '10px 14px', background: 'none', border: 'none',
                                        borderBottom: '1px solid var(--border)',
                                        color: 'var(--text-dim)', fontSize: 12, fontFamily: F,
                                        fontWeight: 300, cursor: 'pointer', letterSpacing: 0.5,
                                        transition: 'color 0.2s ease',
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; }}
                                    >
                                      Rename
                                    </button>
                                    <button
                                      onClick={() => togglePin(c.id)}
                                      style={{
                                        display: 'block', width: '100%', textAlign: 'left',
                                        padding: '10px 14px', background: 'none', border: 'none',
                                        borderBottom: '1px solid var(--border)',
                                        color: 'var(--text-dim)', fontSize: 12, fontFamily: F,
                                        fontWeight: 300, cursor: 'pointer', letterSpacing: 0.5,
                                        transition: 'color 0.2s ease',
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; }}
                                    >
                                      {pinned ? 'Unpin' : 'Pin'}
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(c.id)}
                                      style={{
                                        display: 'block', width: '100%', textAlign: 'left',
                                        padding: '10px 14px', background: 'none', border: 'none',
                                        color: '#6b3030', fontSize: 12, fontFamily: F,
                                        fontWeight: 300, cursor: 'pointer', letterSpacing: 0.5,
                                        transition: 'color 0.2s ease',
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.color = '#ff6b6b'; }}
                                      onMouseLeave={e => { e.currentTarget.style.color = '#6b3030'; }}
                                    >
                                      Delete
                                    </button>
                                  </>
                                ) : (
                                  <div style={{ padding: '12px 14px' }}>
                                    <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '0 0 10px 0', fontFamily: F, fontWeight: 300, lineHeight: 1.5 }}>
                                      Delete this reflection?
                                    </p>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                      <button
                                        onClick={() => handleDelete(c.id)}
                                        style={{
                                          flex: 1, padding: '7px 0', background: 'none',
                                          border: '1px solid #4a2020',
                                          color: '#6b3030', fontSize: 10, fontFamily: F,
                                          letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
                                          transition: 'border-color 0.2s ease, color 0.2s ease',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff6b6b'; e.currentTarget.style.color = '#ff6b6b'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#4a2020'; e.currentTarget.style.color = '#6b3030'; }}
                                      >
                                        Yes
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteId(null)}
                                        style={{
                                          flex: 1, padding: '7px 0', background: 'none',
                                          border: '1px solid var(--border)',
                                          color: 'var(--text-muted)', fontSize: 10, fontFamily: F,
                                          letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
                                          transition: 'border-color 0.2s ease, color 0.2s ease',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 10px 0', fontFamily: F }}>
                    Past Reflections
                  </p>
                  {savedConvos.length > 0 ? (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
                        {savedConvos.slice(0, 15).map(c => (
                          <button
                            key={c.id}
                            onClick={() => { onClose(); onUpgrade(); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '9px 10px', border: '1px solid var(--border)',
                              background: 'transparent', width: '100%', textAlign: 'left',
                              cursor: 'pointer', fontFamily: F,
                              transition: 'border-color 0.2s ease',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                          >
                            <span style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.5, flexShrink: 0 }}>■</span>
                            <span style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              {c.title || 'Untitled reflection'}
                            </span>
                          </button>
                        ))}
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 12px 0', fontFamily: F, fontWeight: 300, lineHeight: 1.6 }}>
                        Upgrade to revisit past reflections.
                      </p>
                    </>
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: F, fontWeight: 300, margin: '0 0 14px 0' }}>
                      No reflections yet.
                    </p>
                  )}
                  <button
                    onClick={() => { onClose(); onUpgrade(); }}
                    style={{
                      width: '100%', padding: '10px 0',
                      background: 'none', border: '1px solid var(--border-hover)',
                      color: 'var(--text)', fontSize: 10, letterSpacing: 2,
                      textTransform: 'uppercase', cursor: 'pointer', fontFamily: F,
                      transition: 'border-color 0.2s ease, color 0.2s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text)'; }}
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

          <button
            onClick={() => { onClose(); onNewReflection(); }}
            style={{
              padding: '11px 0', background: 'none',
              border: '1px solid var(--border-hover)',
              color: 'var(--text)', fontSize: 10, letterSpacing: 2,
              textTransform: 'uppercase', cursor: 'pointer', fontFamily: F,
              transition: 'border-color 0.2s ease, color 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
          >
            New Reflection
          </button>

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
              transition: 'border-color 0.2s ease, color 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212, 207, 200, 0.5)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212, 207, 200, 0.25)'; e.currentTarget.style.color = 'var(--accent)'; }}
          >
            7-Day Protocol
          </a>

          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', padding: '11px 0', textAlign: 'center',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 10, letterSpacing: 2,
              textTransform: 'uppercase', textDecoration: 'none', fontFamily: F,
              transition: 'border-color 0.2s ease, color 0.2s ease',
            }}
            onMouseEnter={e => hoverMuted(e)}
            onMouseLeave={e => unhoverMuted(e)}
          >
            Privacy Policy
          </a>

          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', padding: '11px 0', textAlign: 'center',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 10, letterSpacing: 2,
              textTransform: 'uppercase', textDecoration: 'none', fontFamily: F,
              transition: 'border-color 0.2s ease, color 0.2s ease',
            }}
            onMouseEnter={e => hoverMuted(e)}
            onMouseLeave={e => unhoverMuted(e)}
          >
            Terms of Service
          </a>

          <button
            onClick={() => { onClose(); onShowSafety(); }}
            style={{
              padding: '11px 0', background: 'none',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 10, letterSpacing: 2,
              textTransform: 'uppercase', cursor: 'pointer', fontFamily: F,
              transition: 'border-color 0.2s ease, color 0.2s ease',
            }}
            onMouseEnter={e => hoverMuted(e)}
            onMouseLeave={e => unhoverMuted(e)}
          >
            Safety & Disclaimer
          </button>

          {isPaid && !cancelDone && (
            <button
              onClick={handleCancelSubscription}
              disabled={cancelling}
              style={{
                padding: '11px 0', background: 'none',
                border: '1px solid #4a2020',
                color: '#4a2020', fontSize: 10, letterSpacing: 2,
                textTransform: 'uppercase', cursor: cancelling ? 'default' : 'pointer',
                fontFamily: F, opacity: cancelling ? 0.5 : 1,
                transition: 'border-color 0.2s ease, color 0.2s ease',
              }}
              onMouseEnter={e => { if (!cancelling) { e.currentTarget.style.borderColor = '#6b3030'; e.currentTarget.style.color = '#6b3030'; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#4a2020'; e.currentTarget.style.color = '#4a2020'; }}
            >
              {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
            </button>
          )}

          {cancelDone && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', fontFamily: F, margin: '2px 0' }}>
              Subscription cancelled. Access continues until period end.
            </p>
          )}

          <button
            onClick={onLogout}
            style={{
              padding: '11px 0', background: 'none',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 10, letterSpacing: 2,
              textTransform: 'uppercase', cursor: 'pointer', fontFamily: F,
              transition: 'border-color 0.2s ease, color 0.2s ease',
            }}
            onMouseEnter={e => hoverMuted(e)}
            onMouseLeave={e => unhoverMuted(e)}
          >
            Log Out
          </button>

          {/* Delete Account */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                padding: '11px 0', background: 'none',
                border: '1px solid #4a2020',
                color: '#4a2020', fontSize: 10, letterSpacing: 2,
                textTransform: 'uppercase', cursor: 'pointer', fontFamily: F,
                transition: 'border-color 0.2s ease, color 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#6b3030'; e.currentTarget.style.color = '#6b3030'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#4a2020'; e.currentTarget.style.color = '#4a2020'; }}
            >
              Delete Account
            </button>
          ) : (
            <div style={{ border: '1px solid #4a2020', padding: '14px 16px' }}>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 4px 0', fontFamily: F, fontWeight: 300, lineHeight: 1.6 }}>
                Permanently delete your account, all conversations, and all data. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  onClick={async () => {
                    setDeleting(true);
                    await onDeleteAccount();
                    setDeleting(false);
                    setConfirmDelete(false);
                  }}
                  disabled={deleting}
                  style={{
                    flex: 1, padding: '8px 0', background: 'none',
                    border: '1px solid #4a2020', color: '#6b3030',
                    fontSize: 10, fontFamily: F, letterSpacing: 1,
                    textTransform: 'uppercase', cursor: deleting ? 'default' : 'pointer',
                    opacity: deleting ? 0.5 : 1,
                    transition: 'border-color 0.2s ease, color 0.2s ease',
                  }}
                  onMouseEnter={e => { if (!deleting) { e.currentTarget.style.borderColor = '#ff6b6b'; e.currentTarget.style.color = '#ff6b6b'; } }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#4a2020'; e.currentTarget.style.color = '#6b3030'; }}
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    flex: 1, padding: '8px 0', background: 'none',
                    border: '1px solid var(--border)', color: 'var(--text-muted)',
                    fontSize: 10, fontFamily: F, letterSpacing: 1,
                    textTransform: 'uppercase', cursor: 'pointer',
                    transition: 'border-color 0.2s ease, color 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
