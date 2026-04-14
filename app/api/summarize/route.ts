import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase-server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { conversation_id, user_id } = await req.json();
    if (!conversation_id || !user_id) {
      return NextResponse.json({ error: 'conversation_id and user_id required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Skip if a summary already exists for this conversation
    const { data: existing } = await supabase
      .from('conversation_summaries')
      .select('id')
      .eq('conversation_id', conversation_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Fetch messages for this conversation
    const { data: msgs, error: msgsError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true });

    if (msgsError || !msgs || msgs.length < 2) {
      return NextResponse.json({ ok: false });
    }

    const transcript = msgs
      .map((m: { role: string; content: string }) =>
        `${m.role === 'user' ? 'User' : 'Mirror'}: ${m.content}`
      )
      .join('\n\n');

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Summarize this reflection session in 2-3 sentences. Focus on the core emotional themes, patterns you noticed, and any breakthroughs or resistance. Also list 3-5 single-word theme tags. Respond in JSON only, no markdown: { "summary": string, "themes": string[] }\n\n${transcript}`,
        },
      ],
    });

    const raw = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('');

    let parsed: { summary: string; themes: string[] };
    try {
      const jsonStr = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error('[summarize] failed to parse response:', raw);
      return NextResponse.json({ ok: false });
    }

    const { error: insertError } = await supabase.from('conversation_summaries').insert({
      user_id,
      conversation_id,
      summary: parsed.summary,
      themes: Array.isArray(parsed.themes) ? parsed.themes : [],
    });

    if (insertError) {
      console.error('[summarize] insert error:', insertError.message);
      return NextResponse.json({ ok: false });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[summarize] error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
