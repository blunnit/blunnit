import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const ANON_DAILY_LIMIT = 3;

// GET: check usage for a fingerprint today — returns { allowed, remaining, count }
export async function GET(req: NextRequest) {
  const fp = req.nextUrl.searchParams.get('fp') || req.nextUrl.searchParams.get('fingerprint');
  if (!fp) return NextResponse.json({ allowed: true, remaining: ANON_DAILY_LIMIT, count: 0 });

  const supabase = createServiceClient();
  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('anon_usage')
    .select('count')
    .eq('fingerprint', fp)
    .eq('date', today)
    .maybeSingle();

  const count = data?.count || 0;
  const remaining = Math.max(0, ANON_DAILY_LIMIT - count);
  console.log(`[anon-limits GET] fp=${fp} date=${today} count=${count} remaining=${remaining} allowed=${remaining > 0}`);
  return NextResponse.json({ allowed: remaining > 0, remaining, count, limit: ANON_DAILY_LIMIT });
}

// POST: increment usage count for a fingerprint today
export async function POST(req: NextRequest) {
  const { fp } = await req.json();
  if (!fp) return NextResponse.json({ error: 'Missing fingerprint' }, { status: 400 });

  const supabase = createServiceClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await supabase
    .from('anon_usage')
    .select('count')
    .eq('fingerprint', fp)
    .eq('date', today)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('anon_usage')
      .update({ count: existing.count + 1 })
      .eq('fingerprint', fp)
      .eq('date', today);
    console.log(`[anon-limits POST] fp=${fp} date=${today} new count=${existing.count + 1}`);
  } else {
    await supabase
      .from('anon_usage')
      .insert({ fingerprint: fp, date: today, count: 1 });
    console.log(`[anon-limits POST] fp=${fp} date=${today} new count=1 (first use)`);
  }

  return NextResponse.json({ ok: true });
}
