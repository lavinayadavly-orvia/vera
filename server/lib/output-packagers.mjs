import PptxGenJS from 'pptxgenjs';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripMarkdownFence(text) {
  return String(text || '')
    .replace(/^```(?:markdown|md|text)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function cleanInlineMarkdown(text) {
  return String(text || '')
    .replace(/\*\*/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

function parseStructuredContent(text, theme) {
  const lines = String(text || '').split('\n');
  let title = theme;
  let subtitle = '';
  let intro = '';
  const sections = [];
  let currentSection = null;

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
        body: '',
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

function parsePresentationDeck(output) {
  const rawText = stripMarkdownFence(output.textContent || output.content || '');
  const lines = rawText.split('\n');
  const slides = [];
  let deckTitle = output.theme || 'Presentation';
  let deckSubtitle = '';
  let currentSlide = null;
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
    const fallbackSlides = [];

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

function buildDocumentHtml(output) {
  if (output.format === 'html' && String(output.content || '').trim().startsWith('<')) {
    return output.content;
  }

  const textContent = output.textContent || (output.format === 'html' ? stripHtml(output.content) : output.content);
  const theme = escapeHtml(output.theme || 'Vera Output');
  const meta = [String(output.contentType || '').replace('-', ' '), output.extent || 'standard', output.audience || 'general']
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
    <div class="body">${escapeHtml(textContent || '')}</div>
  </div>
</body>
</html>`;
}

function addPresentationChrome(slide, title, slideNumber, totalSlides) {
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: 13.33,
    h: 7.5,
    fill: { color: 'F7F4EE' },
    line: { color: 'F7F4EE', transparency: 100 },
  });

  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.28,
    fill: { color: 'F97316' },
    line: { color: 'F97316', transparency: 100 },
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
    margin: 0,
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
    margin: 0,
  });

  slide.addText('Vera', {
    x: 0.7,
    y: 7.0,
    w: 1.8,
    h: 0.2,
    fontFace: 'Aptos',
    fontSize: 10,
    color: '6B7280',
    margin: 0,
  });
}

function normaliseSlideBullets(slide) {
  return (slide.bullets || [])
    .map((bullet) => bullet.replace(/^\[[^\]]+\]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 6);
}

async function createPresentationBuffer(output) {
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
        margin: 0,
      });

      slide.addText(slideData.subtitle || deck.subtitle || output.theme || '', {
        x: 0.9,
        y: 2.65,
        w: 7.8,
        h: 0.65,
        fontFace: 'Aptos',
        fontSize: 16,
        color: '475467',
        margin: 0,
      });

      if (slideData.hook) {
        slide.addShape('roundRect', {
          x: 0.9,
          y: 3.65,
          w: 5.7,
          h: 1.15,
          rectRadius: 0.08,
          fill: { color: 'FFF1E8' },
          line: { color: 'FED7AA', transparency: 100 },
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
          margin: 0,
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
          line: { color: 'E7DFD3', pt: 1 },
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
          margin: 0,
        });
        slide.addText(slideData.visualSuggestion, {
          x: 9.2,
          y: 2.0,
          w: 2.7,
          h: 1.3,
          fontFace: 'Aptos',
          fontSize: 14,
          color: '1D2230',
          margin: 0,
        });
      }

      return;
    }

    const bullets = normaliseSlideBullets(slideData);

    slide.addText(slideData.title || `Slide ${index + 1}`, {
      x: 0.9,
      y: 1.25,
      w: 5.2,
      h: 0.55,
      fontFace: 'Aptos Display',
      fontSize: 22,
      bold: true,
      color: '1D2230',
      margin: 0,
    });

    if (bullets.length > 0) {
      slide.addText(
        bullets.map((text) => ({
          text,
          options: {
            bullet: { indent: 16 },
          },
        })),
        {
          x: 0.9,
          y: 2.0,
          w: 6.1,
          h: 3.7,
          fontFace: 'Aptos',
          fontSize: 16,
          color: '243344',
          breakLine: true,
          margin: 0,
          paraSpaceAfterPt: 11,
          valign: 'top',
        },
      );
    }

    slide.addShape('roundRect', {
      x: 7.45,
      y: 1.65,
      w: 4.55,
      h: 2.25,
      rectRadius: 0.08,
      fill: { color: 'FFFFFF' },
      line: { color: 'E7DFD3', pt: 1 },
    });
    slide.addText('Visual Cue', {
      x: 7.72,
      y: 1.92,
      w: 3.5,
      h: 0.24,
      fontFace: 'Aptos',
      fontSize: 11,
      bold: true,
      color: '6B7280',
      margin: 0,
    });
    slide.addText(slideData.visualSuggestion || 'Apply a strong supporting visual or simple chart for this slide.', {
      x: 7.72,
      y: 2.18,
      w: 3.65,
      h: 1.25,
      fontFace: 'Aptos',
      fontSize: 13,
      color: '1D2230',
      margin: 0,
    });

    slide.addShape('roundRect', {
      x: 7.45,
      y: 4.18,
      w: 4.55,
      h: 1.4,
      rectRadius: 0.08,
      fill: { color: 'F8F7F3' },
      line: { color: 'E7DFD3', pt: 1 },
    });
    slide.addText('Speaker Notes', {
      x: 7.72,
      y: 4.42,
      w: 3.5,
      h: 0.24,
      fontFace: 'Aptos',
      fontSize: 11,
      bold: true,
      color: '6B7280',
      margin: 0,
    });
    slide.addText(slideData.speakerNotes || 'Expand on the slide headline with a concise talk track.', {
      x: 7.72,
      y: 4.68,
      w: 3.65,
      h: 0.6,
      fontFace: 'Aptos',
      fontSize: 12,
      color: '475467',
      margin: 0,
    });

    if (slideData.timing) {
      slide.addText(slideData.timing, {
        x: 10.7,
        y: 6.55,
        w: 1.3,
        h: 0.2,
        align: 'right',
        fontFace: 'Aptos',
        fontSize: 11,
        color: '6B7280',
        margin: 0,
      });
    }
  });

  const rawBuffer = await pptx.write({ outputType: 'nodebuffer', compression: true });
  if (Buffer.isBuffer(rawBuffer)) return rawBuffer;
  if (rawBuffer instanceof Uint8Array) return Buffer.from(rawBuffer);
  if (rawBuffer instanceof ArrayBuffer) return Buffer.from(rawBuffer);
  if (typeof rawBuffer === 'string') return Buffer.from(rawBuffer, 'binary');
  return Buffer.from(rawBuffer);
}

