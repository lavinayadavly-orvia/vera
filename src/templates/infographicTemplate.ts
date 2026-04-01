export interface RealWorldInfographicData {
  layout: {
    mode: 'snapshot' | 'comparison' | 'process' | 'timeline' | 'framework';
    barSectionTitle: string;
    recommendationsTitle: string;
  };
  tags: {
    format: string;
    extent: string;
    audience: string;
  };
  hero: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    subtitle: string;
  };
  mainStat: {
    number: string;
    unit: string;
    label: string;
    source: string;
  };
  supportingStats: {
    number: string;
    label: string;
    source: string;
    colorClass: 'c-mint' | 'c-gold' | 'c-sky' | 'c-purple' | 'c-red' | '';
  }[];
  intro: {
    text: string;
    source: string;
  };
  dataBars: {
    label: string;
    sublabel: string;
    percentage: number;
    displayValue: string;
    source: string;
    colorClass: 'c-mint' | 'c-gold' | 'c-sky' | 'c-purple' | 'c-red' | '';
  }[];
  sections: {
    title: string;
    bullets: string[];
    claimRefs: string;
    colorClass: 'c-mint' | 'c-gold' | 'c-sky' | 'c-purple' | 'c-red' | '';
  }[];
  recommendations: {
    text: string;
    source: string;
  }[];
  references: {
    id: string;
    citation: string;
  }[];
}

