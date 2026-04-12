import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

// One-shot setup endpoint — creates anon_usage table if missing.
// Call once: GET /api/setup-anon-table
// Safe to call multiple times (uses IF NOT EXISTS).
export async function GET() {
  const supabase = createServiceClient();

  // Verify table exists by selecting from it
  const { error: checkError } = await supabase
    .from('anon_usage')
    .select('fingerprint')
    .limit(1);

  if (!checkError) {
    return NextResponse.json({ ok: true, message: 'anon_usage table already exists' });
  }

  // Table missing — return the SQL the user needs to run
  const sql = `
CREATE TABLE IF NOT EXISTS public.anon_usage (
  fingerprint text NOT NULL,
  date date NOT NULL,
  count integer DEFAULT 0 NOT NULL,
  PRIMARY KEY (fingerprint, date)
);
ALTER TABLE public.anon_usage DISABLE ROW LEVEL SECURITY;
  `.trim();

  console.log('[setup-anon-table] Table missing. Run this SQL in Supabase dashboard:\n', sql);

  return NextResponse.json({
    ok: false,
    error: 'anon_usage table does not exist',
    sql,
    supabase_url: 'https://supabase.com/dashboard/project/csvroqepkikmbqyblscc/sql/new',
    message: 'Paste the sql field into the Supabase SQL editor and run it, then call this endpoint again to verify.',
  });
}
