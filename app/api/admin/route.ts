import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const PAGE_SIZE = 20;

function checkKey(key: string | null): boolean {
  const secret = process.env.ADMIN_SECRET_KEY;
  return !!secret && key === secret;
}

// GET /api/admin?key=XXX&page=1&filter=all
// Returns rows (paginated), counts, pagination info
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (!checkKey(key)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10));
  const filter = req.nextUrl.searchParams.get('filter') || 'all';

  const supabase = createServiceClient();
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from('training_data')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (filter !== 'all') {
    query = query.eq('rating', filter);
  }

  const { data: rows, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get counts per rating (select all ratings, count client-side to avoid multiple queries)
  const { data: allRatings } = await supabase
    .from('training_data')
    .select('rating');

  const counts = { total: allRatings?.length || 0, unrated: 0, good: 0, bad: 0, drifted: 0 };
  allRatings?.forEach(r => {
    if (r.rating === 'unrated') counts.unrated++;
    else if (r.rating === 'good') counts.good++;
    else if (r.rating === 'bad') counts.bad++;
    else if (r.rating === 'drifted') counts.drifted++;
  });

  return NextResponse.json({
    rows: rows || [],
    counts,
    page,
    totalPages: Math.max(1, Math.ceil((count || 0) / PAGE_SIZE)),
  });
}

// PATCH /api/admin
// Body: { key, id, rating?, corrected_response?, rule_violated?, notes? }
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { key, id, rating, corrected_response, rule_violated, notes } = body;

  if (!checkKey(key)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = createServiceClient();
  const update: Record<string, unknown> = { reviewed_at: new Date().toISOString() };
  if (rating !== undefined) update.rating = rating;
  if (corrected_response !== undefined) update.corrected_response = corrected_response || null;
  if (rule_violated !== undefined) update.rule_violated = rule_violated || null;
  if (notes !== undefined) update.notes = notes || null;

  const { error } = await supabase
    .from('training_data')
    .update(update)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
