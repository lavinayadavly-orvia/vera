import '../lib/load-env.mjs';

const TRUSTED_SOURCE_LIBRARY = [
  {
    topics: ['hypertension', 'blood pressure', 'cardiovascular', 'heart disease', 'stroke'],
    title: 'Hypertension',
    domain: 'who.int',
    url: 'https://www.who.int/news-room/fact-sheets/detail/hypertension',
    snippet: 'WHO fact sheet on hypertension, global burden, awareness, diagnosis, treatment, control, risk factors, symptoms, and management.',
    publishedYear: 2025,
    sourceType: 'WHO fact sheet',
    tier: 'Tier 1',
    suitability: 'P',
    recommendedRole: 'primary',
    verbatimAnchor: 'An estimated 1.4 billion adults aged 30-79 years worldwide had hypertension in 2024; hypertension is a major cause of premature death worldwide.',
  },
  {
    topics: ['hypertension', 'blood pressure', 'cardiovascular', 'heart disease', 'stroke'],
    title: 'About High Blood Pressure',
    domain: 'cdc.gov',
    url: 'https://www.cdc.gov/high-blood-pressure/about/index.html',
    snippet: 'CDC overview of high blood pressure definition, symptoms, complications, risk factors, measurement, and management.',
    publishedYear: 2026,
    sourceType: 'Government health agency overview',
    tier: 'Tier 1',
    suitability: 'P',
    recommendedRole: 'primary',
    verbatimAnchor: 'High blood pressure is consistently at or above 130/80 mm Hg and usually has no warning signs or symptoms.',
  },
  {
    topics: ['hypertension', 'blood pressure', 'cardiovascular', 'heart disease', 'stroke'],
    title: 'High Blood Pressure Facts',
    domain: 'cdc.gov',
    url: 'https://www.cdc.gov/high-blood-pressure/data-research/facts-stats/index.html',
    snippet: 'CDC high blood pressure statistics, control rates, mortality, costs, and population differences in the United States.',
    publishedYear: 2025,
    sourceType: 'Government statistics',
    tier: 'Tier 1',
    suitability: 'P',
    recommendedRole: 'primary',
    verbatimAnchor: 'Nearly half of U.S. adults have high blood pressure; about 1 in 4 adults with high blood pressure has it under control.',
  },
  {
    topics: ['hypertension', 'blood pressure'],
    title: '2026 Heart Disease and Stroke Statistics',
    domain: 'professional.heart.org',
    url: 'https://professional.heart.org/en/science-news/2026-heart-disease-and-stroke-statistics',
    snippet: 'American Heart Association annual statistical update covering cardiovascular disease, stroke, and risk factors including blood pressure.',
    publishedYear: 2026,
    sourceType: 'Professional society statistics update',
    tier: 'Tier 2',
    suitability: 'S',
    recommendedRole: 'supporting',
    verbatimAnchor: 'The AHA, with NIH, annually reports updated statistics on cardiovascular disease, stroke, blood pressure, and cardiovascular risk factors.',
  },
  {
    topics: ['diabetes', 'prediabetes', 'blood glucose', 'insulin'],
    title: 'Diabetes Basics',
    domain: 'cdc.gov',
    url: 'https://www.cdc.gov/diabetes/about/index.html',
    snippet: 'CDC overview of diabetes, types, complications, prevention, diabetes by the numbers, and management actions.',
    publishedYear: 2026,
    sourceType: 'Government health agency overview',
    tier: 'Tier 1',
    suitability: 'P',
    recommendedRole: 'primary',
    verbatimAnchor: 'Diabetes is a chronic health condition that affects how the body turns food into energy; over time it can cause serious health problems.',
  },
  {
    topics: ['diabetes', 'prediabetes', 'blood glucose', 'insulin'],
    title: 'Diabetes',
    domain: 'medlineplus.gov',
    url: 'https://medlineplus.gov/diabetes.html',
    snippet: 'MedlinePlus patient-safe diabetes overview covering types, causes, risk factors, symptoms, diagnosis, management, and prevention.',
    publishedYear: 2025,
    sourceType: 'NIH patient education',
    tier: 'Tier 1',
    suitability: 'P',
    recommendedRole: 'primary',
    verbatimAnchor: 'Diabetes is a disease in which blood glucose levels are too high; long-term high blood glucose can lead to serious health conditions.',
  },
  {
    topics: ['diabetes', 'prediabetes', 'blood glucose', 'insulin'],
    title: 'Diabetes',
    domain: 'who.int',
    url: 'https://www.who.int/health-topics/noncommunicable-diseases/diabetes',
    snippet: 'WHO diabetes topic page summarizing global burden, increasing prevalence, mortality, and noncommunicable disease context.',
    publishedYear: 2026,
    sourceType: 'WHO topic page',
    tier: 'Tier 1',
    suitability: 'S',
    recommendedRole: 'supporting',
    verbatimAnchor: 'WHO summarizes diabetes as a major noncommunicable disease with substantial global burden and complications.',
  },
  {
    topics: ['erectile dysfunction', 'ed', 'impotence', 'sexual health'],
    title: 'Symptoms & Causes of Erectile Dysfunction',
    domain: 'niddk.nih.gov',
    url: 'https://www.niddk.nih.gov/health-information/urologic-diseases/erectile-dysfunction/symptoms-causes',
    snippet: 'NIDDK symptoms and causes of erectile dysfunction, including vascular, neurologic, hormonal, medication, mental health, and lifestyle contributors.',
    publishedYear: 2024,
    sourceType: 'NIH clinical education',
    tier: 'Tier 1',
    suitability: 'P',
    recommendedRole: 'primary',
    verbatimAnchor: 'ED may be a symptom of another health problem; conditions affecting blood vessels, nerves, or hormones can lead to ED.',
  },
  {
    topics: ['erectile dysfunction', 'ed', 'impotence', 'sexual health'],
    title: 'Treatment for Erectile Dysfunction',
    domain: 'niddk.nih.gov',
    url: 'https://www.niddk.nih.gov/health-information/urologic-diseases/erectile-dysfunction/treatment',
    snippet: 'NIDDK treatment overview for erectile dysfunction, covering lifestyle changes, counseling, medicines, devices, surgery, and safety cautions.',
    publishedYear: 2024,
    sourceType: 'NIH treatment guidance',
    tier: 'Tier 1',
    suitability: 'P',
    recommendedRole: 'primary',
    verbatimAnchor: 'Health care professionals treat the underlying cause of ED when possible and may suggest lifestyle changes, counseling, medicines, devices, or surgery.',
  },
  {
    topics: ['erectile dysfunction', 'ed', 'impotence', 'sexual health'],
    title: 'Erectile Dysfunction',
    domain: 'medlineplus.gov',
    url: 'https://medlineplus.gov/erectiledysfunction.html',
    snippet: 'MedlinePlus patient-safe overview of erectile dysfunction, diagnosis, treatment, clinical trials, and NIH-linked resources.',
    publishedYear: 2025,
    sourceType: 'NIH patient education',
    tier: 'Tier 1',
    suitability: 'S',
    recommendedRole: 'supporting',
    verbatimAnchor: 'ED is trouble getting or keeping an erection and can be a sign of health problems.',
  },
  {
    topics: ['hair loss', 'baldness', 'alopecia', 'androgenetic alopecia'],
    title: 'Hair Loss',
    domain: 'medlineplus.gov',
    url: 'https://medlineplus.gov/hairloss.html',
    snippet: 'MedlinePlus hair loss overview covering alopecia, causes, risk factors, treatment options, clinical trials, and NIH resources.',
    publishedYear: 2025,
    sourceType: 'NIH patient education',
    tier: 'Tier 1',
    suitability: 'P',
    recommendedRole: 'primary',
    verbatimAnchor: 'Hair loss can occur with aging, certain diseases, medicines, chemotherapy, stress, low protein diet, family history, or poor nutrition.',
  },
  {
    topics: ['hair loss', 'baldness', 'alopecia', 'androgenetic alopecia'],
    title: 'Hair loss',
    domain: 'medlineplus.gov',
    url: 'https://medlineplus.gov/ency/article/003246.htm',
    snippet: 'MedlinePlus Medical Encyclopedia entry on hair loss, alopecia, considerations, causes, and pattern baldness.',
    publishedYear: 2025,
    sourceType: 'NIH medical encyclopedia',
    tier: 'Tier 1',
    suitability: 'P',
    recommendedRole: 'primary',
    verbatimAnchor: 'Partial or complete loss of hair is called alopecia; hair loss may be patchy or diffuse.',
  },
  {
    topics: ['cancer', 'oncology'],
    title: 'Cancer Prevention Overview (PDQ) - Patient Version',
    domain: 'cancer.gov',
    url: 'https://www.cancer.gov/about-cancer/causes-prevention/patient-prevention-overview-pdq',
    snippet: 'National Cancer Institute overview of cancer prevention, risk factors, lifestyle and environmental contributors, and prevention approaches.',
    publishedYear: 2025,
    sourceType: 'NCI patient/professional education',
    tier: 'Tier 1',
    suitability: 'P',
    recommendedRole: 'primary',
    verbatimAnchor: 'Cancer prevention is action taken to lower the chance of getting cancer; cancer is a group of related diseases.',
  },
  {
    topics: ['general', 'medical', 'health', 'patient education'],
    title: 'MedlinePlus Health Topics',
    domain: 'medlineplus.gov',
    url: 'https://medlineplus.gov/healthtopics.html',
    snippet: 'NIH/NLM index of patient-safe health topics, medical encyclopedia entries, drugs, supplements, and vetted health information.',
    publishedYear: 2026,
    sourceType: 'NIH health topic index',
    tier: 'Tier 1',
    suitability: 'S',
    recommendedRole: 'contextual',
    verbatimAnchor: 'MedlinePlus provides health information from the National Library of Medicine and links to NIH and federal government resources.',
  },
  {
    topics: ['general', 'medical', 'public health', 'global health'],
    title: 'WHO Health Topics',
    domain: 'who.int',
    url: 'https://www.who.int/health-topics',
    snippet: 'WHO health topics index for global public health topics, fact sheets, campaigns, initiatives, and technical resources.',
    publishedYear: 2026,
    sourceType: 'WHO health topic index',
    tier: 'Tier 1',
    suitability: 'S',
    recommendedRole: 'contextual',
    verbatimAnchor: 'WHO health topics provide global public health context and topic-level reference material.',
  },
];

