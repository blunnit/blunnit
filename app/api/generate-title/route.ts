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

  let title: string;
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 15,
      system: 'You are naming a self-awareness reflection conversation. Generate a 2-3 word active title. Use active framing words from this list: Work, Focus, Reflection, Clarity, Tension, Shift, Pattern, Unpacking, Navigating, Exploring, Reckoning, Sitting With, Facing, Untangling, Reconciling, Questioning, Examining, Processing. Pick the CORE topic only. Do NOT combine multiple topics. Do NOT assume emotions not stated. Respond with ONLY the title. Maximum 3 words.',
      messages: [{
        role: 'user',
        content: combined.slice(0, 600),
      }],
    });
    const raw = (msg.content[0] as { type: string; text: string }).text?.trim() || '';
    title = raw.replace(/^["']|["']$/g, '').slice(0, 30).trim();
  } catch (err) {
    console.error('Title generation failed:', err);
    return NextResponse.json({ error: 'Title generation failed' }, { status: 500 });
  }

  const supabase = createServiceClient();
  await supabase
    .from('conversations')
    .update({ title: title || 'New Reflection' })
    .eq('id', conversationId)
    .eq('user_id', userId);

  return NextResponse.json({ ok: true, title });
}
