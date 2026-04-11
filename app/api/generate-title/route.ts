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

  const { conversationId, messages } = await req.json();

  if (!conversationId || !messages?.length) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const combined = (messages as string[]).slice(0, 3).join('\n\n');

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 20,
    messages: [{
      role: 'user',
      content: `Generate a 3-6 word topic title for this conversation. Respond with only the title, nothing else:\n\n${combined.slice(0, 600)}`,
    }],
  });

  const raw = (msg.content[0] as { type: string; text: string }).text?.trim() || '';
  const title = raw.replace(/^["']|["']$/g, '').slice(0, 60).trim();

  await supabase
    .from('conversations')
    .update({ title: title || (messages[0] as string).slice(0, 40) })
    .eq('id', conversationId)
    .eq('user_id', user.id);

  return NextResponse.json({ ok: true, title });
}