function extractYear(text) {
  const match = text.match(/\b(20\d{2}|19\d{2})\b/);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

function stripMarkup(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function limitText(value, maxLength = 480) {
  const clean = stripMarkup(value);
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trim()}...`;
}

function firstSentence(value) {
  const clean = stripMarkup(value);
  const match = clean.match(/^(.{40,260}?[.!?])\s/);
  return match ? match[1] : limitText(clean, 240);
}

function toDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

const GOOGLE_API_KEY =
  process.env.GOOGLE_SEARCH_API_KEY ||
  process.env.GOOGLE_CSE_API_KEY ||
  process.env.GOOGLE_CUSTOM_SEARCH_API_KEY ||
  process.env.VITE_GOOGLE_SEARCH_API_KEY ||
  process.env.VITE_GOOGLE_CSE_API_KEY ||
  process.env.VITE_GOOGLE_CUSTOM_SEARCH_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.VITE_GOOGLE_API_KEY ||
  '';
const GOOGLE_CX = process.env.GOOGLE_CX || process.env.VITE_GOOGLE_CX || '';
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || process.env.VITE_TAVILY_API_KEY || '';
const TAVILY_SEARCH_DEPTH = String(process.env.TAVILY_SEARCH_DEPTH || process.env.VITE_TAVILY_SEARCH_DEPTH || 'advanced').toLowerCase();

function getSearchKeySource() {
  const candidates = [
    'GOOGLE_SEARCH_API_KEY',
    'GOOGLE_CSE_API_KEY',
    'GOOGLE_CUSTOM_SEARCH_API_KEY',
    'VITE_GOOGLE_SEARCH_API_KEY',
    'VITE_GOOGLE_CSE_API_KEY',
    'VITE_GOOGLE_CUSTOM_SEARCH_API_KEY',
    'GOOGLE_API_KEY',
    'VITE_GOOGLE_API_KEY',
  ];
  return candidates.find((name) => process.env[name]) || null;
}

function buildGoogleSearchUrl(query, limit) {
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', GOOGLE_API_KEY);
  url.searchParams.set('cx', GOOGLE_CX);
  url.searchParams.set('q', query);
  url.searchParams.set('num', String(Math.min(limit, 10)));
  return url;
}

function summarizeGoogleError(body) {
  if (!body?.error) return null;
  const detailWithReason = body.error.details?.find((detail) => detail.reason);
  const detailWithMetadata = body.error.details?.find((detail) => detail.metadata);
  return {
    code: body.error.code,
    status: body.error.status,
    message: body.error.message,
    reason: detailWithReason?.reason,
    apiName: detailWithMetadata?.metadata?.apiName,
    service: detailWithMetadata?.metadata?.service,
  };
}

export function getSearchProviderState() {
  const googleConfigured = Boolean(GOOGLE_API_KEY && GOOGLE_CX);
  const tavilyConfigured = Boolean(TAVILY_API_KEY);
  return {
    selected: tavilyConfigured ? 'tavily' : googleConfigured ? 'google-cse' : 'open-medical',
    active: tavilyConfigured
      ? 'tavily-open-medical-curated'
      : googleConfigured
        ? 'open-medical-google-cse-curated'
        : 'open-medical-curated',
    configured: tavilyConfigured || googleConfigured,
    tavilyConfigured,
    googleCseConfigured: googleConfigured,
    openMedicalConfigured: true,
    keyConfigured: Boolean(GOOGLE_API_KEY),
    cxConfigured: Boolean(GOOGLE_CX),
    keySource: getSearchKeySource(),
    tavilySearchDepth: TAVILY_SEARCH_DEPTH,
    label: tavilyConfigured
      ? 'Tavily + open medical APIs + curated official-source fallback'
      : googleConfigured
        ? 'Open medical APIs + Google CSE + curated fallback'
        : 'Open medical APIs + curated official-source fallback',
    note: tavilyConfigured
      ? 'Vera uses Tavily for broad web discovery, then merges Europe PMC, ClinicalTrials.gov, and curated official sources.'
      : googleConfigured
        ? 'Vera merges Europe PMC, ClinicalTrials.gov, Google Custom Search candidates, and curated official sources.'
        : 'Google Custom Search JSON API is legacy-only for new customers; Vera uses Europe PMC, ClinicalTrials.gov, and curated official sources by default.',
  };
}

async function checkGoogleSearchConnection(query) {
  if (!GOOGLE_API_KEY || !GOOGLE_CX) {
    return {
      ok: false,
      status: null,
      configured: false,
      error: {
        status: 'MISSING_CONFIG',
        message: 'Set GOOGLE_SEARCH_API_KEY and GOOGLE_CX to enable legacy Google Custom Search.',
      },
      resultCount: 0,
      results: [],
    };
  }
  try {
    const response = await fetch(buildGoogleSearchUrl(query, 5));
    const body = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      configured: true,
      error: summarizeGoogleError(body),
      resultCount: Array.isArray(body.items) ? body.items.length : 0,
      results: (body.items || []).slice(0, 5).map((item) => ({
        title: item.title,
        domain: item.displayLink || toDomain(item.link),
        url: item.link,
        snippet: item.snippet,
      })),
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      configured: true,
      error: {
        status: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Google Custom Search request failed.',
      },
      resultCount: 0,
      results: [],
    };
  }
}

export async function checkSearchProviderConnection(query = 'hypertension screening adults guideline') {
  const [tavilyResult, openMedicalResult, googleResult] = await Promise.allSettled([
    searchTavilySources(query, 6),
    searchOpenMedicalSources(query, 6),
    checkGoogleSearchConnection(query),
  ]);
  const tavilySources = tavilyResult.status === 'fulfilled' ? tavilyResult.value : [];
  const openMedicalSources = openMedicalResult.status === 'fulfilled' ? openMedicalResult.value : [];
  const google = googleResult.status === 'fulfilled'
    ? googleResult.value
    : {
        ok: false,
        status: null,
        configured: Boolean(GOOGLE_API_KEY && GOOGLE_CX),
        error: {
          status: 'NETWORK_ERROR',
          message: googleResult.reason instanceof Error ? googleResult.reason.message : 'Google Custom Search request failed.',
        },
        resultCount: 0,
        results: [],
      };
  const curatedSources = getCuratedSources(query, 6);

  return {
    ok: tavilySources.length > 0 || openMedicalSources.length > 0 || google.ok || curatedSources.length > 0,
    status: google.ok || tavilySources.length > 0 || openMedicalSources.length > 0 ? 200 : 206,
    state: getSearchProviderState(),
    query,
    primaryMode: tavilySources.length > 0
      ? 'tavily'
      : openMedicalSources.length > 0
      ? 'open-medical'
      : google.ok
        ? 'google-cse'
        : 'curated-official-fallback',
    tavily: {
      ok: tavilySources.length > 0,
      configured: Boolean(TAVILY_API_KEY),
      resultCount: tavilySources.length,
      results: tavilySources.slice(0, 5).map((source) => ({
        title: source.title,
        domain: source.domain,
        url: source.url,
        snippet: source.snippet,
        sourceType: source.sourceType,
      })),
    },
    openMedical: {
      ok: openMedicalSources.length > 0,
      resultCount: openMedicalSources.length,
      results: openMedicalSources.slice(0, 5).map((source) => ({
        title: source.title,
        domain: source.domain,
        url: source.url,
        snippet: source.snippet,
        sourceType: source.sourceType,
      })),
    },
    google,
    curatedFallback: {
      ok: curatedSources.length > 0,
      resultCount: curatedSources.length,
      results: curatedSources.slice(0, 5).map((source) => ({
        title: source.title,
        domain: source.domain,
        url: source.url,
        snippet: source.snippet,
        sourceType: source.sourceType,
      })),
    },
  };
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function sourceMatchesQuery(source, query) {
  const lowerQuery = normalizeText(query);
  return source.topics.some((topic) => {
    if (topic === 'ed') return /\bed\b|erectile dysfunction|impotence/.test(lowerQuery);
    if (topic === 'general') return false;
    return lowerQuery.includes(topic);
  });
}

const MEDICAL_TOPIC_FILTERS = [
  /\b(hypertension|blood pressure|htn)\b/i,
  /\b(diabetes|prediabetes|blood glucose|insulin)\b/i,
  /\b(erectile dysfunction|\bed\b|impotence|sexual health)\b/i,
  /\b(hair loss|baldness|alopecia)\b/i,
  /\b(cancer|oncology|tumou?r|neoplasm)\b/i,
  /\b(cardiovascular|heart disease|stroke)\b/i,
];

function passesMedicalTopicFilter(source, query) {
  const queryFilters = MEDICAL_TOPIC_FILTERS.filter((pattern) => pattern.test(query));
  if (queryFilters.length === 0) return true;
  const sourceText = `${source.title || ''} ${source.snippet || ''} ${source.verbatimAnchor || ''}`;
  return queryFilters.some((pattern) => pattern.test(sourceText));
}

function scoreSource(source, query) {
  const lowerQuery = normalizeText(query);
  let score = 0;
  source.topics.forEach((topic) => {
    if (topic !== 'general' && lowerQuery.includes(topic)) score += 8;
  });
  if (source.domain === 'who.int' && /\bglobal|world|worldwide|public health\b/i.test(query)) score += 3;
  if (source.domain === 'cdc.gov' && /\bus|united states|american\b/i.test(query)) score += 3;
  if (source.suitability === 'P') score += 2;
  if (source.tier === 'Tier 1') score += 2;
  return score;
}

function normalizeCuratedSource(source, index) {
  return {
    title: source.title,
    domain: source.domain,
    url: source.url,
    snippet: source.snippet,
    type: 'web',
    publishedYear: source.publishedYear,
    tier: source.tier,
    sourceType: source.sourceType,
    suitability: source.suitability,
    recommendedRole: source.recommendedRole,
    sourceDocId: `SRC-${String(index + 1).padStart(3, '0')}`,
    verbatimAnchor: source.verbatimAnchor,
    viewerStatus: 'external',
    screeningSummary: `${source.tier} ${source.sourceType}; ${source.recommendedRole} source selected by Vera's curated official-source library.`,
  };
}

