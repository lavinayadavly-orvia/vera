import type {
  ContentSource,
  DetailedGenerationParams,
  EvidenceMapEntry,
  GeneratedOutput,
  GuardrailIssue,
  Market,
  OperationalGuardrailReport,
  ReadabilityReport,
  SourceEvidenceUseCase,
} from '@/types';

const COMPLEX_TERM_EQUIVALENTS: Array<{ from: string; to: string }> = [
  { from: 'myocardial infarction', to: 'heart attack' },
  { from: 'hypertension', to: 'high blood pressure' },
  { from: 'hyperglycemia', to: 'high blood sugar' },
  { from: 'hypoglycemia', to: 'low blood sugar' },
  { from: 'cardiovascular', to: 'heart-related' },
  { from: 'adverse event', to: 'side effect' },
  { from: 'glycemic control', to: 'blood sugar control' },
  { from: 'neuropathy', to: 'nerve damage' },
  { from: 'retinopathy', to: 'eye damage' },
  { from: 'pharmacovigilance', to: 'medicine safety monitoring' },
  { from: 'contraindication', to: 'when not to use it' },
  { from: 'renal impairment', to: 'kidney problems' },
  { from: 'hepatic impairment', to: 'liver problems' },
  { from: 'comorbidity', to: 'other health condition' },
  { from: 'administer', to: 'give' },
  { from: 'initiate therapy', to: 'start treatment' },
];

const INDIA_RED_FLAG_TERMS = ['best', 'unique', 'novel'];

function isPatientFacing(useCase?: SourceEvidenceUseCase): boolean {
  return useCase === 'patient-awareness'
    || useCase === 'patient-education'
    || useCase === 'patient-digital-social';
}

function isHcpDetailAid(governance?: GeneratedOutput['sourceGovernance']): boolean {
  return governance?.evidenceUseCase === 'hcp-detail-aid'
    || governance?.communicationFormat === 'Promotional detail aid';
}

function countSyllables(word: string): number {
  const cleaned = word
    .toLowerCase()
    .replace(/[^a-z]/g, '');

  if (!cleaned) return 0;
  if (cleaned.length <= 3) return 1;

  const stripped = cleaned
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
    .replace(/^y/, '');
  const groups = stripped.match(/[aeiouy]{1,2}/g);
  return Math.max(groups ? groups.length : 1, 1);
}

function estimateFleschKincaidGrade(text: string): number | null {
  const plain = text
    .replace(/^#+\s.*$/gm, ' ')
    .replace(/\(C\d{3,4}\)/g, ' ')
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!plain) return null;

  const sentences = plain.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean);
  const words = plain.split(/\s+/).map((part) => part.trim()).filter(Boolean);
  if (sentences.length === 0 || words.length < 15) return null;

  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  return (0.39 * (words.length / sentences.length)) + (11.8 * (syllables / words.length)) - 15.59;
}

function buildReadabilityReport(text: string, market: Market): ReadabilityReport {
  const gradeLevel = estimateFleschKincaidGrade(text);
  const targetLabel = market === 'india'
    ? 'Grade 6 or lower'
    : market === 'dubai'
      ? 'Plain English or plain Arabic'
      : 'Grade 8 or lower';

  const difficultTerms = COMPLEX_TERM_EQUIVALENTS
    .filter((pair) => text.toLowerCase().includes(pair.from))
    .map((pair) => pair.from);

  const simplifiedEquivalents = COMPLEX_TERM_EQUIVALENTS
    .filter((pair) => text.toLowerCase().includes(pair.from))
    .slice(0, 8);

  const threshold = market === 'india' ? 6 : 8;

  return {
    scoreName: 'Flesch-Kincaid',
    gradeLevel,
    targetLabel,
    passed: gradeLevel === null ? true : gradeLevel <= threshold,
    difficultTerms,
    simplifiedEquivalents,
  };
}

