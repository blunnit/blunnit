'use client';

import { useState, useEffect, useCallback } from 'react';

const F = "'Cormorant Garamond', Georgia, serif";

const RULE_OPTIONS = [
  'Assumption',
  'Binary Collapse',
  'Pressure',
  'Fabricated Insight',
  'Generic Question',
  'No Heart',
  'Em Dash',
  'Protocol Leak',
  'Other',
];

type TrainingRow = {
  id: string;
  user_input: string;
  ai_response: string;
  confrontation_level: string | null;
  rating: 'good' | 'bad' | 'drifted' | 'unrated';
  corrected_response: string | null;
  rule_violated: string | null;
  notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type Counts = { total: number; unrated: number; good: number; bad: number; drifted: number };
type RowDraft = { corrected_response: string; rule_violated: string; notes: string };

const ratingColor = (r: string) => {
  if (r === 'good') return '#4ade80';
  if (r === 'bad') return '#f87171';
  if (r === 'drifted') return '#facc15';
  return '#444';
};

const levelLabel = (l: string | null) => {
  if (l === 'gentle') return 'GENTLE';
  if (l === 'piercing') return 'PIERCING';
  return 'CLEAR';
};

const levelColor = (l: string | null) => {
  if (l === 'gentle') return '#93c5fd';
  if (l === 'piercing') return '#f87171';
  return '#a3a3a3';
};

export default function AdminPage() {
  const [key, setKey] = useState('');
  const [rows, setRows] = useState<TrainingRow[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, unrated: 0, good: 0, bad: 0, drifted: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setKey(params.get('key') || '');
  }, []);

  const fetchData = useCallback(async (k: string, p: number, f: string) => {
    if (!k) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin?key=${encodeURIComponent(k)}&page=${p}&filter=${f}`);
      if (res.status === 403) { setAuthed(false); setLoading(false); return; }
      setAuthed(true);
      const data = await res.json();
      if (data.error) { setError(data.error); setLoading(false); return; }
      setRows(data.rows || []);
      setCounts(data.counts || { total: 0, unrated: 0, good: 0, bad: 0, drifted: 0 });
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
      // Init drafts — pre-fill corrected_response with the ai_response so Scott can edit in place
      setDrafts(prev => {
        const next = { ...prev };
        (data.rows || []).forEach((r: TrainingRow) => {
          if (!next[r.id]) {
            next[r.id] = {
              corrected_response: r.corrected_response ?? r.ai_response,
              rule_violated: r.rule_violated || '',
              notes: r.notes || '',
            };
          }
        });
        return next;
      });
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (key) fetchData(key, page, filter);
  }, [key, page, filter, fetchData]);

  const updateDraft = (id: string, field: keyof RowDraft, value: string) => {
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const rateRow = async (id: string, rating: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, rating: rating as TrainingRow['rating'] } : r));
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, id, rating }),
    });
  };

  const saveCorrection = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    setSaving(prev => ({ ...prev, [id]: true }));
    const res = await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key, id,
        corrected_response: draft.corrected_response,
        rule_violated: draft.rule_violated,
        notes: draft.notes,
      }),
    });
    setSaving(prev => ({ ...prev, [id]: false }));
    if (res.ok) {
      setSaved(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, [id]: false })), 2000);
    }
  };

  const exportFile = (format: 'csv' | 'json') => {
    window.open(`/api/admin/export?key=${encodeURIComponent(key)}&format=${format}`, '_blank');
  };

  if (authed === null && !loading && !key) {
    return (
      <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F }}>
        <p style={{ color: '#555', fontSize: 13, letterSpacing: 2 }}>Add ?key=YOUR_KEY to the URL</p>
      </div>
    );
  }

  if (authed === false) {
    return (
      <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F }}>
        <p style={{ color: '#f87171', fontSize: 13, letterSpacing: 2 }}>403 FORBIDDEN</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#000', minHeight: '100vh', fontFamily: F, color: '#ccc', padding: '28px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ borderBottom: '1px solid #1e1e1e', paddingBottom: 18, marginBottom: 20 }}>
          <p style={{ fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: '#444', margin: '0 0 10px 0' }}>BLUNNIT ADMIN</p>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#777' }}>Total: <strong style={{ color: '#ccc' }}>{counts.total}</strong></span>
              <span style={{ fontSize: 13, color: '#555' }}>Unrated: <strong style={{ color: '#888' }}>{counts.unrated}</strong></span>
              <span style={{ fontSize: 13, color: '#4ade80' }}>Good: <strong>{counts.good}</strong></span>
              <span style={{ fontSize: 13, color: '#f87171' }}>Bad: <strong>{counts.bad}</strong></span>
              <span style={{ fontSize: 13, color: '#facc15' }}>Drifted: <strong>{counts.drifted}</strong></span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => exportFile('csv')} style={exportBtn}>Export CSV</button>
              <button onClick={() => exportFile('json')} style={exportBtn}>Export JSON</button>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
          {(['all', 'unrated', 'good', 'bad', 'drifted'] as const).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              style={{
                padding: '5px 14px',
                background: filter === f ? '#1a1a1a' : 'transparent',
                border: `1px solid ${filter === f ? '#333' : '#1e1e1e'}`,
                color: filter === f ? '#bbb' : '#444',
                fontSize: 10,
                letterSpacing: 2,
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: F,
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {loading && <p style={{ color: '#333', fontSize: 13 }}>Loading...</p>}
        {error && <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>}

        {/* Cards */}
        {rows.map((row, i) => {
          const draft = drafts[row.id] || { corrected_response: row.ai_response, rule_violated: '', notes: '' };
          const isSaving = saving[row.id];
          const wasSaved = saved[row.id];

          return (
            <div
              key={row.id}
              style={{
                border: '1px solid #1a1a1a',
                marginBottom: 16,
                background: '#050505',
              }}
            >
              {/* Card meta bar */}
              <div style={{ padding: '10px 16px', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: '#333', letterSpacing: 1 }}>#{(page - 1) * 20 + i + 1}</span>
                <span style={{ fontSize: 10, color: '#333' }}>{new Date(row.created_at).toLocaleString()}</span>
                <span style={{
                  fontSize: 10,
                  color: levelColor(row.confrontation_level),
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  border: `1px solid ${levelColor(row.confrontation_level)}33`,
                  padding: '1px 7px',
                }}>
                  {levelLabel(row.confrontation_level)}
                </span>
                <span style={{ fontSize: 10, color: ratingColor(row.rating), letterSpacing: 2, textTransform: 'uppercase' }}>
                  {row.rating}
                </span>
              </div>

              {/* Two-column body */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>

                {/* LEFT: original content */}
                <div style={{ padding: '18px 20px', borderRight: '1px solid #1a1a1a' }}>
                  {/* User input */}
                  <p style={label}>User Input</p>
                  <p style={{ fontSize: 14, color: '#888', lineHeight: 1.7, margin: '0 0 20px 0', fontStyle: 'italic', whiteSpace: 'pre-wrap', fontWeight: 300 }}>
                    {row.user_input}
                  </p>

                  {/* AI response */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <p style={{ ...label, margin: 0 }}>AI Response</p>
                    <span style={{ fontSize: 10, color: levelColor(row.confrontation_level), letterSpacing: 1, textTransform: 'uppercase' }}>
                      {levelLabel(row.confrontation_level)}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: '#bbb', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap', fontWeight: 300 }}>
                    {row.ai_response}
                  </p>
                </div>

                {/* RIGHT: correction tools */}
                <div style={{ padding: '18px 20px' }}>
                  {/* Corrected response — pre-filled with AI response for editing */}
                  <p style={label}>Corrected Response</p>
                  <textarea
                    value={draft.corrected_response}
                    onChange={e => updateDraft(row.id, 'corrected_response', e.target.value)}
                    rows={8}
                    style={{ ...textareaStyle, marginBottom: 16 }}
                  />

                  {/* Rating */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#444', marginRight: 4 }}>Rate:</span>
                    {(['good', 'bad', 'drifted'] as const).map(r => (
                      <button
                        key={r}
                        onClick={() => rateRow(row.id, r)}
                        style={{
                          padding: '5px 14px',
                          background: row.rating === r ? `${ratingColor(r)}15` : 'transparent',
                          border: `1px solid ${row.rating === r ? ratingColor(r) : '#222'}`,
                          color: row.rating === r ? ratingColor(r) : '#444',
                          fontSize: 10,
                          letterSpacing: 2,
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          fontFamily: F,
                          transition: 'all 0.15s',
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  {/* Rule violated */}
                  <div style={{ marginBottom: 12 }}>
                    <p style={label}>Rule Violated</p>
                    <select
                      value={draft.rule_violated}
                      onChange={e => updateDraft(row.id, 'rule_violated', e.target.value)}
                      style={selectStyle}
                    >
                      <option value="">None</option>
                      {RULE_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Notes */}
                  <div style={{ marginBottom: 14 }}>
                    <p style={label}>Notes</p>
                    <textarea
                      value={draft.notes}
                      onChange={e => updateDraft(row.id, 'notes', e.target.value)}
                      placeholder="Why is this bad? What pattern does it represent?"
                      rows={2}
                      style={textareaStyle}
                    />
                  </div>

                  {/* Save */}
                  <button
                    onClick={() => saveCorrection(row.id)}
                    disabled={isSaving}
                    style={{
                      padding: '7px 22px',
                      background: 'transparent',
                      border: `1px solid ${wasSaved ? '#4ade80' : '#2a2a2a'}`,
                      color: wasSaved ? '#4ade80' : '#555',
                      fontSize: 10,
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                      cursor: isSaving ? 'default' : 'pointer',
                      fontFamily: F,
                      transition: 'all 0.2s',
                    }}
                  >
                    {isSaving ? 'Saving...' : wasSaved ? 'Saved' : 'Save Correction'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid #1a1a1a' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ ...paginationBtn, opacity: page === 1 ? 0.3 : 1 }}
            >
              Prev
            </button>
            <span style={{ fontSize: 11, color: '#444', fontFamily: F }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ ...paginationBtn, opacity: page === totalPages ? 0.3 : 1 }}
            >
              Next
            </button>
          </div>
        )}

        {rows.length === 0 && !loading && authed && (
          <p style={{ color: '#2a2a2a', fontSize: 13, fontStyle: 'italic' }}>No rows match this filter.</p>
        )}
      </div>
    </div>
  );
}

const label: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: '#3a3a3a',
  margin: '0 0 6px 0',
  fontFamily: F,
};

const exportBtn: React.CSSProperties = {
  padding: '6px 14px',
  background: 'transparent',
  border: '1px solid #222',
  color: '#555',
  fontSize: 10,
  letterSpacing: 2,
  textTransform: 'uppercase',
  cursor: 'pointer',
  fontFamily: F,
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  background: '#080808',
  border: '1px solid #1a1a1a',
  color: '#bbb',
  fontSize: 13,
  lineHeight: 1.7,
  padding: '10px 12px',
  fontFamily: F,
  fontWeight: 300,
  resize: 'vertical',
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  background: '#080808',
  border: '1px solid #1a1a1a',
  color: '#888',
  fontSize: 12,
  padding: '7px 10px',
  fontFamily: F,
  outline: 'none',
  width: '100%',
};

const paginationBtn: React.CSSProperties = {
  padding: '5px 14px',
  background: 'transparent',
  border: '1px solid #1e1e1e',
  color: '#444',
  fontSize: 10,
  letterSpacing: 2,
  textTransform: 'uppercase',
  cursor: 'pointer',
  fontFamily: F,
};