function getCuratedSources(query, limit) {
  const matched = TRUSTED_SOURCE_LIBRARY
    .filter((source) => sourceMatchesQuery(source, query))
    .map((source) => ({
      source,
      score: scoreSource(source, query),
    }))
    .sort((left, right) => right.score - left.score);

  const general = TRUSTED_SOURCE_LIBRARY
    .filter((source) => source.topics.includes('general'))
    .map((source) => ({ source, score: 0 }));
  const selected = matched.length > 0
    ? [...matched, ...general]
    : general;

  return selected
    .slice(0, Math.max(limit, 2))
    .map(({ source }, index) => normalizeCuratedSource(source, index));
}

function normalizeGoogleSource(item, index) {
  return {
    title: item.title,
    domain: toDomain(item.link),
    url: item.link,
    snippet: item.snippet,
    type: 'web',
    publishedYear: extractYear(`${item.title || ''} ${item.snippet || ''}`),
    tier: 'Tier 3',
    sourceType: 'Google Custom Search result',
    suitability: 'S',
    recommendedRole: 'supporting',
    sourceDocId: `WEB-${String(index + 1).padStart(3, '0')}`,
    verbatimAnchor: item.snippet || item.title,
    viewerStatus: 'external',
    screeningSummary: 'Screened web candidate captured by Google Custom Search; verify before final MLR use.',
  };
}

