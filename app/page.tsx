'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { getDailyPrompt } from '@/lib/daily-prompts';
import { CONFRONTATION_LEVELS } from '@/lib/constants';
import AuthModal from '@/components/AuthModal';
import UpgradePage from '@/components/UpgradePage';
import SidePanel from '@/components/SidePanel';

type Message = { role: 'user' | 'assistant'; content: string; level?: string };
type UserState = { id: string; email: string; tier: string } | null;
type SavedConvo = { id: string; title: string; updated_at: string; confrontation_level: string };

const ANON_LIMIT = 3;
const FREE_WEEKLY_LIMIT = 10;
const F = "'Cormorant Garamond', Georgia, serif";

function trackReflectDay(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `blunnit_reflect_days_${userId}`;
    const stored = localStorage.getItem(key);
    const days: string[] = stored ? JSON.parse(stored) : [];
    const today = new Date().toISOString().split('T')[0];
    if (!days.includes(today)) {
      days.push(today);
      localStorage.setItem(key, JSON.stringify(days));
    }
  } catch {}
}

function getReflectDays(userId: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const key = `blunnit_reflect_days_${userId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored).length : 0;
  } catch { return 0; }
}

function getAnonCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const stored = localStorage.getItem('blunnit_anon');
    if (!stored) return 0;
    const data = JSON.parse(stored);
    const today = new Date().toISOString().split('T')[0];
    if (data.date !== today) { localStorage.removeItem('blunnit_anon'); return 0; }
    return data.count || 0;
  } catch { return 0; }
}

function incrementAnonCount(): void {
  if (typeof window === 'undefined') return;
  const today = new Date().toISOString().split('T')[0];
  const current = getAnonCount();
  localStorage.setItem('blunnit_anon', JSON.stringify({ date: today, count: current + 1 }));
}

export default function Home() {
  const [screen, setScreen] = useState<'disclaimer' | 'home' | 'mirror' | 'upgrade'>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('blunnit_accepted')) return 'home';
    return 'disclaimer';
  });
  const [journalText, setJournalText] = useState('');
  const [confrontation, setConfrontation] = useState('clear');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isReflecting, setIsReflecting] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSafetyInfo, setShowSafetyInfo] = useState(false);
  const [dailyPrompt] = useState(() => getDailyPrompt());
  const [user, setUser] = useState<UserState>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [anonUsed, setAnonUsed] = useState(0);
  const [freeRemaining, setFreeRemaining] = useState(FREE_WEEKLY_LIMIT);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [savedConvos, setSavedConvos] = useState<SavedConvo[]>([]);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [reflectDays, setReflectDays] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [userThemes, setUserThemes] = useState<{ theme: string; count: number }[]>([]);
  const [welcomeToast, setWelcomeToast] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => { setAnonUsed(getAnonCount()); }, []);

  useEffect(() => {
    if (user?.tier === 'paid') setReflectDays(getReflectDays(user.id));
  }, [user]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '', tier: 'free' });
      }
      setAuthLoading(false);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '', tier: 'free' });
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkLimits = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/check-limits', { headers: { 'x-user-id': user.id } });
      const data = await res.json();
      if (data.tier === 'paid') {
        if (user.tier !== 'paid') setUser(prev => prev ? { ...prev, tier: 'paid' } : null);
        setFreeRemaining(Infinity);
      } else {
        setFreeRemaining(data.remaining ?? FREE_WEEKLY_LIMIT);
      }
    } catch {}
  }, [user]);

  const loadConversations = useCallback(async () => {
    if (!user || user.tier !== 'paid') return;
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      setSavedConvos(data.conversations || []);
    } catch {}
  }, [user]);

  const loadThemes = useCallback(async () => {
    if (!user || user.tier !== 'paid') return;
    try {
      const res = await fetch('/api/extract-themes');
      const data = await res.json();
      setUserThemes(data.themes || []);
    } catch {}
  }, [user]);

  const loadConversation = async (convoId: string) => {
    try {
      const res = await fetch(`/api/conversations?id=${convoId}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages.map((m: any) => ({ role: m.role, content: m.content, level: m.confrontation_level })));
        setConversationId(convoId);
        setConfrontation(data.conversation?.confrontation_level || 'clear');
        setScreen('mirror');
      }
    } catch {}
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === 'true') {
      setWelcomeToast(true);
      const url = new URL(window.location.href);
      url.searchParams.delete('upgraded');
      window.history.replaceState({}, '', url.toString());
      const timer = setTimeout(() => setWelcomeToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const vv = (window as any).visualViewport;
    if (!vv) return;
    const handler = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardOffset(Math.max(0, offset));
    };
    vv.addEventListener('resize', handler);
    vv.addEventListener('scroll', handler);
    return () => { vv.removeEventListener('resize', handler); vv.removeEventListener('scroll', handler); };
  }, []);

  useEffect(() => { if (!authLoading && user) { checkLimits(); loadConversations(); loadThemes(); } }, [authLoading, user, checkLimits, loadConversations, loadThemes]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamedText]);

  const saveMessage = async (convId: string, role: string, content: string, level?: string) => {
    if (!user) return;
    await fetch('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'message', conversationId: convId, role, content, confrontationLevel: level }) });
  };

  const getOrCreateConversation = async (): Promise<string | null> => {
    if (!user || user.tier !== 'paid') return null;
    if (conversationId) return conversationId;
    const res = await fetch('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', confrontation, title: journalText.slice(0, 40) }) });
    const data = await res.json();
    if (data.conversation?.id) { setConversationId(data.conversation.id); return data.conversation.id; }
    return null;
  };

  const getRemaining = (): number => {
    if (!user) return Math.max(0, ANON_LIMIT - anonUsed);
    if (user.tier === 'paid') return Infinity;
    return freeRemaining;
  };

  const getTier = (): string => !user ? 'anonymous' : user.tier;

  const handleReflect = useCallback(async () => {
    if (!journalText.trim() || isReflecting) return;
    if (!user && anonUsed >= ANON_LIMIT) { setShowAuthModal(true); return; }
    if (user && user.tier === 'free' && freeRemaining <= 0) { setScreen('upgrade'); return; }
    setError(null); setIsReflecting(true); setStreamedText('');
    const userMessage: Message = { role: 'user', content: journalText };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    const reflectionLevel = confrontation;
    const wasNewConvo = !conversationId && user?.tier === 'paid';
    setJournalText(''); setScreen('mirror');
    const convId = await getOrCreateConversation();
    if (convId) await saveMessage(convId, 'user', userMessage.content);
    try {
      const response = await fetch('/api/reflect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })), confrontation: reflectionLevel, userThemes }) });
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData?.error || `Error: ${response.status}`); }
      const data = await response.json();
      const assistantText = data.reflection || 'The mirror is silent. Try again.';
      let i = 0;
      const typeWriter = () => {
        if (i < assistantText.length) { setStreamedText(assistantText.slice(0, i + 1)); i++; setTimeout(typeWriter, 18 + Math.random() * 12); }
        else {
          setMessages((prev) => [...prev, { role: 'assistant', content: assistantText, level: reflectionLevel }]);
          setStreamedText(''); setIsReflecting(false);
          if (convId) saveMessage(convId, 'assistant', assistantText, reflectionLevel);
          if (!user) { incrementAnonCount(); setAnonUsed(prev => prev + 1); }
          else {
            fetch('/api/check-limits', { method: 'POST', headers: { 'x-user-id': user.id } }).then(() => checkLimits());
            if (user.tier === 'paid') {
              trackReflectDay(user.id);
              setReflectDays(getReflectDays(user.id));
              fetch('/api/extract-themes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: assistantText }),
              }).then(() => fetch('/api/extract-themes').then(r => r.json()).then(d => setUserThemes(d.themes || [])));
              if (wasNewConvo && convId) {
                fetch('/api/generate-title', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ conversationId: convId, firstMessage: userMessage.content }),
                }).then(() => fetch('/api/conversations').then(r => r.json()).then(d => setSavedConvos(d.conversations || [])));
              } else {
                fetch('/api/conversations').then(r => r.json()).then(d => setSavedConvos(d.conversations || []));
              }
            }
          }
        }
      };
      typeWriter();
    } catch (err: any) { setError(err.message); setIsReflecting(false); }
  }, [journalText, messages, confrontation, isReflecting, user, anonUsed, freeRemaining, conversationId, userThemes]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReflect(); } };
  const goHome = () => { setMessages([]); setJournalText(''); setStreamedText(''); setError(null); setConversationId(null); setScreen('home'); };
  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); goHome(); };
  const handleDeleteConvo = (id: string) => {
    setSavedConvos(prev => prev.filter(c => c.id !== id));
    if (conversationId === id) { setConversationId(null); goHome(); }
  };
  const handleRenameConvo = (id: string, title: string) => {
    setSavedConvos(prev => prev.map(c => c.id === id ? { ...c, title } : c));
  };
  const getLevelInfo = (key: string) => CONFRONTATION_LEVELS.find((l) => l.key === key);

  const remaining = getRemaining();
  const tier = getTier();

  if (screen === 'upgrade') return <UpgradePage onBack={() => setScreen('home')} />;

  return (
    <div style={{ minHeight: '100vh', position: 'relative', fontFamily: F }}>
      {/* Grain */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, opacity: 0.03, background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

      {/* Fixed auth bar - always rendered, no layout shift */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10, padding: '10px 28px', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {!authLoading && user && (
              <button onClick={() => setShowSidePanel(true)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18, fontFamily: F, padding: '3px 13px', lineHeight: 1.3 }}>
                =
              </button>
            )}
          </div>
          <div>
            {!authLoading && !user && (
              <button onClick={() => setShowAuthModal(true)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', fontFamily: F, padding: '6px 14px' }}>
                Sign In / Up
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 520, margin: '0 auto', padding: '0 28px' }}>

        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={() => { setShowAuthModal(false); window.location.reload(); }} />}

        {welcomeToast && (
          <div style={{
            position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
            zIndex: 300, background: 'var(--surface)', border: '1px solid var(--border-hover)',
            padding: '14px 28px', fontFamily: F, fontSize: 13, color: 'var(--text)',
            letterSpacing: 2, textAlign: 'center', animation: 'fadeIn 0.3s ease',
            whiteSpace: 'nowrap', textTransform: 'uppercase',
          }}>
            Welcome to Full Access
          </div>
        )}

        <SidePanel
          open={showSidePanel}
          user={user}
          savedConvos={savedConvos}
          onClose={() => setShowSidePanel(false)}
          onLoadConvo={loadConversation}
          onDeleteConvo={handleDeleteConvo}
          onRenameConvo={handleRenameConvo}
          onShowSafety={() => setShowSafetyInfo(true)}
          onLogout={handleLogout}
          onUpgrade={() => setScreen('upgrade')}
          onNewReflection={() => { setShowSidePanel(false); goHome(); }}
        />

        {/* Safety Modal */}
        {showSafetyInfo && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
            <div style={{ maxWidth: 480, width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', padding: 32, maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <p style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-dim)', margin: 0, fontFamily: F }}>Safety & Disclaimer</p>
                <button onClick={() => setShowSafetyInfo(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18, fontFamily: F }}>x</button>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text)', marginBottom: 16, fontWeight: 300, fontFamily: F }}>BLUNNIT is a self-awareness tool. It is not therapy, counseling, or a medical service. It is not a substitute for professional mental health care.</p>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text)', marginBottom: 16, fontWeight: 300, fontFamily: F }}>The AI mirror provides reflections based on what you write. These reflections are not diagnoses, prescriptions, or professional advice.</p>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text)', marginBottom: 16, fontWeight: 300, fontFamily: F }}>BLUNNIT is not designed for individuals currently experiencing a mental health crisis. If you are in distress, please contact a professional immediately.</p>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--accent)', marginBottom: 12, fontWeight: 400, fontFamily: F }}>Crisis Resources:</p>
              <p style={{ fontSize: 14, lineHeight: 2, color: 'var(--text)', marginBottom: 4, fontWeight: 300, fontFamily: F }}>988 Suicide & Crisis Lifeline: call or text 988</p>
              <p style={{ fontSize: 14, lineHeight: 2, color: 'var(--text)', marginBottom: 4, fontWeight: 300, fontFamily: F }}>Crisis Text Line: text HOME to 741741</p>
              <p style={{ fontSize: 14, lineHeight: 2, color: 'var(--text)', marginBottom: 20, fontWeight: 300, fontFamily: F }}>Emergency Services: 911</p>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text)', marginBottom: 16, fontWeight: 300, fontFamily: F }}>If at any point during use you experience negative psychological effects, stop using the tool and seek professional help.</p>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-dim)', fontWeight: 300, fontFamily: F }}>By using BLUNNIT, you acknowledge that this tool provides AI-generated reflections for self-awareness purposes only. BLUNNIT, its creator, and its affiliates are not liable for decisions made based on the tool's output.</p>
            </div>
          </div>
        )}

        {/* ═══ DISCLAIMER ═══ */}
        {screen === 'disclaimer' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', animation: 'fadeIn 0.8s ease', padding: '40px 0' }}>
            <img src="/logo.png" alt="" style={{ width: 32, height: 'auto', marginBottom: 20 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <h1 style={{ fontSize: 28, fontWeight: 400, letterSpacing: 6, margin: '0 0 6px 0', fontFamily: F, textTransform: 'uppercase' }}>The Blunnit Mirror</h1>
            <p style={{ fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 40px 0', fontFamily: F }}>Pierce The Illusion</p>
            <div style={{ textAlign: 'left', width: '100%', border: '1px solid var(--border)', padding: 24, marginBottom: 24 }}>
              <p style={{ fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 16px 0', fontFamily: F }}>Before You Begin</p>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text)', marginBottom: 14, fontWeight: 300, fontFamily: F }}>BLUNNIT is a self-awareness tool powered by AI. It is not therapy, counseling, or a substitute for professional mental health care.</p>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text)', marginBottom: 14, fontWeight: 300, fontFamily: F }}>The mirror reflects what you write. It may challenge your thinking. It will not diagnose you, prescribe solutions, or replace professional support.</p>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text)', marginBottom: 14, fontWeight: 300, fontFamily: F }}>If you are currently experiencing a mental health crisis, please reach out to a professional. You can call or text 988 (Suicide & Crisis Lifeline) or text HOME to 741741 (Crisis Text Line).</p>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text-dim)', fontWeight: 300, fontFamily: F }}>By proceeding, you acknowledge that BLUNNIT provides AI-generated reflections for self-awareness purposes only, and that you assume full responsibility for how you use them.</p>
            </div>
            <button onClick={() => { localStorage.setItem('blunnit_accepted', 'true'); setScreen('home'); }} style={{ width: '100%', padding: '18px 0', background: 'var(--btn-bg)', color: 'var(--btn-text)', border: '1px solid var(--btn-bg)', fontSize: 14, letterSpacing: 3, textTransform: 'uppercase', cursor: 'pointer', fontFamily: F, fontWeight: 500 }}>I Understand, Enter</button>
          </div>
        )}

        {/* ═══ HOME ═══ */}
        {screen === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', textAlign: 'center', animation: 'fadeIn 0.8s ease', paddingTop: 60, paddingBottom: 40 }}>

            <img src="/logo.png" alt="" style={{ width: 36, height: 'auto', marginTop: 20, marginBottom: 16 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <h1 style={{ fontSize: 36, fontWeight: 400, letterSpacing: 8, margin: '0 0 4px 0', fontFamily: F, textTransform: 'uppercase' }}>The Blunnit Mirror</h1>
            <p style={{ fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 40px 0', fontFamily: F }}>Pierce The Illusion</p>

            {/* Tier status */}
            {!authLoading && tier !== 'paid' && (
              <div style={{ width: '100%', padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 24, textAlign: 'left' }}>
                {tier === 'anonymous' ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, fontFamily: F, lineHeight: 1.6 }}>
                      {remaining > 0 ? `${remaining} reflection${remaining !== 1 ? 's' : ''} remaining today. Go deep.` : 'You have used your guest reflections for today.'}
                    </p>
                    <button onClick={() => setShowAuthModal(true)} style={{ background: 'none', border: '1px solid var(--border-hover)', color: 'var(--text)', padding: '8px 14px', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', fontFamily: F, whiteSpace: 'nowrap' }}>Sign Up</button>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, fontFamily: F, lineHeight: 1.6 }}>
                      {remaining > 0 ? `${remaining} reflection${remaining !== 1 ? 's' : ''} remaining this week. Go deep.` : 'You have used your reflections for this week.'}
                    </p>
                    {remaining <= 3 && (
                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, fontFamily: F, lineHeight: 1.6 }}>This is a solo-built product. Unlimited free access isn't sustainable, but full access is here if you want it.</p>
                        <button onClick={() => setScreen('upgrade')} style={{ background: 'none', border: '1px solid var(--border-hover)', color: 'var(--text)', padding: '8px 14px', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', fontFamily: F, whiteSpace: 'nowrap' }}>Full Access</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Full Access */}
            {!authLoading && user && user.tier !== 'paid' && (
              <button onClick={() => setScreen('upgrade')} style={{ width: '100%', padding: '14px 0', background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', cursor: 'pointer', fontFamily: F, marginBottom: 24 }}>Unlock Full Access</button>
            )}

            {/* Reflect days for paid users */}
            {!authLoading && user?.tier === 'paid' && reflectDays > 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: F, fontWeight: 300, marginBottom: 20, margin: '0 0 20px 0' }}>
                {reflectDays === 1 ? 'You have reflected for 1 day.' : `You have reflected for ${reflectDays} days.`}
              </p>
            )}

            {/* Daily Prompt */}
            <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '28px 0', margin: '0 0 32px 0', width: '100%' }}>
              <p style={{ fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 16px 0', fontFamily: F }}>Today's Prompt</p>
              <p style={{ fontSize: 20, lineHeight: 1.6, fontStyle: 'italic', color: 'var(--accent)', margin: 0, fontWeight: 300, fontFamily: F }}>"{dailyPrompt}"</p>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 14, fontFamily: F, fontWeight: 300, lineHeight: 1.6 }}>Use this, or bring something of your own. The mirror works best when you bring what's deeply true, not the polished version.</p>
            </div>

            {/* Thoroughness guidance */}
            <div style={{ width: '100%', padding: '16px 18px', background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 32, textAlign: 'left' }}>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, fontFamily: F, lineHeight: 1.7, fontStyle: 'italic' }}>
                Be thorough. The mirror responds with questions that go deeper, so the more honestly and completely you write, the more precise and useful the reflection will be. Short entries get surface-level mirrors.
              </p>
            </div>

            {/* Confrontation Dial */}
            <div style={{ width: '100%', marginBottom: 32 }}>
              <p style={{ fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 14px 0', fontFamily: F }}>How real do you want it?</p>
              <div style={{ display: 'flex', gap: 1 }}>
                {CONFRONTATION_LEVELS.map((level) => (
                  <button key={level.key} onClick={() => setConfrontation(level.key)} style={{ flex: 1, padding: '18px 8px', cursor: 'pointer', background: confrontation === level.key ? 'var(--surface)' : 'transparent', border: `1px solid ${confrontation === level.key ? 'var(--border-hover)' : 'var(--border)'}`, color: confrontation === level.key ? 'var(--text)' : 'var(--text-dim)', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontFamily: F }}>
                    <span style={{ fontSize: 22 }}>{level.icon}</span>
                    <span style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', fontFamily: F, fontWeight: 500 }}>{level.label}</span>
                    <span style={{ fontSize: 11, color: confrontation === level.key ? 'var(--text-dim)' : 'var(--text-muted)', fontFamily: F, lineHeight: 1.4, fontWeight: 300 }}>{level.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div style={{ width: '100%', marginBottom: 20 }}>
              {remaining <= 0 && tier !== 'paid' ? (
                <div style={{ width: '100%', padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', boxSizing: 'border-box', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, fontFamily: F, fontWeight: 300, lineHeight: 1.7 }}>
                    {tier === 'anonymous' ? 'You have used your guest reflections for today. Sign up to continue.' : 'You have used your reflections for this week. Upgrade for unlimited access.'}
                  </p>
                </div>
              ) : (
                <>
                  <textarea value={journalText} onChange={(e) => setJournalText(e.target.value)} onKeyDown={handleKeyDown} placeholder="What's actually going on? The mirror works best when you bring what's real..." rows={5} style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 16, lineHeight: 1.8, padding: 20, fontFamily: F, fontWeight: 300, resize: 'vertical', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.3s' }} onFocus={(e) => { e.target.style.borderColor = 'var(--border-hover)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: F }}>{journalText.length > 0 ? `${journalText.length} characters` : 'Shift+Enter for new line'}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: F }}>Enter to reflect</span>
                  </div>
                </>
              )}
            </div>

            <button onClick={handleReflect} disabled={!journalText.trim() || isReflecting || (remaining <= 0 && tier !== 'paid')} style={{ width: '100%', padding: '18px 0', background: journalText.trim() && (remaining > 0 || tier === 'paid') ? 'var(--btn-bg)' : 'var(--surface)', color: journalText.trim() && (remaining > 0 || tier === 'paid') ? 'var(--btn-text)' : 'var(--text-muted)', border: `1px solid ${journalText.trim() && (remaining > 0 || tier === 'paid') ? 'var(--btn-bg)' : 'var(--border)'}`, fontSize: 14, letterSpacing: 3, textTransform: 'uppercase', cursor: journalText.trim() && (remaining > 0 || tier === 'paid') ? 'pointer' : 'default', fontFamily: F, fontWeight: 500, transition: 'all 0.3s ease' }}>{isReflecting ? 'Looking deeper...' : 'Reflect'}</button>

            <button onClick={() => setShowSafetyInfo(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', padding: '32px 0 20px 0', fontFamily: F }}>Safety & Disclaimer</button>
          </div>
        )}

        {/* ═══ MIRROR ═══ */}
        {screen === 'mirror' && (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingTop: 32, paddingBottom: 140, animation: 'fadeIn 0.6s ease' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, paddingBottom: 16, borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
              <button onClick={goHome} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 13, fontFamily: F, letterSpacing: 3, textTransform: 'uppercase', padding: 0 }}>← Home</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {CONFRONTATION_LEVELS.map((level) => (
                  <button key={level.key} onClick={() => setConfrontation(level.key)} title={`${level.label}: ${level.desc}`} style={{ background: confrontation === level.key ? 'var(--surface)' : 'transparent', border: `1px solid ${confrontation === level.key ? 'var(--border-hover)' : 'transparent'}`, color: confrontation === level.key ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer', padding: '6px 8px', fontSize: 14, transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>{level.icon}</span>
                    {confrontation === level.key && <span style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontFamily: F }}>{level.label}</span>}
                  </button>
                ))}
                <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
                <button onClick={goHome} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontFamily: F }}>New Reflection</button>
                <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
                <button onClick={() => setShowSafetyInfo(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontFamily: F, opacity: 0.6 }}>Safety</button>
              </div>
            </div>

            {/* Remaining in mirror */}
            {tier !== 'paid' && remaining > 0 && remaining <= 3 && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: F, marginBottom: 20 }}>{remaining} reflection{remaining !== 1 ? 's' : ''} remaining</p>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 8px 0', fontFamily: F }}>
                  {msg.role === 'user' ? 'You' : (<>The Mirror {msg.level && <span style={{ marginLeft: 6 }}>{getLevelInfo(msg.level)?.icon} <span style={{ fontSize: 10, letterSpacing: 2 }}>{getLevelInfo(msg.level)?.label}</span></span>}</>)}
                </p>
                <p style={{ fontSize: msg.role === 'assistant' ? 18 : 15, lineHeight: 1.7, color: msg.role === 'assistant' ? 'var(--text)' : 'var(--text-dim)', fontStyle: msg.role === 'assistant' ? 'italic' : 'normal', fontWeight: 300, margin: 0, borderLeft: msg.role === 'assistant' ? '2px solid var(--border)' : 'none', paddingLeft: msg.role === 'assistant' ? 20 : 0, fontFamily: F }}>{msg.content}</p>
                {msg.role === 'assistant' && user?.tier === 'paid' && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(msg.content + '\n\nReflected in the BLUNNIT Mirror');
                      setCopiedIdx(i);
                      setTimeout(() => setCopiedIdx(prev => prev === i ? null : prev), 2000);
                    }}
                    style={{
                      marginTop: 10, background: 'none', border: 'none',
                      color: copiedIdx === i ? 'var(--text-dim)' : 'var(--text-muted)',
                      fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
                      cursor: 'pointer', fontFamily: F, padding: '4px 0',
                      transition: 'color 0.3s',
                    }}
                  >
                    {copiedIdx === i ? 'Copied' : 'Share'}
                  </button>
                )}
              </div>
            ))}

            {streamedText && (
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 8px 0', fontFamily: F }}>The Mirror {getLevelInfo(confrontation)?.icon} <span style={{ fontSize: 10, letterSpacing: 2 }}>{getLevelInfo(confrontation)?.label}</span></p>
                <p style={{ fontSize: 18, lineHeight: 1.7, color: 'var(--text)', fontStyle: 'italic', fontWeight: 300, margin: 0, borderLeft: '2px solid var(--border-hover)', paddingLeft: 20, fontFamily: F }}>
                  {streamedText}<span style={{ display: 'inline-block', width: 2, height: 18, background: 'var(--accent)', marginLeft: 2, animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }} />
                </p>
              </div>
            )}

            {isReflecting && !streamedText && (
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 8px 0', fontFamily: F }}>The Mirror {getLevelInfo(confrontation)?.icon} <span style={{ fontSize: 10, letterSpacing: 2 }}>{getLevelInfo(confrontation)?.label}</span></p>
                <div style={{ display: 'flex', gap: 6, paddingLeft: 22, paddingTop: 8 }}>{[0, 1, 2].map((j) => (<div key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)', animation: `pulse 1.4s ease-in-out ${j * 0.2}s infinite` }} />))}</div>
              </div>
            )}

            {error && <div style={{ padding: 16, border: '1px solid rgba(255,107,107,0.2)', background: 'rgba(255,107,107,0.03)', marginBottom: 28 }}><p style={{ fontSize: 13, color: 'var(--error)', margin: 0, fontFamily: F }}>{error}</p></div>}

            <p style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'center', margin: '40px 0 20px 0', fontFamily: F, opacity: 0.4 }}>
              Powered by BLUNNIT
            </p>
            <div ref={messagesEndRef} />

            {/* Bottom input */}
            <div style={{ position: 'fixed', bottom: keyboardOffset, left: 0, right: 0, zIndex: 10, background: 'linear-gradient(transparent, var(--bg) 20%)', padding: '40px 28px 28px' }}>
              <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', gap: 8 }}>
                <textarea value={journalText} onChange={(e) => setJournalText(e.target.value)} onKeyDown={handleKeyDown} placeholder="Go deeper..." rows={2} disabled={isReflecting} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 15, lineHeight: 1.6, padding: '14px 16px', fontFamily: F, fontWeight: 300, resize: 'none', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.3s', opacity: isReflecting ? 0.5 : 1 }} onFocus={(e) => { e.target.style.borderColor = 'var(--border-hover)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
                <button onClick={handleReflect} disabled={!journalText.trim() || isReflecting} style={{ padding: '14px 20px', background: journalText.trim() && !isReflecting ? 'var(--btn-bg)' : 'var(--surface)', color: journalText.trim() && !isReflecting ? 'var(--btn-text)' : 'var(--text-muted)', border: `1px solid ${journalText.trim() && !isReflecting ? 'var(--btn-bg)' : 'var(--border)'}`, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', cursor: journalText.trim() && !isReflecting ? 'pointer' : 'default', fontFamily: F, fontWeight: 500, transition: 'all 0.3s ease', whiteSpace: 'nowrap' }}>↵</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
