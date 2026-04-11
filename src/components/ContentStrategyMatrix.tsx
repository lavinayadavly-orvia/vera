import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ContentStrategySelection } from '@/types';

type MatrixAudience = 'patient' | 'hcp' | 'kol' | 'public' | 'payer';
type MatrixCommunication = 'awareness' | 'launch' | 'medical' | 'marketing' | 'cme' | 'policy';
type MatrixFormat = 'whitepaper' | 'infographic' | 'video' | 'carousel' | 'podcast' | 'detailer' | 'social' | 'banner';
type MatrixGeo = 'india' | 'us' | 'eu' | 'uk' | 'global' | 'apac';

type MatrixSelection = {
  aud: MatrixAudience | null;
  com: MatrixCommunication | null;
  fmt: MatrixFormat | null;
  geo: MatrixGeo | null;
};

interface ContentStrategyMatrixProps {
  context?: ContentStrategySelection | null;
}

const EMPTY_SELECTION: MatrixSelection = {
  aud: null,
  com: null,
  fmt: null,
  geo: null,
};

const AUDIENCE_OPTIONS: Array<{ value: MatrixAudience; label: string; accent: string; selected: string }> = [
  { value: 'patient', label: 'Patient', accent: 'text-orange-700 dark:text-orange-300', selected: 'bg-orange-200 text-orange-950 dark:bg-orange-900/70 dark:text-orange-100' },
  { value: 'hcp', label: 'HCP', accent: 'text-orange-700 dark:text-orange-300', selected: 'bg-orange-200 text-orange-950 dark:bg-orange-900/70 dark:text-orange-100' },
  { value: 'kol', label: 'KOL / Researcher', accent: 'text-orange-700 dark:text-orange-300', selected: 'bg-orange-200 text-orange-950 dark:bg-orange-900/70 dark:text-orange-100' },
  { value: 'public', label: 'General public', accent: 'text-orange-700 dark:text-orange-300', selected: 'bg-orange-200 text-orange-950 dark:bg-orange-900/70 dark:text-orange-100' },
  { value: 'payer', label: 'Payer / Policy', accent: 'text-orange-700 dark:text-orange-300', selected: 'bg-orange-200 text-orange-950 dark:bg-orange-900/70 dark:text-orange-100' },
];

const COMMUNICATION_OPTIONS: Array<{ value: MatrixCommunication; label: string; accent: string; selected: string }> = [
  { value: 'awareness', label: 'Disease awareness', accent: 'text-emerald-700 dark:text-emerald-300', selected: 'bg-emerald-200 text-emerald-950 dark:bg-emerald-900/70 dark:text-emerald-100' },
  { value: 'launch', label: 'Product launch', accent: 'text-emerald-700 dark:text-emerald-300', selected: 'bg-emerald-200 text-emerald-950 dark:bg-emerald-900/70 dark:text-emerald-100' },
  { value: 'medical', label: 'Medical / MSL', accent: 'text-emerald-700 dark:text-emerald-300', selected: 'bg-emerald-200 text-emerald-950 dark:bg-emerald-900/70 dark:text-emerald-100' },
  { value: 'marketing', label: 'Promotional', accent: 'text-emerald-700 dark:text-emerald-300', selected: 'bg-emerald-200 text-emerald-950 dark:bg-emerald-900/70 dark:text-emerald-100' },
  { value: 'cme', label: 'CME / Education', accent: 'text-emerald-700 dark:text-emerald-300', selected: 'bg-emerald-200 text-emerald-950 dark:bg-emerald-900/70 dark:text-emerald-100' },
  { value: 'policy', label: 'Public health / Policy', accent: 'text-emerald-700 dark:text-emerald-300', selected: 'bg-emerald-200 text-emerald-950 dark:bg-emerald-900/70 dark:text-emerald-100' },
];