export function compileInfographicHtml(data: RealWorldInfographicData): string {
  const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Helper to safely inject variables
  const safe = (str: string | undefined | null) => {
    if (!str) return '';

    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DoneandDone Infographic</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Outfit:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">
<style>
/* ── RESET ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── PAGE (A4 portrait, print-ready) ── */
:root {
  --coral:   #FF5C3A;
  --coral-d: #CC3E22;
  --ink:     #0E0F13;
  --ink2:    #161820;
  --ink3:    #1E2028;
  --warm:    #F5F0E8;
  --warm60:  #B4AC9E;
  --warm30:  #787368;
  --mint:    #3ECFA0;
  --gold:    #E8C547;
  --sky:     #5B9CF6;
  --purple:  #9B72F5;
  --red:     #E44B4A;
}

html, body {
  margin: 0; padding: 0;
  background: #2a2a2a;
  font-family: 'Outfit', sans-serif;
  color: var(--warm);
}

.page {
  width: 794px;
  min-height: 1123px;
  background: var(--ink);
  margin: 32px auto;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 80px rgba(0,0,0,.6);
}

@media print {
  html, body { background: none; margin: 0; }
  .page { margin: 0; box-shadow: none; width: 210mm; min-height: 297mm; }
  .print-btn { display: none !important; }
  @page { size: A4 portrait; margin: 0; }
}

/* ── DECORATIVE BACKGROUND GEOMETRY ── */
.bg-geo { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.bg-geo::before {
  content: ''; position: absolute; right: -80px; top: -80px; width: 340px; height: 340px; border-radius: 50%; background: #1A0905;
}
.bg-geo::after {
  content: ''; position: absolute; right: -30px; top: -30px; width: 220px; height: 220px; border-radius: 50%; border: 1.5px solid rgba(255,92,58,.25);
}
.bg-ring2 { position: absolute; right: -55px; top: -55px; width: 280px; height: 280px; border-radius: 50%; border: 1px solid rgba(255,92,58,.12); pointer-events: none; }
.bg-mint-blob { position: absolute; left: -60px; bottom: 60px; width: 240px; height: 240px; border-radius: 50%; background: #0D1A14; pointer-events: none; }
.bg-mint-ring { position: absolute; left: -40px; bottom: 80px; width: 190px; height: 190px; border-radius: 50%; border: 1px solid rgba(62,207,160,.18); pointer-events: none; }
.bg-lines {
  position: absolute; inset: 0;
  background-image: repeating-linear-gradient(105deg, transparent, transparent 68px, rgba(255,255,255,.025) 68px, rgba(255,255,255,.025) 69px);
  pointer-events: none;
}

/* ── TOP BAR ── */
.topbar { position: relative; background: #0A0B0E; border-bottom: 2px solid var(--coral); padding: 0 28px; height: 52px; display: flex; align-items: center; justify-content: space-between; z-index: 10; }
.logo { display: flex; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 800; }
.logo-d1 { background: var(--coral); color: var(--ink); padding: 5px 10px; border-radius: 4px 0 0 4px; line-height: 1; }
.logo-d2 { background: var(--warm); color: var(--ink); padding: 5px 10px; border-radius: 0 4px 4px 0; line-height: 1; }
.topbar-tags { display: flex; gap: 6px; align-items: center; }
.tag { font-size: 9px; font-weight: 600; letter-spacing: .8px; text-transform: uppercase; padding: 3px 9px; border-radius: 20px; border: 1px solid rgba(255,255,255,.12); color: var(--coral); font-family: 'Syne', sans-serif; }

/* ── HERO ZONE ── */
.hero { position: relative; padding: 28px 28px 20px; border-bottom: 1px solid rgba(255,255,255,.07); z-index: 2; }
.hero-eyebrow { font-family: 'Syne', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--coral); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
.hero-eyebrow::before { content: ''; display: inline-block; width: 20px; height: 1.5px; background: var(--coral); }
.hero-title { font-family: 'Syne', sans-serif; font-size: 30px; font-weight: 800; line-height: 1.1; letter-spacing: -0.8px; color: var(--warm); margin-bottom: 6px; max-width: 520px; }
.hero-title span { color: var(--coral); }
.hero-subtitle { font-size: 13px; color: var(--warm60); font-weight: 300; max-width: 480px; margin-bottom: 22px; line-height: 1.6; }

.hero-body { display: grid; grid-template-columns: 1fr 260px; gap: 16px; align-items: start; }
.hero-stat { position: relative; }
.stat-eyebrow { font-size: 10px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: var(--warm30); margin-bottom: 4px; }
.stat-number { font-family: 'Syne', sans-serif; font-size: 84px; font-weight: 800; line-height: 1; color: var(--coral); letter-spacing: -3px; }
.stat-unit { font-size: 22px; font-weight: 400; color: var(--warm60); letter-spacing: 0; margin-left: 4px; }
.stat-label { font-size: 12px; color: var(--warm30); margin-top: 6px; font-weight: 300; }
.stat-source { font-size: 9px; color: var(--warm30); margin-top: 4px; font-family: 'Outfit', sans-serif; opacity: .7; }

.supp-stats { display: flex; flex-direction: column; gap: 8px; }
.supp-card { background: var(--ink2); border-radius: 8px; padding: 12px 14px; border-left: 3px solid var(--coral); display: flex; justify-content: space-between; align-items: center; }
.supp-card.c-mint { border-left-color: var(--mint); }
.supp-card.c-gold { border-left-color: var(--gold); }
.supp-card.c-sky { border-left-color: var(--sky); }
.supp-card.c-purple { border-left-color: var(--purple); }
.supp-card.c-red { border-left-color: var(--red); }
.supp-card .sc-num { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: var(--coral); line-height: 1; }
.supp-card.c-mint .sc-num { color: var(--mint); }
.supp-card.c-gold .sc-num { color: var(--gold); }
.supp-card.c-sky .sc-num { color: var(--sky); }
.supp-card.c-purple .sc-num { color: var(--purple); }
.supp-card.c-red .sc-num { color: var(--red); }
.supp-card .sc-label { font-size: 11px; color: var(--warm60); font-weight: 300; max-width: 140px; text-align: right; line-height: 1.4; }
.supp-card .sc-source { font-size: 8px; color: var(--warm30); text-align: right; margin-top: 2px; opacity: .7; }

/* ── INTRO CALLOUT ── */
.intro-callout { margin: 0 28px; padding: 14px 18px 14px 22px; background: var(--ink3); border-radius: 8px; border-left: 4px solid var(--coral); position: relative; z-index: 2; margin-top: 16px; }
.intro-quote { font-family: 'DM Serif Display', serif; font-size: 26px; color: var(--coral); line-height: .8; margin-bottom: 2px; }
.intro-text { font-size: 12.5px; color: var(--warm60); line-height: 1.65; font-weight: 300; }
.intro-source { font-size: 9px; color: var(--warm30); margin-top: 6px; opacity: .7; }

/* ── DATA BARS ── */
.section-label { font-family: 'Syne', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--coral); display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.section-label::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,.08); }
.data-bars { padding: 18px 28px; border-bottom: 1px solid rgba(255,255,255,.07); position: relative; z-index: 2; }
.bar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 11px; }
.bar-row:last-child { margin-bottom: 0; }
.bar-label { font-size: 11px; color: var(--warm); font-weight: 500; width: 200px; flex-shrink: 0; line-height: 1.3; }
.bar-label span { display: block; font-size: 9px; color: var(--warm30); font-weight: 300; margin-top: 1px; }
.bar-track { flex: 1; height: 8px; background: rgba(255,255,255,.08); border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 4px; background: var(--coral); transition: width 1s ease; width: 0; }
.bar-fill.c-mint { background: var(--mint); }
.bar-fill.c-gold { background: var(--gold); }
.bar-fill.c-sky { background: var(--sky); }
.bar-fill.c-purple { background: var(--purple); }
.bar-fill.c-red { background: var(--red); }
.bar-val { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; color: var(--coral); width: 44px; text-align: right; flex-shrink: 0; }
.bar-val.c-mint { color: var(--mint); }
.bar-val.c-gold { color: var(--gold); }
.bar-val.c-sky { color: var(--sky); }
.bar-val.c-purple { color: var(--purple); }
.bar-val.c-red { color: var(--red); }
.bar-source { font-size: 8px; color: var(--warm30); width: 72px; text-align: right; flex-shrink: 0; opacity: .7; line-height: 1.3; }

/* ── 3-COLUMN ── */
.section-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; padding: 18px 28px; border-bottom: 1px solid rgba(255,255,255,.07); position: relative; z-index: 2; }
.section-card { background: var(--ink2); border-radius: 10px; overflow: hidden; }
.sc-top { height: 4px; background: var(--coral); }
.sc-top.c-mint { background: var(--mint); }
.sc-top.c-gold { background: var(--gold); }
.sc-top.c-sky { background: var(--sky); }
.sc-top.c-purple { background: var(--purple); }
.sc-top.c-red { background: var(--red); }
.sc-body { padding: 14px; }
.sc-icon { width: 28px; height: 28px; border-radius: 6px; background: var(--coral); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--ink); font-family: 'Syne', sans-serif; margin-bottom: 10px; }
.sc-icon.c-mint { background: var(--mint); }
.sc-icon.c-gold { background: var(--gold); }
.sc-icon.c-sky { background: var(--sky); }
.sc-icon.c-purple { background: var(--purple); }
.sc-icon.c-red { background: var(--red); }
.sc-title { font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700; color: var(--warm); margin-bottom: 8px; line-height: 1.3; }
.sc-bullets { list-style: none; }
.sc-bullets li { font-size: 10.5px; color: var(--warm60); font-weight: 300; line-height: 1.5; padding-left: 10px; position: relative; margin-bottom: 5px; }
.sc-bullets li::before { content: ''; position: absolute; left: 0; top: 6px; width: 4px; height: 4px; border-radius: 50%; background: var(--coral); }
.sc-bullets.c-mint li::before { background: var(--mint); }
.sc-bullets.c-gold li::before { background: var(--gold); }
.sc-bullets.c-sky li::before { background: var(--sky); }
.sc-bullets.c-purple li::before { background: var(--purple); }
.sc-bullets.c-red li::before { background: var(--red); }
.sc-claim { font-size: 8px; color: var(--warm30); margin-top: 6px; opacity: .65; font-family: 'Outfit', sans-serif; }

