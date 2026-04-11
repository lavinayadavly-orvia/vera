import type {
  ApiNamespace,
  ContentType,
  ContentSource,
  Market,
  SourceAudienceSegment,
  SourceCommunicationIntent,
  SourceEvidenceUseCase,
  SourceGovernanceSummary,
  SourceScreeningCheck,
} from '@/types';

type SourceSuitability = 'P' | 'S' | 'C' | 'X';
type ScreeningStatus = SourceScreeningCheck['status'];

interface SearchCandidate {
  title: string;
  link: string;
  snippet?: string;
}

interface SourceRequestProfile {
  prompt: string;
  contentType: ContentType;
  targetAudience: string;
  market: Market;
  apiNamespace: ApiNamespace;
}

interface SourceCategoryRule {
  id: string;
  label: string;
  tier: ContentSource['tier'];
  ratings: Record<SourceEvidenceUseCase, SourceSuitability>;
  domainHints?: string[];
  urlHints?: string[];
  titleHints?: string[];
  snippetHints?: string[];
  peerReviewDefault?: ScreeningStatus;
  strengthDefault?: ScreeningStatus;
  replicationDefault?: ScreeningStatus;
  healthLiteracyDefault?: ScreeningStatus;
}

interface CommunicationProfile {
  id: string;
  label: string;
  intent: SourceCommunicationIntent;
  evidenceUseCase: SourceEvidenceUseCase;
  minimumSourceStandard: string;
  sourceSearchHints: string[];
  preferredCategoryIds?: string[];
  nonNegotiables: string[];
  regulatoryNotes: string[];
  commonFailures: string[];
}

interface FormatPolicy {
  label: string;
  formatRequirements: string[];
  sourceSearchHints: string[];
}

interface MarketPolicy {
  label: string;
  authority: string;
  controllingReferences: string[];
  regulatoryNotes: string[];
  sourceSearchHints: string[];
  preferredCategoryIds?: string[];
}

interface ResolvedSourcePolicy {
  audienceSegment: SourceAudienceSegment;
  audienceLabel: string;
  communicationIntent: SourceCommunicationIntent;
  communicationIntentLabel: string;
  profile: CommunicationProfile;
  formatPolicy: FormatPolicy;
  marketPolicy: MarketPolicy;
  namespaceLabel: string;
}

const USE_CASE_LABELS: Record<SourceEvidenceUseCase, string> = {
  'hcp-detail-aid': 'HCP Detail Aid',
  'hcp-awareness': 'HCP Awareness',
  'hcp-training-cme': 'HCP Training/CME',
  'patient-awareness': 'Patient Awareness',
  'patient-education': 'Patient Education',
  'patient-digital-social': 'Patient Digital/Social',
  'pr-media': 'PR & Media',
  'policy-hta-dossier': 'Policy/HTA Dossier'
};

const SUITABILITY_LABELS: Record<SourceSuitability, string> = {
  P: 'Primary',
  S: 'Supporting',
  C: 'Contextual',
  X: 'Excluded'
};

const AUDIENCE_LABELS: Record<SourceAudienceSegment, string> = {
  patient: 'Patient',
  hcp: 'HCP / clinician',
  kol: 'KOL / researcher',
  public: 'General public',
  payer: 'Payer / policy'
};

const COMMUNICATION_INTENT_LABELS: Record<SourceCommunicationIntent, string> = {
  awareness: 'Disease awareness',
  launch: 'Product launch',
  medical: 'Medical / scientific exchange',
  promotional: 'Promotional',
  cme: 'CME / education',
  policy: 'Policy / market access',
  education: 'Patient education'
};

const NAMESPACE_LABELS: Record<ApiNamespace, string> = {
  medical: 'Medical Affairs / scientific exchange',
  marketing: 'Commercial / promotional'
};

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'about', 'this', 'that', 'these', 'those', 'your', 'their',
  'over', 'under', 'among', 'using', 'used', 'than', 'then', 'also', 'have', 'has', 'had', 'been', 'being',
  'what', 'when', 'where', 'which', 'while', 'will', 'would', 'could', 'should', 'into', 'onto', 'across',
  'make', 'create', 'build', 'develop', 'design', 'generate', 'brief', 'summary', 'guide', 'format', 'content',
  'about', 'disease', 'patient', 'patients', 'clinical', 'medical'
]);

const U = {
  HD: 'hcp-detail-aid',
  HA: 'hcp-awareness',
  HT: 'hcp-training-cme',
  PA: 'patient-awareness',
  PE: 'patient-education',
  PS: 'patient-digital-social',
  PM: 'pr-media',
  PD: 'policy-hta-dossier'
} as const;

function ratings(
  hcpDetailAid: SourceSuitability,
  hcpAwareness: SourceSuitability,
  hcpTraining: SourceSuitability,
  patientAwareness: SourceSuitability,
  patientEducation: SourceSuitability,
  patientDigital: SourceSuitability,
  prMedia: SourceSuitability,
  policyHta: SourceSuitability,
): Record<SourceEvidenceUseCase, SourceSuitability> {
  return {
    [U.HD]: hcpDetailAid,
    [U.HA]: hcpAwareness,
    [U.HT]: hcpTraining,
    [U.PA]: patientAwareness,
    [U.PE]: patientEducation,
    [U.PS]: patientDigital,
    [U.PM]: prMedia,
    [U.PD]: policyHta
  };
}

