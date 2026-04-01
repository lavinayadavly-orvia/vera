import type { GeneratedOutput } from '@/types';

interface ParsedSection {
  title: string;
  bullets: string[];
  body: string;
}

interface ParsedContent {
  title: string;
  subtitle: string;
  intro: string;
  sections: ParsedSection[];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || 'content';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRtf(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\n/g, '\\par\n');
}

function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseStructuredContent(text: string, theme: string): ParsedContent {
  const lines = text.split('\n');
  let title = theme;
  let subtitle = '';
  let intro = '';
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || /^---+$/.test(line)) continue;

    if (line.startsWith('# ')) {
      title = line.slice(2).trim();
      continue;
    }

    if (line.startsWith('## ')) {
      subtitle = line.replace(/^#+\s*/, '').trim();
      continue;
    }

    if (line.startsWith('### ')) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        title: line.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim(),
        bullets: [],
        body: ''
      };
      continue;
    }

    if (/^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) {
      const bullet = line.replace(/^[-*\d.]\s*/, '').replace(/\*\*/g, '').trim();
      if (currentSection) {
        currentSection.bullets.push(bullet);
      }
      continue;
    }

    const cleaned = line.replace(/\*\*/g, '').trim();
    if (!currentSection && !intro) {
      intro = cleaned;
    } else if (currentSection) {
      currentSection.body = currentSection.body ? `${currentSection.body} ${cleaned}` : cleaned;
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return { title, subtitle, intro, sections };
}

function createAndClickDownload(href: string, fileName?: string) {
  const anchor = document.createElement('a');
  anchor.href = href;
  if (fileName) {
    anchor.download = fileName;
  }
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.click();
}