function normalizeEuropePmcSource(item, index) {
  const abstractText = limitText(item.abstractText || item.authorString || item.journalTitle || item.title);
  const source = item.source || 'MED';
  const id = item.id || item.pmid || item.pmcid || item.doi;
  const pubType = Array.isArray(item.pubTypeList?.pubType)
    ? item.pubTypeList.pubType.join(', ')
    : item.pubType || 'Life-sciences literature record';
  const publicationTypeText = `${pubType} ${item.title || ''}`.toLowerCase();
  const isHighEvidence = /systematic review|meta-analysis|randomized|randomised|clinical trial|guideline/.test(publicationTypeText);

  return {
    title: stripMarkup(item.title) || `Europe PMC result ${index + 1}`,
    domain: 'europepmc.org',
    url: id ? `https://europepmc.org/article/${source}/${id}` : 'https://europepmc.org/',
    snippet: abstractText,
    type: 'web',
    publishedYear: item.pubYear ? Number.parseInt(item.pubYear, 10) : extractYear(`${item.firstPublicationDate || ''} ${item.journalInfo?.printPublicationDate || ''}`),
    tier: isHighEvidence ? 'Tier 1' : 'Tier 2',
    sourceType: isHighEvidence ? 'Peer-reviewed evidence candidate' : 'Life-sciences literature index result',
    suitability: isHighEvidence ? 'P' : 'S',
    recommendedRole: isHighEvidence ? 'primary' : 'supporting',
    sourceDocId: `EPMC-${String(index + 1).padStart(3, '0')}`,
    verbatimAnchor: firstSentence(item.abstractText || item.title),
    viewerStatus: 'external',
    screeningSummary: `${isHighEvidence ? 'Tier 1' : 'Tier 2'} literature candidate captured from Europe PMC; verify abstract/full text before final MLR use.`,
  };
}

