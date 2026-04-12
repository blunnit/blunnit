import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const ANON_DAILY_LIMIT = 3;

// GET: check remaining reflections for this fingerprint today
// Query param: ?fingerprint=XXX
// Returns: { allowed: boolean, remaining: number }
export async function GET(req: NextRequest) {
  const fingerprint = req.nextUrl.searchParams.get('fingerprint') || req.nextUrl.searchParams.get('fp');
  if (!fingerprint) {
    return NextResponse.json({ allowed: true, remaining: ANON_DAILY_LIMIT });
  }

  const supabase = createServiceClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('anon_usage')
    .select('count')
    .eq('fingerprint', fingerprint)
    .eq('date', today)
    .maybeSingle();

  if (error) {
    console.error('[anon-limits GET] DB error:', error.message);
    // If table doesn't exist, fail open (allow the reflection)
    return NextResponse.json({ allowed: true, remaining: ANON_DAILY_LIMIT });
  }

  const count = data?.count ?? 0;
  const remaining = Math.max(0, ANON_DAILY_LIMIT - count);
  console.log(`[anon-limits GET] fp=...${fingerprint.slice(-6)} date=${today} count=${count} remaining=${remaining}`);
  return NextResponse.json({ allowed: remaining > 0, remaining });
}

// POST: increment usage count for this fingerprint today
// Body: { fingerprint: string }
// Returns: { remaining: number }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const fingerprint = body.fingerprint || body.fp;
  if (!fingerprint) {
    return NextResponse.json({ error: 'Missing fingerprint' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: existing, error: selectError } = await supabase
    .from('anon_usage')
    .select('count')
    .eq('fingerprint', fingerprint)
    .eq('date', today)
    .maybeSingle();

  if (selectError) {
    console.error('[anon-limits POST] DB error on select:', selectError.message);
    return NextResponse.json({ remaining: 0 });
  }

  let newCount = 1;
  if (existing) {
    newCount = existing.count + 1;
    const { error: updateError } = await supabase
      .from('anon_usage')
      .update({ count: newCount })
      .eq('fingerprint', fingerprint)
      .eq('date', today);
    if (updateError) console.error('[anon-limits POST] update error:', updateError.message);
  } else {
    const { error: insertError } = await supabase
      .from('anon_usage')
      .insert({ fingerprint, date: today, count: 1 });
    if (insertError) console.error('[anon-limits POST] insert error:', insertError.message);
  }

  const remaining = Math.max(0, ANON_DAILY_LIMIT - newCount);
  console.log(`[anon-limits POST] fp=...${fingerprint.slice(-6)} date=${today} newCount=${newCount} remaining=${remaining}`);
  return NextResponse.json({ remaining });
}