function hasHeadToHeadRctSupport(sources: ContentSource[]): boolean {
  return sources.some((source) => {
    const text = `${source.title} ${source.snippet || ''}`.toLowerCase();
    const isTrialLike = source.sourceType?.includes('RCT')
      || source.sourceType?.includes('trials')
      || source.sourceType?.includes('meta-analyses')
      || source.suitability === 'P';
    const comparative = /head[- ]to[- ]head|versus|vs\.|compared with|comparison|superior to|noninferior to/i.test(text);
    return Boolean(isTrialLike && comparative);
  });
}

function buildEvidenceMap(text: string, sources: ContentSource[]): EvidenceMapEntry[] {
  const claimIds = Array.from(new Set(text.match(/\(C\d{3,4}\)/g) || []))
    .map((claimId) => claimId.replace(/[()]/g, ''));

  return claimIds.map((claimId) => {
    const index = Number(claimId.replace(/^C0*/, '')) - 1;
    const source = sources[index];
    const locator = source?.page
      ? `p. ${source.page}${source.section ? ` · ${source.section}` : ''}`
      : source?.section
        ? source.section
        : 'Locator unavailable';

    return {
      claimId,
      sourceTitle: source?.title || 'Unmapped source',
      sourceUrl: source?.url,
      locator,
      status: source?.page || source?.section ? 'mapped' : 'locator-missing',
    };
  });
}

function addIssue(
  issues: GuardrailIssue[],
  severity: GuardrailIssue['severity'],
  code: string,
  title: string,
  message: string,
  suggestions?: string[],
) {
  issues.push({ severity, code, title, message, suggestions });
}

function evaluateRegionalChecks(
  params: Pick<DetailedGenerationParams, 'market' | 'prompt'>,
  output: GeneratedOutput,
  issues: GuardrailIssue[],
) {
  const text = (output.textContent || output.content || '').toLowerCase();
  const sources = output.sources || [];

  if (params.market === 'india') {
    const flaggedTerms = INDIA_RED_FLAG_TERMS.filter((term) => new RegExp(`\\b${term}\\b`, 'i').test(text));
    if (flaggedTerms.length > 0 && !hasHeadToHeadRctSupport(sources)) {
      addIssue(
        issues,
        'block',
        'INDIA_UCPMP_SUPERLATIVE',
        'India UCPMP red flag',
        `Detected superlative/promotional wording (${flaggedTerms.join(', ')}) without clear head-to-head RCT support.`,
        ['Remove the superlative wording.', 'Replace with neutral language.', 'Add directly comparative Tier 1 evidence if the claim must remain.']
      );
    }
  }

  if (params.market === 'singapore') {
    const staleSources = sources.filter((source) => typeof source.publishedYear === 'number' && (new Date().getFullYear() - source.publishedYear > 5));
    if (staleSources.length > 0) {
      addIssue(
        issues,
        'warn',
        'SINGAPORE_SAPI_CURRENCY',
        'Singapore source currency re-validation',
        `${staleSources.length} source(s) appear older than 5 years and should be re-validated for SAPI-style currency review.`,
        staleSources.slice(0, 3).map((source) => `${source.title} (${source.publishedYear})`)
      );
    }
  }

  if (params.market === 'dubai' && output.sourceGovernance && isPatientFacing(output.sourceGovernance.evidenceUseCase)) {
    const termsNeedingLocalization = COMPLEX_TERM_EQUIVALENTS
      .filter((pair) => text.includes(pair.from))
      .map((pair) => pair.from);

    if (termsNeedingLocalization.length > 0) {
      addIssue(
        issues,
        'warn',
        'DUBAI_ARABIC_TRANSLITERATION',
        'Dubai Arabic transliteration review',
        `Detected high-risk medical terms that should be checked for Arabic transliteration or plain-language localisation: ${termsNeedingLocalization.slice(0, 5).join(', ')}.`,
        ['Add a dual-language glossary or plain-language Arabic equivalent.', 'Have Arabic medical localisation reviewed before release.']
      );
    }
  }
}