function normalizeClinicalTrialSource(study, index) {
  const protocol = study.protocolSection || {};
  const identification = protocol.identificationModule || {};
  const status = protocol.statusModule || {};
  const design = protocol.designModule || {};
  const conditions = protocol.conditionsModule?.conditions || [];
  const nctId = identification.nctId;
  const title = identification.briefTitle || identification.officialTitle || `ClinicalTrials.gov study ${index + 1}`;
  const phases = design.phases || [];
  const studyType = design.studyType || 'Clinical study';
  const startYear = extractYear(`${status.startDateStruct?.date || ''} ${status.studyFirstPostDateStruct?.date || ''}`);

  return {
    title: stripMarkup(title),
    domain: 'clinicaltrials.gov',
    url: nctId ? `https://clinicaltrials.gov/study/${nctId}` : 'https://clinicaltrials.gov/',
    snippet: limitText([
      nctId ? `Registry ID: ${nctId}.` : '',
      studyType,
      phases.length ? `Phase: ${phases.join(', ')}.` : '',
      conditions.length ? `Conditions: ${conditions.slice(0, 4).join(', ')}.` : '',
      status.overallStatus ? `Status: ${status.overallStatus}.` : '',
    ].filter(Boolean).join(' ')),
    type: 'web',
    publishedYear: startYear,
    tier: 'Tier 2',
    sourceType: 'ClinicalTrials.gov registry record',
    suitability: 'S',
    recommendedRole: 'supporting',
    sourceDocId: `CTG-${String(index + 1).padStart(3, '0')}`,
    verbatimAnchor: nctId ? `${nctId}: ${stripMarkup(title)}` : stripMarkup(title),
    viewerStatus: 'external',
    screeningSummary: 'Trial registry record captured from ClinicalTrials.gov; use for protocol/status context, not standalone efficacy claims.',
  };
}