const SOURCE_CATEGORY_RULES: SourceCategoryRule[] = [
  {
    id: 'peer-reviewed-rcts-phase-iii-trials',
    label: 'Peer-reviewed RCTs & Phase III trials',
    tier: 'Tier 1',
    ratings: ratings('P', 'P', 'P', 'C', 'C', 'C', 'S', 'P'),
    domainHints: ['nejm.org', 'thelancet.com', 'jamanetwork.com', 'diabetesjournals.org', 'bmj.com', 'pubmed.ncbi.nlm.nih.gov'],
    titleHints: ['randomized', 'randomised', 'phase 3', 'phase iii', 'trial', 'double-blind'],
    peerReviewDefault: 'pass',
    strengthDefault: 'pass',
    replicationDefault: 'caution'
  },
  {
    id: 'systematic-reviews-meta-analyses',
    label: 'Systematic reviews & meta-analyses',
    tier: 'Tier 1',
    ratings: ratings('P', 'P', 'P', 'C', 'C', 'C', 'S', 'P'),
    domainHints: ['cochranelibrary.com', 'pubmed.ncbi.nlm.nih.gov', 'annals.org'],
    titleHints: ['systematic review', 'meta-analysis', 'meta analysis', 'pooled analysis'],
    peerReviewDefault: 'pass',
    strengthDefault: 'pass',
    replicationDefault: 'pass'
  },
  {
    id: 'real-world-evidence-disease-registries',
    label: 'Real-world evidence & disease registries',
    tier: 'Tier 1',
    ratings: ratings('P', 'S', 'S', 'C', 'C', 'C', 'S', 'S'),
    titleHints: ['real-world', 'real world', 'registry', 'cohort', 'retrospective', 'seer', 'cprd', 'optum'],
    peerReviewDefault: 'pass',
    strengthDefault: 'caution',
    replicationDefault: 'caution'
  },
  {
    id: 'clinical-trial-registries-protocols',
    label: 'Clinical trial registries & protocols',
    tier: 'Tier 1',
    ratings: ratings('P', 'S', 'S', 'X', 'X', 'X', 'S', 'S'),
    domainHints: ['clinicaltrials.gov', 'who.int', 'clinicaltrialsregister.eu'],
    urlHints: ['/trial/', '/ct2/show/', '/ictrp'],
    titleHints: ['protocol', 'trial registry', 'clinical trial'],
    peerReviewDefault: 'caution',
    strengthDefault: 'caution',
    replicationDefault: 'unknown'
  },
  {
    id: 'clinical-practice-guidelines',
    label: 'Clinical practice guidelines',
    tier: 'Tier 2',
    ratings: ratings('P', 'P', 'P', 'S', 'S', 'S', 'P', 'P'),
    domainHints: ['nice.org.uk', 'escardio.org', 'easd.org', 'idf.org', 'endocrine.org', 'aafp.org', 'racgp.org.au', 'diabetesjournals.org'],
    titleHints: ['guideline', 'guidelines', 'standards of care', 'recommendation', 'clinical practice'],
    peerReviewDefault: 'pass',
    strengthDefault: 'pass',
    replicationDefault: 'pass'
  },
  {
    id: 'consensus-statements-position-papers',
    label: 'Consensus statements & position papers',
    tier: 'Tier 2',
    ratings: ratings('P', 'S', 'P', 'S', 'S', 'X', 'S', 'P'),
    titleHints: ['consensus statement', 'position statement', 'position paper', 'expert consensus'],
    peerReviewDefault: 'pass',
    strengthDefault: 'caution',
    replicationDefault: 'caution'
  },
  {
    id: 'regulatory-label-prescribing-information',
    label: 'Regulatory label / SmPC / prescribing information',
    tier: 'Tier 2',
    ratings: ratings('P', 'P', 'P', 'X', 'X', 'X', 'S', 'P'),
    domainHints: ['fda.gov', 'ema.europa.eu', 'accessdata.fda.gov', 'medicines.org.uk', 'tga.gov.au', 'cdsco.gov.in'],
    titleHints: ['prescribing information', 'label', 'summary of product characteristics', 'smpc', 'package insert'],
    peerReviewDefault: 'pass',
    strengthDefault: 'pass',
    replicationDefault: 'pass'
  },
  {
    id: 'regulatory-safety-communications',
    label: 'Regulatory safety communications',
    tier: 'Tier 2',
    ratings: ratings('P', 'P', 'S', 'C', 'C', 'X', 'P', 'P'),
    domainHints: ['fda.gov', 'ema.europa.eu', 'eudravigilance', 'tga.gov.au'],
    titleHints: ['drug safety communication', 'safety communication', 'warning', 'safety update', 'recall'],
    peerReviewDefault: 'pass',
    strengthDefault: 'pass',
    replicationDefault: 'pass'
  },
  {
    id: 'hta-body-assessments',
    label: 'HTA body assessments',
    tier: 'Tier 2',
    ratings: ratings('S', 'S', 'S', 'X', 'X', 'X', 'S', 'P'),
    domainHints: ['nice.org.uk', 'icer.org', 'g-ba.de', 'has-sante.fr', 'pbs.gov.au'],
    titleHints: ['technology appraisal', 'hta', 'evidence report', 'reimbursement', 'icer'],
    peerReviewDefault: 'pass',
    strengthDefault: 'pass',
    replicationDefault: 'caution'
  },
  {
    id: 'national-formularies-prescribing-references',
    label: 'National formularies & prescribing references',
    tier: 'Tier 2',
    ratings: ratings('P', 'S', 'P', 'X', 'X', 'X', 'X', 'S'),
    domainHints: ['bnf.nice.org.uk', 'mims.com', 'ahfsdruginformation.com'],
    titleHints: ['formulary', 'drug information', 'prescribing reference', 'bnf', 'ahfs'],
    peerReviewDefault: 'pass',
    strengthDefault: 'pass',
    replicationDefault: 'pass'
  },
  {
    id: 'government-health-agencies-hcp-facing',
    label: 'Government health agencies — HCP-facing',
    tier: 'Tier 3',
    ratings: ratings('S', 'S', 'S', 'P', 'P', 'P', 'P', 'P'),
    domainHints: ['cdc.gov', 'nih.gov', 'who.int', 'health.gov.au', 'canada.ca', 'gov.uk'],
    titleHints: ['clinical guidance', 'provider', 'for healthcare professionals', 'professional resource', 'practice advisory'],
    peerReviewDefault: 'pass',
    strengthDefault: 'caution',
    replicationDefault: 'caution',
    healthLiteracyDefault: 'pass'
  },
  {
    id: 'government-health-agencies-patient-facing',
    label: 'Government health agencies — patient-facing',
    tier: 'Tier 3',
    ratings: ratings('X', 'X', 'X', 'P', 'P', 'P', 'P', 'S'),
    domainHints: ['cdc.gov', 'nih.gov', 'medlineplus.gov', 'nhs.uk', 'who.int', 'healthdirect.gov.au', 'canada.ca'],
    titleHints: ['patient', 'self-care', 'prevention', 'symptoms', 'living with', 'medlineplus'],
    peerReviewDefault: 'pass',
    strengthDefault: 'caution',
    replicationDefault: 'caution',
    healthLiteracyDefault: 'pass'
  },
  {
    id: 'academic-medical-centre-public-content',
    label: 'Academic medical centre public content',
    tier: 'Tier 3',
    ratings: ratings('C', 'C', 'C', 'P', 'P', 'S', 'S', 'C'),
    domainHints: ['mayoclinic.org', 'clevelandclinic.org', 'hopkinsmedicine.org', 'massgeneral.org', 'mdanderson.org'],
    peerReviewDefault: 'caution',
    strengthDefault: 'caution',
    replicationDefault: 'caution',
    healthLiteracyDefault: 'pass'
  },
  {
    id: 'burden-of-disease-heor-epidemiology-studies',
    label: 'Burden of disease / HEOR & epidemiology studies',
    tier: 'Tier 3',
    ratings: ratings('S', 'S', 'S', 'S', 'S', 'X', 'S', 'P'),
    domainHints: ['ihme.org'],
    titleHints: ['cost-effectiveness', 'cost effectiveness', 'burden', 'epidemiology', 'prevalence', 'incidence', 'qaly', 'icer'],
    peerReviewDefault: 'pass',
    strengthDefault: 'caution',
    replicationDefault: 'caution'
  },
  {
    id: 'pharmacovigilance-databases',
    label: 'Pharmacovigilance databases',
    tier: 'Tier 3',
    ratings: ratings('P', 'S', 'S', 'X', 'X', 'X', 'C', 'S'),
    domainHints: ['fda.gov', 'ema.europa.eu', 'eudravigilance'],
    titleHints: ['faers', 'eudravigilance', 'adverse event', 'pharmacovigilance'],
    peerReviewDefault: 'caution',
    strengthDefault: 'caution',
    replicationDefault: 'caution'
  },
  {
    id: 'disease-nonprofits-hcp-facing',
    label: 'Disease nonprofits — HCP-facing',
    tier: 'Tier 4',
    ratings: ratings('S', 'S', 'S', 'X', 'X', 'X', 'C', 'S'),
    domainHints: ['diabetes.org', 'diabetes.org.uk', 'jdrf.org'],
    titleHints: ['professional', 'clinician', 'hcp', 'clinical update'],
    peerReviewDefault: 'caution',
    strengthDefault: 'caution',
    replicationDefault: 'caution'
  },
  {
    id: 'disease-nonprofits-patient-facing',
    label: 'Disease nonprofits — patient-facing',
    tier: 'Tier 4',
    ratings: ratings('X', 'X', 'X', 'P', 'P', 'P', 'S', 'P'),
    domainHints: ['diabetes.org', 'diabetes.org.uk', 'jdrf.org'],
    titleHints: ['patient', 'living with', 'support', 'education', 'prevention', 'self-management'],
    peerReviewDefault: 'caution',
    strengthDefault: 'caution',
    replicationDefault: 'caution',
    healthLiteracyDefault: 'pass'
  },
  {
    id: 'patient-advocacy-organisations',
    label: 'Patient advocacy organisations',
    tier: 'Tier 4',
    ratings: ratings('X', 'X', 'X', 'S', 'S', 'P', 'S', 'P'),
    titleHints: ['patient advocacy', 'patient voice', 'foundation', 'alliance'],
    peerReviewDefault: 'caution',
    strengthDefault: 'caution',
    replicationDefault: 'unknown',
    healthLiteracyDefault: 'pass'
  },
  {
    id: 'validated-patient-reported-outcome-instruments',
    label: 'Validated patient-reported outcome instruments',
    tier: 'Tier 4',
    ratings: ratings('S', 'S', 'S', 'S', 'P', 'S', 'X', 'S'),
    titleHints: ['sf-36', 'paid', 'eq-5d', 'dtsq', 'dasi', 'patient-reported outcome', 'quality of life instrument'],
    peerReviewDefault: 'pass',
    strengthDefault: 'caution',
    replicationDefault: 'pass',
    healthLiteracyDefault: 'pass'
  },
  {
    id: 'systematic-literature-reviews',
    label: 'Systematic literature reviews (SLR)',
    tier: 'Tier 5',
    ratings: ratings('P', 'S', 'S', 'X', 'X', 'X', 'C', 'S'),
    titleHints: ['systematic literature review', 'structured literature review', 'targeted literature review'],
    peerReviewDefault: 'caution',
    strengthDefault: 'caution',
    replicationDefault: 'caution'
  },
  {
    id: 'clinical-evidence-dossiers-ctd-submissions',
    label: 'Clinical evidence dossiers & CTD submissions',
    tier: 'Tier 5',
    ratings: ratings('P', 'S', 'X', 'X', 'X', 'X', 'X', 'P'),
    titleHints: ['clinical dossier', 'ctd', 'module 2.5', 'submission dossier'],
    peerReviewDefault: 'caution',
    strengthDefault: 'pass',
    replicationDefault: 'caution'
  },
  {
    id: 'medical-affairs-scientific-platform-documents',
    label: 'Medical affairs scientific platform documents',
    tier: 'Tier 5',
    ratings: ratings('P', 'P', 'P', 'X', 'X', 'X', 'X', 'X'),
    titleHints: ['scientific platform', 'evidence summary', 'msl brief', 'scientific narrative'],
    peerReviewDefault: 'caution',
    strengthDefault: 'caution',
    replicationDefault: 'unknown'
  },
  {
    id: 'kol-expert-opinion-editorials',
    label: 'KOL expert opinion & editorials',
    tier: 'Tier 6',
    ratings: ratings('C', 'C', 'S', 'X', 'X', 'X', 'C', 'C'),
    titleHints: ['editorial', 'commentary', 'perspective', 'opinion'],
    peerReviewDefault: 'caution',
    strengthDefault: 'caution',
    replicationDefault: 'fail'
  },
  {
    id: 'conference-abstracts-posters',
    label: 'Conference abstracts & posters',
    tier: 'Tier 6',
    ratings: ratings('C', 'S', 'S', 'X', 'X', 'X', 'C', 'X'),
    titleHints: ['abstract', 'poster', 'congress', 'scientific sessions', 'annual meeting', 'easd', 'ada 20', 'esc congress'],
    peerReviewDefault: 'caution',
    strengthDefault: 'caution',
    replicationDefault: 'fail'
  },
  {
    id: 'validated-health-literacy-frameworks',
    label: 'Validated health literacy frameworks',
    tier: 'Tier 6',
    ratings: ratings('X', 'X', 'X', 'S', 'P', 'P', 'X', 'X'),
    domainHints: ['cdc.gov', 'nih.gov'],
    titleHints: ['clear communication index', 'smog', 'flesch', 'plain language', 'health literacy'],
    peerReviewDefault: 'pass',
    strengthDefault: 'pass',
    replicationDefault: 'pass',
    healthLiteracyDefault: 'pass'
  },
  {
    id: 'reputable-health-journalism',
    label: 'Reputable health journalism',
    tier: 'Tier 6',
    ratings: ratings('X', 'X', 'X', 'C', 'C', 'C', 'P', 'C'),
    domainHints: ['reuters.com', 'bbc.com', 'statnews.com'],
    titleHints: ['news', 'analysis', 'reported'],
    peerReviewDefault: 'fail',
    strengthDefault: 'caution',
    replicationDefault: 'unknown'
  },
  {
    id: 'preprints-not-peer-reviewed',
    label: 'Preprints — not yet peer-reviewed',
    tier: 'Tier 6',
    ratings: ratings('X', 'X', 'X', 'X', 'X', 'X', 'C', 'X'),
    domainHints: ['medrxiv.org', 'biorxiv.org', 'researchsquare.com'],
    titleHints: ['preprint'],
    peerReviewDefault: 'fail',
    strengthDefault: 'fail',
    replicationDefault: 'fail'
  },
  {
    id: 'industry-sponsored-editorially-independent',
    label: 'Industry-sponsored content (editorial independence declared)',
    tier: 'Tier 6',
    ratings: ratings('C', 'C', 'S', 'C', 'C', 'C', 'X', 'X'),
    domainHints: ['novonordisk.com', 'lilly.com', 'sanofi.com', 'pfizer.com', 'novartis.com', 'merck.com'],
    titleHints: ['sponsored', 'unrestricted grant', 'editorial independence'],
    peerReviewDefault: 'caution',
    strengthDefault: 'caution',
    replicationDefault: 'unknown'
  },
  {
    id: 'unclassified-web-source',
    label: 'Unclassified web source',
    tier: 'Tier 6',
    ratings: ratings('X', 'C', 'C', 'C', 'C', 'C', 'C', 'C'),
    peerReviewDefault: 'unknown',
    strengthDefault: 'unknown',
    replicationDefault: 'unknown',
    healthLiteracyDefault: 'unknown'
  }
];