function downloadBlob(content: BlobPart, type: string, fileName: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  createAndClickDownload(url, fileName);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function getOutputFileBase(output: GeneratedOutput): string {
  return `doneanddone_${slugify(output.theme || output.contentType || 'content')}`;
}

function buildDocumentHtml(output: GeneratedOutput): string {
  if (output.format === 'html' && output.content.trim().startsWith('<')) {
    return output.content;
  }

  const textContent = output.textContent || (output.format === 'html' ? stripHtml(output.content) : output.content);
  const theme = escapeHtml(output.theme || 'DoneandDone Output');
  const meta = [output.contentType.replace('-', ' '), output.extent || 'standard', output.audience || 'general']
    .map(escapeHtml);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${theme}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #f7f5ef;
      color: #1c1f1d;
      line-height: 1.65;
    }
    .wrap {
      max-width: 900px;
      margin: 0 auto;
      padding: 48px 28px 64px;
    }
    .brand {
      display: inline-flex;
      margin-bottom: 28px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .brand span:first-child {
      background: #ff6a3d;
      color: #111;
      padding: 8px 12px;
      border-radius: 8px 0 0 8px;
    }
    .brand span:last-child {
      background: #111;
      color: #fff;
      padding: 8px 12px;
      border-radius: 0 8px 8px 0;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 34px;
      line-height: 1.1;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 28px;
    }
    .meta span {
      background: #fff;
      border: 1px solid #e3ddd4;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      text-transform: capitalize;
    }
    .body {
      background: #fff;
      border: 1px solid #e3ddd4;
      border-radius: 20px;
      padding: 28px;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="brand"><span>Done</span><span>andDone</span></div>
    <h1>${theme}</h1>
    <div class="meta">${meta.map((item) => `<span>${item}</span>`).join('')}</div>
    <div class="body">${escapeHtml(textContent)}</div>
  </div>
</body>
</html>`;
}

function buildMarkdownContent(output: GeneratedOutput): string {
  const lines = [
    `# ${output.theme || 'DoneandDone Output'}`,
    '',
    `- Format: ${output.contentType.replace('-', ' ')}`,
    `- Depth: ${output.extent || 'standard'}`,
    `- Audience: ${output.audience || 'general'}`,
    '',
    output.textContent || (output.format === 'html' ? stripHtml(output.content) : output.content)
  ];
  return lines.join('\n');
}

function extractOutlineText(output: GeneratedOutput): string {
  try {
    const parsed = JSON.parse(output.content);
    if (parsed && Array.isArray(parsed.slides)) {
      const lines: string[] = [];
      lines.push(parsed.title || output.theme || 'Presentation');
      if (parsed.subtitle) {
        lines.push(parsed.subtitle);
      }
      lines.push('');

      parsed.slides.forEach((slide: any, index: number) => {
        lines.push(`${index + 1}. ${slide.title || `Slide ${index + 1}`}`);
        if (Array.isArray(slide.content)) {
          slide.content.forEach((item: string) => lines.push(`\t${String(item)}`));
        } else if (typeof slide.content === 'string') {
          slide.content.split('\n').filter(Boolean).forEach((item: string) => lines.push(`\t${item}`));
        }
        if (slide.visualSuggestion) {
          lines.push(`\tVisual: ${slide.visualSuggestion}`);
        }
        if (slide.notes) {
          lines.push(`\tNotes: ${slide.notes}`);
        }
        lines.push('');
      });

      return lines.join('\n');
    }
  } catch {
    // Fall back to parsed prose content.
  }

  const parsed = parseStructuredContent(output.textContent || output.content, output.theme || 'Presentation');
  const lines: string[] = [parsed.title];
  if (parsed.subtitle) {
    lines.push(parsed.subtitle);
  }
  if (parsed.intro) {
    lines.push('');
    lines.push(parsed.intro);
  }
  lines.push('');

  parsed.sections.forEach((section, index) => {
    lines.push(`${index + 1}. ${section.title}`);
    section.bullets.forEach((bullet) => lines.push(`\t${bullet}`));
    if (section.body) {
      lines.push(`\t${section.body}`);
    }
    lines.push('');
  });

  return lines.join('\n');
}

function buildStoryboardHtml(output: GeneratedOutput): string {
  const scenes = output.videoScenes || [];
  const title = escapeHtml(output.theme || 'Video Storyboard');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #0f1116;
      color: #f4efe6;
    }
    .wrap {
      max-width: 1100px;
      margin: 0 auto;
      padding: 40px 24px 60px;
    }
    .hero {
      margin-bottom: 28px;
    }
    .hero h1 {
      margin: 0 0 10px;
      font-size: 34px;
    }
    .hero p {
      margin: 0;
      color: rgba(244, 239, 230, 0.72);
    }
    .scene {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
      gap: 20px;
      margin-bottom: 22px;
      background: #171a22;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      overflow: hidden;
    }
    .scene img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      min-height: 260px;
      background: #090b0f;
    }
    .copy {
      padding: 22px;
    }
    .copy h2 {
      margin: 0 0 12px;
      font-size: 20px;
    }
    .meta {
      color: #ff8b68;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 14px;
    }
    .field {
      margin-bottom: 14px;
    }
    .field strong {
      display: block;
      margin-bottom: 6px;
      color: #fff;
    }
    .field span {
      color: rgba(244, 239, 230, 0.76);
      line-height: 1.6;
    }
    @media (max-width: 800px) {
      .scene {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <h1>${title}</h1>
      <p>Storyboard export generated by DoneandDone. Use this as the production handoff for editing, VO recording, and assembly.</p>
    </div>
    ${scenes.map((scene) => `
      <section class="scene">
        <img src="${scene.imageUrl}" alt="Scene ${scene.sceneNumber}" />
        <div class="copy">
          <div class="meta">Scene ${scene.sceneNumber} · ${scene.duration}s</div>
          <h2>${escapeHtml(scene.visualDescription)}</h2>
          <div class="field">
            <strong>On-screen text</strong>
            <span>${escapeHtml(scene.onScreenText || 'No on-screen text')}</span>
          </div>
          <div class="field">
            <strong>Voiceover</strong>
            <span>${escapeHtml(scene.voiceoverText)}</span>
          </div>
        </div>
      </section>
    `).join('')}
  </div>
</body>
</html>`;
}

export function downloadMarkdown(output: GeneratedOutput) {
  downloadBlob(buildMarkdownContent(output), 'text/markdown', `${getOutputFileBase(output)}.md`);
}

export function downloadHtmlDocument(output: GeneratedOutput) {
  downloadBlob(buildDocumentHtml(output), 'text/html', `${getOutputFileBase(output)}.html`);
}

export function downloadWordCompatibleDocument(output: GeneratedOutput) {
  downloadBlob(buildDocumentHtml(output), 'application/msword', `${getOutputFileBase(output)}.doc`);
}

export function downloadPresentationOutline(output: GeneratedOutput) {
  const outline = extractOutlineText(output);
  const rtf = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\fs24 ${escapeRtf(outline)}}`;
  downloadBlob(rtf, 'application/rtf', `${getOutputFileBase(output)}_slide_outline.rtf`);
}

export function downloadStoryboard(output: GeneratedOutput) {
  downloadBlob(buildStoryboardHtml(output), 'text/html', `${getOutputFileBase(output)}_storyboard.html`);
}

export function downloadJsonManifest(output: GeneratedOutput, manifestName: string, data: unknown) {
  downloadBlob(JSON.stringify(data, null, 2), 'application/json', `${getOutputFileBase(output)}_${manifestName}.json`);
}

export function downloadAudioFile(output: GeneratedOutput) {
  if (!output.audioUrl) return;
  createAndClickDownload(output.audioUrl, `${getOutputFileBase(output)}.mp3`);
}

export function downloadPrimaryVisual(output: GeneratedOutput) {
  const assetUrl = output.previewUrl || output.downloadUrl;
  if (!assetUrl || assetUrl === '#') return;
  createAndClickDownload(assetUrl);
}