const FORMAT_OPTIONS: Array<{ value: MatrixFormat; label: string; accent: string; selected: string }> = [
  { value: 'whitepaper', label: 'White paper', accent: 'text-amber-700 dark:text-amber-300', selected: 'bg-amber-200 text-amber-950 dark:bg-amber-900/70 dark:text-amber-100' },
  { value: 'infographic', label: 'Infographic', accent: 'text-amber-700 dark:text-amber-300', selected: 'bg-amber-200 text-amber-950 dark:bg-amber-900/70 dark:text-amber-100' },
  { value: 'video', label: 'Video / Animation', accent: 'text-amber-700 dark:text-amber-300', selected: 'bg-amber-200 text-amber-950 dark:bg-amber-900/70 dark:text-amber-100' },
  { value: 'carousel', label: 'Carousel / Slides', accent: 'text-amber-700 dark:text-amber-300', selected: 'bg-amber-200 text-amber-950 dark:bg-amber-900/70 dark:text-amber-100' },
  { value: 'podcast', label: 'Podcast script', accent: 'text-amber-700 dark:text-amber-300', selected: 'bg-amber-200 text-amber-950 dark:bg-amber-900/70 dark:text-amber-100' },
  { value: 'detailer', label: 'Visual aid / Detailer', accent: 'text-amber-700 dark:text-amber-300', selected: 'bg-amber-200 text-amber-950 dark:bg-amber-900/70 dark:text-amber-100' },
  { value: 'social', label: 'Social post', accent: 'text-amber-700 dark:text-amber-300', selected: 'bg-amber-200 text-amber-950 dark:bg-amber-900/70 dark:text-amber-100' },
  { value: 'banner', label: 'Banner / Ad', accent: 'text-amber-700 dark:text-amber-300', selected: 'bg-amber-200 text-amber-950 dark:bg-amber-900/70 dark:text-amber-100' },
];

const GEO_OPTIONS: Array<{ value: MatrixGeo; label: string; accent: string; selected: string }> = [
  { value: 'india', label: 'India', accent: 'text-orange-800 dark:text-orange-300', selected: 'bg-orange-100 text-orange-950 dark:bg-orange-900/70 dark:text-orange-100' },
  { value: 'us', label: 'United States', accent: 'text-orange-800 dark:text-orange-300', selected: 'bg-orange-100 text-orange-950 dark:bg-orange-900/70 dark:text-orange-100' },
  { value: 'eu', label: 'Europe', accent: 'text-orange-800 dark:text-orange-300', selected: 'bg-orange-100 text-orange-950 dark:bg-orange-900/70 dark:text-orange-100' },
  { value: 'uk', label: 'UK', accent: 'text-orange-800 dark:text-orange-300', selected: 'bg-orange-100 text-orange-950 dark:bg-orange-900/70 dark:text-orange-100' },
  { value: 'global', label: 'Global / Multi-market', accent: 'text-orange-800 dark:text-orange-300', selected: 'bg-orange-100 text-orange-950 dark:bg-orange-900/70 dark:text-orange-100' },
  { value: 'apac', label: 'APAC (ex-India)', accent: 'text-orange-800 dark:text-orange-300', selected: 'bg-orange-100 text-orange-950 dark:bg-orange-900/70 dark:text-orange-100' },
];

const GEO = {
  india: { reg: 'CDSCO (cdsco.gov.in)', label: 'Schedule H/H1 prescribing info + CDSCO dossier', epi: ['ICMR', 'NCDIR', 'NFHS', 'NPCDCS'], gl: ['API', 'CSI', 'RSSDI', 'IndiaClen'], note: 'Prioritise Indian RCT/bridging study data. CDSCO label governs all claims.', restrict: 'DTC prescription drug advertising prohibited. Patient content = disease awareness only.' },
  us:    { reg: 'FDA / OPDP', label: 'FDA-approved PI + Medication Guide', epi: ['CDC', 'SEER', 'AHA stats', 'NHANES'], gl: ['AHA/ACC', 'ADA', 'NCCN/ASCO', 'ASH'], note: 'FDA label is the legal ceiling. OPDP governs all promotional materials. Fair balance mandatory.', restrict: 'DTC allowed but heavily regulated. Every promotional piece needs full ISI block.' },
  eu:    { reg: 'EMA + national competent authorities', label: 'EMA Summary of Product Characteristics (SmPC)', epi: ['ECDC', 'Eurostat', 'EuroHeart', 'ESMO epi'], gl: ['ESC', 'ESMO', 'EASD', 'EULAR'], note: 'SmPC governs — not the FDA PI. Always confirm local SmPC; indications may differ from FDA.', restrict: 'DTC prescription drug advertising banned across EU. GDPR applies to all digital data collection.' },
  uk:    { reg: 'MHRA + NICE', label: 'UK SmPC (post-Brexit, separate from EMA)', epi: ['NHS Digital', 'Cancer Research UK', 'BHF stats', 'ONS'], gl: ['NICE', 'SIGN', 'BNF', 'RCGP/RCP'], note: 'UK SmPC may diverge from EMA post-Brexit. NICE appraisal drives NHS reimbursement positioning.', restrict: 'ABPI Code governs all promotion. No DTC. All materials certified by registered HCP.' },
  global: { reg: 'Most conservative market in distribution set', label: 'Build claims grid — map each claim to each market label', epi: ['WHO GHO', 'GBD/IHME', 'Lancet global studies'], gl: ['WHO', 'ISH', 'IDF', 'UICC'], note: 'Design to the most restrictive market ceiling. Claims grid is mandatory for global content.', restrict: 'DTC restrictions vary by country. Mark all claims with market applicability.' },
  apac:  { reg: 'Varies — TGA (AU), HSA (SG), PMDA (JP)', label: 'Local registration dossier per country', epi: ['WHO WPRO', 'APCO', 'Country MOH data'], gl: ['Local societies', 'WHO baseline', 'JSPE', 'CSANZ'], note: 'Highly heterogeneous. Japanese label (PMDA) typically most conservative. Country adaptation is standard.', restrict: 'Most APAC markets prohibit DTC. Japan/South Korea/Australia have strict promotional codes.' }
} as const satisfies Record<MatrixGeo, {
  reg: string;
  label: string;
  epi: string[];
  gl: string[];
  note: string;
  restrict: string;
}>;

