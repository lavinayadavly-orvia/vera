export interface RealWorldInfographicData {
  layout: {
    mode: 'snapshot' | 'comparison' | 'process' | 'timeline' | 'framework';
    barSectionTitle: string;
    recommendationsTitle: string;
  };
  guideBlocks?: {
    riskFactors: {
      title: string;
      detail: string;
      colorClass: 'c-mint' | 'c-gold' | 'c-sky' | 'c-purple' | 'c-red' | '';
    }[];
    warningSigns: {
      text: string;
    }[];
    pillars: {
      title: string;
      bullets: string[];
      colorClass: 'c-mint' | 'c-gold' | 'c-sky' | 'c-purple' | 'c-red' | '';
    }[];
    keyNumbers: {
      value: string;
      label: string;
      colorClass: 'c-mint' | 'c-gold' | 'c-sky' | 'c-purple' | 'c-red' | '';
    }[];
    timeline: {
      title: string;
      detail: string;
      colorClass: 'c-mint' | 'c-gold' | 'c-sky' | 'c-purple' | 'c-red' | '';
    }[];
    actionPlan: {
      title: string;
      bullets: string[];
      colorClass: 'c-mint' | 'c-gold' | 'c-sky' | 'c-purple' | 'c-red' | '';
    }[];
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

  const safe = (str: string | undefined | null) => {
    if (!str) return '';

    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const accentByClass = (colorClass: RealWorldInfographicData['supportingStats'][number]['colorClass']) => {
    switch (colorClass) {
      case 'c-mint':
        return 'accent-mint';
      case 'c-gold':
        return 'accent-gold';
      case 'c-sky':
        return 'accent-sky';
      case 'c-purple':
        return 'accent-purple';
      case 'c-red':
        return 'accent-red';
      default:
        return 'accent-coral';
    }
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DoneandDone Infographic</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #edf4ef;
  --paper: #ffffff;
  --ink: #123328;
  --muted: #537466;
  --line: #d9e7df;
  --green: #1d9e75;
  --green-dark: #0d5b43;
  --coral: #e56a42;
  --mint: #4dc39b;
  --gold: #d5a640;
  --sky: #4d8fe8;
  --purple: #7764e8;
  --red: #d45453;
}
html, body {
  background: radial-gradient(circle at top, #f7fbf8 0%, var(--bg) 58%, #e3efe8 100%);
  color: var(--ink);
  font-family: 'Outfit', sans-serif;
  line-height: 1.5;
}
body {
  padding: 24px;
}
.ig-wrap {
  width: 100%;
  max-width: 740px;
  margin: 0 auto;
}
.brandbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.logo {
  display: inline-flex;
  font-family: 'Syne', sans-serif;
  font-size: 13px;
  font-weight: 800;
}
.logo-d1 {
  background: var(--coral);
  color: #fff;
  padding: 6px 10px;
  border-radius: 8px 0 0 8px;
}
.logo-d2 {
  background: var(--ink);
  color: #fff;
  padding: 6px 10px;
  border-radius: 0 8px 8px 0;
}
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(18, 51, 40, 0.06);
  color: var(--muted);
  border: 1px solid rgba(18, 51, 40, 0.08);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
}
.hero {
  background: linear-gradient(140deg, #1d9e75 0%, #15745a 100%);
  color: #fff;
  border-radius: 24px;
  padding: 28px 28px 24px;
  box-shadow: 0 24px 60px rgba(13, 91, 67, 0.22);
  overflow: hidden;
  position: relative;
}
.hero::after {
  content: '';
  position: absolute;
  right: -60px;
  top: -60px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}
.hero-tag {
  display: inline-flex;
  align-items: center;
  padding: 6px 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  margin-bottom: 12px;
  position: relative;
  z-index: 1;
}
.hero h1 {
  font-family: 'Syne', sans-serif;
  font-size: 34px;
  line-height: 1.05;
  letter-spacing: -0.04em;
  margin-bottom: 10px;
  position: relative;
  z-index: 1;
}
.hero-subtitle {
  max-width: 620px;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.92);
  position: relative;
  z-index: 1;
}
.hero-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
  gap: 10px;
  margin-top: 18px;
  position: relative;
  z-index: 1;
}
.stat-card {
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 12px 14px;
  min-height: 92px;
}
.stat-value {
  display: block;
  font-family: 'Syne', sans-serif;
  font-size: 28px;
  line-height: 1;
  margin-bottom: 8px;
}
.stat-label {
  display: block;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.9);
}
.stat-source {
  display: block;
  margin-top: 6px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.72);
}
.section {
  margin-top: 26px;
}
.sec-label {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
  margin: 0 0 10px 2px;
}
.panel {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 10px 22px rgba(18, 51, 40, 0.04);
}
.callout {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 14px;
  align-items: start;
}
.callout-copy p {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.65;
}
.callout-copy small {
  display: block;
  margin-top: 8px;
  color: var(--muted);
  font-size: 11px;
}
.callout-metric {
  border-radius: 16px;
  padding: 18px;
  background: linear-gradient(160deg, rgba(29, 158, 117, 0.12), rgba(29, 158, 117, 0.04));
  border: 1px solid rgba(29, 158, 117, 0.18);
}
.callout-metric .metric-label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 10px;
  color: var(--muted);
  font-weight: 700;
  margin-bottom: 6px;
}
.callout-metric .metric-value {
  font-family: 'Syne', sans-serif;
  font-size: 44px;
  line-height: 1;
  color: var(--green-dark);
}
.callout-metric .metric-unit {
  font-size: 20px;
  margin-left: 4px;
}
.callout-metric .metric-text {
  margin-top: 8px;
  color: var(--ink);
  font-size: 13px;
}
.callout-metric .metric-source {
  margin-top: 8px;
  color: var(--muted);
  font-size: 10px;
}
.bar-card {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 20px;
}
.bar-row {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}
.bar-row:last-child {
  margin-bottom: 0;
}
.bar-copy strong {
  display: block;
  font-size: 13px;
  color: var(--ink);
}
.bar-copy span {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  color: var(--muted);
}
.bar-track {
  height: 10px;
  border-radius: 999px;
  background: #e6efea;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 999px;
  width: 0;
  transition: width 0.8s ease;
}
.bar-value {
  min-width: 68px;
  text-align: right;
}
.bar-value strong {
  display: block;
  font-family: 'Syne', sans-serif;
  font-size: 14px;
}
.bar-value span {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  color: var(--muted);
}
.insight-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.insight-card {
  background: var(--paper);
  border: 1px solid var(--line);
  border-top: 4px solid var(--coral);
  border-radius: 18px;
  padding: 16px;
}
.insight-card h3 {
  font-size: 14px;
  margin-bottom: 10px;
}
.insight-card ul {
  padding-left: 16px;
}
.insight-card li {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.55;
  margin-bottom: 6px;
}
.insight-card small {
  display: block;
  margin-top: 8px;
  color: var(--muted);
  font-size: 10px;
}
.recommend-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.two-col {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 12px;
}
.list-panel {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 18px;
}
.risk-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.risk-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: #f8fbf9;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px;
}
.risk-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}
.risk-copy strong {
  display: block;
  font-size: 12px;
  color: var(--ink);
}
.risk-copy span {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.45;
}
.pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pill {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1.3;
  background: #faece7;
  color: #8d3f2a;
  border: 1px solid #efc0b3;
}
.pillar-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.pillar-card {
  border-radius: 18px;
  padding: 16px;
  border: 1px solid var(--line);
}
.pillar-card h3 {
  font-size: 13px;
  margin-bottom: 8px;
}
.pillar-card ul {
  padding-left: 16px;
}
.pillar-card li {
  font-size: 12px;
  line-height: 1.5;
  margin-bottom: 5px;
}
.pillar-card.accent-mint { background: #e9f8f2; border-color: #b8ead7; }
.pillar-card.accent-gold { background: #fbf3df; border-color: #ecd49a; }
.pillar-card.accent-sky { background: #e9f3ff; border-color: #bfd6fb; }
.pillar-card.accent-purple { background: #f1efff; border-color: #cec7fb; }
.pillar-card.accent-red { background: #fdeeee; border-color: #f4c2c2; }
.pillar-card.accent-coral { background: #fff1ea; border-color: #f2c7b5; }
.number-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.number-card {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 14px 10px;
  text-align: center;
}
.number-card strong {
  display: block;
  font-family: 'Syne', sans-serif;
  font-size: 22px;
  margin-bottom: 6px;
}
.number-card span {
  display: block;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
}
.timeline {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 20px 20px 20px 24px;
  position: relative;
}
.timeline::before {
  content: '';
  position: absolute;
  left: 26px;
  top: 18px;
  bottom: 18px;
  width: 2px;
  background: #cfe3da;
}
.timeline-item {
  position: relative;
  padding-left: 28px;
  margin-bottom: 14px;
}
.timeline-item:last-child {
  margin-bottom: 0;
}
.timeline-dot {
  position: absolute;
  left: 0;
  top: 4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.timeline-item strong {
  display: block;
  font-size: 12px;
}
.timeline-item span {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--muted);
}
.action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.action-card {
  background: var(--paper);
  border-radius: 18px;
  border: 1px solid var(--line);
  overflow: hidden;
}
.action-card-head {
  padding: 10px 12px;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}
.action-card-body {
  padding: 14px;
}
.action-card-body ul {
  padding-left: 15px;
}
.action-card-body li {
  font-size: 11px;
  line-height: 1.5;
  margin-bottom: 5px;
  color: var(--muted);
}
.rec-card {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 16px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.rec-num {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(29, 158, 117, 0.12);
  color: var(--green-dark);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  flex-shrink: 0;
}
.rec-copy p {
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink);
}
.rec-copy small {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  color: var(--muted);
}
.refs {
  background: #13372b;
  color: #f5fbf7;
  border-radius: 22px;
  padding: 22px;
}
.refs-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}
.refs-head h3 {
  font-size: 14px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.refs-head p {
  max-width: 320px;
  font-size: 11px;
  line-height: 1.55;
  color: rgba(245, 251, 247, 0.72);
}
.ref-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ref-item {
  font-size: 11px;
  line-height: 1.55;
  color: rgba(245, 251, 247, 0.82);
}
.ref-id {
  color: #fff;
  font-weight: 700;
}
.footer-meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(245, 251, 247, 0.68);
  font-size: 10px;
}
.accent-coral { border-top-color: var(--coral); }
.accent-mint { border-top-color: var(--mint); }
.accent-gold { border-top-color: var(--gold); }
.accent-sky { border-top-color: var(--sky); }
.accent-purple { border-top-color: var(--purple); }
.accent-red { border-top-color: var(--red); }
.fill-coral { background: linear-gradient(90deg, var(--coral), #ef8a67); }
.fill-mint { background: linear-gradient(90deg, var(--mint), #6ad9b3); }
.fill-gold { background: linear-gradient(90deg, var(--gold), #e5c062); }
.fill-sky { background: linear-gradient(90deg, var(--sky), #77acf3); }
.fill-purple { background: linear-gradient(90deg, var(--purple), #9688f1); }
.fill-red { background: linear-gradient(90deg, var(--red), #e57a78); }
.text-coral { color: var(--coral); }
.text-mint { color: var(--mint); }
.text-gold { color: var(--gold); }
.text-sky { color: var(--sky); }
.text-purple { color: var(--purple); }
.text-red { color: var(--red); }
.print-btn {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1000;
  border: none;
  border-radius: 999px;
  padding: 12px 18px;
  background: var(--ink);
  color: #fff;
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 16px 28px rgba(18, 51, 40, 0.18);
}
@media print {
  @page {
    size: A4;
    margin: 12mm;
  }
  html, body {
    background: #fff;
  }
  body {
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .ig-wrap {
    max-width: none;
  }
  .print-btn {
    display: none !important;
  }
  .hero,
  .panel,
  .bar-card,
  .list-panel,
  .insight-card,
  .rec-card,
  .timeline,
  .pillar-card,
  .number-card,
  .action-card,
  .refs,
  .bar-row,
  .timeline-item {
    break-inside: avoid;
    page-break-inside: avoid;
    box-shadow: none;
  }
  .hero-stats,
  .risk-grid,
  .pillar-grid,
  .number-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .two-col,
  .insight-grid,
  .recommend-grid,
  .action-grid {
    grid-template-columns: 1fr;
  }
  .section {
    margin-top: 10mm;
  }
  .refs-section {
    break-before: page;
    page-break-before: always;
  }
}
@media (max-width: 720px) {
  body { padding: 12px; }
  .brandbar, .refs-head, .footer-meta, .callout, .two-col { display: block; }
  .tag-row { margin-top: 10px; }
  .hero h1 { font-size: 28px; }
  .hero-stats, .insight-grid, .recommend-grid, .risk-grid, .pillar-grid, .number-grid, .action-grid { grid-template-columns: 1fr; }
  .bar-row { grid-template-columns: 1fr; }
  .bar-value { text-align: left; }
}
</style>
</head>
<body>
  <div class="ig-wrap">
    <div class="brandbar">
      <div class="logo"><span class="logo-d1">Done</span><span class="logo-d2">andDone</span></div>
      <div class="tag-row">
        <span class="tag">${safe(data.tags.format)}</span>
        <span class="tag">${safe(data.tags.extent)}</span>
        <span class="tag">${safe(data.tags.audience)}</span>
      </div>
    </div>

    <section class="hero">
      <div class="hero-tag">${safe(data.hero.eyebrow)}</div>
      <h1>${safe(data.hero.titleLine1)}<br>${safe(data.hero.titleLine2)}</h1>
      <p class="hero-subtitle">${safe(data.hero.subtitle)}</p>
      <div class="hero-stats">
        <div class="stat-card">
          <span class="stat-value">${safe(data.mainStat.number)}${data.mainStat.unit ? `<span style="font-size:18px;margin-left:4px;">${safe(data.mainStat.unit)}</span>` : ''}</span>
          <span class="stat-label">${safe(data.mainStat.label)}</span>
          <span class="stat-source">${safe(data.mainStat.source)}</span>
        </div>
        ${data.supportingStats.map((stat) => `
          <div class="stat-card">
            <span class="stat-value ${accentByClass(stat.colorClass).replace('accent-', 'text-')}">${safe(stat.number)}</span>
            <span class="stat-label">${safe(stat.label)}</span>
            <span class="stat-source">${safe(stat.source)}</span>
          </div>
        `).join('')}
      </div>
    </section>

    <section class="section">
      <div class="sec-label">Overview</div>
      <div class="panel callout">
        <div class="callout-copy">
          <p>${safe(data.intro.text)}</p>
          <small>${safe(data.intro.source)}</small>
        </div>
        <div class="callout-metric">
          <div class="metric-label">Primary Signal</div>
          <div class="metric-value">${safe(data.mainStat.number)}${data.mainStat.unit ? `<span class="metric-unit">${safe(data.mainStat.unit)}</span>` : ''}</div>
          <div class="metric-text">${safe(data.mainStat.label)}</div>
          <div class="metric-source">${safe(data.mainStat.source)}</div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="sec-label">${safe(data.layout.barSectionTitle)}</div>
      <div class="bar-card">
        ${data.dataBars.map((bar) => `
          <div class="bar-row">
            <div class="bar-copy">
              <strong>${safe(bar.label)}</strong>
              <span>${safe(bar.sublabel)}</span>
            </div>
            <div class="bar-track"><div class="bar-fill fill-${accentByClass(bar.colorClass).replace('accent-', '')}" data-width="${bar.percentage}%"></div></div>
            <div class="bar-value">
              <strong class="${accentByClass(bar.colorClass).replace('accent-', 'text-')}">${safe(bar.displayValue)}</strong>
              <span>${safe(bar.source)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    ${data.guideBlocks && (data.guideBlocks.riskFactors.length > 0 || data.guideBlocks.warningSigns.length > 0) ? `
      <section class="section">
        <div class="sec-label">Risk And Detection</div>
        <div class="two-col">
          <div class="list-panel">
            <div class="sec-label" style="margin-top:0;">Risk Factors</div>
            <div class="risk-grid">
              ${data.guideBlocks.riskFactors.map((risk) => `
                <div class="risk-item">
                  <div class="risk-dot fill-${accentByClass(risk.colorClass).replace('accent-', '')}"></div>
                  <div class="risk-copy">
                    <strong>${safe(risk.title)}</strong>
                    <span>${safe(risk.detail)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="list-panel">
            <div class="sec-label" style="margin-top:0;">Warning Signs</div>
            <div class="pill-list">
              ${data.guideBlocks.warningSigns.map((sign) => `<span class="pill">${safe(sign.text)}</span>`).join('')}
            </div>
          </div>
        </div>
      </section>
    ` : ''}

    ${data.guideBlocks && data.guideBlocks.pillars.length > 0 ? `
      <section class="section">
        <div class="sec-label">Core Pillars</div>
        <div class="pillar-grid">
          ${data.guideBlocks.pillars.map((pillar) => `
            <article class="pillar-card ${accentByClass(pillar.colorClass)}">
              <h3>${safe(pillar.title)}</h3>
              <ul>
                ${pillar.bullets.map((bullet) => `<li>${safe(bullet)}</li>`).join('')}
              </ul>
            </article>
          `).join('')}
        </div>
      </section>
    ` : ''}

    ${data.guideBlocks && data.guideBlocks.keyNumbers.length > 0 ? `
      <section class="section">
        <div class="sec-label">Key Numbers</div>
        <div class="number-grid">
          ${data.guideBlocks.keyNumbers.map((item) => `
            <div class="number-card">
              <strong class="${accentByClass(item.colorClass).replace('accent-', 'text-')}">${safe(item.value)}</strong>
              <span>${safe(item.label)}</span>
            </div>
          `).join('')}
        </div>
      </section>
    ` : ''}

    ${data.guideBlocks && data.guideBlocks.timeline.length > 0 ? `
      <section class="section">
        <div class="sec-label">Timeline</div>
        <div class="timeline">
          ${data.guideBlocks.timeline.map((item) => `
            <div class="timeline-item">
              <div class="timeline-dot fill-${accentByClass(item.colorClass).replace('accent-', '')}"></div>
              <strong>${safe(item.title)}</strong>
              <span>${safe(item.detail)}</span>
            </div>
          `).join('')}
        </div>
      </section>
    ` : ''}

    ${data.guideBlocks && data.guideBlocks.actionPlan.length > 0 ? `
      <section class="section">
        <div class="sec-label">Action Plan</div>
        <div class="action-grid">
          ${data.guideBlocks.actionPlan.map((step) => `
            <article class="action-card">
              <div class="action-card-head fill-${accentByClass(step.colorClass).replace('accent-', '')}">${safe(step.title)}</div>
              <div class="action-card-body">
                <ul>
                  ${step.bullets.map((bullet) => `<li>${safe(bullet)}</li>`).join('')}
                </ul>
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    ` : ''}

    <section class="section">
      <div class="sec-label">Key Focus Areas</div>
      <div class="insight-grid">
        ${data.sections.map((section) => `
          <article class="insight-card ${accentByClass(section.colorClass)}">
            <h3>${safe(section.title)}</h3>
            <ul>
              ${section.bullets.map((bullet) => `<li>${safe(bullet)}</li>`).join('')}
            </ul>
            <small>${safe(section.claimRefs)}</small>
          </article>
        `).join('')}
      </div>
    </section>

    <section class="section">
      <div class="sec-label">${safe(data.layout.recommendationsTitle)}</div>
      <div class="recommend-grid">
        ${data.recommendations.map((recommendation, index) => `
          <article class="rec-card">
            <div class="rec-num">${index + 1}</div>
            <div class="rec-copy">
              <p>${safe(recommendation.text)}</p>
              <small>${safe(recommendation.source)}</small>
            </div>
          </article>
        `).join('')}
      </div>
    </section>

    <section class="section refs-section">
      <div class="refs">
        <div class="refs-head">
          <div>
            <h3>References</h3>
          </div>
          <p>All evidence statements should be medically reviewed before distribution. This infographic is intended as a structured working draft for internal refinement.</p>
        </div>
        <div class="ref-list">
          ${data.references.map((reference) => `
            <div class="ref-item"><span class="ref-id">${safe(reference.id)}</span> ${safe(reference.citation)}</div>
          `).join('')}
        </div>
        <div class="footer-meta">
          <span>Generated ${currentDate}</span>
          <span>Layout mode: ${safe(data.layout.mode)}</span>
          <span>DoneandDone Medical Affairs Studio</span>
        </div>
      </div>
    </section>
  </div>

  <button class="print-btn" onclick="window.print()">Save as PDF</button>

  <script>
    window.addEventListener('load', () => {
      document.querySelectorAll('.bar-fill').forEach((bar) => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            bar.style.width = bar.getAttribute('data-width') || '0%';
          }, 60);
        });
      });
    });
  </script>
</body>
</html>`;
}
