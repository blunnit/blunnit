import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = createServiceClient();
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('daily_presence').select('count').eq('date', today).single();
  return NextResponse.json({ count: data?.count || 0 });
}

export async function POST() {
  const supabase = createServiceClient();
  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase.from('daily_presence').select('count').eq('date', today).single();
  if (existing) {
    await supabase.from('daily_presence').update({ count: existing.count + 1 }).eq('date', today);
  } else {
    await supabase.from('daily_presence').insert({ date: today, count: 1 });
  }
  return NextResponse.json({ ok: true });
}
