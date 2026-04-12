'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';

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
  displayName: string | null;
  showDailyPrompt: boolean;
  onToggleDailyPrompt: () => void;
  showHowItWorksPref: boolean;
  onToggleHowItWorks: () => void;
  onChangeName: (name: string) => Promise<void>;
  isDesktop?: boolean;
  onSignIn?: () => void;
  onToggleSidebar?: () => void;
};

export default function SidePanel({
  open, user, savedConvos, onClose, onLoadConvo, onDeleteConvo, onRenameConvo,
  onShowSafety, onLogout, onUpgrade, onNewReflection, onDeleteAccount,
  displayName, showDailyPrompt, onToggleDailyPrompt, showHowItWorksPref, onToggleHowItWorks, onChangeName,
  isDesktop = false, onSignIn, onToggleSidebar,
}: Props) {
  const [manageView, setManageView] = useState(false);
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

  // Manage view state
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

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

  // Reset manage view when panel closes
  useEffect(() => {
    if (!open) {
      setManageView(false);
      setEditingName(false);
      setChangingPassword(false);
      setPasswordError(null);
      setPasswordSuccess(false);
    }
  }, [open]);

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

  const handleSaveName = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed) { setEditingName(false); return; }
    setSavingName(true);
    try {
      await onChangeName(trimmed);
    } catch {}
    setSavingName(false);
    setEditingName(false);
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    if (!newPassword) { setPasswordError('Enter a new password.'); return; }
    if (newPassword.length < 6) { setPasswordError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return; }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { setPasswordError(error.message); }
      else {
        setPasswordSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => { setChangingPassword(false); setPasswordSuccess(false); }, 2000);
      }
    } catch { setPasswordError('Something went wrong.'); }
    setSavingPassword(false);
  };

  const isPaid = user?.tier === 'paid';

  const sortedConvos = [...savedConvos].sort((a, b) => {
    const ap = pinnedIds.has(a.id) ? 1 : 0;
    const bp = pinnedIds.has(b.id) ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const panelWidth = isMobile ? '100vw' : 300;

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    background: '#0e0e0e', border: '1px solid var(--border)',
    color: 'var(--text)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box' as const, fontFamily: F, fontWeight: 300,
    marginBottom: 8,
  };

  const sectionLabel = {
    fontSize: 9, letterSpacing: 3, textTransform: 'uppercase' as const,
    color: 'var(--text-dim)', margin: '0 0 10px 0', fontFamily: F,
  };

  const rowBtn = (dimRed = false, disabled = false) => ({
    width: '100%', padding: '11px 14px', background: 'none',
    border: `1px solid ${dimRed ? '#4a2020' : 'rgba(212, 207, 200, 0.25)'}`,
    color: dimRed ? '#8b3a3a' : 'var(--accent)',
    fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' as const,
    cursor: disabled ? 'default' : 'pointer', fontFamily: F,
    transition: 'border-color 0.2s ease, color 0.2s ease',
    opacity: disabled ? 0.5 : 1,
    textAlign: 'left' as const,
  });

  return (
    <>
      {/* Overlay — mobile only */}
      {!isDesktop && (
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
      )}

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: isDesktop ? 280 : panelWidth,
        zIndex: 201,
        background: '#000',
        borderRight: '1px solid var(--border)',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        display: 'flex', flexDirection: 'column',
        padding: '24px 20px',
      }}>

        {/* Logo — desktop only, main view only */}
        {isDesktop && !manageView && (
          <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)', flexShrink: 0, position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <img src="/logo.png" alt="" style={{ width: 24, height: 'auto', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                title="Collapse sidebar"
                style={{ position: 'absolute', top: 0, right: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '2px 4px', lineHeight: 1, fontFamily: F, transition: 'color 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-dim)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                {String.fromCharCode(8592)}
              </button>
            )}
          </div>
        )}

        {/* Header — always on mobile, only in manage view on desktop */}
        {(!isDesktop || manageView) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexShrink: 0 }}>
            {manageView ? (
              <button
                onClick={() => { setManageView(false); setEditingName(false); setChangingPassword(false); setPasswordError(null); setPasswordSuccess(false); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', fontFamily: F, padding: 0, transition: 'color 0.2s ease' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; }}
              >
                {String.fromCharCode(8592)} Account
              </button>
            ) : (
              <span style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: F }}>
                Account
              </span>
            )}
            {!isDesktop && (
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 20, fontFamily: F, lineHeight: 1, padding: 0, transition: 'color 0.2s ease' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; }}
              >
                x
              </button>
            )}
          </div>
        )}

        {/* Main view */}
        {!manageView && (
          <>
            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {!user && isDesktop && (
                <div style={{ marginBottom: 20 }}>
                  <button
                    onClick={onSignIn}
                    style={{ width: '100%', padding: '12px 0', background: 'none', border: '1px solid var(--border-hover)', color: 'var(--text)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', fontFamily: F, transition: 'border-color 0.2s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
                  >
                    Sign In / Sign Up
                  </button>
                </div>
              )}
              {user && (
                <>
                  {/* Account info */}
                  <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                    {displayName && (
                      <p style={{ fontSize: 15, color: 'var(--text)', margin: '0 0 2px 0', fontFamily: F, fontWeight: 300 }}>
                        {displayName}
                      </p>
                    )}
                    <p style={{ fontSize: 13, color: displayName ? 'var(--text-dim)' : 'var(--text)', margin: '0 0 6px 0', fontFamily: F, wordBreak: 'break-all', fontWeight: 300 }}>
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
                                      {c.title || 'New Reflection'}
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
                                    {String.fromCharCode(8942)}
                                  </button>
                                </div>

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
                                  {c.title || 'New Reflection'}
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
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
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
                  transition: 'border-color 0.2s ease',
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

              {user && (
                <button
                  onClick={() => { setManageView(true); setNameValue(displayName || ''); }}
                  style={{
                    padding: '11px 14px', background: 'none',
                    border: '1px solid var(--border-hover)',
                    color: 'var(--text)', fontSize: 10, letterSpacing: 2,
                    textTransform: 'uppercase', cursor: 'pointer', fontFamily: F,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: 'border-color 0.2s ease, color 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
                >
                  <span>Manage Account</span>
                  <span style={{ fontSize: 10 }}>{String.fromCharCode(8250)}</span>
                </button>
              )}

            </div>
          </>
        )}

        {/* Manage Account view */}
        {manageView && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

            {/* Profile section */}
            <div style={{ marginBottom: 28 }}>
              <p style={sectionLabel}>Profile</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>

                {/* Change Name */}
                {!editingName ? (
                  <div style={{ padding: '10px 14px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: F, fontWeight: 300 }}>
                      {displayName || 'No name set'}
                    </span>
                    <button
                      onClick={() => { setEditingName(true); setNameValue(displayName || ''); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', fontFamily: F, transition: 'color 0.2s ease', padding: 0 }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; }}
                    >
                      Edit Name
                    </button>
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--border-hover)', padding: '10px 14px' }}>
                    <input
                      autoFocus
                      value={nameValue}
                      onChange={e => setNameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                      placeholder="Your name"
                      style={{ ...inputStyle, marginBottom: 10 }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={handleSaveName}
                        disabled={savingName}
                        style={{ flex: 1, padding: '8px 0', background: 'none', border: '1px solid var(--border-hover)', color: 'var(--text-dim)', fontSize: 10, fontFamily: F, letterSpacing: 1, textTransform: 'uppercase', cursor: savingName ? 'default' : 'pointer', transition: 'border-color 0.2s ease, color 0.2s ease' }}
                        onMouseEnter={e => { if (!savingName) { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text)'; } }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
                      >
                        {savingName ? '...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingName(false)}
                        style={{ flex: 1, padding: '8px 0', background: 'none', border: '1px solid var(--border-hover)', color: 'var(--text-dim)', fontSize: 10, fontFamily: F, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', transition: 'border-color 0.2s ease, color 0.2s ease' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Change Password */}
                {!changingPassword ? (
                  <button
                    onClick={() => { setChangingPassword(true); setPasswordError(null); setPasswordSuccess(false); }}
                    style={{ ...rowBtn(), textAlign: 'center' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'rgba(212, 207, 200, 0.25)'; }}
                  >
                    Change Password
                  </button>
                ) : (
                  <div style={{ border: '1px solid var(--border)', padding: '12px 14px' }}>
                    {passwordSuccess ? (
                      <p style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: F, fontWeight: 300, margin: 0 }}>Password updated.</p>
                    ) : (
                      <>
                        <input
                          type="password"
                          placeholder="New password (min 6)"
                          value={newPassword}
                          onChange={e => { setNewPassword(e.target.value); setPasswordError(null); }}
                          style={inputStyle}
                        />
                        <input
                          type="password"
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={e => { setConfirmPassword(e.target.value); setPasswordError(null); }}
                          onKeyDown={e => { if (e.key === 'Enter') handleChangePassword(); }}
                          style={{ ...inputStyle, marginBottom: 10 }}
                        />
                        {passwordError && (
                          <p style={{ fontSize: 12, color: '#ff6b6b', fontFamily: F, margin: '0 0 10px 0' }}>{passwordError}</p>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={handleChangePassword}
                            disabled={savingPassword}
                            style={{ flex: 1, padding: '8px 0', background: 'none', border: '1px solid var(--border-hover)', color: 'var(--text-dim)', fontSize: 10, fontFamily: F, letterSpacing: 1, textTransform: 'uppercase', cursor: savingPassword ? 'default' : 'pointer', transition: 'border-color 0.2s ease, color 0.2s ease' }}
                            onMouseEnter={e => { if (!savingPassword) { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text)'; } }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
                          >
                            {savingPassword ? '...' : 'Update'}
                          </button>
                          <button
                            onClick={() => { setChangingPassword(false); setNewPassword(''); setConfirmPassword(''); setPasswordError(null); }}
                            style={{ flex: 1, padding: '8px 0', background: 'none', border: '1px solid var(--border-hover)', color: 'var(--text-dim)', fontSize: 10, fontFamily: F, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', transition: 'border-color 0.2s ease, color 0.2s ease' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

              </div>
            </div>

            {/* Preferences section */}
            <div style={{ marginBottom: 0 }}>
              <p style={sectionLabel}>Preferences</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ padding: '12px 14px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: F, fontWeight: 300 }}>Show Daily Prompt</span>
                  <button
                    onClick={onToggleDailyPrompt}
                    style={{
                      padding: '4px 10px', background: 'none',
                      border: `1px solid ${showDailyPrompt ? 'var(--border-hover)' : 'var(--border)'}`,
                      color: showDailyPrompt ? 'var(--text-dim)' : 'var(--text-muted)',
                      fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
                      cursor: 'pointer', fontFamily: F, transition: 'all 0.2s ease',
                      flexShrink: 0,
                    }}
                  >
                    {showDailyPrompt ? 'On' : 'Off'}
                  </button>
                </div>
                <div style={{ padding: '12px 14px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: F, fontWeight: 300 }}>Show How It Works</span>
                  <button
                    onClick={onToggleHowItWorks}
                    style={{
                      padding: '4px 10px', background: 'none',
                      border: `1px solid ${showHowItWorksPref ? 'var(--border-hover)' : 'var(--border)'}`,
                      color: showHowItWorksPref ? 'var(--text-dim)' : 'var(--text-muted)',
                      fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
                      cursor: 'pointer', fontFamily: F, transition: 'all 0.2s ease',
                      flexShrink: 0,
                    }}
                  >
                    {showHowItWorksPref ? 'On' : 'Off'}
                  </button>
                </div>
              </div>
            </div>

            {/* Legal + Account pinned to bottom */}
            <div style={{ marginTop: 'auto', paddingTop: 28, display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 8 }}>

            {/* Legal section */}
            <div>
              <p style={sectionLabel}>Legal</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>

                <a
                  href="/privacy"
                  style={{
                    display: 'block', padding: '11px 14px', textAlign: 'center',
                    border: '1px solid rgba(212, 207, 200, 0.25)',
                    color: 'var(--accent)', fontSize: 10, letterSpacing: 2,
                    textTransform: 'uppercase', textDecoration: 'none', fontFamily: F,
                    transition: 'border-color 0.2s ease, color 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'rgba(212, 207, 200, 0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'rgba(212, 207, 200, 0.25)'; }}
                >
                  Privacy Policy
                </a>

                <a
                  href="/terms"
                  style={{
                    display: 'block', padding: '11px 14px', textAlign: 'center',
                    border: '1px solid rgba(212, 207, 200, 0.25)',
                    color: 'var(--accent)', fontSize: 10, letterSpacing: 2,
                    textTransform: 'uppercase', textDecoration: 'none', fontFamily: F,
                    transition: 'border-color 0.2s ease, color 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'rgba(212, 207, 200, 0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'rgba(212, 207, 200, 0.25)'; }}
                >
                  Terms of Service
                </a>

                <button
                  onClick={() => { onClose(); onShowSafety(); }}
                  style={{ ...rowBtn(), textAlign: 'center' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'rgba(212, 207, 200, 0.25)'; }}
                >
                  Safety & Disclaimer
                </button>

              </div>
            </div>

            {/* Account section */}
            <div>
              <p style={sectionLabel}>Account</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>

                {isPaid && !cancelDone && (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={cancelling}
                    style={{ ...rowBtn(true, cancelling), textAlign: 'center' }}
                    onMouseEnter={e => { if (!cancelling) { e.currentTarget.style.borderColor = '#5a2828'; e.currentTarget.style.color = '#a54545'; } }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#4a2020'; e.currentTarget.style.color = '#8b3a3a'; }}
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
                  style={{ ...rowBtn(), textAlign: 'center' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'rgba(212, 207, 200, 0.25)'; }}
                >
                  Log Out
                </button>

                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    style={{ ...rowBtn(true), textAlign: 'center' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#5a2828'; e.currentTarget.style.color = '#a54545'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#4a2020'; e.currentTarget.style.color = '#8b3a3a'; }}
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
                          border: '1px solid #4a2020', color: '#8b3a3a',
                          fontSize: 10, fontFamily: F, letterSpacing: 1,
                          textTransform: 'uppercase', cursor: deleting ? 'default' : 'pointer',
                          opacity: deleting ? 0.5 : 1,
                          transition: 'border-color 0.2s ease, color 0.2s ease',
                        }}
                        onMouseEnter={e => { if (!deleting) { e.currentTarget.style.borderColor = '#5a2828'; e.currentTarget.style.color = '#a54545'; } }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#4a2020'; e.currentTarget.style.color = '#8b3a3a'; }}
                      >
                        {deleting ? 'Deleting...' : 'Yes, Delete'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        style={{
                          flex: 1, padding: '8px 0', background: 'none',
                          border: '1px solid var(--border-hover)', color: 'var(--text-dim)',
                          fontSize: 10, fontFamily: F, letterSpacing: 1,
                          textTransform: 'uppercase', cursor: 'pointer',
                          transition: 'border-color 0.2s ease, color 0.2s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>

            </div>{/* end bottom-pinned wrapper */}

          </div>
        )}
      </div>
    </>
  );
}
