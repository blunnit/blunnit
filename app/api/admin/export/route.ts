import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const EXPORT_COLS = [
  'user_input',
  'ai_response',
  'confrontation_level',
  'rating',
  'corrected_response',
  'rule_violated',
  'notes',
  'created_at',
] as const;

type ExportRow = Record<(typeof EXPORT_COLS)[number], string | null>;

// GET /api/admin/export?key=XXX&format=csv|json
// Returns all rated (non-unrated) rows for fine-tuning
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (key !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const format = req.nextUrl.searchParams.get('format') === 'csv' ? 'csv' : 'json';
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('training_data')
    .select(EXPORT_COLS.join(', '))
    .neq('rating', 'unrated')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data || []) as unknown as ExportRow[];
  const date = new Date().toISOString().split('T')[0];

  if (format === 'csv') {
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      EXPORT_COLS.join(','),
      ...rows.map(r => EXPORT_COLS.map(col => escape(r[col])).join(',')),
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="blunnit-training-${date}.csv"`,
      },
    });
  }

  return new NextResponse(JSON.stringify(rows, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="blunnit-training-${date}.json"`,
    },
  });
}
