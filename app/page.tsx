'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { getDailyPrompt } from '@/lib/daily-prompts';
import { CONFRONTATION_LEVELS } from '@/lib/constants';
import AuthModal from '@/components/AuthModal';
import UpgradePage from '@/components/UpgradePage';

type Message = { role: 'user' | 'assistant'; content: string; level?: string };
type UserState = { id: string; email: string; tier: string } | null;

const ANON_LIMIT = 3;
const FREE_WEEKLY_LIMIT = 10;
const FONT = "'Cormorant Garamond', Georgia, serif";

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
  try {
    const today = new Date().toISOString().split('T')[0];
    const current = getAnonCount();
    localStorage.setItem('blunnit_anon', JSON.stringify({ date: today, count: current + 1 }));
  } catch {}
}

export default function Home() {
  const [screen, setScreen] = useState<'disclaimer' | 'home' | 'mirror' | 'upgrade'>('disclaimer');
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Load anon count on mount
  useEffect(() => { setAnonUsed(getAnonCount()); }, []);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase.from('profiles').select('tier').eq('id', authUser.id).single();
        setUser({ id: authUser.id, email: authUser.email || '', tier: profile?.tier || 'free' });
      }
      setAuthLoading(false);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('tier').eq('id', session.user.id).single();
        setUser({ id: session.user.id, email: session.user.email || '', tier: profile?.tier || 'free' });
      } else { setUser(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Check free tier limits
  const checkLimits = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/check-limits');
      const data = await res.json();
      setFreeRemaining(data.remaining ?? FREE_WEEKLY_LIMIT);
    } catch {}
  }, [user]);

  useEffect(() => { if (!authLoading && user) checkLimits(); }, [authLoading, user, checkLimits]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamedText]);

  const saveMessage = async (convId: string, role: string, content: string, level?: string) => {
    if (!user) return;
    await fetch('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'message', conversationId: convId, role, content, confrontationLevel: level }) });
  };

  const getOrCreateConversation = async (): Promise<string | null> => {
    if (!user) return null;
    if (conversationId) return conversationId;
    const res = await fetch('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', confrontation, title: journalText.slice(0, 60) }) });
    const data = await res.json();
    if (data.conversation?.id) { setConversationId(data.conversation.id); return data.conversation.id; }
    return null;
  };

  // Calculate remaining
  const getRemaining = (): number => {
    if (!user) return Math.max(0, ANON_LIMIT - anonUsed);
    if (user.tier === 'paid') return Infinity;
    return freeRemaining;
  };

  const getTier = (): string => {
    if (!user) return 'anonymous';
    return user.tier;
  };

  const handleReflect = useCallback(async () => {
    if (!journalText.trim() || isReflecting) return;

    // Check limits
    if (!user && anonUsed >= ANON_LIMIT) { setShowAuthModal(true); return; }
    if (user && user.tier === 'free' && freeRemaining <= 0) { setScreen('upgrade'); return; }

    setError(null); setIsReflecting(true); setStreamedText('');
    const userMessage: Message = { role: 'user', content: journalText };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    const reflectionLevel = confrontation;
    setJournalText(''); setScreen('mirror');
    const convId = await getOrCreateConversation();
    if (convId) await saveMessage(convId, 'user', userMessage.content);
    try {
      const response = await fetch('/api/reflect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })), confrontation: reflectionLevel }) });
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
          // Increment counts
          if (!user) { incrementAnonCount(); setAnonUsed(prev => prev + 1); }
          else { fetch('/api/check-limits', { method: 'POST' }).then(() => checkLimits()); }
        }
      };
      typeWriter();
    } catch (err: any) { setError(err.message); setIsReflecting(false); }
  }, [journalText, messages, confrontation, isReflecting, user, anonUsed, freeRemaining, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReflect(); } };
  const resetSession = () => { setMessages([]); setJournalText(''); setStreamedText(''); setError(null); setConversationId(null); setScreen('home'); };
  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); resetSession(); };
  const getLevelInfo = (key: string) => CONFRONTATION_LEVELS.find((l) => l.key === key);

  const remaining = getRemaining();
  const tier = getTier();

  if (screen === 'upgrade') return <UpgradePage onBack={() => setScreen('home')} />;

  return (
    <div style={{ minHeight: '100vh', position: 'relative', fontFamily: FONT }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, opacity: 0.03, background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 520, margin: '0 auto', padding: '0 28px' }}>

        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={() => { setShowAuthModal(false); checkLimits(); }} />}

        {/* Safety Modal */}
        {showSafetyInfo && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
            <div style={{ maxWidth: 480, width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', padding: 32, maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <p style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0, fontFamily: FONT }}>Safety & Disclaimer</p>
                <button onClick={() => setShowSafetyInfo(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18 }}>x</button>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)', marginBottom: 16, fontWeight: 300, fontFamily: FONT }}>BLUNNIT is a self-awareness tool. It is not therapy, counseling, or a medical service. It is not a substitute for professional mental health care.</p>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)', marginBottom: 16, fontWeight: 300, fontFamily: FONT }}>The AI mirror provides reflections based on what you write. These reflections are not diagnoses, prescriptions, or professional advice.</p>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)', marginBottom: 16, fontWeight: 300, fontFamily: FONT }}>BLUNNIT is not designed for individuals currently experiencing a mental health crisis. If you are in distress, please contact a professional immediately.</p>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--accent)', marginBottom: 12, fontWeight: 400, fontFamily: FONT }}>Crisis Resources:</p>
              <p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--text)', marginBottom: 6, fontWeight: 300, fontFamily: FONT }}>988 Suicide & Crisis Lifeline: call or text 988</p>
              <p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--text)', marginBottom: 6, fontWeight: 300, fontFamily: FONT }}>Crisis Text Line: text HOME to 741741</p>
              <p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--text)', marginBottom: 20, fontWeight: 300, fontFamily: FONT }}>Emergency Services: 911</p>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)', marginBottom: 16, fontWeight: 300, fontFamily: FONT }}>If at any point during use you experience negative psychological effects, stop using the tool and seek professional help.</p>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-dim)', fontWeight: 300, fontFamily: FONT }}>By using BLUNNIT, you acknowledge that this tool provides AI-generated reflections for self-awareness purposes only. BLUNNIT, its creator, and its affiliates are not liable for decisions made based on the tool's output.</p>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        {screen === 'disclaimer' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', animation: 'fadeIn 0.8s ease' }}>
            <img src="/logo.png" alt="BLUNNIT" style={{ width: 60, height: 60, marginBottom: 20, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <h1 style={{ fontSize: 28, fontWeight: 400, letterSpacing: 6, margin: '0 0 6px 0', fontFamily: FONT, textTransform: 'uppercase' }}>The Blunnit Mirror</h1>
            <p style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 40px 0', fontFamily: FONT }}>Pierce The Illusion</p>
            <div style={{ textAlign: 'left', width: '100%', border: '1px solid var(--border)', padding: 24, marginBottom: 24 }}>
              <p style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 16px 0', fontFamily: FONT }}>Before You Begin</p>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)', marginBottom: 14, fontWeight: 300, fontFamily: FONT }}>BLUNNIT is a self-awareness tool powered by AI. It is not therapy, counseling, or a substitute for professional mental health care.</p>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)', marginBottom: 14, fontWeight: 300, fontFamily: FONT }}>The mirror reflects what you write. It may challenge your thinking. It will not diagnose you, prescribe solutions, or replace professional support.</p>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)', marginBottom: 14, fontWeight: 300, fontFamily: FONT }}>If you are currently experiencing a mental health crisis, please reach out to a professional. You can call or text 988 (Suicide & Crisis Lifeline) or text HOME to 741741 (Crisis Text Line).</p>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-dim)', fontWeight: 300, fontFamily: FONT }}>By proceeding, you acknowledge that BLUNNIT provides AI-generated reflections for self-awareness purposes only, and that you assume full responsibility for how you use them.</p>
            </div>
            <button onClick={() => setScreen('home')} style={{ width: '100%', padding: '18px 0', background: 'var(--btn-bg)', color: 'var(--btn-text)', border: '1px solid var(--btn-bg)', fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', cursor: 'pointer', fontFamily: FONT, fontWeight: 500 }}>I Understand, Enter</button>
          </div>
        )}

        {/* Home */}
        {screen === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', animation: 'fadeIn 0.8s ease' }}>

            {/* Auth bar - positioned above everything, not overlapping */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10, padding: '12px 28px', background: 'var(--bg)' }}>
              <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
                {user ? (
                  <>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: FONT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                      {user.tier === 'paid' ? '◆' : '○'} {user.email}
                    </span>
                    <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontFamily: FONT, whiteSpace: 'nowrap' }}>Log Out</button>
                  </>
                ) : (
                  <button onClick={() => setShowAuthModal(true)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontFamily: FONT, padding: '6px 14px' }}>Sign In</button>
                )}
              </div>
            </div>

            <img src="/logo.png" alt="BLUNNIT" style={{ width: 64, height: 64, marginBottom: 16, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <h1 style={{ fontSize: 36, fontWeight: 400, letterSpacing: 8, margin: '0 0 2px 0', fontFamily: FONT, textTransform: 'uppercase' }}>The Blunnit Mirror</h1>
            <p style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 48px 0', fontFamily: FONT }}>Pierce The Illusion</p>

            {/* Tier status */}
            {!authLoading && tier !== 'paid' && (
              <div style={{ width: '100%', padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 24, textAlign: 'left' }}>
                {tier === 'anonymous' ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0, fontFamily: FONT, lineHeight: 1.5 }}>
                      {remaining > 0
                        ? `${remaining} reflection${remaining !== 1 ? 's' : ''} remaining today. Go deep.`
                        : 'You have used your guest reflections for today.'
                      }
                    </p>
                    <button onClick={() => setShowAuthModal(true)} style={{ background: 'none', border: '1px solid var(--border-hover)', color: 'var(--text)', padding: '8px 14px', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', fontFamily: FONT, whiteSpace: 'nowrap', marginLeft: 12 }}>Sign Up</button>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0, fontFamily: FONT, lineHeight: 1.6 }}>
                      {remaining > 0
                        ? `${remaining} reflection${remaining !== 1 ? 's' : ''} remaining this week. Go deep. The mirror rewards honesty, not frequency.`
                        : 'You have used your reflections for this week.'
                      }
                    </p>
                    {remaining <= 3 && (
                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, fontFamily: FONT, lineHeight: 1.5 }}>This is a solo-built product. Unlimited free access isn't sustainable, but full access is here if you want it.</p>
                        <button onClick={() => setScreen('upgrade')} style={{ background: 'none', border: '1px solid var(--border-hover)', color: 'var(--text)', padding: '8px 14px', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', fontFamily: FONT, whiteSpace: 'nowrap', marginLeft: 12 }}>Full Access</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Daily Prompt */}
            <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '32px 0', margin: '0 0 48px 0', width: '100%' }}>
              <p style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 18px 0', fontFamily: FONT }}>Today's Prompt</p>
              <p style={{ fontSize: 20, lineHeight: 1.6, fontStyle: 'italic', color: 'var(--accent)', margin: 0, fontWeight: 300, fontFamily: FONT }}>"{dailyPrompt}"</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 14, fontFamily: FONT, fontWeight: 300, lineHeight: 1.5 }}>Use this, or bring something of your own. The mirror works best when you bring what's deeply true, not the polished version.</p>
            </div>

            {/* Confrontation Dial */}
            <div style={{ width: '100%', marginBottom: 36 }}>
              <p style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 14px 0', fontFamily: FONT }}>How real do you want it?</p>
              <div style={{ display: 'flex', gap: 1 }}>
                {CONFRONTATION_LEVELS.map((level) => (
                  <button key={level.key} onClick={() => setConfrontation(level.key)} style={{ flex: 1, padding: '18px 8px', cursor: 'pointer', background: confrontation === level.key ? 'var(--surface)' : 'transparent', border: `1px solid ${confrontation === level.key ? 'var(--border-hover)' : 'var(--border)'}`, color: confrontation === level.key ? 'var(--text)' : 'var(--text-dim)', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontFamily: FONT }}>
                    <span style={{ fontSize: 22 }}>{level.icon}</span>
                    <span style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontFamily: FONT, fontWeight: 500 }}>{level.label}</span>
                    <span style={{ fontSize: 10, color: confrontation === level.key ? 'var(--text-dim)' : 'var(--text-muted)', fontFamily: FONT, lineHeight: 1.4, fontWeight: 300 }}>{level.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div style={{ width: '100%', marginBottom: 20 }}>
              <textarea value={journalText} onChange={(e) => setJournalText(e.target.value)} onKeyDown={handleKeyDown} placeholder="What's actually going on? The mirror works best when you bring what's real..." rows={5} style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 16, lineHeight: 1.8, padding: 20, fontFamily: FONT, fontWeight: 300, resize: 'vertical', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.3s' }} onFocus={(e) => { e.target.style.borderColor = 'var(--border-hover)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: FONT }}>{journalText.length > 0 ? `${journalText.length} characters` : 'Shift+Enter for new line'}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: FONT }}>Enter to reflect</span>
              </div>
            </div>

            <button onClick={handleReflect} disabled={!journalText.trim() || isReflecting} style={{ width: '100%', padding: '18px 0', background: journalText.trim() ? 'var(--btn-bg)' : 'var(--surface)', color: journalText.trim() ? 'var(--btn-text)' : 'var(--text-muted)', border: `1px solid ${journalText.trim() ? 'var(--btn-bg)' : 'var(--border)'}`, fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', cursor: journalText.trim() ? 'pointer' : 'default', fontFamily: FONT, fontWeight: 500, transition: 'all 0.3s ease' }}>{isReflecting ? 'Looking deeper...' : 'Reflect'}</button>

            <button onClick={() => setShowSafetyInfo(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', padding: '24px 0 0 0', opacity: 0.6, fontFamily: FONT }}>Safety & Disclaimer</button>
          </div>
        )}

        {/* Mirror */}
        {screen === 'mirror' && (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingTop: 32, paddingBottom: 140, animation: 'fadeIn 0.6s ease' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, paddingBottom: 16, borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 13, fontFamily: FONT, fontWeight: 400, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--text-dim)' }}>The Blunnit Mirror</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {CONFRONTATION_LEVELS.map((level) => (
                  <button key={level.key} onClick={() => setConfrontation(level.key)} title={`${level.label}: ${level.desc}`} style={{ background: confrontation === level.key ? 'var(--surface)' : 'transparent', border: `1px solid ${confrontation === level.key ? 'var(--border-hover)' : 'transparent'}`, color: confrontation === level.key ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer', padding: '6px 8px', fontSize: 14, transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>{level.icon}</span>
                    {confrontation === level.key && <span style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontFamily: FONT, fontWeight: 400 }}>{level.label}</span>}
                  </button>
                ))}
                <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
                <button onClick={resetSession} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontFamily: FONT }}>New</button>
                <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
                <button onClick={() => setShowSafetyInfo(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontFamily: FONT, opacity: 0.6 }}>Safety</button>
              </div>
            </div>

            {/* Remaining count in mirror */}
            {tier !== 'paid' && remaining > 0 && remaining <= 3 && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: FONT, marginBottom: 20, letterSpacing: 1 }}>{remaining} reflection{remaining !== 1 ? 's' : ''} remaining</p>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 8px 0', fontFamily: FONT }}>
                  {msg.role === 'user' ? 'You' : (<>The Mirror {msg.level && <span style={{ marginLeft: 6 }}>{getLevelInfo(msg.level)?.icon} <span style={{ fontSize: 9, letterSpacing: 2 }}>{getLevelInfo(msg.level)?.label}</span></span>}</>)}
                </p>
                <p style={{ fontSize: msg.role === 'assistant' ? 18 : 15, lineHeight: 1.7, color: msg.role === 'assistant' ? 'var(--text)' : 'var(--text-dim)', fontStyle: msg.role === 'assistant' ? 'italic' : 'normal', fontWeight: 300, margin: 0, borderLeft: msg.role === 'assistant' ? '2px solid var(--border)' : 'none', paddingLeft: msg.role === 'assistant' ? 20 : 0, fontFamily: FONT }}>{msg.content}</p>
              </div>
            ))}

            {/* Streaming */}
            {streamedText && (
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 8px 0', fontFamily: FONT }}>The Mirror {getLevelInfo(confrontation)?.icon} <span style={{ fontSize: 9, letterSpacing: 2 }}>{getLevelInfo(confrontation)?.label}</span></p>
                <p style={{ fontSize: 18, lineHeight: 1.7, color: 'var(--text)', fontStyle: 'italic', fontWeight: 300, margin: 0, borderLeft: '2px solid var(--border-hover)', paddingLeft: 20, fontFamily: FONT }}>
                  {streamedText}<span style={{ display: 'inline-block', width: 2, height: 18, background: 'var(--accent)', marginLeft: 2, animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }} />
                </p>
              </div>
            )}

            {/* Loading */}
            {isReflecting && !streamedText && (
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 8px 0', fontFamily: FONT }}>The Mirror {getLevelInfo(confrontation)?.icon} <span style={{ fontSize: 9, letterSpacing: 2 }}>{getLevelInfo(confrontation)?.label}</span></p>
                <div style={{ display: 'flex', gap: 6, paddingLeft: 22, paddingTop: 8 }}>{[0, 1, 2].map((j) => (<div key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)', animation: `pulse 1.4s ease-in-out ${j * 0.2}s infinite` }} />))}</div>
              </div>
            )}

            {error && <div style={{ padding: 16, border: '1px solid rgba(255,107,107,0.2)', background: 'rgba(255,107,107,0.03)', marginBottom: 28 }}><p style={{ fontSize: 12, color: 'var(--error)', margin: 0, fontFamily: FONT }}>{error}</p></div>}
            <div ref={messagesEndRef} />

            {/* Bottom input */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10, background: 'linear-gradient(transparent, var(--bg) 20%)', padding: '40px 28px 28px' }}>
              <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', gap: 8 }}>
                <textarea value={journalText} onChange={(e) => setJournalText(e.target.value)} onKeyDown={handleKeyDown} placeholder="Go deeper..." rows={2} disabled={isReflecting} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 15, lineHeight: 1.6, padding: '14px 16px', fontFamily: FONT, fontWeight: 300, resize: 'none', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.3s', opacity: isReflecting ? 0.5 : 1 }} onFocus={(e) => { e.target.style.borderColor = 'var(--border-hover)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
                <button onClick={handleReflect} disabled={!journalText.trim() || isReflecting} style={{ padding: '14px 20px', background: journalText.trim() && !isReflecting ? 'var(--btn-bg)' : 'var(--surface)', color: journalText.trim() && !isReflecting ? 'var(--btn-text)' : 'var(--text-muted)', border: `1px solid ${journalText.trim() && !isReflecting ? 'var(--btn-bg)' : 'var(--border)'}`, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', cursor: journalText.trim() && !isReflecting ? 'pointer' : 'default', fontFamily: FONT, fontWeight: 500, transition: 'all 0.3s ease', whiteSpace: 'nowrap' }}>↵</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
