import '../lib/load-env.mjs';

function extractYear(text) {
  const match = text.match(/\b(20\d{2}|19\d{2})\b/);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

function toDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY || '';
const GOOGLE_CX = process.env.GOOGLE_CX || process.env.VITE_GOOGLE_CX || '';

export async function searchWebSources(query, limit = 6) {
  if (!GOOGLE_API_KEY || !GOOGLE_CX) {
    return [];
  }

  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&num=${Math.min(limit, 10)}`;
  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return (data.items || []).map((item) => ({
    title: item.title,
    domain: toDomain(item.link),
    url: item.link,
    snippet: item.snippet,
    type: 'web',
    publishedYear: extractYear(`${item.title || ''} ${item.snippet || ''}`),
  }));
}
