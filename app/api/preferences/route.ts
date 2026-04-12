import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ show_daily_prompt: true, show_how_it_works: true });
  }

  const { data } = await supabase
    .from('profiles')
    .select('show_daily_prompt, show_how_it_works')
    .eq('id', userId)
    .single();

  return NextResponse.json({
    show_daily_prompt: data?.show_daily_prompt ?? true,
    show_how_it_works: data?.show_how_it_works ?? true,
  });
}

export async function PATCH(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, boolean> = {};
  if (typeof body.show_daily_prompt === 'boolean') updates.show_daily_prompt = body.show_daily_prompt;
  if (typeof body.show_how_it_works === 'boolean') updates.show_how_it_works = body.show_how_it_works;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no valid fields' }, { status: 400 });
  }

  await supabase.from('profiles').update(updates).eq('id', userId);
  return NextResponse.json({ ok: true });
}
