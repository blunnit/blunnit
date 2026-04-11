import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-auth-server';

// GET: List conversations or get a specific one
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('id');

  if (conversationId) {
    // Get specific conversation with messages
    const { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    return NextResponse.json({ conversation, messages: messages || [] });
  }

  // List all conversations
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50);

  return NextResponse.json({ conversations: conversations || [] });
}

// POST: Create conversation or add message
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();

  if (body.action === 'create') {
    // Create new conversation
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        confrontation_level: body.confrontation || 'clear',
        title: body.title || 'Untitled reflection',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversation });
  }

  if (body.action === 'message') {
    // Add message to conversation
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: body.conversationId,
        role: body.role,
        content: body.content,
        confrontation_level: body.confrontationLevel,
      });

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', body.conversationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// PATCH: Rename a conversation
export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { conversationId, title } = await req.json();

  if (!conversationId || !title) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  await supabase
    .from('conversations')
    .update({ title: title.slice(0, 100) })
    .eq('id', conversationId)
    .eq('user_id', user.id);

  return NextResponse.json({ ok: true });
}

// DELETE: Remove a conversation
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('id');

  if (!conversationId) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', user.id);

  return NextResponse.json({ ok: true });
}
