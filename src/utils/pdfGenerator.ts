import { jsPDF } from 'jspdf';

export interface ParsedSection {
  title: string;
  bullets: string[];
  body: string;
}

export interface ParsedContent {
  title: string;
  subtitle: string;
  intro: string;
  sections: ParsedSection[];
}

export interface PDFMetadata {
  format: string;
  extent: string;
  audience: string;
  theme: string;
}

export function parseContent(text: string, theme: string): ParsedContent {
  const lines = text.split('\n');
  let title = theme, subtitle = '', intro = '', sections: ParsedSection[] = [], cur: ParsedSection | null = null;
  
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || /^---+$/.test(line)) continue;
    if (line.startsWith('# ')) { 
      // Only set title if it's the very first H1, else it might just be a section header. But the user logic did this:
      title = line.slice(2).trim(); 
      continue; 
    }
    if (line.startsWith('## ')) { 
      subtitle = line.replace(/^#+\s*/,'').trim(); 
      continue; 
    }
    if (line.startsWith('### ')) {
      if (cur) sections.push(cur);
      cur = { title: line.replace(/^#+\s*/,'').replace(/\*\*/g,'').trim(), bullets: [], body: '' };
    } else if (/^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) {
      const bt = line.replace(/^[-*\d.]\s*/,'').replace(/\*\*/g,'').trim();
      if (cur) cur.bullets.push(bt);
    } else {
      const clean = line.replace(/\*\*/g,'').trim();
      if (!cur && !intro) intro = clean;
      else if (cur) cur.body = cur.body ? cur.body + ' ' + clean : clean;
    }
  }
  if (cur) sections.push(cur);
  return { title, subtitle, intro, sections };
}

export function extractStats(text: string): string[] {
  const m = text.match(/\d+[\.,]?\d*\s*(?:%|percent|million|billion|fold|x-fold|months?|years?|times)/gi) || [];
  return [...new Set(m.map(s => s.trim()))].slice(0, 4);
}

export function buildPDF(parsed: ParsedContent, stats: string[], metadata: PDFMetadata): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const PW = 595.28, PH = 841.89, ML = 18, MR = 18, UW = PW - ML - MR;

  // Palette
  const BG = [14, 15, 19] as [number, number, number];
  const BG2 = [22, 24, 32] as [number, number, number];
  const BG3 = [30, 32, 40] as [number, number, number];
  const BG4 = [37, 39, 48] as [number, number, number];
  const CORAL = [255, 92, 58] as [number, number, number];
  const WARM = [245, 240, 232] as [number, number, number];
  const WARM60 = [180, 172, 158] as [number, number, number];
  const WARM30 = [120, 115, 105] as [number, number, number];
  const ACCS: [number, number, number][] = [
    [255, 92, 58], [62, 207, 160], [232, 197, 71],
    [91, 156, 246], [155, 114, 245], [228, 75, 74]
  ];

  const sf = (a: [number, number, number]) => doc.setFillColor(a[0], a[1], a[2]);
  const sd = (a: [number, number, number]) => doc.setDrawColor(a[0], a[1], a[2]);
  const st = (a: [number, number, number]) => doc.setTextColor(a[0], a[1], a[2]);
  const fr = (x: number, y: number, w: number, h: number, col: [number, number, number]) => { sf(col); doc.rect(x, y, w, h, 'F'); };
  const rr = (x: number, y: number, w: number, h: number, r: number, fc: [number, number, number] | null, sc?: [number, number, number], sw?: number) => {
    if (fc) sf(fc); if (sc) { sd(sc); doc.setLineWidth(sw || 0.5); } else doc.setLineWidth(0);
    doc.roundedRect(x, y, w, h, r, r, fc && sc ? 'FD' : fc ? 'F' : 'S');
  };
  const circ = (cx: number, cy: number, r: number, fc: [number, number, number] | null, sc?: [number, number, number], sw?: number) => {
    if (fc) sf(fc); if (sc) { sd(sc); doc.setLineWidth(sw || 1); }
    doc.circle(cx, cy, r, fc && !sc ? 'F' : sc && !fc ? 'S' : 'FD');
  };
  const ln2 = (x1: number, y1: number, x2: number, y2: number, col: [number, number, number], sw?: number) => { sd(col); doc.setLineWidth(sw || 0.5); doc.line(x1, y1, x2, y2); };
  const tx = (text: string, x: number, y: number, sz: number | string, col: [number, number, number], align: 'left' | 'center' | 'right', bold: boolean) => {
    let fontName = 'helvetica', fontSize = sz;
    if (typeof sz === 'string') { fontName = sz; fontSize = arguments[3]; } else { fontSize = sz; }
    doc.setFontSize(fontSize as number); st(col); doc.setFont(fontName, bold ? 'bold' : 'normal');
    if (align === 'center') doc.text(String(text), x, y, { align: 'center' });
    else if (align === 'right') doc.text(String(text), x, y, { align: 'right' });
    else doc.text(String(text), x, y);
  };

  function wrapDraw(text: string, x: number, y: number, maxW: number, font: string, size: number, col: [number, number, number], lh: number, maxL?: number) {
    doc.setFontSize(size); st(col); doc.setFont('helvetica', font);
    const lines = doc.splitTextToSize(String(text), maxW);
    for (const ln of lines.slice(0, maxL || lines.length)) { doc.text(ln, x, y); y += lh; }
    return y;
  }

  function hBar(x: number, y: number, w: number, h: number, pct: number, fillCol: [number, number, number], bgCol?: [number, number, number], r?: number) {
    rr(x, y, w, h, r || 3, bgCol || BG4);
    const fw = Math.max(w * Math.min(pct, 1), (r || 3) * 2 + 1);
    rr(x, y, fw, h, r || 3, fillCol);
  }

  function drawLogo(x: number, y: number, s?: number) {
    s = s || 1;
    const size = 19 * s;
    const cx = x + size / 2;
    const cy = y + size / 2;
    const pad = 3.2 * s;
    rr(x, y, size, size, 4 * s, [240, 250, 250], [203, 213, 212], 0.5);
    ln2(x + pad + 2 * s, y + pad, cx, y + size - pad - 1.5 * s, [13, 148, 136], 2.1 * s);
    ln2(x + size - pad - 2 * s, y + pad, cx, y + size - pad - 1.5 * s, [13, 148, 136], 2.1 * s);
    circ(cx, y + size - pad - 1.1 * s, 1.4 * s, [13, 148, 136]);
  }

  // PAGE 1 — HERO INFOGRAPHIC
  fr(0, 0, PW, PH, BG);

  // Background geometric shapes
  sf([22, 10, 5]); doc.circle(PW + 28, 18, 165, 'F');
  sf([26, 13, 7]); doc.circle(PW - 12, 50, 105, 'F');
  sd([255, 92, 58]); doc.setLineWidth(1.5); doc.circle(PW - 52, 52, 98, 'S');
  doc.setLineWidth(0.8); doc.circle(PW - 52, 52, 122, 'S');
  sf([13, 20, 15]); doc.circle(-35, 55, 105, 'F');
  sd([62, 207, 160]); doc.setLineWidth(0.8); doc.circle(-25, 65, 85, 'S');

  // Subtle grid lines
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.3); doc.setGState(doc.GState({ opacity: 0.04 }));
  for (let i = 0; i < 9; i++) { const ox = i * 72; doc.line(ox, 0, ox + 190, PH); }
  doc.setGState(doc.GState({ opacity: 1 }));

  // TOP BAR
  fr(0, 0, PW, 52, BG2);
  ln2(0, 52, PW, 52, CORAL, 2);
  drawLogo(ML, 16);
  tx('Medical Affairs Content Studio', ML + 118, 30, 8, WARM30, 'left', false);
  const tags: [string, [number, number, number]][] = [[metadata.format, CORAL], [metadata.extent, [232, 197, 71]], [metadata.audience, [91, 156, 246]]];
  let rx = PW - ML;
  for (const [tag, col] of [...tags].reverse()) { const tw = tag.length * 5.2 + 16; rx -= tw; rr(rx, 16, tw, 18, 4, BG3); tx(tag, rx + tw / 2, 28, 7.5, col, 'center', false); rx -= 7; }

  // HERO SECTION
  const HERO_Y = 120;
  const LW = PW * 0.54, RX = LW + 10, RW = PW - RX - ML;

  // Left accent strip
  fr(0, HERO_Y - 20, 4, 200, CORAL);

  let hy = HERO_Y + 10;
  tx((parsed.title ? metadata.format : metadata.format).toUpperCase(), ML + 8, hy, 9, CORAL, 'left', true);
  hy += 20;

  const words = parsed.title.split(' '); const mid = Math.max(1, Math.floor(words.length / 2));
  const l1 = words.slice(0, mid).join(' '); const l2 = words.slice(mid).join(' ');
  const tsz = parsed.title.length < 34 ? 28 : parsed.title.length < 50 ? 23 : 18;
  tx(l1, ML + 8, hy, tsz, WARM, 'left', true); hy += tsz * 1.3;
  if (l2) { tx(l2, ML + 8, hy, tsz, CORAL, 'left', true); hy += tsz * 1.2; }

  if (parsed.subtitle) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); st(WARM60);
    const sl = doc.splitTextToSize(parsed.subtitle.slice(0, 80), LW - ML - 20);
    doc.text(sl[0], ML + 8, hy); hy += 24;
  }
  ln2(ML + 8, hy, PW - ML, hy, CORAL, 1.5); hy += 24;

  let statEndY = hy;
  if (stats.length > 0) {
    const s0 = stats[0]; const numStr = s0.replace(/[a-zA-Z\s%]/g, '').trim(); const unitStr = s0.replace(/[\d.,]/g, '').trim();
    const gsz = numStr.length <= 3 ? 72 : numStr.length <= 5 ? 58 : 46;
    tx(numStr, ML + 8, hy + gsz - 14, gsz, CORAL, 'left', true);
    tx(unitStr, ML + 8, hy + gsz + 4, 12, WARM60, 'left', false);
    statEndY = hy + gsz + 24;
  }

  let ry2 = HERO_Y + 22;
  const suppStats = stats.slice(1, 4);
  for (let i = 0; i < suppStats.length; i++) {
    const acc = ACCS[(i + 1) % ACCS.length];
    const cardH = 44, s2 = suppStats[i];
    const numS = s2.replace(/[a-zA-Z\s%]/g, '').trim(); const unitS = s2.replace(/[\d.,]/g, '').trim();
    rr(RX, ry2, RW, cardH, 7, BG3);
    fr(RX, ry2, 3, cardH, acc);
    tx(numS, RX + 12, ry2 + 22, 18, acc, 'left', true);
    tx(unitS.slice(0, 14), RX + 12, ry2 + 36, 8, WARM60, 'left', false);
    const pct = Math.min(parseFloat(numS.replace(',', '.')) || 50, 99) / 100;
    const dcx = PW - ML - 18, dcy = ry2 + cardH / 2, dr = 12;
    sd(BG4); doc.setLineWidth(4); doc.setLineCap(1); (doc as any).arc(dcx - dr, dcy - dr, dcx + dr, dcy + dr, 0, 359.5);
    sd(acc); doc.setLineWidth(4); (doc as any).arc(dcx - dr, dcy - dr, dcx + dr, dcy + dr, 90, 90 - (pct * 360));
    ry2 += cardH + 12;
  }

  hy = Math.max(statEndY, ry2) + 20;

  if (parsed.intro && hy < PH - 200) {
    const introText = parsed.intro.slice(0, 280);
    doc.setFontSize(10); const iLines = doc.splitTextToSize(introText, UW - 40).slice(0, 5);
    const bh = iLines.length * 14 + 24;
    rr(ML, hy, UW, bh, 8, BG3); fr(ML, hy, 4, bh, CORAL);
    tx('\u201c', ML + 12, hy + 24, 28, CORAL, 'left', true);
    let iy = hy + 18; for (const iln of iLines) { tx(iln, ML + 38, iy, 10, WARM60, 'left', false); iy += 14; }
    hy += bh + 24;
  }

  const allBullets: string[] = [];
  for (const sec of parsed.sections) { for (const b of sec.bullets) { allBullets.push(b); if (allBullets.length >= 6) break; } if (allBullets.length >= 6) break; }

  if (allBullets.length > 0 && hy < PH - 160) {
    tx('KEY FINDINGS', ML, hy, 9, CORAL, 'left', true);
    ln2(ML, hy + 10, PW - ML, hy + 10, [40, 42, 50], 0.5); hy += 26;

    const cols = 3, colW = (UW - (cols - 1) * 10) / cols, rows = Math.ceil(Math.min(allBullets.length, 6) / cols);
    const rowH = Math.min(70, (PH - 55 - hy) / rows);

    for (let i = 0; i < Math.min(allBullets.length, 6); i++) {
      const row = Math.floor(i / cols), col = i % cols;
      const acc = ACCS[i % ACCS.length];
      const cx2 = ML + col * (colW + 10), cy2 = hy + row * rowH;
      rr(cx2, cy2, colW, rowH - 8, 7, BG2);
      rr(cx2, cy2, colW, 4, 3, acc);
      rr(cx2 + 7, cy2 + 12, 18, 18, 4, acc);
      tx(String(i + 1), cx2 + 16, cy2 + 25, 8, BG, 'center', true);
      doc.setFontSize(8.5); st(WARM60); doc.setFont('helvetica', 'normal');
      const bLines = doc.splitTextToSize(allBullets[i].slice(0, 60), colW - 32).slice(0, 3);
      let by2 = cy2 + 20; for (const bl of bLines) { doc.text(bl, cx2 + 30, by2); by2 += 12; }
    }
  }

  fr(0, PH - 44, PW, 44, BG2); ln2(0, PH - 44, PW, PH - 44, CORAL, 1.5);
  tx('Vera — Medical Affairs Content Studio', ML, PH - 27, 8, WARM30, 'left', true);
  tx('Medical affairs review recommended before external distribution.', PW / 2, PH - 27, 7, WARM30, 'center', false);
  tx('1 / 2', PW - ML, PH - 27, 8, WARM30, 'right', false);

  // PAGE 2 — DATA + SECTIONS
  doc.addPage();
  fr(0, 0, PW, PH, BG);

  sf([13, 20, 15]); doc.circle(PW + 20, PH - 30, 140, 'F');
  sd([62, 207, 160]); doc.setLineWidth(0.8); doc.circle(PW + 10, PH - 20, 112, 'S');
  sf([18, 10, 12]); doc.circle(-18, 95, 120, 'F');
  sd([255, 92, 58]); doc.setLineWidth(0.8); doc.circle(-8, 85, 96, 'S');

  fr(0, 0, PW, 44, BG2); ln2(0, 44, PW, 44, CORAL, 1.5);
  drawLogo(ML, 12, 0.85);
  tx(parsed.title.slice(0, 65), PW / 2, 27, 8, WARM30, 'center', false);
  tx('2 / 2', PW - ML, 27, 8, WARM30, 'right', false);

  let py = 70;

  if (stats.length > 0) {
    tx('DATA SNAPSHOT', ML, py, 9, CORAL, 'left', true);
    ln2(ML, py + 10, PW - ML, py + 10, [40, 42, 50], 0.5); py += 26;
    const barPcts = [0.82, 0.45, 0.63, 0.30, 0.71];
    const barBlockH = stats.length * 32 + 20;
    rr(ML, py, UW, barBlockH, 8, BG2);
    let by3 = py + 26;
    for (let i = 0; i < stats.length; i++) {
      const acc = ACCS[i % ACCS.length], pct = barPcts[i % barPcts.length];
      const s3 = stats[i];
      const numS = s3.replace(/[a-zA-Z\s%]/g, '').trim(); const unitS = s3.replace(/[\d.,]/g, '').trim();
      const label = numS + ' ' + unitS;
      tx(label, ML + 10, by3, 10, acc, 'left', true);
      const labelW = label.length * 5.8 + 8;
      const bx = ML + labelW + 16, bw = UW - labelW - 30;
      hBar(bx, by3 - 7, bw, 10, pct, acc, BG4, 4);
      tx(Math.round(pct * 100) + '%', bx + bw * pct + 5, by3 + 1, 8, acc, 'left', true);
      by3 += 30;
    }
    py += barBlockH + 26;
  }

  tx('DEEP DIVE', ML, py, 9, CORAL, 'left', true);
  ln2(ML, py + 10, PW - ML, py + 10, [40, 42, 50], 0.5); py += 24;

  for (let i = 0; i < Math.min(parsed.sections.length, 5); i++) {
    const sec = parsed.sections[i]; const acc = ACCS[(i + 2) % ACCS.length];
    const bullets = sec.bullets.slice(0, 5); const body = sec.body || '';
    const nBody = body ? Math.ceil(body.length / 90) + 1 : 0;
    const nBull = bullets.reduce((s, b) => s + Math.ceil(b.length / 55) + 1, 0);
    const blkH = Math.max(62, 36 + nBody * 13 + nBull * 13 + 12);
    if (py + blkH > PH - 50) break;

    rr(ML, py, UW, blkH, 9, BG3); fr(ML, py, 4, blkH, acc);

    rr(ML + 12, py + 10, 20, 20, 5, acc); tx(String(i + 1), ML + 22, py + 24, 8, BG, 'center', true);
    const titleW = Math.min(sec.title.length * 5.8, 210);
    tx(sec.title.slice(0, 54), ML + 38, py + 22, 11, WARM, 'left', true);
    ln2(ML + 38, py + 30, ML + 38 + titleW, py + 30, acc, 1.5);

    let cy2 = py + 46;
    if (body) { cy2 = wrapDraw(body.slice(0, 200), ML + 12, cy2, UW - 24, 'normal', 9, WARM60, 13, 3); cy2 += 4; }

    if (bullets.length) {
      const half = Math.ceil(bullets.length / 2); const bw2 = (UW - 24) / 2;
      let b1y = cy2, b2y = cy2;
      for (const b of bullets.slice(0, half)) { sf(acc); doc.circle(ML + 18, b1y - 3, 2.3, 'F'); b1y = wrapDraw(b.slice(0, 54), ML + 26, b1y, bw2 - 10, 'normal', 8.5, WARM60, 12, 2); b1y += 2; }
      for (const b of bullets.slice(half)) { sf(acc); doc.circle(ML + 18 + bw2 + 16, b2y - 3, 2.3, 'F'); b2y = wrapDraw(b.slice(0, 54), ML + 26 + bw2 + 16, b2y, bw2 - 10, 'normal', 8.5, WARM60, 12, 2); b2y += 2; }
    }
    py += blkH + 16;
  }

  const recSec = parsed.sections.find(s => /recommend|takeaway|conclusion|action|summary|key/i.test(s.title));
  if (recSec && recSec.bullets.length && py < PH - 90) {
    const recs = recSec.bullets.slice(0, 4); const recH = Math.max(72, 34 + recs.length * 22);
    if (py + recH < PH - 50) {
      rr(ML, py, UW, recH, 10, BG2); fr(ML, py, UW, 4, CORAL);
      tx('RECOMMENDATIONS', ML + 16, py + 20, 9, CORAL, 'left', true);
      let ry3 = py + 38;
      for (let j = 0; j < recs.length; j++) {
        if (ry3 > py + recH - 18) break;
        rr(ML + 10, ry3 - 11, 18, 18, 4, CORAL); tx(String(j + 1), ML + 19, ry3 + 2, 8, BG, 'center', true);
        ry3 = wrapDraw(recs[j].slice(0, 85), ML + 34, ry3, UW - 52, 'normal', 9.5, WARM60, 13, 2); ry3 += 6;
      }
      py += recH + 16;
    }
  }

  fr(0, PH - 44, PW, 44, BG2); ln2(0, PH - 44, PW, PH - 44, CORAL, 1.5);
  tx('Vera — Medical Affairs Content Studio', ML, PH - 27, 8, WARM30, 'left', true);
  tx(metadata.extent + '  ·  ' + metadata.audience + '  ·  Internal review only', PW / 2, PH - 27, 7.5, WARM30, 'center', false);
  tx('Medical affairs review recommended before external distribution.', PW - ML, PH - 27, 7, WARM30, 'right', false);

  return doc;
}