const FORMAT_POLICIES: Record<ContentType, FormatPolicy> = {
  'white-paper': {
    label: 'White paper',
    formatRequirements: [
      'Full methodology, limitations, and reference structure are expected.',
      'Executive summary and sectioned argument flow should be source-backed.',
      'Use dense evidence packaging, not isolated promotional claims.'
    ],
    sourceSearchHints: ['systematic review', 'guideline', 'methodology', 'primary publication']
  },
  infographic: {
    label: 'Infographic',
    formatRequirements: [
      'Limit to a few traceable statistics and short evidence-backed statements.',
      'Every visible data point should map to a footnote-grade source.',
      'Avoid paragraph-level copy; source quality matters more than source count.'
    ],
    sourceSearchHints: ['guideline summary', 'key statistics', 'public health facts']
  },
  video: {
    label: 'Video / animation',
    formatRequirements: [
      'Narration-safe facts only; do not use evidence that needs heavy caveating to make sense.',
      'One concept per scene with clean sourceable proof points.',
      'Storyboard, on-screen text, and voiceover should all map to the same evidence frame.'
    ],
    sourceSearchHints: ['plain language', 'sourceable facts', 'brief']
  },
  presentation: {
    label: 'Presentation / slides',
    formatRequirements: [
      'Slide-level evidence should be modular and reusable.',
      'Each slide should have one evidentiary purpose and one source cluster.',
      'Tables, study summaries, and guideline positions should remain distinguishable.'
    ],
    sourceSearchHints: ['slide-ready evidence', 'guideline', 'study summary']
  },
  'social-post': {
    label: 'Social post',
    formatRequirements: [
      'Use one idea, one proof point, and one sourceable stat at most.',
      'Patient/public social should prefer public-health or patient-safe sources.',
      'Do not compress complex efficacy framing into social copy.'
    ],
    sourceSearchHints: ['single statistic', 'public health source', 'social-safe fact']
  },
  document: {
    label: 'Document',
    formatRequirements: [
      'Sectioned copy should be sourced block by block.',
      'Use guideline and review support for narrative sections, not isolated snippets.',
      'Where evidence is thin, show structured placeholders instead of invented detail.'
    ],
    sourceSearchHints: ['guideline', 'review article', 'source-backed summary']
  },
  report: {
    label: 'Report',
    formatRequirements: [
      'Comparative, epidemiology, HEOR, and policy inputs should stay separated.',
      'Report conclusions should be anchored to current evidence, not journalism.',
      'Local burden and market-fit sources should be visible when claims are market-specific.'
    ],
    sourceSearchHints: ['hta', 'heor', 'real-world evidence', 'epidemiology']
  },
  podcast: {
    label: 'Podcast script',
    formatRequirements: [
      'Use explainable evidence that can survive spoken delivery without tables.',
      'Avoid uncaveated numerical overload in audio-only formats.',
      'Narrative flow should still preserve exact evidence boundaries.'
    ],
    sourceSearchHints: ['plain-language summary', 'expert guidance', 'narrative-safe evidence']
  }
};

const MARKET_POLICIES: Record<Market, MarketPolicy> = {
  global: {
    label: 'Global / multi-market',
    authority: 'Most restrictive label and review standard across the intended distribution set.',
    controllingReferences: ['Claims grid across target labels / SmPCs', 'WHO or multinational guidance', 'Global burden sources'],
    regulatoryNotes: [
      'Design reusable claims to the most conservative market ceiling.',
      'Global content should stay explicit about where local adaptation is required.'
    ],
    sourceSearchHints: ['global guideline', 'world health organization', 'multinational study', 'claims grid'],
    preferredCategoryIds: ['clinical-practice-guidelines', 'systematic-reviews-meta-analyses', 'government-health-agencies-hcp-facing']
  },
  india: {
    label: 'India',
    authority: 'CDSCO-approved label plus India-specific epidemiology and society guidance.',
    controllingReferences: ['CDSCO / approved prescribing information', 'ICMR / Indian epidemiology', 'Indian or adapted society guidelines'],
    regulatoryNotes: [
      'Prefer Indian prevalence, practice, or bridging data when the content makes India-specific claims.',
      'Patient/public content should stay disease-awareness-safe unless the workflow explicitly supports branded local compliance.'
    ],
    sourceSearchHints: ['india guideline', 'cdsco label', 'icmr epidemiology', 'india trial'],
    preferredCategoryIds: ['regulatory-label-prescribing-information', 'clinical-practice-guidelines', 'government-health-agencies-hcp-facing', 'burden-of-disease-heor-epidemiology-studies']
  },
  singapore: {
    label: 'Singapore',
    authority: 'HSA-governed local label and Singapore evidence re-validation practice.',
    controllingReferences: ['HSA-approved information', 'Singapore clinical guidance', 'Local or regional epidemiology'],
    regulatoryNotes: [
      'References older than five years should be treated as re-validation candidates.',
      'Where local data is unavailable, clearly signal imported evidence and why it is still relevant.'
    ],
    sourceSearchHints: ['singapore guideline', 'hsa label', 'singapore epidemiology'],
    preferredCategoryIds: ['regulatory-label-prescribing-information', 'clinical-practice-guidelines', 'government-health-agencies-hcp-facing']
  },
  dubai: {
    label: 'Dubai / UAE',
    authority: 'Local label / health authority guidance with explicit localization and Arabic terminology review.',
    controllingReferences: ['Local approved label or prescribing information', 'UAE / GCC guidance where available', 'Localization-reviewed patient-safe sources'],
    regulatoryNotes: [
      'Patient-facing content should preserve clinically correct terminology for localization review.',
      'Prefer public-health and government-style sources when building public-facing content.'
    ],
    sourceSearchHints: ['uae guideline', 'dubai health authority', 'mohap', 'gcc healthcare'],
    preferredCategoryIds: ['regulatory-label-prescribing-information', 'government-health-agencies-patient-facing', 'clinical-practice-guidelines']
  },
  germany: {
    label: 'Germany',
    authority: 'German / EU SmPC position plus G-BA or IQWiG access and value framing where relevant.',
    controllingReferences: ['German or EU SmPC', 'G-BA / IQWiG / HTA materials', 'German society guidance'],
    regulatoryNotes: [
      'Comparative and value-oriented claims should lean on HTA-compatible evidence sets.',
      'Do not treat FDA label language as the controlling authority for Germany.'
    ],
    sourceSearchHints: ['germany smpc', 'g-ba', 'iqwig', 'german guideline'],
    preferredCategoryIds: ['regulatory-label-prescribing-information', 'hta-body-assessments', 'clinical-practice-guidelines']
  },
  us: {
    label: 'United States',
    authority: 'FDA-approved prescribing information plus US guidance and public-health authorities.',
    controllingReferences: ['FDA prescribing information', 'US professional society guidelines', 'CDC / NIH / SEER / NHANES where relevant'],
    regulatoryNotes: [
      'US promotional framing should always resolve back to FDA-approved labeling.',
      'Fair-balance-sensitive outputs should avoid unsupported shorthand claims.'
    ],
    sourceSearchHints: ['fda prescribing information', 'us guideline', 'cdc clinical guidance', 'nih evidence'],
    preferredCategoryIds: ['regulatory-label-prescribing-information', 'clinical-practice-guidelines', 'government-health-agencies-hcp-facing']
  },
  uk: {
    label: 'United Kingdom',
    authority: 'UK SmPC plus NICE, NHS, and UK-coded promotional review expectations.',
    controllingReferences: ['UK SmPC', 'NICE guidance / HTA', 'NHS or ONS epidemiology where relevant'],
    regulatoryNotes: [
      'Use UK-specific reimbursement and practice references where NHS positioning is implied.',
      'Do not assume EMA wording and UK wording are identical.'
    ],
    sourceSearchHints: ['uk smpc', 'nice guideline', 'nhs evidence', 'uk epidemiology'],
    preferredCategoryIds: ['regulatory-label-prescribing-information', 'clinical-practice-guidelines', 'hta-body-assessments', 'government-health-agencies-patient-facing']
  }
};

