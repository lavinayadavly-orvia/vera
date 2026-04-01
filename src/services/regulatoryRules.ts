import constraintsLibrary from '@/data/regulatoryConstraints.json';
import type {
  ApiNamespace,
  ContentSource,
  GeneratedOutput,
  Market,
  RegulatoryContentType,
  RulesEngineFinding,
  RulesEngineReport,
  SourceGovernanceSummary,
} from '@/types';

type ConstraintRule = {
  id: string;
  market: Market;
  namespace: ApiNamespace;
  regulatoryContentTypes: RegulatoryContentType[];
  title: string;
  prohibitedTerms?: string[];
  requiredDisclaimers?: string[];
  notes?: string[];
  maxReferenceAgeYears?: number;
  requiresSmPCTable?: boolean;
  requiresBlackBoxDisclaimer?: boolean;
};

const MEDICAL_TERM_PATTERNS = [
  /\bmyocardial infarction\b/i,
  /\bhyperglyc(?:a|e)emia\b/i,
  /\bcontraindication\b/i,
  /\binsulin resistance\b/i,
];

function formatMarketLabel(market: Market): string {
  if (market === 'dubai') return 'Dubai / UAE';
  if (market === 'us') return 'United States';
  if (market === 'uk') return 'United Kingdom';
  return market.charAt(0).toUpperCase() + market.slice(1);
}

function inferRegulatoryContentType(
  output: GeneratedOutput,
  namespace: ApiNamespace,
  governance?: SourceGovernanceSummary,
): RegulatoryContentType {
  if (governance?.evidenceUseCase === 'policy-hta-dossier' || output.contentType === 'report') {
    return 'policy';
  }

  if (governance?.evidenceUseCase === 'patient-education') return 'patient-education';
  if (governance?.evidenceUseCase === 'patient-awareness' || governance?.evidenceUseCase === 'patient-digital-social') {
    return 'disease-awareness';
  }

  if (governance?.evidenceUseCase === 'hcp-detail-aid') return 'promotional';
  if (namespace === 'marketing') return output.contentType === 'social-post' ? 'promotional' : 'promotional';
  if (governance?.evidenceUseCase === 'hcp-awareness' || governance?.evidenceUseCase === 'hcp-training-cme') {
    return 'scientific-exchange';
  }

  return 'medical-information';
}

function hasCurrentSmPCSource(sources?: ContentSource[]): boolean {
  return Boolean(
    sources?.some((source) =>
      /smpc|label|prescribing information|regulatory/i.test(
        `${source.sourceType || ''} ${source.title || ''} ${source.snippet || ''}`,
      ),
    ),
  );
}

function findMatchedTerms(text: string, prohibitedTerms: string[] = []): string[] {
  const lowerText = text.toLowerCase();
  return prohibitedTerms.filter((term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(lowerText));
}

function buildFinding(
  severity: RulesEngineFinding['severity'],
  rule: ConstraintRule,
  message: string,
  extras: Partial<RulesEngineFinding> = {},
): RulesEngineFinding {
  return {
    severity,
    code: rule.id.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
    title: rule.title,
    message,
    ruleId: rule.id,
    ...extras,
  };
}

export function evaluateRegulatoryRules(params: {
  market: Market;
  namespace: ApiNamespace;
  output: GeneratedOutput;
}): RulesEngineReport {
  const rules = (constraintsLibrary.rules as ConstraintRule[]).filter((rule) =>
    rule.market === params.market
    && rule.namespace === params.namespace,
  );

  const regulatoryContentType = inferRegulatoryContentType(
    params.output,
    params.namespace,
    params.output.sourceGovernance,
  );
  const applicableRules = rules.filter((rule) => rule.regulatoryContentTypes.includes(regulatoryContentType));
  const outputText = `${params.output.theme || ''}\n${params.output.content || ''}`;
  const findings: RulesEngineFinding[] = [];
  const requiredDisclaimers = new Set<string>();
  const prohibitedTerms = new Set<string>();

  applicableRules.forEach((rule) => {
    (rule.requiredDisclaimers || []).forEach((disclaimer) => requiredDisclaimers.add(disclaimer));
    (rule.prohibitedTerms || []).forEach((term) => prohibitedTerms.add(term));

    const matchedTerms = findMatchedTerms(outputText, rule.prohibitedTerms);
    if (matchedTerms.length > 0) {
      findings.push(
        buildFinding(
          params.namespace === 'marketing' ? 'block' : 'warn',
          rule,
          `Prohibited or sensitive terms detected for ${params.market}: ${matchedTerms.join(', ')}.`,
          { matchedTerms, requiredDisclaimers: rule.requiredDisclaimers },
        ),
      );
    }

    if (typeof rule.maxReferenceAgeYears === 'number') {
      const now = new Date().getFullYear();
      const outdatedSources = (params.output.sources || []).filter((source) =>
        source.publishedYear && now - source.publishedYear > rule.maxReferenceAgeYears,
      );
      if (outdatedSources.length > 0) {
        findings.push(
          buildFinding(
            'warn',
            rule,
            `${outdatedSources.length} source(s) exceed the ${rule.maxReferenceAgeYears}-year re-validation window.`,
            {
              requiredDisclaimers: rule.requiredDisclaimers,
            },
          ),
        );
      }
    }

    if (rule.requiresSmPCTable && !hasCurrentSmPCSource(params.output.sources)) {
      findings.push(
        buildFinding(
          'block',
          rule,
          `No current SmPC / prescribing-information source was found for this ${formatMarketLabel(params.market)} promotional output.`,
          { requiredDisclaimers: rule.requiredDisclaimers },
        ),
      );
    }

    if (rule.requiresBlackBoxDisclaimer) {
      findings.push(
        buildFinding(
          'warn',
          rule,
          'US promotional flow requires boxed-warning / fair-balance review before release.',
          { requiredDisclaimers: rule.requiredDisclaimers },
        ),
      );
    }

    if (params.market === 'dubai' && MEDICAL_TERM_PATTERNS.some((pattern) => pattern.test(outputText))) {
      findings.push(
        buildFinding(
          'warn',
          rule,
          'Patient-facing medical terminology should receive Arabic transliteration review before localization.',
          { requiredDisclaimers: rule.requiredDisclaimers },
        ),
      );
    }
  });

  const status = findings.some((finding) => finding.severity === 'block')
    ? 'block'
    : findings.some((finding) => finding.severity === 'warn')
      ? 'warn'
      : 'pass';

  return {
    version: constraintsLibrary.version,
    namespace: params.namespace,
    market: params.market,
    regulatoryContentType,
    constrainedBy: applicableRules.map((rule) => rule.title),
    findings,
    requiredDisclaimers: Array.from(requiredDisclaimers),
    prohibitedTerms: Array.from(prohibitedTerms),
    status,
  };
}
