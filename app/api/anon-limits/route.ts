import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const LIMIT = 3;

// GET ?fp=XXX → { remaining: number }
export async function GET(req: NextRequest) {
  const fp = req.nextUrl.searchParams.get('fp') || '';
  if (!fp) {
    return NextResponse.json({ remaining: LIMIT });
  }

  const today = new Date().toISOString().split('T')[0];
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('anon_usage')
    .select('count')
    .eq('fingerprint', fp)
    .eq('date', today)
    .maybeSingle();

  if (error) {
    console.error('[anon GET] db error:', error.message);
    return NextResponse.json({ remaining: LIMIT });
  }

  const count = data?.count ?? 0;
  const remaining = Math.max(0, LIMIT - count);
  console.log(`[anon GET] fp=...${fp.slice(-6)} date=${today} count=${count} remaining=${remaining}`);
  return NextResponse.json({ remaining });
}

// POST { fp } → { remaining: number }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const fp: string = body.fp || '';
  if (!fp) {
    return NextResponse.json({ error: 'missing fp' }, { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0];
  const supabase = createServiceClient();

  const { data: existing, error: selectErr } = await supabase
    .from('anon_usage')
    .select('count')
    .eq('fingerprint', fp)
    .eq('date', today)
    .maybeSingle();

  if (selectErr) {
    console.error('[anon POST] select error:', selectErr.message);
    return NextResponse.json({ remaining: 0 });
  }

  let newCount: number;
  if (existing) {
    newCount = existing.count + 1;
    const { error: updateErr } = await supabase
      .from('anon_usage')
      .update({ count: newCount })
      .eq('fingerprint', fp)
      .eq('date', today);
    if (updateErr) console.error('[anon POST] update error:', updateErr.message);
  } else {
    newCount = 1;
    const { error: insertErr } = await supabase
      .from('anon_usage')
      .insert({ fingerprint: fp, date: today, count: 1 });
    if (insertErr) console.error('[anon POST] insert error:', insertErr.message);
  }

  const remaining = Math.max(0, LIMIT - newCount);
  console.log(`[anon POST] fp=...${fp.slice(-6)} date=${today} newCount=${newCount} remaining=${remaining}`);
  return NextResponse.json({ remaining });
}
