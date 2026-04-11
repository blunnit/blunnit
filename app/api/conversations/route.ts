import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

// GET: List conversations or get a specific one
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('id');

  if (conversationId) {
    const { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    return NextResponse.json({ conversation, messages: messages || [] });
  }

  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(50);

  return NextResponse.json({ conversations: conversations || [] });
}

// POST: Create conversation or add message
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const supabase = createServiceClient();
  const body = await req.json();

  if (body.action === 'create') {
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        confrontation_level: body.confrontation || 'clear',
        title: body.title || 'Untitled reflection',
      })
      .select()
      .single();

    if (error) {
      console.error('[conversations] create error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversation });
  }

  if (body.action === 'message') {
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: body.conversationId,
        role: body.role,
        content: body.content,
        confrontation_level: body.confrontationLevel,
      });

    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', body.conversationId)
      .eq('user_id', userId);

    if (error) {
      console.error('[conversations] message error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// PATCH: Rename a conversation
export async function PATCH(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const supabase = createServiceClient();
  const { conversationId, title } = await req.json();

  if (!conversationId || !title) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  await supabase
    .from('conversations')
    .update({ title: title.slice(0, 100) })
    .eq('id', conversationId)
    .eq('user_id', userId);

  return NextResponse.json({ ok: true });
}

// DELETE: Remove a conversation
export async function DELETE(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('id');

  if (!conversationId) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', userId);

  return NextResponse.json({ ok: true });
}