function classifyWebSource(url) {
  const domain = toDomain(url);
  const evidenceDomain = `${domain} ${url}`.toLowerCase();
  if (/\b(who\.int|cdc\.gov|nih\.gov|ncbi\.nlm\.nih\.gov|niddk\.nih\.gov|cancer\.gov|medlineplus\.gov|ema\.europa\.eu|fda\.gov|nice\.org\.uk|gov\.uk)\b/.test(evidenceDomain)) {
    return {
      tier: 'Tier 1',
      suitability: 'P',
      recommendedRole: 'primary',
      sourceType: 'Authoritative health/government web source',
    };
  }
  if (/\b(pubmed|europepmc|clinicaltrials|cochrane|jamanetwork|nejm|thelancet|bmj|nature|science|ahajournals|acc\.org|heart\.org|diabetesjournals|ascopubs)\b/.test(evidenceDomain)) {
    return {
      tier: 'Tier 2',
      suitability: 'S',
      recommendedRole: 'supporting',
      sourceType: 'Medical literature/professional source',
    };
  }
  if (/\b\.edu\b|\.org\b/.test(evidenceDomain)) {
    return {
      tier: 'Tier 3',
      suitability: 'S',
      recommendedRole: 'supporting',
      sourceType: 'Screened web source',
    };
  }
  return {
    tier: 'Tier 4',
    suitability: 'C',
    recommendedRole: 'contextual',
    sourceType: 'Contextual web source',
  };
}