export function generateAndDownloadPDF(content: string, metadata: PDFMetadata) {
  const parsed = parseContent(content, metadata.theme);
  const stats = extractStats(content);
  const doc = buildPDF(parsed, stats, metadata);
  const slug = metadata.theme.replace(/\s+/g, '_').toLowerCase().slice(0, 40);
  doc.save(`vera_${slug}.pdf`);
}

export async function generateAndDownloadHtmlPDF(html: string, fileName: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '794px';
  iframe.style.height = '1123px';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');

  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error('Failed to load infographic HTML into export frame.'));
      iframe.srcdoc = html;
    });

    const exportDocument = iframe.contentDocument;
    if (!exportDocument) {
      throw new Error('Export frame document is unavailable.');
    }

    if (exportDocument.fonts?.ready) {
      await exportDocument.fonts.ready;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 300));

    const target = exportDocument.body;
    if (!target) {
      throw new Error('Export frame body is unavailable.');
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    await doc.html(target, {
      x: 0,
      y: 0,
      width: 595.28,
      windowWidth: 794,
      margin: [0, 0, 0, 0],
      autoPaging: 'slice',
      html2canvas: {
        scale: 1.6,
        useCORS: true,
        backgroundColor: '#edf4ef',
      },
    });

    doc.save(fileName);
  } finally {
    iframe.remove();
  }
}