export async function packageServerOutputAssets(output, assetManager) {
  const nextOutput = { ...output };

  if (typeof nextOutput.audioUrl === 'string' && nextOutput.audioUrl.startsWith('data:audio/')) {
    const asset = await assetManager.saveDataUrlAsset(nextOutput.audioUrl);
    nextOutput.audioUrl = asset.url;
    if (nextOutput.contentType === 'podcast') {
      nextOutput.downloadUrl = asset.url;
    }
  }

  if (nextOutput.contentType === 'presentation') {
    const previewAsset = await assetManager.saveTextAsset({
      extension: 'html',
      body: buildDocumentHtml(nextOutput),
    });
    nextOutput.previewUrl = previewAsset.url;
    const providerDeckBuffer = nextOutput.__presentationBinary || nextOutput.presentationBinary;

    if (providerDeckBuffer) {
      const deckAsset = await assetManager.saveBinaryAsset({
        extension: 'pptx',
        body: providerDeckBuffer,
      });
      nextOutput.downloadUrl = deckAsset.url;
      delete nextOutput.__presentationBinary;
      delete nextOutput.presentationBinary;
      return nextOutput;
    }

    if (typeof nextOutput.downloadUrl === 'string' && nextOutput.downloadUrl !== '#' && /^https?:\/\//i.test(nextOutput.downloadUrl)) {
      delete nextOutput.__presentationBinary;
      delete nextOutput.presentationBinary;
      return nextOutput;
    }

    const deckAsset = await assetManager.saveBinaryAsset({
      extension: 'pptx',
      body: await createPresentationBuffer(nextOutput),
    });
    nextOutput.downloadUrl = deckAsset.url;
    delete nextOutput.__presentationBinary;
    delete nextOutput.presentationBinary;
    return nextOutput;
  }

  if (['document', 'report', 'white-paper', 'social-post', 'podcast'].includes(nextOutput.contentType)) {
    const htmlAsset = await assetManager.saveTextAsset({
      extension: 'html',
      body: buildDocumentHtml(nextOutput),
    });
    nextOutput.previewUrl = htmlAsset.url;
    if (nextOutput.downloadUrl === '#' || !nextOutput.downloadUrl) {
      nextOutput.downloadUrl = htmlAsset.url;
    }
    return nextOutput;
  }

  if (nextOutput.contentType === 'infographic' && nextOutput.format === 'html' && typeof nextOutput.content === 'string') {
    const asset = await assetManager.saveTextAsset({
      extension: 'html',
      body: nextOutput.content,
    });
    nextOutput.previewUrl = asset.url;
    nextOutput.downloadUrl = asset.url;
    return nextOutput;
  }

  return nextOutput;
}
