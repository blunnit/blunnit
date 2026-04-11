import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-auth-server';
import { TIERS } from '@/lib/constants';

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      tier: 'anonymous',
      allowed: true,
      remaining: TIERS.anonymous.reflectionsPerSession,
      limit: TIERS.anonymous.reflectionsPerSession,
    });
  }

  // Get user profile for tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();

  const tier = profile?.tier || 'free';

  if (tier === 'paid') {
    return NextResponse.json({
      tier: 'paid',
      allowed: true,
      remaining: Infinity,
      limit: Infinity,
    });
  }

  // Check free tier limits
  const weekStart = getWeekStart();
  const { data: countData } = await supabase
    .from('reflection_counts')
    .select('count')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .single();

  const used = countData?.count || 0;
  const limit = TIERS.free.reflectionsPerWeek;
  const remaining = Math.max(0, limit - used);

  return NextResponse.json({
    tier: 'free',
    allowed: remaining > 0,
    remaining,
    limit,
    used,
  });
}

export async function POST() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();

  if (profile?.tier === 'paid') {
    return NextResponse.json({ ok: true });
  }

  const weekStart = getWeekStart();

  // Upsert: increment count or create with 1
  const { data: existing } = await supabase
    .from('reflection_counts')
    .select('id, count')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .single();

  if (existing) {
    await supabase
      .from('reflection_counts')
      .update({ count: existing.count + 1 })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('reflection_counts')
      .insert({ user_id: user.id, week_start: weekStart, count: 1 });
  }

  return NextResponse.json({ ok: true });
}
