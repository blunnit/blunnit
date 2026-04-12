import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase-server';

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { conversationId, messages } = await req.json();

  if (!conversationId || !messages?.length) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const combined = (messages as string[]).slice(0, 3).join('\n\n');

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 15,
    messages: [{
      role: 'user',
      content: `Summarize this conversation in 2-4 words. Respond with ONLY the title. Maximum 4 words. Examples: 'Career crossroads', 'Fear of judgment', 'Relationship tension', 'Finding purpose'\n\n${combined.slice(0, 600)}`,
    }],
  });

  const raw = (msg.content[0] as { type: string; text: string }).text?.trim() || '';
  const title = raw.replace(/^["']|["']$/g, '').slice(0, 30).trim();

  const supabase = createServiceClient();
  await supabase
    .from('conversations')
    .update({ title: title || (messages[0] as string).slice(0, 30) })
    .eq('id', conversationId)
    .eq('user_id', userId);

  return NextResponse.json({ ok: true, title });
}
