import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — return current reflect_days_count for display
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ reflect_days_count: 0 });

  const { data, error } = await supabase
    .from('profiles')
    .select('reflect_days_count')
    .eq('id', userId)
    .single();

  if (error) console.error('[reflect-days GET] error:', error.message);
  return NextResponse.json({ reflect_days_count: data?.reflect_days_count ?? 0 });
}

// POST — increment if this is the first reflection today
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('profiles')
    .select('reflect_days_count, last_reflect_date')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[reflect-days POST] select error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const lastDate = data?.last_reflect_date ?? null;

  // Already reflected today — nothing to do
  if (lastDate === today) {
    return NextResponse.json({ reflect_days_count: data?.reflect_days_count ?? 0 });
  }

  const newCount = (data?.reflect_days_count ?? 0) + 1;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ reflect_days_count: newCount, last_reflect_date: today })
    .eq('id', userId);

  if (updateError) {
    console.error('[reflect-days POST] update error:', updateError.message);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ reflect_days_count: newCount });
}
