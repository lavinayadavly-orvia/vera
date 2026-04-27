import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { renderHtmlToPdfBuffer } from '../server/lib/render-html-pdf.mjs';

const assetId = process.argv[2];

if (!assetId || !assetId.endsWith('.html')) {
  console.error('Usage: node scripts/export-infographic-pdf.mjs <asset-id.html>');
  process.exit(1);
}

const outDir = path.join(process.cwd(), 'server/data/assets');
const htmlPath = path.join(outDir, assetId);
const html = await readFile(htmlPath, 'utf8');
const pdf = await renderHtmlToPdfBuffer(html, 'Vera Infographic');

if (!pdf) {
  throw new Error('PDF renderer did not return a file.');
}

await mkdir(outDir, { recursive: true });
const file = `${randomUUID()}.pdf`;
await writeFile(path.join(outDir, file), pdf);

console.log(JSON.stringify({
  file,
  url: `http://127.0.0.1:8787/api/assets/${file}`,
  bytes: pdf.length,
}, null, 2));
