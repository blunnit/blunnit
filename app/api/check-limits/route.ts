import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FREE_WEEKLY_LIMIT = 10;

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.getFullYear(), now.getMonth(), diff);
  return monday.toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ tier: 'anonymous', allowed: true, remaining: 3, limit: 3 });
  }

  const { data: profile } = await supabase.from('profiles').select('tier').eq('id', userId).single();
  const tier = profile?.tier || 'free';

  if (tier === 'paid') {
    return NextResponse.json({ tier: 'paid', allowed: true, remaining: 999, limit: 999 });
  }

  const weekStart = getWeekStart();
  const { data: countData } = await supabase.from('reflection_counts').select('count').eq('user_id', userId).eq('week_start', weekStart).single();
  const used = countData?.count || 0;
  const remaining = Math.max(0, FREE_WEEKLY_LIMIT - used);

  return NextResponse.json({ tier: 'free', allowed: remaining > 0, remaining, limit: FREE_WEEKLY_LIMIT, used });
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ ok: true });

  const { data: profile } = await supabase.from('profiles').select('tier').eq('id', userId).single();
  if (profile?.tier === 'paid') return NextResponse.json({ ok: true });

  const weekStart = getWeekStart();
  const { data: existing } = await supabase.from('reflection_counts').select('id, count').eq('user_id', userId).eq('week_start', weekStart).single();

  if (existing) {
    await supabase.from('reflection_counts').update({ count: existing.count + 1 }).eq('id', existing.id);
  } else {
    await supabase.from('reflection_counts').insert({ user_id: userId, week_start: weekStart, count: 1 });
  }

  return NextResponse.json({ ok: true });
}