'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { getDailyPrompt } from '@/lib/daily-prompts';
import { CONFRONTATION_LEVELS } from '@/lib/constants';
import AuthModal from '@/components/AuthModal';
import UpgradePage from '@/components/UpgradePage';
import SidePanel from '@/components/SidePanel';
import { ConfrontationIcon } from '@/components/ConfrontationIcon';

type Signal = { type: 'sit' | 'choice' | 'mirror'; data?: string | string[] };
type Message = { role: 'user' | 'assistant'; content: string; level?: string; signal?: Signal };
type UserState = { id: string; email: string; tier: string } | null;
type SavedConvo = { id: string; title: string; updated_at: string; confrontation_level: string };

const ANON_DAILY_LIMIT = 5;
const FREE_WEEKLY_LIMIT = 10;
const DAILY_SOFT_CAP = 15;
const F = "'Cormorant Garamond', Georgia, serif";



function getDailyReflectCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const today = new Date().toISOString().split('T')[0];
    const val = localStorage.getItem(`blunnit_daily_count_${today}`);
    return val ? parseInt(val, 10) : 0;
  } catch { return 0; }
}

function incrementDailyReflectCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const today = new Date().toISOString().split('T')[0];
    const key = `blunnit_daily_count_${today}`;
    const next = getDailyReflectCount() + 1;
    localStorage.setItem(key, String(next));
    return next;
  } catch { return 0; }
}