const EVIDENCE = {
  hcp: {
    launch:    ['Pivotal Phase III RCT (PubMed/EMBASE)', 'Regulatory label for market', 'Mechanism: primary publication', 'Specialty guideline context'],
    medical:   ['Full clinical dossier', 'Cochrane comparative safety', 'ClinicalTrials.gov protocol', 'Subgroup & post-hoc analyses'],
    marketing: ['Approved label claims only', 'Pivotal trial headline data', 'Guideline positioning'],
    cme:       ['Cochrane systematic reviews', 'NMA comparing drug class', 'Multiple RCTs', 'Market-specific guideline body'],
    awareness: ['Disease burden: WHO/NIH + local epi', 'Treatment gap data'],
    policy:    ['Health economics (EMBASE)', 'Real-world evidence', 'WHO/NICE burden data']
  },
  patient: {
    launch:    ['Approved label (plain language)', 'WHO/NIH patient summaries', 'Local health authority patient guide'],
    medical:   ['Regulatory label only', 'NIH MedlinePlus', 'Cochrane plain summaries'],
    marketing: ['Regulatory label (approved claims only)', 'No primary trial data directly'],
    cme:       ['Patient education sources only'],
    awareness: ['WHO/NIH/local epi burden stats', 'Cochrane plain-language summaries'],
    policy:    ['National health survey data', 'WHO burden estimates']
  },
  kol: {
    launch:    ['Full clinical data package', 'ClinicalTrials.gov full protocol', 'Cochrane comparator landscape', 'Congress data (ASCO/ESC/ADA)'],
    medical:   ['All trial data inc. subgroups', 'Pharmacovigilance (EMBASE)', 'PROSPERO-registered NMAs'],
    marketing: ['Scientific publications', 'Congress presentations'],
    cme:       ['Cochrane, NMAs, all RCTs in class'],
    awareness: ['Epidemiology: local registries + GBD', 'Unmet need publications'],
    policy:    ['HEOR studies', 'Budget impact models', 'Real-world outcomes']
  },
  public: {
    launch:    ['WHO/NIH plain summaries', 'Regulatory approval announcement'],
    medical:   ['Not applicable'],
    marketing: ['Regulatory label — no clinical data directly'],
    cme:       ['Not applicable'],
    awareness: ['WHO, NIH, local authority burden stats', 'National health surveys'],
    policy:    ['WHO/govt health data', 'UN/World Bank health indicators']
  },
  payer: {
    launch:    ['HEOR studies', 'Cost-effectiveness models', 'Regulatory label + NMA', 'Real-world adherence data'],
    medical:   ['Pharmacoeconomics publications', 'Real-world outcomes (EMBASE)'],
    marketing: ['Budget impact evidence', 'Comparative effectiveness RCTs'],
    cme:       ['Not standard for payer audience'],
    awareness: ['Burden of illness studies', 'Local epi + WHO'],
    policy:    ['HTA body reports (NICE/HTAi)', 'Budget impact models']
  }
} as const satisfies Record<MatrixAudience, Record<MatrixCommunication, string[]>>;