function normalizeTavilySource(item, index) {
  const url = item.url || '';
  const classification = classifyWebSource(url);
  return {
    title: stripMarkup(item.title) || `Tavily result ${index + 1}`,
    domain: toDomain(url),
    url,
    snippet: limitText(item.content || item.raw_content || item.title),
    type: 'web',
    publishedYear: extractYear(`${item.published_date || ''} ${item.title || ''} ${item.content || ''}`),
    tier: classification.tier,
    sourceType: classification.sourceType,
    suitability: classification.suitability,
    recommendedRole: classification.recommendedRole,
    sourceDocId: `WEB-${String(index + 1).padStart(3, '0')}`,
    verbatimAnchor: firstSentence(item.content || item.raw_content || item.title),
    viewerStatus: 'external',
    screeningSummary: `${classification.tier} ${classification.sourceType} captured by Tavily; verify original page before final MLR use.`,
  };
}

async function searchTavilySources(query, limit) {
  if (!TAVILY_API_KEY) return [];

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      topic: 'general',
      search_depth: ['basic', 'advanced', 'fast', 'ultra-fast'].includes(TAVILY_SEARCH_DEPTH)
        ? TAVILY_SEARCH_DEPTH
        : 'advanced',
      chunks_per_source: 3,
      max_results: Math.min(limit, 10),
      include_answer: false,
      include_raw_content: false,
      include_images: false,
      include_favicon: false,
    }),
  });

  if (!response.ok) return [];
  const data = await response.json().catch(() => ({}));
  return (data.results || []).map((item, index) => normalizeTavilySource(item, index));
}