/* ── RECOMMENDATIONS ── */
.recs { padding: 16px 28px; border-bottom: 1px solid rgba(255,255,255,.07); position: relative; z-index: 2; }
.rec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.rec-item { display: flex; gap: 10px; align-items: flex-start; }
.rec-num { width: 24px; height: 24px; border-radius: 6px; background: var(--coral); display: flex; align-items: center; justify-content: center; font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 800; color: var(--ink); flex-shrink: 0; margin-top: 1px; }
.rec-text { font-size: 11px; color: var(--warm60); font-weight: 300; line-height: 1.55; }
.rec-source { font-size: 8px; color: var(--warm30); opacity: .65; display: block; margin-top: 2px; }

/* ── REFS ── */
.refs { padding: 10px 28px 20px; position: relative; z-index: 2; }
.refs-title { font-size: 8px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--warm30); margin-bottom: 5px; font-family: 'Syne', sans-serif; }
.refs-list { display: flex; flex-direction: column; gap: 2px; }
.ref-item { font-size: 8px; color: var(--warm30); opacity: .65; line-height: 1.5; font-weight: 300; }
.ref-id { font-weight: 600; color: var(--coral); opacity: 1; }

/* ── FOOTER ── */
.footer { position: relative; background: #0A0B0E; border-top: 1.5px solid var(--coral); padding: 10px 28px; display: flex; align-items: center; justify-content: space-between; z-index: 10; }
.footer-left { font-size: 9px; color: var(--warm30); font-weight: 500; font-family: 'Syne', sans-serif; letter-spacing: .3px; }
.footer-mid { font-size: 8px; color: var(--warm30); opacity: .6; text-align: center; max-width: 340px; line-height: 1.5; font-weight: 300; }
.footer-right { font-size: 8px; color: var(--warm30); opacity: .6; text-align: right; }
.mlr-badge { display: inline-flex; align-items: center; gap: 4px; background: rgba(255,92,58,.15); border: 1px solid rgba(255,92,58,.3); border-radius: 20px; padding: 2px 8px; font-size: 8px; color: var(--coral); font-weight: 600; letter-spacing: .5px; font-family: 'Syne', sans-serif; margin-top: 3px; }

/* ── BUTTON ── */
.print-btn { position: fixed; bottom: 28px; right: 28px; background: var(--coral); color: var(--ink); border: none; border-radius: 10px; padding: 14px 24px; font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(255,92,58,.4); z-index: 1000; transition: all .15s ease; display: flex; align-items: center; gap: 8px; }
.print-btn:hover { background: #FF7A5C; transform: translateY(-2px); }
.print-btn svg { width: 16px; height: 16px; }
</style>
</head>
<body>
<div class="page">
  <div class="bg-geo"></div><div class="bg-ring2"></div><div class="bg-mint-blob"></div><div class="bg-mint-ring"></div><div class="bg-lines"></div>

  <div class="topbar">
    <div class="logo"><span class="logo-d1">Done</span><span class="logo-d2">andDone</span></div>
    <div class="topbar-tags">
      <span class="tag">${safe(data.tags.format)}</span>
      <span class="tag">${safe(data.tags.extent)}</span>
      <span class="tag">${safe(data.tags.audience)}</span>
    </div>
  </div>

  <div class="hero">
    <div class="hero-eyebrow">${safe(data.hero.eyebrow)}</div>
    <h1 class="hero-title">${safe(data.hero.titleLine1)}<br><span>${safe(data.hero.titleLine2)}</span></h1>
    <p class="hero-subtitle">${safe(data.hero.subtitle)}</p>

    <div class="hero-body">
      <div class="hero-stat">
        <div class="stat-eyebrow">Key Metric</div>
        <div class="stat-number">${safe(data.mainStat.number)}<span class="stat-unit">${safe(data.mainStat.unit)}</span></div>
        <div class="stat-label">${safe(data.mainStat.label)}</div>
        <div class="stat-source">${safe(data.mainStat.source)}</div>
      </div>

      <div class="supp-stats">
        ${data.supportingStats.map(stat => `
          <div class="supp-card ${stat.colorClass}">
            <div>
              <div class="sc-num ${stat.colorClass}">${safe(stat.number)}</div>
              <div class="sc-source">${safe(stat.source)}</div>
            </div>
            <div class="sc-label">${safe(stat.label)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  <div class="intro-callout">
    <div class="intro-quote">"</div>
    <p class="intro-text">${safe(data.intro.text)}</p>
    <div class="intro-source">${safe(data.intro.source)}</div>
  </div>

  <div class="data-bars">
    <div class="section-label">${safe(data.layout.barSectionTitle)}</div>
    ${data.dataBars.map(bar => `
      <div class="bar-row">
        <div class="bar-label">${safe(bar.label)} <span>${safe(bar.sublabel)}</span></div>
        <div class="bar-track"><div class="bar-fill ${bar.colorClass}" data-width="${bar.percentage}%"></div></div>
        <div class="bar-val ${bar.colorClass}">${safe(bar.displayValue)}</div>
        <div class="bar-source">${safe(bar.source)}</div>
      </div>
    `).join('')}
  </div>

  <div class="section-grid">
    ${data.sections.map((sec, i) => `
      <div class="section-card">
        <div class="sc-top ${sec.colorClass}"></div>
        <div class="sc-body">
          <div class="sc-icon ${sec.colorClass}">0${i+1}</div>
          <div class="sc-title">${safe(sec.title)}</div>
          <ul class="sc-bullets ${sec.colorClass}">
            ${sec.bullets.map(b => `<li>${safe(b)}</li>`).join('')}
          </ul>
          <div class="sc-claim">${safe(sec.claimRefs)}</div>
        </div>
      </div>
    `).join('')}
  </div>

  <div class="recs">
    <div class="section-label">${safe(data.layout.recommendationsTitle)}</div>
    <div class="rec-grid">
      ${data.recommendations.map((rec, i) => `
        <div class="rec-item">
          <div class="rec-num">${i+1}</div>
          <div class="rec-text">${safe(rec.text)} <span class="rec-source">${safe(rec.source)}</span></div>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="refs">
    <div class="refs-title">Source References</div>
    <div class="refs-list">
      ${data.references.map(ref => `
        <div class="ref-item"><span class="ref-id">${safe(ref.id)}</span> ${safe(ref.citation)}</div>
      `).join('')}
    </div>
  </div>

  <div class="footer">
    <div class="footer-left">DoneandDone — Medical Affairs<div class="mlr-badge">⚑ MLR REVIEW REQUIRED BEFORE DISTRIBUTION</div></div>
    <div class="footer-mid">All claims are traceable to verified source documents via CLAIM_IDs.<br>This content is prepared for internal medical affairs use only.</div>
    <div class="footer-right">Generated: ${currentDate}<br>Claim IDs tracked</div>
  </div>
</div>
<button class="print-btn" onclick="window.print()">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
  Save as PDF
</button>
<script>
  window.addEventListener('load', () => {
    document.querySelectorAll('.bar-fill').forEach(bar => {
      requestAnimationFrame(() => {
        setTimeout(() => { bar.style.width = bar.getAttribute('data-width'); }, 100);
      });
    });
  });
</script>
</body></html>`;
}