const TONE = {
  hcp:     'Clinical, precise, evidence-anchored. Cite study names, p-values, confidence intervals. HCPs expect statistical rigour.',
  patient: 'Plain language (≤8th grade reading level). Empathetic, action-oriented. No jargon. Focus on "what this means for you."',
  kol:     'Peer-to-peer. Scientific depth, hypothesis-driven, acknowledge limitations openly. Data transparency is credibility.',
  public:  'Simple, trustworthy, non-alarmist. Lead with relevance. Avoid brand names. Use analogies.',
  payer:   'Outcomes-focused, economic framing. Budget impact, QALY, cost-per-outcome. Real-world effectiveness over efficacy alone.'
} as const satisfies Record<MatrixAudience, string>;

const AVOID = {
  hcp: {
    launch:    ['Off-label claims', 'Unpublished data without NDA cover', 'Superlatives without citation'],
    medical:   ['Promotional tone', 'Unapproved indications', 'Cherry-picked subgroups without context'],
    marketing: ['Off-label claims', 'Data not in approved label', 'Comparative claims without head-to-head data'],
    cme:       ['Brand-led framing — must show full class data', 'Promotional intent'],
    awareness: ['Brand mentions', 'Unverified statistics'],
    policy:    ['Anecdotal evidence', 'Non-peer-reviewed sources']
  },
  patient: {
    launch:    ['Clinical stats without explanation', 'Brand claims beyond label', 'Fear-based messaging'],
    medical:   ['Trial data without plain-language context'],
    marketing: ['Off-label implications', 'Statistical data without meaning'],
    cme:       ['N/A — use patient education framing'],
    awareness: ['Stigmatising language', 'Unverified prevalence numbers'],
    policy:    ['Jargon', 'Scary statistics without context']
  },
  kol: {
    launch:    ['Withholding unfavourable data', 'Unapproved promotion dressed as science'],
    medical:   ['Endpoints not pre-registered', 'Suppressed comparator data'],
    marketing: ['Scientific bias toward sponsor drug'],
    cme:       ['Single-sponsor bias'],
    awareness: ['Unverified epidemiology'],
    policy:    ['Non-validated economic models']
  },
  public: {
    launch:    ['Medical claims', 'Brand promotion'],
    medical:   ['N/A'],
    marketing: ['Prescription drug promotion (prohibited in most markets)'],
    cme:       ['N/A'],
    awareness: ['Alarmist statistics without context', 'Scientific jargon'],
    policy:    ['Brand association', 'Medical jargon']
  },
  payer: {
    launch:    ['Efficacy-only framing — payers need effectiveness', 'Unvalidated economic models'],
    medical:   ['Ignoring comparator costs'],
    marketing: ['Cherry-picked RCT data without RWE'],
    cme:       ['N/A'],
    awareness: ['Burden stats without cost context'],
    policy:    ['Non-HTAi-compliant models']
  }
} as const satisfies Record<MatrixAudience, Record<MatrixCommunication, string[]>>;

const FORMAT_RULES = {
  whitepaper: { d: 'High. Full methodology, references, limitations. IMRAD structure. Min 8–12 cited sources.', dens: 'Dense but navigable — section headers, summary boxes, 1-page executive summary.' },
  infographic:{ d: 'Low — 3 to 5 key data points max. Every stat needs a footnote source.', dens: 'One insight per visual zone. No paragraph text.' },
  video:      { d: 'Medium. Script drives content. Data shown as animated numbers, sourced in the brief.', dens: 'One concept per scene. 90-sec max for patient/public. 3–5 min for HCP.' },
  carousel:   { d: 'Medium. Each slide = one idea. Last slide = source list or CTA.', dens: '5–8 slides. Slide 1: hook. Slides 2–6: evidence. Slides 7–8: action and source.' },
  podcast:    { d: 'Medium–High. Conversational but evidence-grounded. Host cites source naturally.', dens: 'Narrative arc. Avoid complex stats without context — listener cannot rewind.' },
  detailer:   { d: 'High clinical rigour. Every claim = approved reference. MLR-reviewable.', dens: 'Unmet need → mechanism → efficacy → safety → positioning.' },
  social:     { d: 'Minimal. One stat, one idea, one CTA. Source in caption or swipe.', dens: 'Caption ≤150 words. No clinical claims without full approved context.' },
  banner:     { d: 'Lowest. Headline + image + CTA only. All claims must be approvable.', dens: 'Zero clinical data in the visual. Drive to a landing page for evidence.' }
} as const satisfies Record<MatrixFormat, { d: string; dens: string }>;