const COMMUNICATION_PROFILES: CommunicationProfile[] = [
  {
    id: 'promotional-detail-aid',
    label: 'Promotional detail aid',
    intent: 'promotional',
    evidenceUseCase: 'hcp-detail-aid',
    minimumSourceStandard: 'Tier 1 for efficacy and safety claims, plus Tier 2 label/guideline support for indication and dosing.',
    sourceSearchHints: ['prescribing information', 'phase 3 trial', 'systematic review', 'guideline'],
    preferredCategoryIds: ['regulatory-label-prescribing-information', 'peer-reviewed-rcts-phase-iii-trials', 'systematic-reviews-meta-analyses', 'clinical-practice-guidelines'],
    nonNegotiables: [
      'Current approved label only for indication, dosing, and safety framing.',
      'Primary claims must map to RCT or meta-analysis evidence.',
      'ARR/NNT must accompany relative measures when claims are promotional.'
    ],
    regulatoryNotes: [
      'Full MLR/PRC review is mandatory.',
      'No off-label implication is permissible.',
      'Fair balance and country code compliance are required.'
    ],
    commonFailures: [
      'Reference does not directly support the claim.',
      'Relative risk is used without absolute measures.',
      'Outdated or superseded label language is carried forward.'
    ]
  },
  {
    id: 'congress-conference-materials',
    label: 'Congress & conference materials',
    intent: 'medical',
    evidenceUseCase: 'hcp-awareness',
    minimumSourceStandard: 'Tier 1 for presented data, Tier 2 for clinical context, abstracts contextual only unless full paper is unavailable.',
    sourceSearchHints: ['congress abstract', 'peer-reviewed publication', 'clinical context', 'data cut-off'],
    preferredCategoryIds: ['peer-reviewed-rcts-phase-iii-trials', 'systematic-reviews-meta-analyses', 'clinical-practice-guidelines', 'conference-abstracts-posters'],
    nonNegotiables: [
      'Data cut-off must be clear.',
      'Post-hoc analyses must stay labelled as exploratory.',
      'Sponsor acknowledgement must be visible.'
    ],
    regulatoryNotes: [
      'Scientific exchange versus promotion must be clearly separated.',
      'Data-on-file references must be retrievable.',
      'Medical affairs ownership rules apply.'
    ],
    commonFailures: [
      'Abstract is treated as equivalent to a peer-reviewed publication.',
      'Data cut-off is omitted.',
      'Post-hoc findings are presented like primary endpoints.'
    ]
  },
  {
    id: 'cme-cpd',
    label: 'CME / CPD',
    intent: 'cme',
    evidenceUseCase: 'hcp-training-cme',
    minimumSourceStandard: 'Tier 1 for all clinical teaching, Tier 2 for guideline alignment.',
    sourceSearchHints: ['guideline update', 'systematic review', 'evidence grading', 'teaching'],
    preferredCategoryIds: ['systematic-reviews-meta-analyses', 'peer-reviewed-rcts-phase-iii-trials', 'clinical-practice-guidelines'],
    nonNegotiables: [
      'Evidence grading must be transparent.',
      'Learning objectives and evidence currency must align.',
      'Balanced coverage is required; not brand-only.'
    ],
    regulatoryNotes: [
      'Accreditation body rules govern content and faculty independence.',
      'Commercial supporters cannot control content, objectives, or faculty selection.',
      'Faculty conflicts must be disclosed and mitigated before the activity.'
    ],
    commonFailures: [
      'Commercial influence shapes speaker or content selection.',
      'One treatment option dominates without balance.',
      'Faculty COI is not visible to learners.'
    ]
  },
  {
    id: 'medical-affairs-scientific-exchange',
    label: 'Medical Affairs / MSL scientific exchange',
    intent: 'medical',
    evidenceUseCase: 'hcp-awareness',
    minimumSourceStandard: 'Tier 1 primary evidence preferred; lower levels allowed only when clearly graded and context-labelled.',
    sourceSearchHints: ['primary evidence', 'clinical trial protocol', 'safety update', 'scientific exchange'],
    preferredCategoryIds: ['peer-reviewed-rcts-phase-iii-trials', 'systematic-reviews-meta-analyses', 'real-world-evidence-disease-registries', 'clinical-trial-registries-protocols'],
    nonNegotiables: [
      'On-label and off-label evidence must be clearly separated.',
      'Negative and safety findings cannot be omitted.',
      'All sponsor roles and data limitations must remain visible.'
    ],
    regulatoryNotes: [
      'Reactive versus proactive scientific exchange rules apply by market.',
      'Unsolicited request documentation is required for most off-label exchange.',
      'Adverse event reporting obligations remain active.'
    ],
    commonFailures: [
      'Off-label data is shared proactively.',
      'Negative findings are dropped.',
      'On-label and off-label material are blended together.'
    ]
  },
  {
    id: 'journal-advertising-sponsored-supplements',
    label: 'Journal advertising & sponsored supplements',
    intent: 'promotional',
    evidenceUseCase: 'hcp-awareness',
    minimumSourceStandard: 'Tier 1 for clinical claims, with editorial independence clearly declared.',
    sourceSearchHints: ['clinical publication', 'head-to-head evidence', 'editorial independence', 'journal supplement'],
    preferredCategoryIds: ['peer-reviewed-rcts-phase-iii-trials', 'systematic-reviews-meta-analyses', 'clinical-practice-guidelines'],
    nonNegotiables: [
      'Named authors and COI declarations must be present.',
      'Supplement review process must be explicit.',
      'Head-to-head evidence is preferred over placebo-only comparisons.'
    ],
    regulatoryNotes: [
      'Sponsored supplements must be clearly labelled.',
      'Editorial independence must be preserved.',
      'Country advertising code compliance applies.'
    ],
    commonFailures: [
      'Sponsor involvement is hidden.',
      'ICMJE authorship standards are not met.',
      'Supplement content is indistinguishable from editorial content.'
    ]
  },
  {
    id: 'disease-awareness-campaign',
    label: 'Disease awareness campaign',
    intent: 'awareness',
    evidenceUseCase: 'patient-awareness',
    minimumSourceStandard: 'Tier 3 minimum for factual disease awareness, with Tier 2 only for prevalence or burden claims.',
    sourceSearchHints: ['who facts', 'government patient information', 'disease burden statistics', 'prevention guidance'],
    preferredCategoryIds: ['government-health-agencies-patient-facing', 'government-health-agencies-hcp-facing', 'disease-nonprofits-patient-facing', 'burden-of-disease-heor-epidemiology-studies'],
    nonNegotiables: [
      'Epidemiology should be within 3 years.',
      'Disease framing must stay unbranded.',
      'Readability should land around grade 6-8 for public-facing use.'
    ],
    regulatoryNotes: [
      'Non-promotional disease awareness rules apply.',
      'Accessibility standards are required for digital execution.',
      'MLR review is still required even when the campaign is unbranded.'
    ],
    commonFailures: [
      'Old epidemiology data is reused.',
      'The brand is implied inside an unbranded campaign.',
      'Community review is missing.'
    ]
  },
  {
    id: 'patient-education-leaflet',
    label: 'Patient education leaflet / booklet / brochure',
    intent: 'education',
    evidenceUseCase: 'patient-education',
    minimumSourceStandard: 'Tier 3 for disease and lifestyle information, Tier 2 for treatment context, Tier 4 accepted for validated self-management support.',
    sourceSearchHints: ['patient guide', 'plain language', 'self-management', 'treatment guide'],
    preferredCategoryIds: ['government-health-agencies-patient-facing', 'academic-medical-centre-public-content', 'disease-nonprofits-patient-facing', 'validated-health-literacy-frameworks'],
    nonNegotiables: [
      'Plain-language validation is required.',
      'Translations need back-translation validation.',
      'Validated PRO tools only when patient instruments are referenced.'
    ],
    regulatoryNotes: [
      'Patient advisory review is strongly recommended.',
      'Accessible formats should be planned for vulnerable groups.',
      'Content should be refreshed after guideline changes.'
    ],
    commonFailures: [
      'Medical jargon is not explained.',
      'Community review is skipped.',
      'Translated content is deployed without validation.'
    ]
  },
  {
    id: 'patient-app-digital-health-tool',
    label: 'Patient app / digital health tool',
    intent: 'education',
    evidenceUseCase: 'patient-education',
    minimumSourceStandard: 'Tier 3 minimum for static content; algorithmic recommendations require Tier 1 or Tier 2 support plus disclosed logic.',
    sourceSearchHints: ['patient digital tool', 'self-management', 'algorithm basis', 'plain language'],
    preferredCategoryIds: ['government-health-agencies-patient-facing', 'validated-health-literacy-frameworks', 'validated-patient-reported-outcome-instruments', 'disease-nonprofits-patient-facing'],
    nonNegotiables: [
      'Version control and review cadence must exist.',
      'Actual patient UX testing is required.',
      'Any algorithmic recommendation must disclose its evidence basis.'
    ],
    regulatoryNotes: [
      'Medical device and app-store rules may apply.',
      'GDPR/HIPAA and local privacy rules govern any patient data collection.',
      'Informed consent and content review cycles must be documented.'
    ],
    commonFailures: [
      'Algorithm basis is hidden.',
      'Patient testing is replaced with internal review only.',
      'Data is collected without explicit consent language.'
    ]
  },
  {
    id: 'social-media-content',
    label: 'Social media content',
    intent: 'awareness',
    evidenceUseCase: 'patient-digital-social',
    minimumSourceStandard: 'Tier 3 minimum for factual public claims; disease statistics should come from Tier 2 government or WHO sources.',
    sourceSearchHints: ['public health statistic', 'social-safe fact', 'who fact sheet', 'government awareness'],
    preferredCategoryIds: ['government-health-agencies-patient-facing', 'disease-nonprofits-patient-facing', 'validated-health-literacy-frameworks'],
    nonNegotiables: [
      'No patient-facing clinical efficacy claims.',
      'Public statistics should be less than 2 years old where possible.',
      'Paid sponsorship must be obvious.'
    ],
    regulatoryNotes: [
      'Platform ad policies apply.',
      'AE monitoring and reporting pathways must exist before launch.',
      'No symptom-checker or diagnostic claim drift is allowed.'
    ],
    commonFailures: [
      'Clinical efficacy claims appear in patient social posts.',
      'Old statistics are reused.',
      'Sponsored content is not disclosed.'
    ]
  },
  {
    id: 'patient-support-programme',
    label: 'Patient support programme materials',
    intent: 'education',
    evidenceUseCase: 'patient-education',
    minimumSourceStandard: 'Tier 2 label for dosing and administration, Tier 3 for disease education, Tier 4 for peer support or lifestyle content.',
    sourceSearchHints: ['prescribing information', 'patient support programme', 'administration guide', 'self-management'],
    preferredCategoryIds: ['regulatory-label-prescribing-information', 'government-health-agencies-patient-facing', 'disease-nonprofits-patient-facing'],
    nonNegotiables: [
      'Product-specific content must match the current approved label.',
      'Clinical modules should be authored or reviewed by qualified HCPs.',
      'Localisation and privacy controls are mandatory.'
    ],
    regulatoryNotes: [
      'HCP initiation rules apply in many markets.',
      'PSP content must remain non-promotional.',
      'Pharmacovigilance obligations remain active throughout the programme.'
    ],
    commonFailures: [
      'Programme launches without HCP initiation where required.',
      'Dosing copy is not label-current.',
      'Patient data governance is under-specified.'
    ]
  },
  {
    id: 'press-release-media-statement',
    label: 'Press release / media statement',
    intent: 'launch',
    evidenceUseCase: 'pr-media',
    minimumSourceStandard: 'Tier 1 for trial data and Tier 3 for burden framing; expert opinion only as attributed commentary.',
    sourceSearchHints: ['trial results', 'public health statistics', 'media statement', 'investigator quote'],
    preferredCategoryIds: ['peer-reviewed-rcts-phase-iii-trials', 'regulatory-safety-communications', 'government-health-agencies-hcp-facing', 'reputable-health-journalism'],
    nonNegotiables: [
      'Headline claims must match study findings.',
      'Absolute numbers should accompany relative measures.',
      'Sponsor role must be visible.'
    ],
    regulatoryNotes: [
      'Embargo, fair balance, and financial disclosure rules may apply.',
      'Misleading impressions are prohibited.',
      'Named spokespeople and investigators should be attributable.'
    ],
    commonFailures: [
      'Headline overstates the data.',
      'Relative risk appears without absolute context.',
      'Expert quote is used as if it were primary evidence.'
    ]
  },
  {
    id: 'policy-submission-hta-evidence-dossier',
    label: 'Policy submission / HTA evidence dossier',
    intent: 'policy',
    evidenceUseCase: 'policy-hta-dossier',
    minimumSourceStandard: 'Tier 1 for clinical evidence, Tier 2 for guideline alignment, Tier 3 for epidemiology and burden, plus explicit RWE limitations.',
    sourceSearchHints: ['hta assessment', 'cost effectiveness', 'budget impact', 'real-world evidence'],
    preferredCategoryIds: ['hta-body-assessments', 'burden-of-disease-heor-epidemiology-studies', 'systematic-reviews-meta-analyses', 'real-world-evidence-disease-registries'],
    nonNegotiables: [
      'Selective evidence presentation is unacceptable.',
      'GRADE-equivalent evidence grading must be visible.',
      'ARR, NNT, QALY, and ICER should be reported when relevant.'
    ],
    regulatoryNotes: [
      'Body-specific HTA structure rules govern the dossier.',
      'All referenced data must be requestable on demand.',
      'Independent validation of economic models is strongly recommended.'
    ],
    commonFailures: [
      'Only positive studies are presented.',
      'Economic assumptions are opaque.',
      'Local relevance is not demonstrated from international data.'
    ]
  }
];

