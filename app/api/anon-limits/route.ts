import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const ANON_DAILY_LIMIT = 3;

// GET: check usage count for a fingerprint today
export async function GET(req: NextRequest) {
  const fp = req.nextUrl.searchParams.get('fp');
  if (!fp) return NextResponse.json({ count: 0 });

  const supabase = createServiceClient();
  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('anon_usage')
    .select('count')
    .eq('fingerprint', fp)
    .eq('date', today)
    .maybeSingle();

  return NextResponse.json({ count: data?.count || 0, limit: ANON_DAILY_LIMIT });
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
  } else {
    await supabase
      .from('anon_usage')
      .insert({ fingerprint: fp, date: today, count: 1 });
  }

  return NextResponse.json({ ok: true });
}
