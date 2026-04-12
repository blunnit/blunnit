import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export async function DELETE(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const supabase = createServiceClient();

  // Delete user themes
  await supabase.from('user_themes').delete().eq('user_id', userId);

  // Delete reflection counts if table exists
  await supabase.from('reflection_counts').delete().eq('user_id', userId);

  // Delete messages first (child of conversations)
  const { data: convos } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', userId);

  if (convos?.length) {
    const ids = convos.map((c) => c.id);
    await supabase.from('messages').delete().in('conversation_id', ids);
    await supabase.from('conversations').delete().eq('user_id', userId);
  }

  // Delete profile
  await supabase.from('profiles').delete().eq('id', userId);

  // Delete the auth user — requires service role
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) {
    console.error('[delete-account] auth.admin.deleteUser error:', authError.message);
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