const PROFILE_KEYWORDS: Array<{ profileId: string; patterns: RegExp[] }> = [
  { profileId: 'press-release-media-statement', patterns: [/\bpress release\b/i, /\bmedia statement\b/i, /\bnews release\b/i, /\bjournalist\b/i, /\bmedia\b/i] },
  { profileId: 'policy-submission-hta-evidence-dossier', patterns: [/\bhta\b/i, /\bdossier\b/i, /\breimbursement\b/i, /\bpayer\b/i, /\bpolicy\b/i, /\bicer\b/i, /\bqaly\b/i, /\bg-?ba\b/i] },
  { profileId: 'promotional-detail-aid', patterns: [/\bdetail aid\b/i, /\be-detail\b/i, /\brep-delivered\b/i, /\bsales aid\b/i] },
  { profileId: 'congress-conference-materials', patterns: [/\bconference\b/i, /\bcongress\b/i, /\bposter\b/i, /\bsymposi(a|um)\b/i] },
  { profileId: 'cme-cpd', patterns: [/\bcme\b/i, /\bcpd\b/i, /\btraining\b/i, /\be-learning\b/i, /\blearning module\b/i] },
  { profileId: 'medical-affairs-scientific-exchange', patterns: [/\bmsl\b/i, /\bscientific exchange\b/i, /\bunsolicited request\b/i, /\boff-label\b/i] },
  { profileId: 'journal-advertising-sponsored-supplements', patterns: [/\bsponsored supplement\b/i, /\bjournal advertising\b/i, /\badvertorial\b/i] },
  { profileId: 'patient-support-programme', patterns: [/\bpsp\b/i, /\bpatient support program(me)?\b/i] },
  { profileId: 'patient-app-digital-health-tool', patterns: [/\bapp\b/i, /\bdigital health tool\b/i, /\bself-management tool\b/i] },
  { profileId: 'patient-education-leaflet', patterns: [/\bleaflet\b/i, /\bbooklet\b/i, /\bbrochure\b/i, /\bself-management guide\b/i] },
  { profileId: 'social-media-content', patterns: [/\bsocial\b/i, /\blinkedin\b/i, /\binstagram\b/i, /\btiktok\b/i, /\bx\.com\b/i, /\btwitter\b/i, /\bcarousel\b/i] },
  { profileId: 'disease-awareness-campaign', patterns: [/\bawareness campaign\b/i, /\bdisease awareness\b/i, /\bunbranded campaign\b/i] }
];

function normaliseText(value: string): string {
  return value.toLowerCase();
}

function containsAny(text: string, patterns: string[] = []): boolean {
  return patterns.some((pattern) => text.includes(pattern.toLowerCase()));
}

function extractMeaningfulTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length > 3 && !STOP_WORDS.has(token));
}

function extractYear(text: string): number | null {
  const years = text.match(/\b(19|20)\d{2}\b/g) || [];
  if (years.length === 0) return null;
  return Math.max(...years.map((year) => Number(year)));
}

function findCommunicationProfile(profileId: string): CommunicationProfile {
  return COMMUNICATION_PROFILES.find((profile) => profile.id === profileId)!
    || COMMUNICATION_PROFILES[0];
}

function findExplicitProfile(request: SourceRequestProfile): CommunicationProfile | null {
  const combined = `${request.prompt} ${request.targetAudience}`.toLowerCase();

  for (const entry of PROFILE_KEYWORDS) {
    if (entry.patterns.some((pattern) => pattern.test(combined))) {
      return findCommunicationProfile(entry.profileId);
    }
  }

  return null;
}

function inferAudienceSegment(request: SourceRequestProfile): SourceAudienceSegment {
  const combined = `${request.targetAudience} ${request.prompt}`.toLowerCase();

  if (/\bpayer\b|\bpolicy\b|\bhta\b|\breimbursement\b|\bformulary\b|\bmarket access\b/.test(combined)) return 'payer';
  if (/\bkol\b|\bresearcher\b|\bacademic\b|\binvestigator\b|\bkey opinion\b|\bscientist\b/.test(combined)) return 'kol';
  if (/\bpatient\b|\bcaregiver\b|\bdiagnosed\b|\bself-management\b|\bself management\b/.test(combined)) return 'patient';
  if (/\bgeneral public\b|\bpublic\b|\bconsumer\b|\bcommunity\b/.test(combined)) return 'public';
  if (/\bhcp\b|\bhealthcare professional\b|\bclinician\b|\bphysician\b|\bprescriber\b|\bmsl\b|\bspecialist\b|\bmedical affairs\b/.test(combined)) return 'hcp';

  if (request.apiNamespace === 'medical') return 'hcp';
  if (request.contentType === 'social-post' || request.contentType === 'video') return 'public';
  return 'patient';
}

