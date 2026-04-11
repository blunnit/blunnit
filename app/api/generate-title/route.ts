import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabase } from '@/lib/supabase-auth-server';

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { conversationId, firstMessage } = await req.json();

  if (!conversationId || !firstMessage) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 20,
    messages: [{
      role: 'user',
      content: `Generate a short topic title (max 40 characters) for a reflection that begins with this message. Return only the title, no quotes, no punctuation at the end:\n\n${firstMessage.slice(0, 300)}`,
    }],
  });

  const raw = (msg.content[0] as { type: string; text: string }).text?.trim() || '';
  const title = raw.replace(/^["']|["']$/g, '').slice(0, 40).trim();

  await supabase
    .from('conversations')
    .update({ title: title || firstMessage.slice(0, 40) })
    .eq('id', conversationId)
    .eq('user_id', user.id);

  return NextResponse.json({ ok: true, title });
}
