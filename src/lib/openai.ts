import OpenAI from 'openai';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.warn('⚠️ VITE_OPENAI_API_KEY is not set. AI generation will fail. Add it to your .env file.');
}

export const openai = new OpenAI({
  apiKey: apiKey || '',
  dangerouslyAllowBrowser: true,
});

// Helper: generateText
export async function generateText({ prompt, maxTokens = 2000, model = 'gpt-4o' }: { prompt: string; maxTokens?: number; model?: string }) {
  const response = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
  });
  return { text: response.choices[0]?.message?.content || '' };
}

// Helper: generateObject (returns parsed JSON matching a schema shape)
export async function generateObject({ prompt, schema, model = 'gpt-4o' }: { prompt: string; schema: string | Record<string, any>; model?: string }): Promise<{ object: any }> {
  const schemaStr = typeof schema === 'string' ? schema : JSON.stringify(schema, null, 2);
  const systemPrompt = `Respond ONLY with valid JSON that conforms to this schema description:\n${schemaStr}\nNo explanation, no markdown, just raw JSON.`;
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    max_tokens: 3000,
  });
  const raw = response.choices[0]?.message?.content || '{}';
  return { object: JSON.parse(raw) };
}

// Helper: generateImage (returns native Blob URL via DALL-E 3)
export async function generateImage({ prompt, n = 1 }: { prompt: string; n?: number }) {
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n,
    size: '1024x1024',
    response_format: 'b64_json', // prevent 2-hour Azure SAS expiration
  });
  
  const urls = await Promise.all(response.data.map(async img => {
    if (img.b64_json) {
      try {
        const res = await fetch(`data:image/png;base64,${img.b64_json}`);
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      } catch (err) {
        console.error('Failed to convert base64 to Blob', err);
        return '';
      }
    }
    return img.url || '';
  }));
  
  return { data: urls.map(url => ({ url })) };
}

// Helper: generateSpeech (returns Blob URL)
export async function generateSpeech({ text, voice = 'nova' }: { text: string; voice?: string }) {
  const response = await openai.audio.speech.create({
    model: 'tts-1',
    voice: voice as any,
    input: text,
  });
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  return { url };
}
