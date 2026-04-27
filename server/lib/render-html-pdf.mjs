import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];

async function findChromeBinary() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      await access(candidate, fsConstants.X_OK);
      return candidate;
    } catch {
      // continue
    }
  }
  return null;
}

export async function renderHtmlToPdfBuffer(html, title = 'Vera Output') {
  const chromeBinary = await findChromeBinary();
  if (!chromeBinary) {
    return null;
  }

  const workDir = await mkdtemp(path.join(tmpdir(), 'vera-html-pdf-'));
  const htmlPath = path.join(workDir, 'document.html');
  const pdfPath = path.join(workDir, 'document.pdf');

  try {
    await writeFile(htmlPath, html, 'utf8');

    await execFileAsync(chromeBinary, [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--allow-file-access-from-files',
      '--no-pdf-header-footer',
      `--print-to-pdf=${pdfPath}`,
      `--virtual-time-budget=4000`,
      pathToFileURL(htmlPath).href,
    ], {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });

    const pdfBuffer = await readFile(pdfPath);
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.warn(`[vera] HTML to PDF render failed for "${title}".`, error);
    return null;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
