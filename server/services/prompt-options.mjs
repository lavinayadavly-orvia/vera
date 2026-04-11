import { generateObject } from '../providers/openai.mjs';

const ALLOWED_CONTENT_TYPES = ['infographic', 'white-paper', 'presentation', 'video', 'podcast', 'document', 'report', 'social-post'];
const ALLOWED_TONES = ['professional', 'casual', 'academic', 'persuasive', 'inspirational'];
const ALLOWED_LENGTHS = ['short', 'medium', 'long', 'comprehensive'];
const ALLOWED_DEPTHS = ['basic', 'intermediate', 'advanced', 'expert'];

function sanitizePromptBlueprint(theme, option, index) {
  const contentType = ALLOWED_CONTENT_TYPES.includes(option.recommendedContentType)
    ? option.recommendedContentType
    : 'infographic';
  const tone = ALLOWED_TONES.includes(option.recommendedTone)
    ? option.recommendedTone
    : 'professional';
  const length = ALLOWED_LENGTHS.includes(option.recommendedLength)
    ? option.recommendedLength
    : 'medium';
  const scientificDepth = ALLOWED_DEPTHS.includes(option.recommendedScientificDepth)
    ? option.recommendedScientificDepth
    : 'intermediate';

  return {
    id: option.id?.trim() || `option-${index + 1}`,
    label: option.label?.trim() || `Option ${index + 1}`,
    angle: option.angle?.trim() || 'A strong angle tailored to the brief.',
    prompt: option.prompt?.trim() || `Create a high-quality ${contentType.replace('-', ' ')} about ${theme}.`,
    rationale: option.rationale?.trim() || 'Designed to turn a short brief into a production-ready prompt.',
    recommendedContentType: contentType,
    recommendedTone: tone,
    recommendedLength: length,
    recommendedScientificDepth: scientificDepth,
    recommendedAudience: option.recommendedAudience?.trim() || 'General audience',
  };
}

export async function generatePromptOptions(theme) {
  const object = await generateObject({
    prompt: `You are Vera's briefing strategist.

A user has given a one-line brief:
"${theme}"

Return exactly 4 differentiated prompt options that help the user move from a rough one-liner to a strong production-ready prompt.

Each option must:
- take a distinct angle
- be specific enough to generate high-quality content directly
- recommend the most suitable primary output format
- recommend tone, depth, length, and audience defaults
- stay faithful to the user's brief

Diversify the four options across angles such as:
- executive summary
- educational explainer
- evidence-led analysis
- campaign/storytelling`,
    schema: {
      type: 'object',
      properties: {
        options: {
          type: 'array',
          minItems: 4,
          maxItems: 4,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              angle: { type: 'string' },
              prompt: { type: 'string' },
              rationale: { type: 'string' },
              recommendedContentType: { type: 'string', enum: ALLOWED_CONTENT_TYPES },
              recommendedTone: { type: 'string', enum: ALLOWED_TONES },
              recommendedLength: { type: 'string', enum: ALLOWED_LENGTHS },
              recommendedScientificDepth: { type: 'string', enum: ALLOWED_DEPTHS },
              recommendedAudience: { type: 'string' },
            },
            required: ['id', 'label', 'angle', 'prompt', 'rationale', 'recommendedContentType', 'recommendedTone', 'recommendedLength', 'recommendedScientificDepth', 'recommendedAudience'],
          },
        },
      },
      required: ['options'],
    },
  });

  const normalized = (object.options || [])
    .slice(0, 4)
    .map((option, index) => sanitizePromptBlueprint(theme, option, index));

  while (normalized.length < 4) {
    normalized.push(sanitizePromptBlueprint(theme, {
      id: `option-${normalized.length + 1}`,
      label: `Option ${normalized.length + 1}`,
      angle: 'A flexible production-ready direction',
      prompt: `Create a high-quality ${normalized.length % 2 === 0 ? 'report' : 'presentation'} about ${theme}. Keep it specific, structured, and useful for the intended audience.`,
      rationale: 'Fallback option generated to preserve a complete selection set.',
      recommendedContentType: normalized.length % 2 === 0 ? 'report' : 'presentation',
      recommendedTone: 'professional',
      recommendedLength: 'medium',
      recommendedScientificDepth: 'intermediate',
      recommendedAudience: 'General audience',
    }, normalized.length));
  }

  return normalized;
}