const AUD_LABELS: Record<MatrixAudience, string> = { hcp: 'HCP', patient: 'Patient', kol: 'KOL / Researcher', public: 'General public', payer: 'Payer / Policy' };
const COM_LABELS: Record<MatrixCommunication, string> = { awareness: 'Disease awareness', launch: 'Product launch', medical: 'Medical / MSL', marketing: 'Promotional', cme: 'CME / Education', policy: 'Public health / Policy' };
const FMT_LABELS: Record<MatrixFormat, string> = { whitepaper: 'White paper', infographic: 'Infographic', video: 'Video', carousel: 'Carousel', podcast: 'Podcast script', detailer: 'Detailer', social: 'Social post', banner: 'Banner / Ad' };
const GEO_LABELS: Record<MatrixGeo, string> = { india: 'India', us: 'United States', eu: 'Europe', uk: 'UK', global: 'Global', apac: 'APAC' };

function mapContentTypeToMatrixFormat(contentType?: ContentStrategySelection['contentType']): MatrixFormat | null {
  switch (contentType) {
    case 'white-paper':
    case 'document':
    case 'report':
      return 'whitepaper';
    case 'infographic':
      return 'infographic';
    case 'video':
      return 'video';
    case 'presentation':
      return 'carousel';
    case 'podcast':
      return 'podcast';
    case 'social-post':
      return 'social';
    default:
      return null;
  }
}

function mapMarketToMatrixGeo(market?: ContentStrategySelection['market']): MatrixGeo | null {
  switch (market) {
    case 'global':
      return 'global';
    case 'india':
      return 'india';
    case 'us':
      return 'us';
    case 'uk':
      return 'uk';
    case 'germany':
      return 'eu';
    case 'singapore':
    case 'dubai':
      return 'apac';
    default:
      return null;
  }
}

function mapAudienceToMatrixAudience(audience?: string): MatrixAudience | null {
  if (!audience) return null;
  const normalized = audience.toLowerCase();
  if (normalized.includes('payer') || normalized.includes('policy') || normalized.includes('hta') || normalized.includes('market access')) {
    return 'payer';
  }
  if (normalized.includes('kol') || normalized.includes('research') || normalized.includes('scientist') || normalized.includes('academic')) {
    return 'kol';
  }
  if (normalized.includes('hcp') || normalized.includes('healthcare') || normalized.includes('clinician') || normalized.includes('physician')) {
    return 'hcp';
  }
  if (normalized.includes('patient')) {
    return 'patient';
  }
  if (normalized.includes('public') || normalized.includes('general') || normalized.includes('consumer')) {
    return 'public';
  }
  return null;
}

function mapNamespaceToCommunication(namespace?: ContentStrategySelection['apiNamespace'], audience?: string): MatrixCommunication | null {
  if (namespace === 'marketing') {
    return 'marketing';
  }

  const audienceType = mapAudienceToMatrixAudience(audience);
  if (audienceType === 'patient' || audienceType === 'public') {
    return 'awareness';
  }

  if (namespace === 'medical') {
    return 'medical';
  }

  return null;
}

function deriveSelectionFromContext(context?: ContentStrategySelection | null): MatrixSelection {
  if (!context) return EMPTY_SELECTION;

  return {
    aud: mapAudienceToMatrixAudience(context.targetAudience),
    com: mapNamespaceToCommunication(context.apiNamespace, context.targetAudience),
    fmt: mapContentTypeToMatrixFormat(context.contentType),
    geo: mapMarketToMatrixGeo(context.market),
  };
}

function getMLR(aud: MatrixAudience, com: MatrixCommunication, fmt: MatrixFormat, geo: MatrixGeo) {
  let score = 0;
  score += ({ hcp: 2, kol: 1, patient: 3, public: 2, payer: 2 }[aud] || 0);
  score += ({ marketing: 4, launch: 4, medical: 2, awareness: 2, cme: 2, policy: 1 }[com] || 0);
  score += ({ banner: 3, social: 3, detailer: 3, video: 2, carousel: 2, infographic: 2, whitepaper: 1, podcast: 1 }[fmt] || 0);
  score *= ({ us: 1.2, eu: 1.1, uk: 1.1, india: 1.0, global: 1.3, apac: 1.0 }[geo] || 1);
  if (score >= 10) return { level: 4, label: 'Very high', desc: 'Full MLR panel review required before any distribution' };
  if (score >= 7) return { level: 3, label: 'High', desc: 'Medical + Legal + Regulatory sign-off mandatory' };
  if (score >= 4) return { level: 2, label: 'Moderate', desc: 'Medical + Regulatory sign-off required; Legal advisory' };
  return { level: 1, label: 'Low', desc: 'Medical review sufficient; Regulatory spot-check' };
}