function inferCommunicationIntent(
  request: SourceRequestProfile,
  audienceSegment: SourceAudienceSegment,
): SourceCommunicationIntent {
  const combined = `${request.prompt} ${request.targetAudience}`.toLowerCase();

  if (/\bhta\b|\bdossier\b|\breimbursement\b|\bpayer\b|\bpolicy\b|\bmarket access\b|\bicer\b|\bqaly\b|\bbudget impact\b/.test(combined)) {
    return 'policy';
  }
  if (/\bcme\b|\bcpd\b|\btraining\b|\be-learning\b|\blearning module\b|\baccredited\b/.test(combined)) {
    return 'cme';
  }
  if (/\bpsp\b|\bpatient support program(me)?\b|\bbooklet\b|\bleaflet\b|\bbrochure\b|\bself-management\b|\bdigital health tool\b|\bpatient app\b/.test(combined)) {
    return 'education';
  }
  if (/\blaunch\b|\bapproval\b|\bapproved\b|\bnew indication\b|\brollout\b|\bdebut\b/.test(combined)) {
    return 'launch';
  }
  if (/\bdetail aid\b|\be-detail\b|\bsales aid\b|\bpromotional\b|\bcommercial\b|\badvert\b|\bcampaign\b/.test(combined)) {
    return 'promotional';
  }
  if (/\bmedical affairs\b|\bmsl\b|\bscientific exchange\b|\bconference\b|\bcongress\b|\bsymposi(a|um)\b|\boff-label\b|\bfield medical\b/.test(combined)) {
    return 'medical';
  }
  if (/\bawareness\b|\bunbranded\b|\bprevention\b|\bscreening\b|\bsymptoms\b|\bburden\b|\bpublic health\b/.test(combined)) {
    return 'awareness';
  }

  if (audienceSegment === 'payer') return 'policy';

  if (request.apiNamespace === 'marketing') {
    if (
      request.contentType === 'social-post'
      || request.contentType === 'infographic'
      || /\bbrand\b|\bcampaign\b|\bdetail aid\b|\be-detail\b|\bsales aid\b|\bpromotional\b|\bcommercial\b|\badvert\b/.test(combined)
    ) {
      return audienceSegment === 'hcp' || audienceSegment === 'kol' ? 'promotional' : 'awareness';
    }

    return audienceSegment === 'hcp' || audienceSegment === 'kol' ? 'medical' : 'awareness';
  }

  if (audienceSegment === 'patient' || audienceSegment === 'public') return 'education';
  return request.contentType === 'presentation' ? 'cme' : 'medical';
}

function selectCommunicationProfile(
  request: SourceRequestProfile,
  audienceSegment: SourceAudienceSegment,
  communicationIntent: SourceCommunicationIntent,
): CommunicationProfile {
  if (communicationIntent === 'policy' || audienceSegment === 'payer') {
    return findCommunicationProfile('policy-submission-hta-evidence-dossier');
  }

  if (communicationIntent === 'cme') {
    return findCommunicationProfile('cme-cpd');
  }

  if (communicationIntent === 'launch') {
    if (audienceSegment === 'patient' || audienceSegment === 'public') {
      return findCommunicationProfile('press-release-media-statement');
    }
    return findCommunicationProfile('promotional-detail-aid');
  }

  if (communicationIntent === 'promotional') {
    return audienceSegment === 'hcp' || audienceSegment === 'kol'
      ? findCommunicationProfile('promotional-detail-aid')
      : findCommunicationProfile('social-media-content');
  }

  if (communicationIntent === 'education') {
    if (/\bapp\b|\bdigital health tool\b/.test(`${request.prompt} ${request.targetAudience}`.toLowerCase())) {
      return findCommunicationProfile('patient-app-digital-health-tool');
    }
    if (/\bpsp\b|\bpatient support program(me)?\b/.test(`${request.prompt} ${request.targetAudience}`.toLowerCase())) {
      return findCommunicationProfile('patient-support-programme');
    }
    return findCommunicationProfile('patient-education-leaflet');
  }

  if (communicationIntent === 'awareness') {
    return request.contentType === 'social-post' || request.contentType === 'video'
      ? findCommunicationProfile('social-media-content')
      : findCommunicationProfile('disease-awareness-campaign');
  }

  if (audienceSegment === 'hcp' || audienceSegment === 'kol') {
    return findCommunicationProfile('medical-affairs-scientific-exchange');
  }

  return findCommunicationProfile('patient-education-leaflet');
}

function resolveSourcePolicy(request: SourceRequestProfile): ResolvedSourcePolicy {
  const audienceSegment = inferAudienceSegment(request);
  const explicitProfile = findExplicitProfile(request);
  const communicationIntent = explicitProfile?.intent || inferCommunicationIntent(request, audienceSegment);
  const profile = explicitProfile || selectCommunicationProfile(request, audienceSegment, communicationIntent);

  return {
    audienceSegment,
    audienceLabel: AUDIENCE_LABELS[audienceSegment],
    communicationIntent,
    communicationIntentLabel: COMMUNICATION_INTENT_LABELS[communicationIntent],
    profile,
    formatPolicy: FORMAT_POLICIES[request.contentType],
    marketPolicy: MARKET_POLICIES[request.market],
    namespaceLabel: NAMESPACE_LABELS[request.apiNamespace]
  };
}

function inferCommunicationProfile(request: SourceRequestProfile): CommunicationProfile {
  return resolveSourcePolicy(request).profile;
}

function getCategoryById(id: string): SourceCategoryRule {
  return SOURCE_CATEGORY_RULES.find((rule) => rule.id === id)!
    || SOURCE_CATEGORY_RULES[SOURCE_CATEGORY_RULES.length - 1];
}

function detectCategory(candidate: SearchCandidate): SourceCategoryRule {
  const url = (() => {
    try {
      return new URL(candidate.link);
    } catch {
      return null;
    }
  })();

  const domain = url?.hostname.replace(/^www\./, '') || '';
  const pathname = url?.pathname.toLowerCase() || '';
  const title = normaliseText(candidate.title);
  const snippet = normaliseText(candidate.snippet || '');
  const corpus = `${title} ${snippet} ${pathname}`.trim();

  for (const rule of SOURCE_CATEGORY_RULES) {
    const domainMatch = containsAny(domain, rule.domainHints);
    const urlMatch = containsAny(pathname, rule.urlHints);
    const titleMatch = containsAny(corpus, rule.titleHints);
    const snippetMatch = containsAny(snippet, rule.snippetHints);

    if (domainMatch || urlMatch || titleMatch || snippetMatch) {
      return rule;
    }
  }

  if (/\.gov\b/.test(domain) || /\.nhs\.uk$/.test(domain)) {
    return getCategoryById('government-health-agencies-patient-facing');
  }

  if (/\.edu\b/.test(domain) || /clinic|hospital|medicine/.test(domain)) {
    return getCategoryById('academic-medical-centre-public-content');
  }

  if (/reuters|bbc|statnews/.test(domain)) {
    return getCategoryById('reputable-health-journalism');
  }

  if (/pharma|novo|lilly|sanofi|pfizer|novartis|merck/.test(domain)) {
    return getCategoryById('industry-sponsored-editorially-independent');
  }

  return getCategoryById('unclassified-web-source');
}

function evaluateDateCurrency(year: number | null): SourceScreeningCheck {
  const currentYear = new Date().getFullYear();
  if (!year) {
    return { id: 'date-currency', label: 'Date & currency', status: 'unknown', note: 'No clear publication year found in the search result metadata.' };
  }
  const age = currentYear - year;
  if (age <= 5) {
    return { id: 'date-currency', label: 'Date & currency', status: 'pass', note: `${year}; within the preferred 5-year window.` };
  }
  if (age <= 8) {
    return { id: 'date-currency', label: 'Date & currency', status: 'caution', note: `${year}; usable with explicit date limitation review.` };
  }
  return { id: 'date-currency', label: 'Date & currency', status: 'fail', note: `${year}; older than the preferred source window.` };
}

function evaluateCoverage(prompt: string, candidate: SearchCandidate): SourceScreeningCheck {
  const promptTokens = new Set(extractMeaningfulTokens(prompt));
  const candidateTokens = new Set(extractMeaningfulTokens(`${candidate.title} ${candidate.snippet || ''}`));
  const overlap = [...promptTokens].filter((token) => candidateTokens.has(token));

  if (overlap.length >= 3) {
    return { id: 'coverage-scope', label: 'Coverage & scope', status: 'pass', note: `Strong topic overlap: ${overlap.slice(0, 4).join(', ')}.` };
  }
  if (overlap.length >= 1) {
    return { id: 'coverage-scope', label: 'Coverage & scope', status: 'caution', note: `Partial topic overlap: ${overlap.slice(0, 3).join(', ')}.` };
  }
  return { id: 'coverage-scope', label: 'Coverage & scope', status: 'fail', note: 'Search result does not clearly match the requested indication, population, or claim.' };
}

function evaluateFocus(rule: SourceCategoryRule, candidate: SearchCandidate): SourceScreeningCheck {
  const text = `${candidate.title} ${candidate.snippet || ''}`.toLowerCase();

  if (/post-hoc|post hoc|exploratory|subgroup/.test(text)) {
    return { id: 'focus-relevance', label: 'Focus & relevance', status: 'caution', note: 'Search result appears to emphasize subgroup or exploratory findings.' };
  }

  if (rule.id === 'conference-abstracts-posters' || rule.id === 'clinical-trial-registries-protocols') {
    return { id: 'focus-relevance', label: 'Focus & relevance', status: 'caution', note: 'Source is useful for context but not automatically a primary endpoint citation.' };
  }

  return { id: 'focus-relevance', label: 'Focus & relevance', status: 'pass', note: 'No obvious metadata signal of post-hoc or exploratory misuse.' };
}