function parseSignal(text: string): { cleanText: string; signal: Signal | null } {
  const sitMatch = text.match(/\[SIT\]/);
  if (sitMatch) {
    return { cleanText: text.replace(/\[SIT\]/, '').trim(), signal: { type: 'sit' } };
  }
  const choiceMatch = text.match(/\[CHOICE\]([^\n]+)/);
  if (choiceMatch) {
    const opts = choiceMatch[1].split('|').map((s: string) => s.trim()).filter(Boolean);
    return { cleanText: text.replace(/\[CHOICE\][^\n]+\n?/, '').trim(), signal: { type: 'choice', data: opts } };
  }
  const mirrorMatch = text.match(/\[MIRROR\]([^\n]+)/);
  if (mirrorMatch) {
    return { cleanText: text.replace(/\[MIRROR\][^\n]+\n?/, '').trim(), signal: { type: 'mirror', data: mirrorMatch[1].trim() } };
  }
  return { cleanText: text, signal: null };
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
  const [anonRemaining, setAnonRemaining] = useState(ANON_DAILY_LIMIT);
  const [freeRemaining, setFreeRemaining] = useState(FREE_WEEKLY_LIMIT);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [savedConvos, setSavedConvos] = useState<SavedConvo[]>([]);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [reflectDays, setReflectDays] = useState(0);
  const [userThemes, setUserThemes] = useState<{ theme: string; count: number }[]>([]);
  const [welcomeToast, setWelcomeToast] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [sitPref, setSitPref] = useState<'hold' | 'offer' | 'none' | null>(null);
  const [activeSitMsgIdx, setActiveSitMsgIdx] = useState<number | null>(null);
  const [sitCountdown, setSitCountdown] = useState(0);
  const [presenceCount, setPresenceCount] = useState(0);
  const [softCapShown, setSoftCapShown] = useState(false);
  const [savedConfirm, setSavedConfirm] = useState(false);
  const [limitsLoaded, setLimitsLoaded] = useState(false);
  const [showDailyPrompt, setShowDailyPrompt] = useState(true);
  const [showHowItWorksPref, setShowHowItWorksPref] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    try { return localStorage.getItem('blunnit_sidebar_open') !== 'false'; } catch { return true; }
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userHasScrolledUp = useRef(false);
  const pendingChoiceRef = useRef<string | null>(null);
  const sitPrefRef = useRef(sitPref);
  const userMsgCountRef = useRef(0);
  const titleRegenFiredRef = useRef(false);
  const fingerprintRef = useRef<string>('');
  const anonIncrementedRef = useRef(false);
  const supabase = createClient();

  // Generate fingerprint once on mount, then fetch remaining anon count
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      fingerprintRef.current = btoa(
        screen.width + 'x' + screen.height + '_' +
        Intl.DateTimeFormat().resolvedOptions().timeZone + '_' +
        navigator.language
      );
    } catch {
      fingerprintRef.current = 'anon_' + Date.now();
    }
    fetch(`/api/anon-limits?fp=${encodeURIComponent(fingerprintRef.current)}`)
      .then(r => r.json())
      .then(d => { if (typeof d.remaining === 'number') setAnonRemaining(d.remaining); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.tier === 'paid') {
      fetch('/api/reflect-days', { headers: { 'x-user-id': user.id } })
        .then(r => r.json())
        .then(d => { if (typeof d.reflect_days_count === 'number') setReflectDays(d.reflect_days_count); })
        .catch(() => {});
    }
  }, [user]);

  // Keep sitPrefRef in sync
  useEffect(() => { sitPrefRef.current = sitPref; }, [sitPref]);

  // Load sit pref from localStorage when user is available
  useEffect(() => {
    if (!user) return;
    try {
      const stored = localStorage.getItem(`blunnit_sit_pref_${user.id}`);
      if (stored === 'hold' || stored === 'offer' || stored === 'none') {
        setSitPref(stored as 'hold' | 'offer' | 'none');
        sitPrefRef.current = stored as 'hold' | 'offer' | 'none';
      }
    } catch {}
  }, [user]);

  // Load presence count on home screen
  useEffect(() => {
    if (screen !== 'home') return;
    fetch('/api/presence').then(r => r.json()).then(d => {
      if (d.count > 0) setPresenceCount(d.count);
    }).catch(() => {});
  }, [screen]);

  // Sit countdown timer
  useEffect(() => {
    if (activeSitMsgIdx === null || sitCountdown <= 0) return;
    const t = setTimeout(() => setSitCountdown(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [activeSitMsgIdx, sitCountdown]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const dName = session.user.user_metadata?.display_name || null;
        setDisplayName(dName);
        setUser({ id: session.user.id, email: session.user.email || '', tier: 'free' });
        if (!dName) {
          try {
            if (!localStorage.getItem(`blunnit_name_asked_${session.user.id}`)) {
              setShowNameModal(true);
              localStorage.setItem(`blunnit_name_asked_${session.user.id}`, 'true');
            }
          } catch {}
        }
      }
      setAuthLoading(false);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const dName = session.user.user_metadata?.display_name || null;
        setDisplayName(dName);
        setUser({ id: session.user.id, email: session.user.email || '', tier: 'free' });
      } else {
        setDisplayName(null);
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
    setLimitsLoaded(true);
  }, [user]);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/conversations', { headers: { 'x-user-id': user.id } });
      const data = await res.json();
      setSavedConvos(data.conversations || []);
    } catch {}
  }, [user]);

  const loadPreferences = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/preferences', { headers: { 'x-user-id': user.id } });
      const data = await res.json();
      if (typeof data.show_daily_prompt === 'boolean') setShowDailyPrompt(data.show_daily_prompt);
      if (typeof data.show_how_it_works === 'boolean') setShowHowItWorksPref(data.show_how_it_works);
    } catch {}
  }, [user]);

  const loadThemes = useCallback(async () => {
    if (!user || user.tier !== 'paid') return;
    try {
      const res = await fetch('/api/extract-themes', { headers: { 'x-user-id': user.id } });
      const data = await res.json();
      setUserThemes(data.themes || []);
    } catch {}
  }, [user]);

  const loadConversation = async (convoId: string) => {
    try {
      const res = await fetch(`/api/conversations?id=${convoId}`, { headers: { 'x-user-id': user?.id || '' } });
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages.map((m: any) => ({ role: m.role, content: m.content, level: m.confrontation_level })));
        setConversationId(convoId);
        userMsgCountRef.current = data.messages.filter((m: any) => m.role === 'user').length;
        titleRegenFiredRef.current = true;
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

  // Reset limitsLoaded when user identity changes
  useEffect(() => { setLimitsLoaded(false); }, [user?.id]);

  // Desktop detection
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Persist sidebar preference
  useEffect(() => {
    try { localStorage.setItem('blunnit_sidebar_open', String(sidebarOpen)); } catch {}
  }, [sidebarOpen]);

  // Body scroll lock when mobile panel is open
  useEffect(() => {
    if (!isDesktop && showSidePanel) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isDesktop, showSidePanel]);

  // Reset preferences when user logs out
  useEffect(() => {
    if (!user) { setShowDailyPrompt(true); setShowHowItWorksPref(true); }
  }, [user]);

  useEffect(() => { if (!authLoading && user) { checkLimits(); loadConversations(); loadThemes(); loadPreferences(); } }, [authLoading, user, checkLimits, loadConversations, loadThemes, loadPreferences]);
  useEffect(() => {
    if (!userHasScrolledUp.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages.length]);

  useEffect(() => {
    if (!userHasScrolledUp.current && scrollContainerRef.current) {
      requestAnimationFrame(() => {
        if (!userHasScrolledUp.current && scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      });
    }
  }, [streamedText]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onTouch = () => {
      if (isReflecting) userHasScrolledUp.current = true;
    };
    el.addEventListener('touchstart', onTouch, { passive: true });
    el.addEventListener('mousedown', onTouch);
    return () => {
      el.removeEventListener('touchstart', onTouch);
      el.removeEventListener('mousedown', onTouch);
    };
  }, [isReflecting]);

  useEffect(() => {
    document.title = screen === 'mirror' ? 'The Blunnit Mirror' : 'The Blunnit Mirror — Pierce The Illusion';
  }, [screen]);

  useEffect(() => {
    if (screen === 'mirror') {
      window.history.pushState({ blunnit: 'mirror' }, '');
    }
  }, [screen]);

  useEffect(() => {
    const onPop = () => {
      setScreen(prev => {
        if (prev === 'mirror') {
          setMessages([]);
          setJournalText('');
          setStreamedText('');
          setError(null);
          setConversationId(null);
          setActiveSitMsgIdx(null);
          setSitCountdown(0);
          setSoftCapShown(false);
          userMsgCountRef.current = 0;
          titleRegenFiredRef.current = false;
          return 'home';
        }
        return prev;
      });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const saveMessage = async (convId: string, role: string, content: string, level?: string) => {
    if (!user) return;
    await fetch('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': user.id }, body: JSON.stringify({ action: 'message', conversationId: convId, role, content, confrontationLevel: level }) });
  };

  const getOrCreateConversation = async (_firstMsgText?: string): Promise<string | null> => {
    if (!user) return null;
    if (conversationId) return conversationId;
    const res = await fetch('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': user.id }, body: JSON.stringify({ action: 'create', confrontation, title: 'New Reflection' }) });
    const data = await res.json();
    if (data.conversation?.id) {
      setConversationId(data.conversation.id);
      userMsgCountRef.current = 0;
      titleRegenFiredRef.current = false;
      return data.conversation.id;
    }
    return null;
  };

  const getRemaining = (): number => {
    if (!user) return anonRemaining;
    if (user.tier === 'paid') return Infinity;
    return freeRemaining;
  };

  const getTier = (): string => !user ? 'anonymous' : user.tier;

  const setSitPreference = (pref: 'hold' | 'offer' | 'none', msgIdx: number) => {
    setSitPref(pref);
    sitPrefRef.current = pref;
    if (user) { try { localStorage.setItem(`blunnit_sit_pref_${user.id}`, pref); } catch {} }
    if (pref === 'hold') { setActiveSitMsgIdx(msgIdx); setSitCountdown(60); }
  };

  const handleReflect = useCallback(async () => {
    const choiceText = pendingChoiceRef.current;
    pendingChoiceRef.current = null;
    const textToUse = choiceText ?? journalText;
    if (!textToUse.trim() || isReflecting) return;
    if (!user) {
      if (anonRemaining <= 0) { setShowAuthModal(true); return; }
    }
    if (user && user.tier === 'free' && freeRemaining <= 0) { setScreen('upgrade'); return; }
    anonIncrementedRef.current = false;
    setError(null); setIsReflecting(true); setStreamedText('');
    const userMessage: Message = { role: 'user', content: textToUse };
    const updatedMessages = [...messages, userMessage];
    userHasScrolledUp.current = false;
    setMessages(updatedMessages);
    const reflectionLevel = confrontation;
    setJournalText(''); setScreen('mirror');
    const convId = await getOrCreateConversation(textToUse);
    if (convId) await saveMessage(convId, 'user', userMessage.content);
    userMsgCountRef.current += 1;
    const currentMsgCount = userMsgCountRef.current;
    try {
      const response = await fetch('/api/reflect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })), confrontation: reflectionLevel, userThemes, tier: user ? user.tier : 'anonymous' }) });
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData?.error || `Error: ${response.status}`); }
      const data = await response.json();
      const rawAssistantText = data.reflection || 'The mirror is silent. Try again.';
      const { cleanText: assistantText, signal: parsedSignal } = parseSignal(rawAssistantText);
      const signal = user?.tier === 'paid' ? parsedSignal : null;
      let i = 0;
      const typeWriter = () => {
        if (i < assistantText.length) { setStreamedText(assistantText.slice(0, i + 1)); i++; setTimeout(typeWriter, 18 + Math.random() * 12); }
        else {
          const newMsg: Message = { role: 'assistant', content: assistantText, level: reflectionLevel, signal: signal || undefined };
          setMessages((prev) => {
            const next = [...prev, newMsg];
            if (signal?.type === 'sit' && sitPrefRef.current === 'hold') {
              const idx = next.length - 1;
              setTimeout(() => { setActiveSitMsgIdx(idx); setSitCountdown(60); }, 100);
            }
            const dailyCount = incrementDailyReflectCount();
            if (dailyCount === DAILY_SOFT_CAP) { setSoftCapShown(true); }
            return next;
          });
          setStreamedText(''); setIsReflecting(false);
          if (convId) saveMessage(convId, 'assistant', assistantText, reflectionLevel);
          if (!user && !anonIncrementedRef.current) {
            anonIncrementedRef.current = true;
            fetch('/api/anon-limits', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fp: fingerprintRef.current }),
            })
              .then(r => r.json())
              .then(d => { if (typeof d.remaining === 'number') setAnonRemaining(d.remaining); })
              .catch(() => setAnonRemaining(prev => Math.max(0, prev - 1)));
          }
          else {
            fetch('/api/presence', { method: 'POST' }).catch(() => {});
            fetch('/api/check-limits', { method: 'POST', headers: { 'x-user-id': user.id } }).then(() => checkLimits());
            if (user.tier === 'paid') {
              fetch('/api/reflect-days', { method: 'POST', headers: { 'x-user-id': user.id } })
                .then(r => r.json())
                .then(d => { if (typeof d.reflect_days_count === 'number') setReflectDays(d.reflect_days_count); })
                .catch(() => {});
              fetch('/api/extract-themes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
                body: JSON.stringify({ text: assistantText }),
              }).then(() => fetch('/api/extract-themes', { headers: { 'x-user-id': user.id } }).then(r => r.json()).then(d => setUserThemes(d.themes || [])));
            }
            fetch('/api/conversations', { headers: { 'x-user-id': user.id } }).then(r => r.json()).then(d => setSavedConvos(d.conversations || []));
            if (convId && !titleRegenFiredRef.current) {
              const userMsgs = updatedMessages.filter(m => m.role === 'user');
              const firstMsg = userMsgs[0]?.content?.toLowerCase().trim() || '';
              const startsWithGreeting = /^(hi+|hello+|hey+)[.!?]?$/.test(firstMsg);
              const triggerAt = startsWithGreeting ? 4 : 3;
              if (currentMsgCount === triggerAt) {
                titleRegenFiredRef.current = true;
                const msgsForTitle = (startsWithGreeting ? userMsgs.slice(1, 4) : userMsgs.slice(0, 3)).map(m => m.content);
                fetch('/api/generate-title', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
                  body: JSON.stringify({ conversationId: convId, messages: msgsForTitle }),
                }).then(r => r.json()).then(d => {
                  if (d.title) setSavedConvos(prev => prev.map(c => c.id === convId ? { ...c, title: d.title } : c));
                  fetch('/api/conversations', { headers: { 'x-user-id': user.id } }).then(r => r.json()).then(d2 => setSavedConvos(d2.conversations || []));
                });
              }
            }
          }
        }
      };
      typeWriter();
    } catch { setError('The mirror is momentarily unavailable. Please try again in a moment.'); setIsReflecting(false); }
  }, [journalText, messages, confrontation, isReflecting, user, anonRemaining, freeRemaining, conversationId, userThemes]);

  const sendChoice = (text: string) => {
    if (isReflecting) return;
    pendingChoiceRef.current = text;
    handleReflect();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReflect(); } };

  const goHome = () => {
    setMessages([]); setJournalText(''); setStreamedText(''); setError(null); setConversationId(null);
    setActiveSitMsgIdx(null); setSitCountdown(0); setSoftCapShown(false);
    userMsgCountRef.current = 0; titleRegenFiredRef.current = false;
    setScreen('home');
  };

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.reload(); };
  const handleDeleteAccount = async () => {
    if (!user) return;
    await fetch('/api/delete-account', { method: 'DELETE', headers: { 'x-user-id': user.id } });
    await supabase.auth.signOut();
    setUser(null);
    goHome();
  };
  const handleDeleteConvo = (id: string) => {
    setSavedConvos(prev => prev.filter(c => c.id !== id));
    if (conversationId === id) { setConversationId(null); goHome(); }
  };
  const handleRenameConvo = (id: string, title: string) => {
    setSavedConvos(prev => prev.map(c => c.id === id ? { ...c, title } : c));
  };
  const handleManualSave = async () => {
    if (!user || !messages.length) return;
    // If no conversation exists yet, create one now
    if (!conversationId) {
      const firstUserMsg = messages.find(m => m.role === 'user');
      await getOrCreateConversation(firstUserMsg?.content);
    }
    // Show confirmation
    setSavedConfirm(true);
    setTimeout(() => setSavedConfirm(false), 2000);
  };

  const handleSaveName = async () => {
    if (!user) { setShowNameModal(false); return; }
    const trimmed = nameInput.trim();
    if (trimmed) {
      await supabase.auth.updateUser({ data: { display_name: trimmed } });
      setDisplayName(trimmed);
    }
    setShowNameModal(false);
    setNameInput('');
  };

  const handleChangeName = async (name: string) => {
    if (!user) return;
    await supabase.auth.updateUser({ data: { display_name: name } });
    setDisplayName(name);
  };

  const handleToggleDailyPrompt = () => {
    if (!user) return;
    const newVal = !showDailyPrompt;
    setShowDailyPrompt(newVal);
    fetch('/api/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
      body: JSON.stringify({ show_daily_prompt: newVal }),
    }).catch(() => {});
  };

  const handleToggleHowItWorks = () => {
    if (!user) return;
    const newVal = !showHowItWorksPref;
    setShowHowItWorksPref(newVal);
    fetch('/api/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
      body: JSON.stringify({ show_how_it_works: newVal }),
    }).catch(() => {});
  };

  const getLevelInfo = (key: string) => CONFRONTATION_LEVELS.find((l) => l.key === key);

  const remaining = getRemaining();
  const tier = getTier();

  if (screen === 'upgrade') return <UpgradePage onBack={() => setScreen('home')} />;

  return (
    <div style={{ minHeight: '100vh', position: 'relative', fontFamily: F }}>
      {/* Grain */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, opacity: 0.03, background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

      {/* Fixed auth bar - hidden on disclaimer screen */}
      {screen !== 'disclaimer' && !isDesktop && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10, padding: '10px 28px', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {!authLoading && user && (
                <button onClick={() => setShowSidePanel(v => !v)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18, fontFamily: F, padding: '6px 22px', lineHeight: 1.3 }}>
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
      )}

      {isDesktop && screen !== 'disclaimer' && !sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          title="Open sidebar"
          style={{ position: 'fixed', top: 16, left: 16, zIndex: 202, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer', padding: '8px 10px', fontSize: 14, lineHeight: 1, fontFamily: F, transition: 'border-color 0.2s, color 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
        >
          {String.fromCharCode(8594)}
        </button>
      )}

      <div style={{ marginLeft: isDesktop && screen !== 'disclaimer' && sidebarOpen ? 280 : 0, transition: isDesktop ? 'margin-left 0.3s ease' : undefined }}>
      <div style={{ position: 'relative', zIndex: 2, maxWidth: isDesktop && screen !== 'disclaimer' ? 800 : 520, margin: '0 auto', padding: isDesktop && screen !== 'disclaimer' ? '0 40px' : '0 28px' }}>

        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

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
          open={isDesktop && screen !== 'disclaimer' ? sidebarOpen : showSidePanel}
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
          onDeleteAccount={handleDeleteAccount}
          displayName={displayName}
          showDailyPrompt={showDailyPrompt}
          onToggleDailyPrompt={handleToggleDailyPrompt}
          showHowItWorksPref={showHowItWorksPref}
          onToggleHowItWorks={handleToggleHowItWorks}
          onChangeName={handleChangeName}
          isDesktop={isDesktop && screen !== 'disclaimer'}
          onSignIn={() => setShowAuthModal(true)}
          onToggleSidebar={() => setSidebarOpen(v => !v)}
        />

        {/* Name collection modal — shown once after first signup */}
        {showNameModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 102, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28, fontFamily: F }}>
            <div style={{ maxWidth: 380, width: '100%', background: '#000', border: '1px solid #1a1a1a', padding: 32 }}>
              <p style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', color: '#7a756f', margin: '0 0 8px 0', fontFamily: F }}>Welcome</p>
              <p style={{ fontSize: 20, lineHeight: 1.5, color: '#e8e4df', margin: '0 0 24px 0', fontFamily: F, fontWeight: 300, fontStyle: 'italic' }}>What should we call you?</p>
              <input
                type="text"
                placeholder="Your name (optional)"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                autoFocus
                style={{ width: '100%', padding: '14px 16px', marginBottom: 12, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#e8e4df', fontSize: 16, outline: 'none', boxSizing: 'border-box', fontFamily: F }}
              />
              <button onClick={handleSaveName} style={{ width: '100%', padding: '14px 0', background: '#e8e4df', color: '#000', border: 'none', fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', cursor: 'pointer', fontFamily: F, fontWeight: 500, marginBottom: 10 }}>
                Continue
              </button>
              <button onClick={() => { setShowNameModal(false); setNameInput(''); }} style={{ width: '100%', padding: '10px 0', background: 'none', border: 'none', color: '#7a756f', fontSize: 12, letterSpacing: 2, cursor: 'pointer', fontFamily: F }}>
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Safety Modal */}
        {showSafetyInfo && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
            <div style={{ maxWidth: 480, width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', padding: 32, maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <p style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-dim)', margin: 0, fontFamily: F }}>Safety & Disclaimer</p>
                <button onClick={() => setShowSafetyInfo(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18, fontFamily: F }}>x</button>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text)', marginBottom: 16, fontWeight: 300, fontFamily: F }}>The Blunnit Mirror is a self-awareness tool. It is not therapy, counseling, or a medical service. It is not a substitute for professional mental health care.</p>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text)', marginBottom: 16, fontWeight: 300, fontFamily: F }}>The AI mirror provides reflections based on what you write. These reflections are not diagnoses, prescriptions, or professional advice.</p>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text)', marginBottom: 16, fontWeight: 300, fontFamily: F }}>The Blunnit Mirror is not designed for individuals currently experiencing a mental health crisis. If you are in distress, please contact a professional immediately.</p>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--accent)', marginBottom: 12, fontWeight: 400, fontFamily: F }}>Crisis Resources:</p>
              <p style={{ fontSize: 14, lineHeight: 2, color: 'var(--text)', marginBottom: 4, fontWeight: 300, fontFamily: F }}>988 Suicide & Crisis Lifeline: call or text 988</p>
              <p style={{ fontSize: 14, lineHeight: 2, color: 'var(--text)', marginBottom: 4, fontWeight: 300, fontFamily: F }}>Crisis Text Line: text HOME to 741741</p>
              <p style={{ fontSize: 14, lineHeight: 2, color: 'var(--text)', marginBottom: 20, fontWeight: 300, fontFamily: F }}>Emergency Services: 911</p>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text)', marginBottom: 16, fontWeight: 300, fontFamily: F }}>If at any point during use you experience negative psychological effects, stop using the tool and seek professional help.</p>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-dim)', fontWeight: 300, fontFamily: F }}>By using The Blunnit Mirror, you acknowledge that this tool provides AI-generated reflections for self-awareness purposes only. The Blunnit Mirror, its creator, and its affiliates are not liable for decisions made based on the tool's output.</p>
              <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--text-muted)', fontWeight: 300, fontFamily: F, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                Your reflections help the mirror improve. Conversation data is used in anonymized form to refine AI quality. See our{' '}
                <a href="/privacy" style={{ color: 'var(--text-dim)', textDecoration: 'underline' }}>Privacy Policy</a> for details.
              </p>
            </div>
          </div>
        )}

        {/* DISCLAIMER */}
        {screen === 'disclaimer' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', animation: 'fadeIn 0.8s ease', padding: '40px 0' }}>
            <img src="/logo.png" alt="" style={{ width: 32, height: 'auto', marginBottom: 20 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <h1 style={{ fontSize: 28, fontWeight: 400, letterSpacing: 6, margin: '0 0 6px 0', fontFamily: F, textTransform: 'uppercase' }}>The Blunnit Mirror</h1>
            <p style={{ fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 40px 0', fontFamily: F }}>Pierce The Illusion</p>
            <div style={{ textAlign: 'left', width: '100%', border: '1px solid var(--border)', padding: 24, marginBottom: 24 }}>
              <p style={{ fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 16px 0', fontFamily: F }}>Before You Begin</p>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text)', marginBottom: 14, fontWeight: 300, fontFamily: F }}>The Blunnit Mirror is a self-awareness tool powered by AI. It is not therapy, counseling, or a substitute for professional mental health care.</p>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text)', marginBottom: 14, fontWeight: 300, fontFamily: F }}>The mirror reflects what you write. It may challenge your thinking. It will not diagnose you, prescribe solutions, or replace professional support.</p>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text)', marginBottom: 14, fontWeight: 300, fontFamily: F }}>If you are currently experiencing a mental health crisis, please reach out to a professional. You can call or text 988 (Suicide & Crisis Lifeline) or text HOME to 741741 (Crisis Text Line).</p>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text-dim)', fontWeight: 300, fontFamily: F }}>By proceeding, you acknowledge that The Blunnit Mirror provides AI-generated reflections for self-awareness purposes only, and that you assume full responsibility for how you use them.</p>
            </div>
            <button onClick={() => { localStorage.setItem('blunnit_accepted', 'true'); setScreen('home'); }} style={{ width: '100%', padding: '18px 0', background: 'var(--btn-bg)', color: 'var(--btn-text)', border: '1px solid var(--btn-bg)', fontSize: 14, letterSpacing: 3, textTransform: 'uppercase', cursor: 'pointer', fontFamily: F, fontWeight: 500 }}>I Understand, Enter</button>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '18px 0 0 0', fontFamily: F, fontWeight: 300, lineHeight: 1.7, textAlign: 'center' }}>
              By using The Blunnit Mirror you agree to our{' '}
              <a href="/terms" style={{ color: 'var(--text-dim)', textDecoration: 'underline' }}>Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" style={{ color: 'var(--text-dim)', textDecoration: 'underline' }}>Privacy Policy</a>.
            </p>
          </div>
        )}

        {/* HOME */}
        {screen === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', textAlign: 'center', animation: 'fadeIn 0.8s ease', paddingTop: isDesktop ? 28 : 60, paddingBottom: 40 }}>

            <div style={{ paddingTop: isDesktop ? 60 : 20, paddingBottom: isDesktop ? 40 : 32, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <img src="/logo.png" alt="" style={{ width: isDesktop ? 50 : 40, height: 'auto', marginBottom: 12 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <h1 style={{ fontSize: isDesktop ? 48 : 32, fontWeight: 400, letterSpacing: isDesktop ? 10 : 8, margin: '0 0 12px 0', fontFamily: F, textTransform: 'uppercase', textAlign: 'center' }}>The Blunnit Mirror</h1>
              <p style={{ fontSize: 11, letterSpacing: 5, textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0, fontFamily: F }}>Pierce The Illusion</p>
            </div>

            {/* Auth-dependent section — hold placeholder until both auth and limits are resolved */}
            {(authLoading || (!!user && !limitsLoaded)) ? (
              <div style={{ width: '100%', minHeight: 58, marginBottom: 24 }} />
            ) : (
              <div style={{ width: '100%', animation: 'fadeIn 0.4s ease', transition: 'opacity 0.3s ease' }}>
                {tier !== 'paid' && (
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
                {user && user.tier !== 'paid' && (
                  <button onClick={() => setScreen('upgrade')} style={{ width: '100%', padding: '14px 0', background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', cursor: 'pointer', fontFamily: F, marginBottom: 24 }}>Unlock Full Access</button>
                )}
                {user?.tier === 'paid' && reflectDays > 0 && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: F, fontWeight: 300, margin: '0 0 8px 0' }}>
                    {reflectDays === 1 ? 'You have reflected for 1 day.' : `You have reflected for ${reflectDays} days.`}
                  </p>
                )}
              </div>
            )}

            {/* Presence count */}
            {presenceCount > 0 && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: F, fontWeight: 300, margin: '0 0 20px 0', letterSpacing: 1 }}>
                {presenceCount} {presenceCount === 1 ? 'person' : 'people'} reflected today.
              </p>
            )}

            {/* Daily Prompt — hidden if user toggled it off */}
            {(!user || showDailyPrompt) && (
              <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '28px 0', margin: '0 0 32px 0', width: '100%' }}>
                <p style={{ fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 16px 0', fontFamily: F }}>Today's Prompt</p>
                <p style={{ fontSize: 20, lineHeight: 1.6, fontStyle: 'italic', color: 'var(--accent)', margin: '0 0 16px 0', fontWeight: 300, fontFamily: F }}>"{dailyPrompt}"</p>
                <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, fontFamily: F, fontWeight: 300, lineHeight: 1.6 }}>Use this, or bring something of your own. The mirror works best when you bring what's deeply true, not the polished version.</p>
              </div>
            )}

            {/* How it works - collapsible */}
            {(!user || showHowItWorksPref) && <div style={{ width: '100%', marginBottom: 32, border: '1px solid var(--border)' }}>
              <button
                onClick={() => setShowHowItWorks(v => !v)}
                style={{ width: '100%', padding: '12px 18px', background: 'none', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontFamily: F }}
              >
                <span style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-dim)' }}>How it works</span>
                <span style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1 }}>{showHowItWorks ? '−' : '+'}</span>
              </button>
              {showHowItWorks && (
                <div style={{ padding: '4px 18px 16px', textAlign: 'left' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 8px 0', fontFamily: F, fontWeight: 300, lineHeight: 1.7 }}>Write what's real. The mirror works best with honesty.</p>
                  <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 8px 0', fontFamily: F, fontWeight: 300, lineHeight: 1.7 }}>Choose your level. Gentle holds space. Piercing strips the frame.</p>
                  <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 8px 0', fontFamily: F, fontWeight: 300, lineHeight: 1.7 }}>Reflect. The AI mirrors back what you might not be seeing.</p>
                  <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0' }} />
                  <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, fontFamily: F, fontWeight: 300, lineHeight: 1.7 }}>Be thorough. The more honestly and completely you write, the more precise the reflection. Short entries get surface-level mirrors.</p>
                </div>
              )}
            </div>}

            {/* Divider when How It Works is hidden */}
            {user && !showHowItWorksPref && (
              <div style={{ width: '100%', borderTop: '1px solid var(--border)', marginBottom: 32 }} />
            )}

            {/* Confrontation Dial */}
            <div style={{ width: '100%', marginBottom: 32 }}>
              <p style={{ fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 14px 0', fontFamily: F }}>How real do you want it?</p>
              <div style={{ display: 'flex', gap: 1 }}>
                {CONFRONTATION_LEVELS.map((level) => (
                  <button key={level.key} onClick={() => setConfrontation(level.key)} style={{ flex: 1, padding: '18px 8px', cursor: 'pointer', background: confrontation === level.key ? 'var(--surface)' : 'transparent', border: `1px solid ${confrontation === level.key ? 'var(--border-hover)' : 'var(--border)'}`, color: confrontation === level.key ? 'var(--text)' : 'var(--text-dim)', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontFamily: F }}>
                    <ConfrontationIcon level={level.key} size={22} />
                    <span style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', fontFamily: F, fontWeight: 500 }}>{level.label}</span>
                    <span style={{ fontSize: 11, color: confrontation === level.key ? 'var(--text-dim)' : 'var(--text-muted)', fontFamily: F, lineHeight: 1.4, fontWeight: 300 }}>{level.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Onboarding hint for new logged-in users */}
            {user && savedConvos.length === 0 && messages.length === 0 && (
              <div style={{ width: '100%', padding: '14px 18px', border: '1px solid var(--border)', marginBottom: 16, textAlign: 'left' }}>
                <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, fontFamily: F, fontWeight: 300, lineHeight: 1.8 }}>
                  This is your mirror. Write what's actually going on, not the polished version. The AI will reflect back what you might not be seeing.
                </p>
              </div>
            )}

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

        {/* MIRROR */}
        {screen === 'mirror' && (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingTop: isDesktop ? 28 : 72, animation: 'fadeIn 0.6s ease' }}>

            {/* Header */}
            <div style={{ marginBottom: 32, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <button onClick={goHome} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 13, fontFamily: F, letterSpacing: 3, textTransform: 'uppercase', padding: 0, transition: 'color 0.2s ease' }} onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; }}>← Home</button>
            </div>

            {/* Scrollable messages area */}
            <div
              ref={scrollContainerRef}
              onScroll={() => {
                const el = scrollContainerRef.current;
                if (!el) return;
                userHasScrolledUp.current = el.scrollHeight - el.scrollTop - el.clientHeight >= 100;
              }}
              style={{ overflowY: 'auto', height: isDesktop ? 'calc(100vh - 120px)' : 'calc(100vh - 160px)', paddingBottom: 160 }}
            >

            {/* Remaining in mirror */}
            {tier !== 'paid' && remaining > 0 && remaining <= 3 && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: F, marginBottom: 20 }}>{remaining} reflection{remaining !== 1 ? 's' : ''} remaining</p>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 8px 0', fontFamily: F, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {msg.role === 'user' ? 'You' : (<>The Mirror{msg.level && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><ConfrontationIcon level={msg.level} size={13} /><span style={{ fontSize: 10, letterSpacing: 2 }}>{getLevelInfo(msg.level)?.label}</span></span>}</>)}
                </p>
                <p style={{ fontSize: msg.role === 'assistant' ? 18 : 15, lineHeight: 1.7, color: msg.role === 'assistant' ? 'var(--text)' : 'var(--text-dim)', fontStyle: msg.role === 'assistant' ? 'italic' : 'normal', fontWeight: 300, margin: 0, borderLeft: msg.role === 'assistant' ? '2px solid var(--border)' : 'none', paddingLeft: msg.role === 'assistant' ? 20 : 0, fontFamily: F }}>{msg.content}</p>

                {/* Signal rendering */}
                {msg.role === 'assistant' && msg.signal && (
                  <div style={{ marginTop: 16, paddingLeft: 20 }}>
                    {msg.signal.type === 'choice' && Array.isArray(msg.signal.data) && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {(msg.signal.data as string[]).map((opt: string, oi: number) => (
                          <button key={oi} onClick={() => sendChoice(opt)} disabled={isReflecting}
                            style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--border-hover)', color: 'var(--text-dim)', fontSize: 12, fontFamily: F, fontWeight: 300, cursor: isReflecting ? 'default' : 'pointer', opacity: isReflecting ? 0.4 : 1, letterSpacing: 0.5 }}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                    {msg.signal.type === 'mirror' && typeof msg.signal.data === 'string' && (
                      <p style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--text-muted)', fontFamily: F, fontWeight: 300, margin: 0, lineHeight: 1.7 }}>
                        {msg.signal.data as string}
                      </p>
                    )}
                    {msg.signal.type === 'sit' && (
                      <>
                        {sitPref === null && activeSitMsgIdx !== i && (
                          <div style={{ border: '1px solid var(--border)', padding: '16px 18px' }}>
                            <p style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 12px 0', fontFamily: F }}>Sit with this?</p>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {(['Hold me to it', 'Offer it', 'Not for me'] as const).map((label, pi) => {
                                const prefs: Array<'hold' | 'offer' | 'none'> = ['hold', 'offer', 'none'];
                                return (
                                  <button key={pi} onClick={() => setSitPreference(prefs[pi], i)}
                                    style={{ padding: '8px 14px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 11, fontFamily: F, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {sitPref === 'offer' && activeSitMsgIdx !== i && (
                          <button onClick={() => { setActiveSitMsgIdx(i); setSitCountdown(60); }}
                            style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, fontFamily: F, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer' }}>
                            Sit with this
                          </button>
                        )}
                        {activeSitMsgIdx === i && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0' }}>
                            <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, fontFamily: F, fontWeight: 300 }}>
                              {sitCountdown > 0 ? `Sitting with this. ${sitCountdown}s.` : 'Take your time.'}
                            </p>
                            <button onClick={() => { setActiveSitMsgIdx(null); setSitCountdown(0); }}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, fontFamily: F, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', padding: 0 }}>
                              Done
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}

            {streamedText && (
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 8px 0', fontFamily: F, display: 'flex', alignItems: 'center', gap: 6 }}>The Mirror<ConfrontationIcon level={confrontation} size={13} /><span style={{ fontSize: 10, letterSpacing: 2 }}>{getLevelInfo(confrontation)?.label}</span></p>
                <p style={{ fontSize: 18, lineHeight: 1.7, color: 'var(--text)', fontStyle: 'italic', fontWeight: 300, margin: 0, borderLeft: '2px solid var(--border-hover)', paddingLeft: 20, fontFamily: F }}>
                  {streamedText}<span style={{ display: 'inline-block', width: 2, height: 18, background: 'var(--accent)', marginLeft: 2, animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }} />
                </p>
              </div>
            )}

            {isReflecting && !streamedText && (
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 8px 0', fontFamily: F, display: 'flex', alignItems: 'center', gap: 6 }}>The Mirror<ConfrontationIcon level={confrontation} size={13} /><span style={{ fontSize: 10, letterSpacing: 2 }}>{getLevelInfo(confrontation)?.label}</span></p>
                <div style={{ display: 'flex', gap: 6, paddingLeft: 22, paddingTop: 8 }}>{[0, 1, 2].map((j) => (<div key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)', animation: `pulse 1.4s ease-in-out ${j * 0.2}s infinite` }} />))}</div>
              </div>
            )}

            {error && <div style={{ padding: 16, border: '1px solid rgba(255,107,107,0.2)', background: 'rgba(255,107,107,0.03)', marginBottom: 28 }}><p style={{ fontSize: 13, color: 'var(--error)', margin: 0, fontFamily: F }}>{error}</p></div>}

            {softCapShown && (
              <div style={{ marginBottom: 28, padding: '14px 18px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, fontFamily: F, fontWeight: 300, lineHeight: 1.7, fontStyle: 'italic' }}>
                  You've reflected deeply today. The mirror works best when you give yourself time to process between sessions.
                </p>
              </div>
            )}

            <p style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'center', margin: '40px 0 20px 0', fontFamily: F, opacity: 0.4 }}>
              Powered by BLUNNIT
            </p>
            </div>

            {/* Bottom input */}
            <div style={{ position: 'fixed', bottom: isDesktop ? 0 : keyboardOffset, left: isDesktop && sidebarOpen ? 280 : 0, right: 0, zIndex: 10, background: 'linear-gradient(transparent, var(--bg) 20%)', padding: `40px ${isDesktop ? 40 : 28}px`, paddingBottom: isDesktop ? 28 : 'max(28px, env(safe-area-inset-bottom))' as any }}>
              <div style={{ maxWidth: isDesktop ? 720 : 520, margin: '0 auto' }}>

                {/* Controls row: confrontation dial */}
                <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
                  {CONFRONTATION_LEVELS.map((level) => (
                    <button key={level.key} onClick={() => setConfrontation(level.key)} title={`${level.label}: ${level.desc}`} style={{ background: confrontation === level.key ? 'var(--surface)' : 'transparent', border: `1px solid ${confrontation === level.key ? 'var(--border-hover)' : 'transparent'}`, color: confrontation === level.key ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer', padding: '5px 8px', fontSize: 13, transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 4, fontFamily: F }}>
                      <ConfrontationIcon level={level.key} size={15} />
                      {confrontation === level.key && <span style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>{level.label}</span>}
                    </button>
                  ))}
                </div>

                {/* Input row */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {!user && anonRemaining <= 0 ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setShowAuthModal(true)}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: F, fontWeight: 300 }}>Create an account to continue reflecting</span>
                    </div>
                  ) : (
                    <>
                      <textarea value={journalText} onChange={(e) => setJournalText(e.target.value)} onKeyDown={handleKeyDown} placeholder="Go deeper..." rows={isDesktop ? 3 : 2} disabled={isReflecting} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 15, lineHeight: 1.6, padding: '14px 16px', fontFamily: F, fontWeight: 300, resize: 'none', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.3s', opacity: isReflecting ? 0.5 : 1 }} onFocus={(e) => { e.target.style.borderColor = 'var(--border-hover)'; if (!isDesktop) { setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 300); } }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
                      <button onClick={handleReflect} disabled={!journalText.trim() || isReflecting} style={{ padding: '14px 20px', background: journalText.trim() && !isReflecting ? 'var(--btn-bg)' : 'var(--surface)', color: journalText.trim() && !isReflecting ? 'var(--btn-text)' : 'var(--text-muted)', border: `1px solid ${journalText.trim() && !isReflecting ? 'var(--btn-bg)' : 'var(--border)'}`, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', cursor: journalText.trim() && !isReflecting ? 'pointer' : 'default', fontFamily: F, fontWeight: 500, transition: 'all 0.3s ease', whiteSpace: 'nowrap' }}>↵</button>
                    </>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
