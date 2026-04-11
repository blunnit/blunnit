import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase-server';

const anthropic = new Anthropic();

// GET: fetch top themes for the authenticated user
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ themes: [] });

  const supabase = createServiceClient();
  const { data: themes } = await supabase
    .from('user_themes')
    .select('theme, count')
    .eq('user_id', userId)
    .order('count', { ascending: false })
    .limit(10);

  return NextResponse.json({ themes: themes || [] });
}

// POST: extract themes from reflection text and upsert into user_themes
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: 'Missing text' }, { status: 400 });

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `Extract 2-5 key psychological or emotional themes from this reflection. Return only a JSON array of short lowercase strings, like ["control", "career tension", "fear of judgment"]. Text:\n\n${text.slice(0, 800)}`,
    }],
  });

  let themes: string[] = [];
  try {
    const raw = (msg.content[0] as { type: string; text: string }).text?.trim() || '[]';
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) themes = JSON.parse(match[0]);
  } catch {}

  if (!Array.isArray(themes) || themes.length === 0) {
    return NextResponse.json({ ok: true, themes: [] });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  for (const theme of themes.slice(0, 5)) {
    const t = String(theme).toLowerCase().trim().slice(0, 60);
    if (!t) continue;

    const { data: existing } = await supabase
      .from('user_themes')
      .select('id, count')
      .eq('user_id', userId)
      .eq('theme', t)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('user_themes')
        .update({ count: existing.count + 1, last_seen: now })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('user_themes')
        .insert({ user_id: userId, theme: t, count: 1, last_seen: now });
    }
  }

  return NextResponse.json({ ok: true, themes });
}