function evaluateSignificance(candidate: SearchCandidate): SourceScreeningCheck {
  const text = `${candidate.title} ${candidate.snippet || ''}`.toLowerCase();
  if (/\barr\b|\bnnt\b|\bconfidence interval\b|\bci\b|\bp\s*[<=>]/.test(text)) {
    return { id: 'significance-effect-size', label: 'Significance & effect size', status: 'pass', note: 'Metadata mentions effect-size or significance framing.' };
  }
  if (/\bstatistically significant\b|\bhazard ratio\b|\brelative risk\b/.test(text)) {
    return { id: 'significance-effect-size', label: 'Significance & effect size', status: 'caution', note: 'Significance is hinted, but absolute measures need full-text confirmation.' };
  }
  return { id: 'significance-effect-size', label: 'Significance & effect size', status: 'unknown', note: 'Effect-size quality cannot be confirmed from search metadata alone.' };
}

function evaluateAuthorsAccountability(rule: SourceCategoryRule): SourceScreeningCheck {
  if (rule.id.startsWith('regulatory-') || rule.id.startsWith('government-')) {
    return { id: 'authors-accountability', label: 'Authors & accountability', status: 'pass', note: 'Institutional ownership is explicit from the source type.' };
  }
  if (rule.peerReviewDefault === 'pass') {
    return { id: 'authors-accountability', label: 'Authors & accountability', status: 'caution', note: 'Likely attributable, but named authors and COI still require full-text review.' };
  }
  return { id: 'authors-accountability', label: 'Authors & accountability', status: 'unknown', note: 'Authorship and COI cannot be verified from search metadata alone.' };
}