function evaluateSourceSufficiency(output: GeneratedOutput, issues: GuardrailIssue[]) {
  if (!isHcpDetailAid(output.sourceGovernance)) return;

  const eligible = (output.sources || []).some((source) => source.tier === 'Tier 1' || source.tier === 'Tier 2');
  if (!eligible) {
    addIssue(
      issues,
      'block',
      'HCP_DETAIL_AID_SOURCE_LOCK',
      'Source sufficiency lock',
      'HCP Detail Aid generation requires at least one Tier 1 or Tier 2 source. The current source set does not meet that threshold.',
      ['Link or retrieve Tier 1 or Tier 2 evidence.', 'Switch the communication format if the asset is not a detail aid.', 'Narrow the prompt toward a guideline, label, or peer-reviewed trial evidence base.']
    );
  }
}

function evaluateEvidenceMapping(output: GeneratedOutput, issues: GuardrailIssue[]): EvidenceMapEntry[] {
  const evidenceMap = buildEvidenceMap(output.textContent || output.content || '', output.sources || []);

  if (evidenceMap.length === 0) {
    addIssue(
      issues,
      'warn',
      'EVIDENCE_MAP_EMPTY',
      'Evidence mapping incomplete',
      'No claim anchors were found for automatic evidence mapping. Hyperlinked page/table mapping requires explicit claim IDs.',
      ['Ensure claims carry C00X anchors.', 'Add source locators when ingesting PDF evidence.']
    );
    return evidenceMap;
  }

  const unmapped = evidenceMap.filter((entry) => entry.status === 'locator-missing');
  if (unmapped.length > 0) {
    addIssue(
      issues,
      'warn',
      'EVIDENCE_LOCATOR_MISSING',
      'Page/table locator missing',
      `${unmapped.length} claim(s) are anchored to a source, but not to a page or table locator.`,
      ['For PDF evidence, capture page/table locators during ingestion.', 'Keep claim-to-source anchors, then enrich them with locators in the next workflow step.']
    );
  }

  return evidenceMap;
}

export function evaluateOperationalGuardrails(
  params: Pick<DetailedGenerationParams, 'market' | 'prompt' | 'targetAudience'>,
  output: GeneratedOutput,
): OperationalGuardrailReport {
  const issues: GuardrailIssue[] = [];

  evaluateSourceSufficiency(output, issues);
  evaluateRegionalChecks(params, output, issues);

  let readability: ReadabilityReport | undefined;
  if (output.sourceGovernance && isPatientFacing(output.sourceGovernance.evidenceUseCase)) {
    readability = buildReadabilityReport(output.textContent || output.content || '', params.market);
    if (!readability.passed) {
      addIssue(
        issues,
        'warn',
        'PATIENT_READABILITY_HIGH',
        'Patient readability safety valve',
        `Readability appears too high for the selected market. Estimated grade: ${readability.gradeLevel?.toFixed(1) ?? 'unavailable'}; target: ${readability.targetLabel}.`,
        readability.simplifiedEquivalents.slice(0, 5).map((pair) => `${pair.from} -> ${pair.to}`)
      );
    } else if (readability.simplifiedEquivalents.length > 0) {
      addIssue(
        issues,
        'info',
        'PATIENT_READABILITY_TERMS',
        'Plain-language opportunities',
        'The content is broadly readable, but some medical terms still have simpler alternatives.',
        readability.simplifiedEquivalents.slice(0, 5).map((pair) => `${pair.from} -> ${pair.to}`)
      );
    }
  }

  const evidenceMap = evaluateEvidenceMapping(output, issues);
  const locked = issues.some((issue) => issue.severity === 'block');
  const summary = locked
    ? `${issues.filter((issue) => issue.severity === 'block').length} blocking guardrail issue(s) detected.`
    : issues.length > 0
      ? `${issues.length} guardrail advisory issue(s) detected.`
      : 'All configured operational guardrails passed.';

  return {
    market: params.market,
    locked,
    summary,
    issues,
    readability,
    evidenceMap,
  };
}
