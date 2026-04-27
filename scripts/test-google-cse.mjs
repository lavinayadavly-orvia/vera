import '../server/lib/load-env.mjs';

const key =
  process.env.GOOGLE_SEARCH_API_KEY ||
  process.env.GOOGLE_CSE_API_KEY ||
  process.env.GOOGLE_CUSTOM_SEARCH_API_KEY ||
  process.env.VITE_GOOGLE_SEARCH_API_KEY ||
  process.env.VITE_GOOGLE_CSE_API_KEY ||
  process.env.VITE_GOOGLE_CUSTOM_SEARCH_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.VITE_GOOGLE_API_KEY;

const cx = process.env.GOOGLE_CX || process.env.VITE_GOOGLE_CX;
const query = process.argv.slice(2).join(' ') || 'hypertension screening adults guideline';

if (!key || !cx) {
  console.log(JSON.stringify({
    ok: false,
    reason: 'MISSING_CONFIG',
    message: 'Set GOOGLE_SEARCH_API_KEY and GOOGLE_CX in .env.',
  }, null, 2));
  process.exit(1);
}

const url = new URL('https://www.googleapis.com/customsearch/v1');
url.searchParams.set('key', key);
url.searchParams.set('cx', cx);
url.searchParams.set('q', query);
url.searchParams.set('num', '5');

const response = await fetch(url);
const body = await response.json().catch(() => ({}));

console.log(JSON.stringify({
  ok: response.ok,
  status: response.status,
  query,
  error: body.error ? {
    code: body.error.code,
    status: body.error.status,
    message: body.error.message,
    reason: body.error.details?.find((detail) => detail.reason)?.reason,
    apiName: body.error.details?.find((detail) => detail.metadata)?.metadata?.apiName,
    service: body.error.details?.find((detail) => detail.metadata)?.metadata?.service,
  } : null,
  resultCount: Array.isArray(body.items) ? body.items.length : 0,
  results: (body.items || []).slice(0, 5).map((item) => ({
    title: item.title,
    domain: item.displayLink,
    url: item.link,
    snippet: item.snippet,
  })),
}, null, 2));

process.exit(response.ok ? 0 : 1);