function evaluateResearchOriginFunding(rule: SourceCategoryRule, candidate: SearchCandidate): SourceScreeningCheck {
  const domain = (() => {
    try {
      return new URL(candidate.link).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  })();

  if (rule.id === 'industry-sponsored-editorially-independent' || /novo|lilly|sanofi|pfizer|novartis|merck/.test(domain)) {
    return { id: 'research-origin-funding', label: 'Research origin & funding', status: 'caution', note: 'Industry involvement appears likely; independent oversight must be confirmed.' };
  }

  if (rule.id.startsWith('government-') || rule.id.startsWith('regulatory-')) {
    return { id: 'research-origin-funding', label: 'Research origin & funding', status: 'pass', note: 'Public or regulatory origin lowers sponsorship ambiguity.' };
  }

  return { id: 'research-origin-funding', label: 'Research origin & funding', status: 'unknown', note: 'Funding and sponsor control require full-text verification.' };
}

function evaluatePeerReview(rule: SourceCategoryRule): SourceScreeningCheck {
  const status = rule.peerReviewDefault || 'unknown';
  const notes: Record<ScreeningStatus, string> = {
    pass: 'Source type is typically peer-reviewed or institutionally governed.',
    caution: 'Peer review or quality controls may exist, but full verification is still needed.',
    fail: 'Source type is not a peer-reviewed basis for primary evidence.',
    unknown: 'Peer-review pathway is unclear from metadata.'
  };
  return { id: 'peer-review-indexing', label: 'Peer review & indexing', status, note: notes[status] };
}

function evaluateGeographicFit(request: SourceRequestProfile, candidate: SearchCandidate): SourceScreeningCheck {
  const candidateText = `${candidate.title} ${candidate.snippet || ''}`.toLowerCase();
  const geographyTerms: Record<Market, string[]> = {
    global: ['global', 'international', 'multinational', 'worldwide'],
    india: ['india', 'indian'],
    singapore: ['singapore', 'singaporean'],
    dubai: ['dubai', 'uae', 'united arab emirates', 'gcc'],
    germany: ['germany', 'german', 'eu', 'european'],
    us: ['us', 'usa', 'united states', 'american'],
    uk: ['uk', 'united kingdom', 'britain', 'british', 'england']
  };

  if (request.market === 'global') {
    return { id: 'geographic-population-fit', label: 'Geographic & population fit', status: 'unknown', note: 'Global / multi-market request; local fit still needs manual market review.' };
  }

  const matchedTerm = geographyTerms[request.market].find((term) => candidateText.includes(term));
  if (matchedTerm) {
    return { id: 'geographic-population-fit', label: 'Geographic & population fit', status: 'pass', note: `Source metadata references the requested geography: ${matchedTerm}.` };
  }

  return { id: 'geographic-population-fit', label: 'Geographic & population fit', status: 'caution', note: `The requested market (${MARKET_POLICIES[request.market].label}) is not obvious from metadata; extrapolation review may be needed.` };
}

function evaluateHealthLiteracy(rule: SourceCategoryRule, useCase: SourceEvidenceUseCase): SourceScreeningCheck {
  const isPatientFacing = useCase === 'patient-awareness' || useCase === 'patient-education' || useCase === 'patient-digital-social';

  if (!isPatientFacing) {
    return { id: 'health-literacy', label: 'Health literacy', status: 'unknown', note: 'Patient readability screening is not the primary filter for this request type.' };
  }

  const status = rule.healthLiteracyDefault
    || (rule.id.includes('patient-facing') || rule.id === 'academic-medical-centre-public-content' ? 'pass' : 'caution');
  const notes: Record<ScreeningStatus, string> = {
    pass: 'Source type is generally compatible with patient readability and plain-language adaptation.',
    caution: 'Patient readability may be achievable, but jargon and literacy fit need manual review.',
    fail: 'Source type is unsuitable for direct patient-facing adaptation.',
    unknown: 'Readability fit is not clear from metadata.'
  };

  return { id: 'health-literacy', label: 'Health literacy', status, note: notes[status] };
}

function buildScreeningChecks(
  rule: SourceCategoryRule,
  request: SourceRequestProfile,
  candidate: SearchCandidate,
  useCase: SourceEvidenceUseCase,
): SourceScreeningCheck[] {
  const year = extractYear(`${candidate.title} ${candidate.snippet || ''}`);

  return [
    evaluateDateCurrency(year),
    evaluateCoverage(request.prompt, candidate),
    { id: 'strength-of-evidence', label: 'Strength of evidence', status: rule.strengthDefault || 'unknown', note: rule.strengthDefault === 'pass' ? 'Source type aligns with strong evidence expectations.' : rule.strengthDefault === 'caution' ? 'Useful evidence type, but confounding and design limitations must be reviewed.' : rule.strengthDefault === 'fail' ? 'Not adequate as a standalone primary-evidence source.' : 'Strength of evidence cannot be inferred confidently.' },
    evaluateFocus(rule, candidate),
    evaluateSignificance(candidate),
    evaluateAuthorsAccountability(rule),
    evaluateResearchOriginFunding(rule, candidate),
    evaluatePeerReview(rule),
    evaluateGeographicFit(request, candidate),
    { id: 'replication-consistency', label: 'Replication & consistency', status: rule.replicationDefault || 'unknown', note: rule.replicationDefault === 'pass' ? 'Source type usually reflects replicated or consensus-level evidence.' : rule.replicationDefault === 'caution' ? 'Directional consistency should be verified across other studies.' : rule.replicationDefault === 'fail' ? 'Single-study or non-replicated evidence risk is high.' : 'Replication cannot be determined from metadata alone.' },
    evaluateHealthLiteracy(rule, useCase)
  ];
}

function summariseChecks(checks: SourceScreeningCheck[]): string {
  return checks
    .map((check) => `${check.label}: ${check.status}`)
    .slice(0, 5)
    .join(' · ');
}

function scoreSource(suitability: SourceSuitability, checks: SourceScreeningCheck[], priorityBonus: number = 0): number {
  const suitabilityScore: Record<SourceSuitability, number> = { P: 40, S: 28, C: 10, X: -100 };
  const screeningScore = checks.reduce((score, check) => {
    if (check.status === 'pass') return score + 6;
    if (check.status === 'caution') return score + 1;
    if (check.status === 'fail') return score - 14;
    return score;
  }, 0);
  return suitabilityScore[suitability] + screeningScore + priorityBonus;
}

function isSourceDisqualified(useCase: SourceEvidenceUseCase, source: ContentSource): boolean {
  if (source.suitability === 'X') return true;

  const criticalFailIds = new Set(['date-currency', 'coverage-scope', 'peer-review-indexing']);
  const patientCriticalFailIds = new Set(['health-literacy']);

  return (source.screening || []).some((check) => {
    if (check.status !== 'fail') return false;
    if (criticalFailIds.has(check.id)) return true;
    if ((useCase === 'patient-awareness' || useCase === 'patient-education' || useCase === 'patient-digital-social') && patientCriticalFailIds.has(check.id)) {
      return true;
    }
    return false;
  });
}

function fitToRole(suitability: SourceSuitability): ContentSource['recommendedRole'] {
  if (suitability === 'P') return 'primary';
  if (suitability === 'S') return 'supporting';
  if (suitability === 'C') return 'contextual';
  return 'excluded';
}

function uniqueLabels(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function categoryBonus(rule: SourceCategoryRule, suitability: SourceSuitability, policy: ResolvedSourcePolicy): number {
  let bonus = 0;

  if (policy.profile.preferredCategoryIds?.includes(rule.id)) bonus += 18;
  if (policy.marketPolicy.preferredCategoryIds?.includes(rule.id)) bonus += 12;
  if (suitability === 'P') bonus += 6;

  if (policy.communicationIntent === 'promotional' && rule.id === 'regulatory-label-prescribing-information') bonus += 10;
  if (policy.communicationIntent === 'policy' && ['hta-body-assessments', 'burden-of-disease-heor-epidemiology-studies', 'real-world-evidence-disease-registries'].includes(rule.id)) {
    bonus += 8;
  }
  if ((policy.communicationIntent === 'awareness' || policy.communicationIntent === 'education') && ['government-health-agencies-patient-facing', 'disease-nonprofits-patient-facing', 'validated-health-literacy-frameworks'].includes(rule.id)) {
    bonus += 8;
  }

  return bonus;
}

function hasSelectedCategory(
  sources: Array<ContentSource & { sourceType?: string }>,
  categoryIds: string[],
): boolean {
  const labels = categoryIds.map((id) => getCategoryById(id).label);
  return sources.some((source) => source.sourceType && labels.includes(source.sourceType));
}

function buildHardLockReasons(
  request: SourceRequestProfile,
  policy: ResolvedSourcePolicy,
  selectedSources: ContentSource[],
): string[] {
  const reasons: string[] = [];
  if (selectedSources.length === 0) {
    return reasons;
  }

  const hasRegulatoryAnchor = hasSelectedCategory(selectedSources, ['regulatory-label-prescribing-information']);
  const explicitDetailAidIntent = /\bdetail aid\b|\be-detail\b|\bsales aid\b|\brep-delivered\b|\bvisual aid\b/i.test(
    `${request.prompt} ${request.targetAudience}`,
  );

  if (
    policy.profile.id === 'promotional-detail-aid'
    && explicitDetailAidIntent
    && !hasRegulatoryAnchor
  ) {
    reasons.push(`Explicit detail-aid style promotional content requires a current ${policy.marketPolicy.label} label / prescribing-information anchor before generation.`);
  }

  return uniqueLabels(reasons);
}

export function buildGovernedSearchQuery(request: SourceRequestProfile): string {
  const policy = resolveSourcePolicy(request);
  const hints = uniqueLabels([
    ...policy.profile.sourceSearchHints,
    ...policy.marketPolicy.sourceSearchHints,
    ...policy.formatPolicy.sourceSearchHints,
    ...policy.marketPolicy.controllingReferences,
  ]);

  return `${request.prompt} ${hints.slice(0, 8).join(' ')}`.trim();
}

export function buildSourcePolicyBundle(
  request: SourceRequestProfile,
  results: SearchCandidate[],
  limit: number,
): {
  governance: SourceGovernanceSummary;
  sources: ContentSource[];
  screenedSources: ContentSource[];
  sourcePromptBlock: string;
} {
  const policy = resolveSourcePolicy(request);
  const profile = policy.profile;
  const useCase = profile.evidenceUseCase;
  const combinedRegulatoryNotes = uniqueLabels([...profile.regulatoryNotes, ...policy.marketPolicy.regulatoryNotes]);

  const screenedSources = results.map((candidate) => {
    const category = detectCategory(candidate);
    const checks = buildScreeningChecks(category, request, candidate, useCase);
    const suitability = category.ratings[useCase];

    const domain = (() => {
      try {
        return new URL(candidate.link).hostname.replace(/^www\./, '');
      } catch {
        return candidate.link;
      }
    })();

    const source: ContentSource = {
      title: candidate.title,
      domain,
      url: candidate.link,
      snippet: candidate.snippet,
      type: 'web',
      publishedYear: extractYear(`${candidate.title} ${candidate.snippet || ''}`) || undefined,
      tier: category.tier,
      sourceType: category.label,
      suitability,
      recommendedRole: fitToRole(suitability),
      evidenceUseCase: useCase,
      screening: checks,
      screeningSummary: summariseChecks(checks)
    };

    return {
      category,
      source,
      score: scoreSource(suitability, checks, categoryBonus(category, suitability, policy)),
      disqualified: isSourceDisqualified(useCase, source)
    };
  });

  const selected = screenedSources
    .filter((entry) => !entry.disqualified)
    .sort((left, right) => right.score - left.score)
    .reduce<ContentSource[]>((acc, entry) => {
      if (acc.length >= limit) return acc;
      if (acc.some((source) => source.domain === entry.source.domain && source.sourceType === entry.source.sourceType)) {
        return acc;
      }
      acc.push(entry.source);
      return acc;
    }, []);

  const screenedSelection = screenedSources
    .sort((left, right) => right.score - left.score)
    .reduce<ContentSource[]>((acc, entry) => {
      if (acc.length >= Math.max(limit, 5)) return acc;
      if (acc.some((source) => source.domain === entry.source.domain && source.sourceType === entry.source.sourceType)) {
        return acc;
      }
      acc.push(entry.source);
      return acc;
    }, []);

  const fallback = selected.length > 0
    ? selected
    : screenedSources
        .filter((entry) => entry.source.suitability !== 'X')
        .sort((left, right) => right.score - left.score)
        .slice(0, limit)
        .map((entry) => entry.source);

  const preferredSourceTypes = SOURCE_CATEGORY_RULES
    .filter((rule) =>
      rule.ratings[useCase] === 'P'
      || profile.preferredCategoryIds?.includes(rule.id)
      || policy.marketPolicy.preferredCategoryIds?.includes(rule.id),
    )
    .sort((left, right) => categoryBonus(right, right.ratings[useCase], policy) - categoryBonus(left, left.ratings[useCase], policy))
    .map((rule) => rule.label);

  const allowedSourceTypes = SOURCE_CATEGORY_RULES
    .filter((rule) => rule.ratings[useCase] === 'P' || rule.ratings[useCase] === 'S')
    .map((rule) => rule.label);

  const blockedCategories = SOURCE_CATEGORY_RULES
    .filter((rule) => rule.ratings[useCase] === 'X')
    .map((rule) => rule.label);

  const hardLockReasons = buildHardLockReasons(request, policy, fallback);
  const hardLockReason = hardLockReasons[0];
  const sourceSearchHints = uniqueLabels([
    ...profile.sourceSearchHints,
    ...policy.marketPolicy.sourceSearchHints,
    ...policy.formatPolicy.sourceSearchHints,
  ]);

  const sourcePromptBlock = [
    `SOURCE GOVERNANCE PROFILE: ${profile.label} (${USE_CASE_LABELS[useCase]})`,
    `AUDIENCE / INTENT: ${policy.audienceLabel} · ${policy.communicationIntentLabel}`,
    `NAMESPACE: ${policy.namespaceLabel}`,
    `MARKET AUTHORITY: ${policy.marketPolicy.label} · ${policy.marketPolicy.authority}`,
    `CONTROLLING REFERENCES: ${policy.marketPolicy.controllingReferences.join(' | ')}`,
    `MINIMUM SOURCE STANDARD: ${profile.minimumSourceStandard}`,
    `FORMAT REQUIREMENTS: ${policy.formatPolicy.formatRequirements.join(' | ')}`,
    `PREFERRED SOURCE TYPES: ${preferredSourceTypes.slice(0, 8).join('; ')}`,
    `ALLOWED SOURCE TYPES: ${allowedSourceTypes.slice(0, 10).join('; ')}`,
    `EXCLUDED SOURCE TYPES: ${blockedCategories.slice(0, 8).join('; ')}`,
    `SOURCE SEARCH HINTS: ${sourceSearchHints.join(' | ')}`,
    `NON-NEGOTIABLE CHECKS: ${profile.nonNegotiables.join(' | ')}`,
    `REGULATORY / REVIEW NOTES: ${combinedRegulatoryNotes.join(' | ')}`,
    `COMMON FAILURE RISKS: ${profile.commonFailures.join(' | ')}`,
    hardLockReasons.length > 0 ? `SOURCE LOCKS: ${hardLockReasons.join(' | ')}` : '',
    fallback.length > 0
      ? `APPROVED SOURCE CANDIDATES:\n${fallback.map((source, index) => {
          const fit = source.suitability ? SUITABILITY_LABELS[source.suitability] : 'Screened';
          return `${index + 1}. [${fit}] ${source.sourceType} · ${source.tier} · ${source.title} (${source.domain})\nFACTS: ${source.snippet || '[No snippet available]'}\nSCREENING: ${source.screeningSummary}`;
        }).join('\n\n')}`
      : 'APPROVED SOURCE CANDIDATES: None found. Use [SOURCE NEEDED] for unsupported facts.'
  ]
    .filter(Boolean)
    .join('\n');

  return {
    governance: {
      audienceSegment: policy.audienceSegment,
      audienceLabel: policy.audienceLabel,
      communicationIntent: policy.communicationIntent,
      communicationIntentLabel: policy.communicationIntentLabel,
      communicationFormat: profile.label,
      namespace: request.apiNamespace,
      namespaceLabel: policy.namespaceLabel,
      market: request.market,
      marketLabel: policy.marketPolicy.label,
      marketAuthority: policy.marketPolicy.authority,
      controllingReferences: policy.marketPolicy.controllingReferences,
      evidenceUseCase: useCase,
      evidenceUseCaseLabel: USE_CASE_LABELS[useCase],
      minimumSourceStandard: profile.minimumSourceStandard,
      preferredSourceTypes: uniqueLabels(preferredSourceTypes),
      allowedSourceTypes: uniqueLabels(allowedSourceTypes),
      excludedSourceTypes: uniqueLabels(blockedCategories),
      sourceSearchHints,
      formatRequirements: policy.formatPolicy.formatRequirements,
      nonNegotiables: profile.nonNegotiables,
      regulatoryNotes: combinedRegulatoryNotes,
      commonFailures: profile.commonFailures,
      screenedSourceCount: screenedSelection.length,
      approvedSourceCount: fallback.length,
      hardLockReasons,
      hardLockReason
    },
    sources: fallback,
    screenedSources: screenedSelection,
    sourcePromptBlock
  };
}
