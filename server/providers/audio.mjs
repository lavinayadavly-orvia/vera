import '../lib/load-env.mjs';
import { generateSpeechDataUrl as generateOpenAiSpeechDataUrl } from './openai.mjs';

const AUDIO_PROVIDER = String(process.env.AUDIO_PROVIDER || process.env.VITE_AUDIO_PROVIDER || 'openai').trim().toLowerCase();
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '';
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
const ELEVENLABS_OUTPUT_FORMAT = process.env.ELEVENLABS_OUTPUT_FORMAT || 'mp3_44100_128';
const ELEVENLABS_ENABLE_LOGGING = String(process.env.ELEVENLABS_ENABLE_LOGGING || 'false').trim().toLowerCase() === 'true';
const ELEVENLABS_LANGUAGE_CODE = (process.env.ELEVENLABS_LANGUAGE_CODE || '').trim();
const ELEVENLABS_STABILITY = Number.parseFloat(process.env.ELEVENLABS_STABILITY || '');
const ELEVENLABS_SIMILARITY_BOOST = Number.parseFloat(process.env.ELEVENLABS_SIMILARITY_BOOST || '');
const ELEVENLABS_STYLE = Number.parseFloat(process.env.ELEVENLABS_STYLE || '');
const ELEVENLABS_USE_SPEAKER_BOOST = String(process.env.ELEVENLABS_USE_SPEAKER_BOOST || '').trim().toLowerCase();
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

function isFiniteNumber(value) {
  return Number.isFinite(value);
}

function getMimeType(outputFormat) {
  if (outputFormat.startsWith('mp3_')) return 'audio/mpeg';
  if (outputFormat.startsWith('pcm_') || outputFormat.startsWith('wav_')) return 'audio/wav';
  return 'audio/mpeg';
}

function buildVoiceSettings() {
  const settings = {};

  if (isFiniteNumber(ELEVENLABS_STABILITY)) {
    settings.stability = ELEVENLABS_STABILITY;
  }
  if (isFiniteNumber(ELEVENLABS_SIMILARITY_BOOST)) {
    settings.similarity_boost = ELEVENLABS_SIMILARITY_BOOST;
  }
  if (isFiniteNumber(ELEVENLABS_STYLE)) {
    settings.style = ELEVENLABS_STYLE;
  }
  if (ELEVENLABS_USE_SPEAKER_BOOST === 'true') {
    settings.use_speaker_boost = true;
  }
  if (ELEVENLABS_USE_SPEAKER_BOOST === 'false') {
    settings.use_speaker_boost = false;
  }

  return Object.keys(settings).length > 0 ? settings : undefined;
}

function getSelectedAudioProvider() {
  return AUDIO_PROVIDER === 'elevenlabs' ? 'elevenlabs' : 'openai';
}

export function getConfiguredAudioProvider() {
  if (getSelectedAudioProvider() === 'elevenlabs' && ELEVENLABS_API_KEY && ELEVENLABS_VOICE_ID) {
    return 'elevenlabs';
  }

  return 'openai';
}

export function getAudioProviderState() {
  const selected = getSelectedAudioProvider();
  const active = getConfiguredAudioProvider();

  if (selected === 'elevenlabs' && active !== 'elevenlabs') {
    return {
      selected,
      active,
      note: 'ElevenLabs was selected, but the API key or voice ID is missing. Vera will fall back to OpenAI TTS.',
    };
  }

  return {
    selected,
    active,
    note: active === 'elevenlabs'
      ? 'Server-side audio uses ElevenLabs text-to-speech.'
      : 'Server-side audio uses the OpenAI speech pipeline.',
  };
}

async function generateSpeechWithElevenLabs({ text, voiceId }) {
  if (!ELEVENLABS_API_KEY || !voiceId) {
    throw new Error('ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID must be set for ElevenLabs audio generation.');
  }

  const requestUrl = new URL(`${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`);
  requestUrl.searchParams.set('output_format', ELEVENLABS_OUTPUT_FORMAT);
  requestUrl.searchParams.set('enable_logging', ELEVENLABS_ENABLE_LOGGING ? 'true' : 'false');

  const payload = {
    text,
    model_id: ELEVENLABS_MODEL_ID,
  };

  if (ELEVENLABS_LANGUAGE_CODE) {
    payload.language_code = ELEVENLABS_LANGUAGE_CODE;
  }

  const voiceSettings = buildVoiceSettings();
  if (voiceSettings) {
    payload.voice_settings = voiceSettings;
  }

  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      accept: getMimeType(ELEVENLABS_OUTPUT_FORMAT),
      'content-type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`ElevenLabs request failed (${response.status}): ${message}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:${getMimeType(ELEVENLABS_OUTPUT_FORMAT)};base64,${base64}`;
}

export async function generateSpeechDataUrl({ text, voice, voiceId } = {}) {
  const activeProvider = getConfiguredAudioProvider();

  if (activeProvider === 'elevenlabs') {
    return generateSpeechWithElevenLabs({
      text,
      voiceId: voiceId || ELEVENLABS_VOICE_ID,
    });
  }

  return generateOpenAiSpeechDataUrl({ text, voice });
}
