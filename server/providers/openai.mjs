import '../lib/load-env.mjs';
import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '';

let client = null;

function getClient() {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY or VITE_OPENAI_API_KEY must be set for server-side generation.');
  }

  if (!client) {
    client = new OpenAI({ apiKey });
  }

  return client;
}

export async function generateText({ prompt, maxTokens = 2200, model = 'gpt-4o' }) {
  const response = await getClient().chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
  });

  return response.choices[0]?.message?.content || '';
}

export async function generateObject({ prompt, schema, model = 'gpt-4o' }) {
  const schemaText = typeof schema === 'string' ? schema : JSON.stringify(schema, null, 2);
  const response = await getClient().chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Respond only with valid JSON that conforms to this schema description:\n${schemaText}`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 3200,
  });

  return JSON.parse(response.choices[0]?.message?.content || '{}');
}

export async function generateSpeechDataUrl({ text, voice = 'nova' }) {
  const response = await getClient().audio.speech.create({
    model: 'tts-1',
    voice,
    input: text,
  });

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:audio/mpeg;base64,${base64}`;
}
