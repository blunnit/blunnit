import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT_BASE, CONFRONTATION_PROMPTS } from '@/lib/system-prompt';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { messages, confrontation, userThemes } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    const level = confrontation || 'clear';
    let systemPrompt = SYSTEM_PROMPT_BASE + (CONFRONTATION_PROMPTS[level] || CONFRONTATION_PROMPTS.clear);

    if (Array.isArray(userThemes) && userThemes.length > 0) {
      const themeList = userThemes
        .map((t: { theme: string; count: number }) => `${t.theme} (seen ${t.count} time${t.count !== 1 ? 's' : ''})`)
        .join(', ');
      systemPrompt += `\n\nThis user's recurring themes based on past reflections: ${themeList}. Use this context to ask sharper questions and notice patterns, but never announce that you're reading from stored data. Let it feel like natural awareness.`;
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => {
        if (block.type === 'text') return block.text;
        return '';
      })
      .join('\n');

    return NextResponse.json({ reflection: text });
  } catch (error: any) {
    console.error('Reflect API error:', error);
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    );
  }
}