function getSignoffs(aud: MatrixAudience, com: MatrixCommunication, fmt: MatrixFormat, geo: MatrixGeo) {
  const isPromo = com === 'marketing' || com === 'launch';
  const isPatient = aud === 'patient' || aud === 'public';
  const isHighRiskFormat = fmt === 'banner' || fmt === 'social' || fmt === 'detailer';
  const isGlobal = geo === 'global';

  return [
    { role: 'Medical Affairs', status: 'req', note: 'Reviews evidence accuracy and scientific integrity' },
    { role: 'Regulatory Affairs', status: 'req', note: 'Verifies all claims are within the approved label' },
    { role: 'Legal / Compliance', status: isPromo || isHighRiskFormat || isGlobal ? 'req' : 'opt', note: isPromo ? 'Mandatory for promotional and launch materials' : 'Advisory; mandatory if comparative claims present' },
    { role: 'Marketing', status: isPromo ? 'req' : 'opt', note: 'Reviews for brand consistency and promotional intent' },
    { role: 'Drug Safety / PV', status: isPatient || isPromo ? 'opt' : 'na', note: 'Required if safety claims or AE data are mentioned' },
    { role: 'Market Access', status: aud === 'payer' || com === 'policy' ? 'req' : 'na', note: 'Required for payer-facing and health economics content' },
    { role: 'Multi-country MLR', status: isGlobal ? 'req' : 'na', note: 'Each market needs local regulatory sign-off for global pieces' },
  ];
}

function getRounds(com: MatrixCommunication, geo: MatrixGeo) {
  if ((com === 'marketing' || com === 'launch') && geo === 'us') return 4;
  if (com === 'marketing' || com === 'launch') return 3;
  if (geo === 'global') return 4;
  return 2;
}

function getTriggers(aud: MatrixAudience, com: MatrixCommunication, fmt: MatrixFormat, geo: MatrixGeo) {
  const triggers: Array<{ type: 'req' | 'warn' | 'ok'; text: string }> = [];
  if (com === 'marketing' || com === 'launch') triggers.push({ type: 'req', text: 'Comparative claims require head-to-head RCT data — class comparisons need an NMA' });
  if (aud === 'patient' && ['india', 'eu', 'uk', 'apac'].includes(geo)) triggers.push({ type: 'req', text: 'Brand-linked patient content likely non-compliant in this market — disease awareness framing required' });
  if (fmt === 'social' || fmt === 'banner') triggers.push({ type: 'warn', text: 'Digital formats often need a separate digital review track — confirm with your MLR SOP' });
  if (geo === 'global') triggers.push({ type: 'req', text: 'Claims grid required — map each claim to each market\'s regulatory status before MLR submission' });
  if (com === 'cme') triggers.push({ type: 'warn', text: 'CME content must declare educational grant source; sponsor cannot control content or speaker selection' });
  if (aud === 'kol' && com === 'medical') triggers.push({ type: 'ok', text: 'Scientific exchange is exempt from promotional MLR in most markets — document the exchange formally' });
  if (fmt === 'video' || fmt === 'podcast') triggers.push({ type: 'warn', text: 'Audio/visual formats need script + storyboard submitted together in the first MLR round' });
  if (geo === 'us' && com === 'marketing') triggers.push({ type: 'req', text: 'OPDP fair balance mandatory — ISI must appear with equivalent prominence to efficacy claims' });
  if (!triggers.length) triggers.push({ type: 'ok', text: 'No high-risk triggers detected for this combination — standard MLR process applies' });
  return triggers;
}

function SelectionChip({
  label,
  selected,
  onClick,
  selectedClassName,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  selectedClassName: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        selected
          ? selectedClassName
          : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {label}
    </button>
  );
}

function MatrixPanel({
  title,
  accentClassName,
  children,
}: {
  title: string;
  accentClassName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-foreground/10 bg-muted/30 p-4">
      <div className={cn('mb-2 text-[11px] font-semibold uppercase tracking-[0.12em]', accentClassName)}>
        {title}
      </div>
      <div className="space-y-2 text-sm leading-6 text-foreground">{children}</div>
    </div>
  );
}