async function searchEuropePmcSources(query, limit) {
  const url = new URL('https://www.ebi.ac.uk/europepmc/webservices/rest/search');
  url.searchParams.set('query', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('resultType', 'core');
  url.searchParams.set('pageSize', String(Math.min(limit, 10)));

  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json().catch(() => ({}));
  return (data.resultList?.result || []).map((item, index) => normalizeEuropePmcSource(item, index));
}

async function searchClinicalTrialsSources(query, limit) {
  const url = new URL('https://clinicaltrials.gov/api/v2/studies');
  url.searchParams.set('query.term', query);
  url.searchParams.set('pageSize', String(Math.min(limit, 10)));
  url.searchParams.set('format', 'json');

  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json().catch(() => ({}));
  return (data.studies || []).map((study, index) => normalizeClinicalTrialSource(study, index));
}

async function searchOpenMedicalSources(query, limit) {
  const [europePmcResult, clinicalTrialsResult] = await Promise.allSettled([
    searchEuropePmcSources(query, Math.max(3, Math.ceil(limit / 2))),
    searchClinicalTrialsSources(query, Math.max(2, Math.floor(limit / 2))),
  ]);
  const europePmc = europePmcResult.status === 'fulfilled' ? europePmcResult.value : [];
  const clinicalTrials = clinicalTrialsResult.status === 'fulfilled' ? clinicalTrialsResult.value : [];
  return [...europePmc, ...clinicalTrials].filter((source) => passesMedicalTopicFilter(source, query));
}

async function searchGoogleSources(query, limit) {
  if (!GOOGLE_API_KEY || !GOOGLE_CX) {
    return [];
  }

  try {
    const response = await fetch(buildGoogleSearchUrl(query, limit));
    if (!response.ok) return [];
    const data = await response.json().catch(() => ({}));
    return (data.items || []).map((item, index) => normalizeGoogleSource(item, index));
  } catch {
    return [];
  }
}

function dedupeSources(sources) {
  const seen = new Set();
  const unique = [];
  for (const source of sources) {
    const key = source.url || `${source.domain}:${source.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(source);
  }
  return unique.map((source, index) => ({
    ...source,
    sourceDocId: source.sourceDocId || `SRC-${String(index + 1).padStart(3, '0')}`,
  }));
}

export async function searchWebSources(query, limit = 6) {
  const curatedSources = getCuratedSources(query, limit);
  const [tavilyResult, openMedicalResult, googleResult] = await Promise.allSettled([
    searchTavilySources(query, limit),
    searchOpenMedicalSources(query, limit),
    searchGoogleSources(query, limit),
  ]);
  const tavilySources = tavilyResult.status === 'fulfilled' ? tavilyResult.value : [];
  const openMedicalSources = openMedicalResult.status === 'fulfilled' ? openMedicalResult.value : [];
  const googleSources = googleResult.status === 'fulfilled' ? googleResult.value : [];

  return dedupeSources([
    ...curatedSources.slice(0, Math.max(2, Math.ceil(limit / 3))),
    ...openMedicalSources,
    ...tavilySources,
    ...googleSources,
    ...curatedSources,
  ]).slice(0, limit);
}
