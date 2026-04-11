import PptxGenJS from 'pptxgenjs';
import type { GeneratedOutput } from '@/types';
import { getPrimaryVisualUrl } from '@/services/outputAssets';

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

interface ParsedPresentationSlide {
  title: string;
  bullets: string[];
  speakerNotes?: string;
  visualSuggestion?: string;
  timing?: string;
  mainTitle?: string;
  subtitle?: string;
  hook?: string;
}

interface ParsedPresentationDeck {
  title: string;
  subtitle: string;
  slides: ParsedPresentationSlide[];
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

function stripMarkdownFence(text: string): string {
  return text
    .replace(/^```(?:markdown|md|text)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function cleanInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

function parsePresentationDeck(output: GeneratedOutput): ParsedPresentationDeck {
  const rawText = stripMarkdownFence(output.textContent || output.content || '');
  const lines = rawText.split('\n');
  const slides: ParsedPresentationSlide[] = [];
  let deckTitle = output.theme || 'Presentation';
  let deckSubtitle = '';
  let currentSlide: ParsedPresentationSlide | null = null;
  let inDesignThemeSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || /^---+$/.test(line)) continue;

    if (line.startsWith('# ')) {
      deckTitle = cleanInlineMarkdown(line.slice(2));
      continue;
    }

    if (line.startsWith('## ')) {
      const heading = cleanInlineMarkdown(line.slice(3));
      if (!deckSubtitle) {
        deckSubtitle = heading;
      }
      inDesignThemeSection = /^design theme$/i.test(heading);
      continue;
    }

    const slideHeadingMatch = line.match(/^###\s*Slide(?:s)?\s*([\d-]+)?\s*:?\s*(.+)$/i) || line.match(/^Slide\s*(\d+)?\s*:?\s*(.+)$/i);
    if (slideHeadingMatch) {
      if (currentSlide) slides.push(currentSlide);
      currentSlide = {
        title: cleanInlineMarkdown(slideHeadingMatch[2] || `Slide ${slides.length + 1}`),
        bullets: [],
      };
      inDesignThemeSection = false;
      continue;
    }

    if (inDesignThemeSection) continue;

    const bulletMatch = line.match(/^[-*]\s+(.+)$/) || line.match(/^\d+\.\s+(.+)$/);
    if (bulletMatch) {
      const bullet = cleanInlineMarkdown(bulletMatch[1]);
      if (!currentSlide) {
        currentSlide = { title: `Slide ${slides.length + 1}`, bullets: [] };
      }

      const keyedMatch = bullet.match(/^([^:]+):\s*(.+)$/);
      if (keyedMatch) {
        const key = keyedMatch[1].trim().toLowerCase();
        const value = keyedMatch[2].trim();
        if (key === 'speaker notes') {
          currentSlide.speakerNotes = value;
          continue;
        }
        if (key === 'visual suggestion') {
          currentSlide.visualSuggestion = value;
          continue;
        }
        if (key === 'timing') {
          currentSlide.timing = value;
          continue;
        }
        if (key === 'main title') {
          currentSlide.mainTitle = value;
          continue;
        }
        if (key === 'subtitle') {
          currentSlide.subtitle = value;
          continue;
        }
        if (key === 'hook') {
          currentSlide.hook = value;
          continue;
        }
      }

      currentSlide.bullets.push(bullet);
      continue;
    }

    if (currentSlide) {
      currentSlide.bullets.push(cleanInlineMarkdown(line));
    }
  }

  if (currentSlide) {
    slides.push(currentSlide);
  }

  if (slides.length === 0) {
    const parsed = parseStructuredContent(rawText, deckTitle);
    const fallbackSlides: ParsedPresentationSlide[] = [];

    fallbackSlides.push({
      title: 'Title Slide',
      bullets: [],
      mainTitle: parsed.title,
      subtitle: parsed.subtitle || output.theme || '',
      hook: parsed.intro || '',
    });

    parsed.sections.forEach((section) => {
      fallbackSlides.push({
        title: section.title,
        bullets: [...section.bullets, ...(section.body ? [section.body] : [])],
      });
    });

    return {
      title: parsed.title,
      subtitle: parsed.subtitle,
      slides: fallbackSlides,
    };
  }

  return {
    title: deckTitle,
    subtitle: deckSubtitle,
    slides,
  };
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
  return `vera_${slugify(output.theme || output.contentType || 'content')}`;
}

function buildDocumentHtml(output: GeneratedOutput): string {
  if (output.format === 'html' && output.content.trim().startsWith('<')) {
    return output.content;
  }

  const textContent = output.textContent || (output.format === 'html' ? stripHtml(output.content) : output.content);
  const theme = escapeHtml(output.theme || 'Vera Output');
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
      align-items: center;
      gap: 12px;
      margin-bottom: 28px;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: #173226;
      font-size: 20px;
    }
    .brand svg {
      width: 32px;
      height: 32px;
      flex-shrink: 0;
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
    <div class="brand">
      <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vera">
        <rect width="64" height="64" rx="16" fill="#F0FAFA" stroke="#CBD5D4" stroke-width="0.5"/>
        <line x1="19" y1="13" x2="32" y2="48" stroke="#0D9488" stroke-width="6.5" stroke-linecap="round"/>
        <line x1="45" y1="13" x2="32" y2="48" stroke="#0D9488" stroke-width="6.5" stroke-linecap="round"/>
        <circle cx="32" cy="49" r="4.5" fill="#0D9488"/>
      </svg>
      <span>Vera</span>
    </div>
    <h1>${theme}</h1>
    <div class="meta">${meta.map((item) => `<span>${item}</span>`).join('')}</div>
    <div class="body">${escapeHtml(textContent)}</div>
  </div>
</body>
</html>`;
}

function buildMarkdownContent(output: GeneratedOutput): string {
  const lines = [
    `# ${output.theme || 'Vera Output'}`,
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
      <p>Storyboard export generated by Vera. Use this as the production handoff for editing, VO recording, and assembly.</p>
    </div>
    ${scenes.map((scene) => `
      <section class="scene">
        <img src="${scene.imageUrl}" alt="Scene ${scene.sceneNumber}" />
        <div class="copy">
          <div class="meta">Scene ${scene.sceneNumber} · ${scene.duration}s</div>
          <h2>${escapeHtml(scene.sceneTitle || scene.visualDescription)}</h2>
          <div class="field">
            <strong>Beat role</strong>
            <span>${escapeHtml(scene.beatRole || 'proof')}</span>
          </div>
          <div class="field">
            <strong>Shot type</strong>
            <span>${escapeHtml(scene.shotType || 'Cinematic coverage')}</span>
          </div>
          <div class="field">
            <strong>Motion cue</strong>
            <span>${escapeHtml(scene.motionCue || 'Subtle editorial motion')}</span>
          </div>
          <div class="field">
            <strong>Visual direction</strong>
            <span>${escapeHtml(scene.visualDescription)}</span>
          </div>
          <div class="field">
            <strong>On-screen text</strong>
            <span>${escapeHtml(scene.onScreenText || 'No on-screen text')}</span>
          </div>
          <div class="field">
            <strong>Voiceover</strong>
            <span>${escapeHtml(scene.voiceoverText)}</span>
          </div>
          <div class="field">
            <strong>Transition</strong>
            <span>${escapeHtml(scene.transition || 'Hard cut')}</span>
          </div>
          <div class="field">
            <strong>Continuity anchor</strong>
            <span>${escapeHtml(scene.continuityAnchor || output.videoPackage?.creativeDirection?.recurringMotif || 'Maintain visual continuity')}</span>
          </div>
          <div class="field">
            <strong>Edit note</strong>
            <span>${escapeHtml(scene.editNote || 'Keep the scene clean and legible in edit.')}</span>
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

function addPresentationChrome(slide: PptxGenJS.Slide, title: string, slideNumber: number, totalSlides: number) {
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: 13.33,
    h: 7.5,
    fill: { color: 'F7F4EE' },
    line: { color: 'F7F4EE', transparency: 100 }
  });

  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.28,
    fill: { color: 'F97316' },
    line: { color: 'F97316', transparency: 100 }
  });

  slide.addText(title, {
    x: 0.7,
    y: 0.45,
    w: 8.8,
    h: 0.45,
    fontFace: 'Aptos',
    fontSize: 24,
    bold: true,
    color: '1D2230',
    margin: 0
  });

  slide.addText(`${slideNumber}/${totalSlides}`, {
    x: 11.75,
    y: 7.0,
    w: 0.8,
    h: 0.2,
    align: 'right',
    fontFace: 'Aptos',
    fontSize: 10,
    color: '6B7280',
    margin: 0
  });

  slide.addText('Vera', {
    x: 0.7,
    y: 7.0,
    w: 1.8,
    h: 0.2,
    fontFace: 'Aptos',
    fontSize: 10,
    color: '6B7280',
    margin: 0
  });
}

function normaliseSlideBullets(slide: ParsedPresentationSlide): string[] {
  const bullets = slide.bullets
    .map((bullet) => bullet.replace(/^\[[^\]]+\]\s*/, '').trim())
    .filter(Boolean);

  return bullets.slice(0, 6);
}

export async function downloadPresentationDeck(output: GeneratedOutput) {
  const deck = parsePresentationDeck(output);
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Vera';
  pptx.company = 'Vera';
  pptx.subject = output.theme || deck.title;
  pptx.title = deck.title;

  const slides = deck.slides.length > 0 ? deck.slides : [{
    title: 'Title Slide',
    bullets: [],
    mainTitle: deck.title,
    subtitle: deck.subtitle,
  }];

  slides.forEach((slideData, index) => {
    const slide = pptx.addSlide();
    const isTitleSlide = index === 0;
    addPresentationChrome(slide, slideData.title || `Slide ${index + 1}`, index + 1, slides.length);

    if (isTitleSlide) {
      slide.addText(slideData.mainTitle || deck.title, {
        x: 0.9,
        y: 1.45,
        w: 8.2,
        h: 1.1,
        fontFace: 'Aptos Display',
        fontSize: 24,
        bold: true,
        color: '1D2230',
        margin: 0
      });

      slide.addText(slideData.subtitle || deck.subtitle || output.theme || '', {
        x: 0.9,
        y: 2.65,
        w: 7.8,
        h: 0.65,
        fontFace: 'Aptos',
        fontSize: 16,
        color: '475467',
        margin: 0
      });

      if (slideData.hook) {
        slide.addShape('roundRect', {
          x: 0.9,
          y: 3.65,
          w: 5.7,
          h: 1.15,
          rectRadius: 0.08,
          fill: { color: 'FFF1E8' },
          line: { color: 'FED7AA', transparency: 100 }
        });
        slide.addText(slideData.hook, {
          x: 1.15,
          y: 3.96,
          w: 5.2,
          h: 0.55,
          fontFace: 'Aptos',
          fontSize: 14,
          color: 'C2410C',
          bold: true,
          margin: 0
        });
      }

      if (slideData.visualSuggestion) {
        slide.addShape('roundRect', {
          x: 8.95,
          y: 1.45,
          w: 3.4,
          h: 2.2,
          rectRadius: 0.08,
          fill: { color: 'FFFFFF' },
          line: { color: 'E7DFD3', pt: 1 }
        });
        slide.addText('Visual Direction', {
          x: 9.2,
          y: 1.72,
          w: 2.7,
          h: 0.24,
          fontFace: 'Aptos',
          fontSize: 11,
          bold: true,
          color: '6B7280',
          margin: 0
        });
        slide.addText(slideData.visualSuggestion, {
          x: 9.2,
          y: 2.0,
          w: 2.7,
          h: 1.3,
          fontFace: 'Aptos',
          fontSize: 14,
          color: '1D2230',
          margin: 0
        });
      }
    } else {
      const bullets = normaliseSlideBullets(slideData);

      slide.addShape('roundRect', {
        x: 0.9,
        y: 1.3,
        w: 7.8,
        h: 5.1,
        rectRadius: 0.08,
        fill: { color: 'FFFFFF' },
        line: { color: 'E7DFD3', pt: 1 }
      });

      slide.addText(slideData.title, {
        x: 1.2,
        y: 1.65,
        w: 6.8,
        h: 0.55,
        fontFace: 'Aptos Display',
        fontSize: 20,
        bold: true,
        color: '1D2230',
        margin: 0
      });

      slide.addText(
        bullets.length > 0 ? bullets.map((bullet) => ({ text: bullet, options: { bullet: { indent: 18 } } })) : 'Add sourced content for this slide.',
        {
          x: 1.2,
          y: 2.35,
          w: 6.9,
          h: 3.45,
          fontFace: 'Aptos',
          fontSize: 17,
          color: '344054',
          breakLine: true,
          margin: 0.04,
          paraSpaceAfter: 10,
          valign: 'top'
        }
      );

      slide.addShape('roundRect', {
        x: 9.1,
        y: 1.3,
        w: 3.3,
        h: 2.2,
        rectRadius: 0.08,
        fill: { color: 'FFF7E8' },
        line: { color: 'F2D08C', pt: 1 }
      });
      slide.addText('Visual Cue', {
        x: 9.35,
        y: 1.58,
        w: 2.5,
        h: 0.2,
        fontFace: 'Aptos',
        fontSize: 11,
        bold: true,
        color: '9A5B00',
        margin: 0
      });
      slide.addText(slideData.visualSuggestion || 'Use a clean chart, icon system, or supporting image aligned to the slide claim.', {
        x: 9.35,
        y: 1.88,
        w: 2.55,
        h: 1.2,
        fontFace: 'Aptos',
        fontSize: 13,
        color: '7A4A00',
        margin: 0
      });

      slide.addShape('roundRect', {
        x: 9.1,
        y: 3.8,
        w: 3.3,
        h: 1.1,
        rectRadius: 0.08,
        fill: { color: 'EEF6FF' },
        line: { color: 'C9E0FF', pt: 1 }
      });
      slide.addText('Timing', {
        x: 9.35,
        y: 4.05,
        w: 1.0,
        h: 0.2,
        fontFace: 'Aptos',
        fontSize: 11,
        bold: true,
        color: '0B63B6',
        margin: 0
      });
      slide.addText(slideData.timing || '1 minute', {
        x: 9.35,
        y: 4.3,
        w: 2.3,
        h: 0.25,
        fontFace: 'Aptos',
        fontSize: 14,
        color: '1D2230',
        margin: 0
      });
    }

    const notes = [
      slideData.speakerNotes,
      slideData.visualSuggestion ? `Visual suggestion: ${slideData.visualSuggestion}` : '',
      slideData.timing ? `Timing: ${slideData.timing}` : ''
    ]
      .filter(Boolean)
      .join('\n\n');

    if (notes) {
      slide.addNotes(notes);
    }
  });

  await pptx.writeFile({ fileName: `${getOutputFileBase(output)}.pptx`, compression: true });
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
  const assetUrl = getPrimaryVisualUrl(output);
  if (!assetUrl) return;
  createAndClickDownload(assetUrl);
}