export function ContentStrategyMatrix({ context }: ContentStrategyMatrixProps) {
  const prefilledSelection = useMemo(() => deriveSelectionFromContext(context), [context]);
  const [selection, setSelection] = useState<MatrixSelection>(prefilledSelection);

  useEffect(() => {
    setSelection(prefilledSelection);
  }, [prefilledSelection]);

  const selectedCount = Object.values(selection).filter(Boolean).length;
  const isComplete = selectedCount === 4;
  const hasPrefill = Object.values(prefilledSelection).some(Boolean);

  const output = useMemo(() => {
    if (!selection.aud || !selection.com || !selection.fmt || !selection.geo) {
      return null;
    }

    const mlr = getMLR(selection.aud, selection.com, selection.fmt, selection.geo);
    const signoffs = getSignoffs(selection.aud, selection.com, selection.fmt, selection.geo);
    const triggers = getTriggers(selection.aud, selection.com, selection.fmt, selection.geo);
    const rounds = getRounds(selection.com, selection.geo);

    return {
      evidence: EVIDENCE[selection.aud][selection.com],
      tone: TONE[selection.aud],
      avoid: AVOID[selection.aud][selection.com],
      formatRule: FORMAT_RULES[selection.fmt],
      geoRule: GEO[selection.geo],
      mlr,
      signoffs,
      triggers,
      rounds,
    };
  }, [selection]);

  return (
    <div className="space-y-5 p-6 md:p-8">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Select one option from each dimension to generate your strategy brief, source requirements, and MLR sign-off guide.
        </p>
        {hasPrefill && (
          <Badge variant="outline" className="text-xs">
            Prefilled from current Vera context where possible
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-[24px] border border-foreground/10 bg-muted/30 p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">1 · Audience</div>
          <div className="flex flex-wrap gap-2">
            {AUDIENCE_OPTIONS.map((option) => (
              <SelectionChip
                key={option.value}
                label={option.label}
                selected={selection.aud === option.value}
                selectedClassName={option.selected}
                onClick={() => setSelection((prev) => ({ ...prev, aud: option.value }))}
              />
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-foreground/10 bg-muted/30 p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">2 · Communication Type</div>
          <div className="flex flex-wrap gap-2">
            {COMMUNICATION_OPTIONS.map((option) => (
              <SelectionChip
                key={option.value}
                label={option.label}
                selected={selection.com === option.value}
                selectedClassName={option.selected}
                onClick={() => setSelection((prev) => ({ ...prev, com: option.value }))}
              />
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-foreground/10 bg-muted/30 p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">3 · Format</div>
          <div className="flex flex-wrap gap-2">
            {FORMAT_OPTIONS.map((option) => (
              <SelectionChip
                key={option.value}
                label={option.label}
                selected={selection.fmt === option.value}
                selectedClassName={option.selected}
                onClick={() => setSelection((prev) => ({ ...prev, fmt: option.value }))}
              />
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-foreground/10 bg-muted/30 p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-800 dark:text-orange-300">4 · Market / Geography</div>
          <div className="flex flex-wrap gap-2">
            {GEO_OPTIONS.map((option) => (
              <SelectionChip
                key={option.value}
                label={option.label}
                selected={selection.geo === option.value}
                selectedClassName={option.selected}
                onClick={() => setSelection((prev) => ({ ...prev, geo: option.value }))}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['aud', 'com', 'fmt', 'geo'] as const).map((key) => (
          <span
            key={key}
            className={cn(
              'h-2 w-2 rounded-full',
              selection[key] ? 'bg-primary' : 'bg-border'
            )}
          />
        ))}
        <span className="ml-2 text-xs text-muted-foreground">
          {isComplete ? 'All dimensions selected — brief ready' : `${selectedCount} of 4 selected`}
        </span>
      </div>

      {!output ? (
        <div className="rounded-[28px] border border-foreground/10 bg-background/82 px-6 py-10 text-center text-sm text-muted-foreground shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          Select one option from each of the four dimensions to generate your full strategy and MLR brief.
        </div>
      ) : (
        <div className="space-y-4 rounded-[28px] border border-foreground/10 bg-background/82 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge className="bg-orange-100 text-orange-950 hover:bg-orange-100 dark:bg-orange-900 dark:text-orange-100">{AUD_LABELS[selection.aud!]}</Badge>
            <span>×</span>
            <Badge className="bg-emerald-100 text-emerald-950 hover:bg-emerald-100 dark:bg-emerald-900 dark:text-emerald-100">{COM_LABELS[selection.com!]}</Badge>
            <span>×</span>
            <Badge className="bg-amber-100 text-amber-950 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-100">{FMT_LABELS[selection.fmt!]}</Badge>
            <span>×</span>
            <Badge className="bg-orange-100 text-orange-950 hover:bg-orange-100 dark:bg-orange-900 dark:text-orange-100">{GEO_LABELS[selection.geo!]}</Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <MatrixPanel title="Evidence sources" accentClassName="text-sky-700 dark:text-sky-300">
              <ul className="space-y-1 pl-5 text-sm">
                {output.evidence.map((item) => (
                  <li key={item} className="list-disc">{item}</li>
                ))}
              </ul>
            </MatrixPanel>

            <MatrixPanel title={`Market: ${GEO_LABELS[selection.geo!]}`} accentClassName="text-rose-700 dark:text-rose-300">
              <div><span className="font-medium">Regulator:</span> {output.geoRule.reg}</div>
              <div><span className="font-medium">Label:</span> {output.geoRule.label}</div>
              <div><span className="font-medium">Local epi:</span> {output.geoRule.epi.join(', ')}</div>
              <div><span className="font-medium">Guidelines:</span> {output.geoRule.gl.join(', ')}</div>
              <p className="pt-2 text-sm italic text-muted-foreground">{output.geoRule.note}</p>
              <p className="pt-2 text-xs text-amber-700 dark:text-amber-300">{output.geoRule.restrict}</p>
            </MatrixPanel>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <MatrixPanel title="Tone & language" accentClassName="text-emerald-700 dark:text-emerald-300">
              <p>{output.tone}</p>
            </MatrixPanel>

            <MatrixPanel title="What to avoid" accentClassName="text-rose-700 dark:text-rose-300">
              <ul className="space-y-1 pl-5 text-sm">
                {output.avoid.map((item) => (
                  <li key={item} className="list-disc">{item}</li>
                ))}
              </ul>
            </MatrixPanel>

            <MatrixPanel title={`Format: ${FMT_LABELS[selection.fmt!]}`} accentClassName="text-amber-700 dark:text-amber-300">
              <div><span className="font-medium">Depth:</span> {output.formatRule.d}</div>
              <div className="pt-2"><span className="font-medium">Density:</span> {output.formatRule.dens}</div>
            </MatrixPanel>
          </div>

          <div className="border-t pt-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              MLR & sign-off requirements
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Review complexity</div>
                  <div className="mb-3 flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={cn(
                          'h-2 flex-1 rounded-full',
                          level <= output.mlr.level ? 'bg-red-500' : 'bg-muted'
                        )}
                      />
                    ))}
                  </div>
                  <div className="text-2xl font-semibold">{output.mlr.label}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{output.mlr.desc}</p>

                  <div className="mt-4">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Estimated review rounds</div>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4].map((round) => (
                        <div
                          key={round}
                          className={cn(
                            'h-4 w-4 rounded-full border',
                            round <= output.rounds ? 'border-red-500 bg-red-500' : 'border-border bg-muted'
                          )}
                        />
                      ))}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {output.rounds} round{output.rounds > 1 ? 's' : ''} typical
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Key triggers & flags</div>
                  <div className="space-y-2">
                    {output.triggers.map((trigger) => (
                      <div
                        key={trigger.text}
                        className={cn(
                          'rounded-md border-l-2 px-3 py-2 text-xs leading-5',
                          trigger.type === 'req' && 'border-red-500 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100',
                          trigger.type === 'warn' && 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
                          trigger.type === 'ok' && 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
                        )}
                      >
                        {trigger.type === 'req' ? '⚑ ' : trigger.type === 'warn' ? '⚠ ' : '✓ '}
                        {trigger.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Who must sign off</div>
                <div className="space-y-1">
                  {output.signoffs.map((signoff) => (
                    <div key={signoff.role} className="flex gap-3 border-b py-3 last:border-b-0">
                      <Badge
                        className={cn(
                          'min-w-[82px] justify-center self-start',
                          signoff.status === 'req' && 'bg-red-100 text-red-900 hover:bg-red-100 dark:bg-red-950 dark:text-red-100',
                          signoff.status === 'opt' && 'bg-emerald-100 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-100',
                          signoff.status === 'na' && 'bg-muted text-muted-foreground hover:bg-muted'
                        )}
                      >
                        {signoff.status === 'req' ? 'Required' : signoff.status === 'opt' ? 'Advisory' : 'N/A'}
                      </Badge>
                      <div>
                        <div className="font-medium">{signoff.role}</div>
                        <div className="text-sm text-muted-foreground">{signoff.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
