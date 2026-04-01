import { generateText, generateObject, generateImage, generateSpeech } from '@/lib/openai';
import type { ContentType, GeneratedOutput, DetailedGenerationParams, ContentSource, PromptBlueprint } from '@/types';
import type { RealWorldInfographicData } from '@/templates/infographicTemplateLong';
import { compileInfographicHtml as compileLongInfographicHtml } from '@/templates/infographicTemplateLong';
import { compileInfographicHtml as compilePosterInfographicHtml } from '@/templates/infographicTemplate';
import { logValidationReport } from '@/services/assetValidator';
import { buildComplianceArchitectureSummary, inferApiNamespace } from '@/services/complianceArchitecture';
import { evaluateOperationalGuardrails } from '@/services/operationalGuardrails';
import { scrubGenerationInput } from '@/services/privacyScrubber';
import { buildGovernedSearchQuery, buildSourcePolicyBundle } from '@/services/sourceGovernance';
import { validateOutput, sanitiseOutput } from '@/utils/outputValidator';
import { normalizeMarkdownDocument } from '@/utils/markdownRenderer';

interface GenerationParams {
  prompt: string;
  contentType: ContentType;
  userId: string;
}

type OutputValidationProfile = {
  requireAudit: boolean;
  requireHeading: boolean;
  minContentLength: number;
};

const STRUCTURED_TEXT_OUTPUTS: ContentType[] = ['document', 'report', 'presentation', 'podcast', 'white-paper'];

function outputRequiresClaimLevelAudit(output: GeneratedOutput): boolean {
  return Boolean(output.sources?.some((source) => source.type !== 'web'));
}

function getOutputValidationProfile(output: GeneratedOutput): OutputValidationProfile {
  const requireAudit = outputRequiresClaimLevelAudit(output);

  switch (output.contentType) {
    case 'social-post':
      return {
        requireAudit,
        requireHeading: false,
        minContentLength: 120,
      };
    case 'presentation':
      return {
        requireAudit,
        requireHeading: true,
        minContentLength: 250,
      };
    case 'video':
      return {
        requireAudit,
        requireHeading: true,
        minContentLength: 250,
      };
    case 'podcast':
      return {
        requireAudit,
        requireHeading: true,
        minContentLength: 300,
      };
    default:
      return {
        requireAudit,
        requireHeading: true,
        minContentLength: 400,
      };
  }
}

function formatReferenceCitation(source: ContentSource, index: number): string {
  const title = source.title || `Screened source ${index + 1}`;
  const domain = source.domain || 'Source';
  const year = source.publishedYear ? ` (${source.publishedYear})` : '';
  return `- ${title} — ${domain}${year}`;
}

function buildDisplayReferenceSection(sources?: ContentSource[]): string {
  if (sources && sources.length > 0) {
    return ['## References', ...sources.slice(0, 8).map(formatReferenceCitation)].join('\n');
  }

  return [
    '## References',
    '- Reference pack pending compliance verification before final release.',
  ].join('\n');
}

function stripReferencePlaceholderNotes(text: string): string {
  return text
    .replace(/^\*\*Note:\*\*\s.*SOURCE NEEDED.*$/gim, '')
    .replace(/^`{3,}(markdown)?\s*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function rebuildReferenceSection(markdown: string, sources?: ContentSource[]): string {
  const referenceSection = buildDisplayReferenceSection(sources);
  const sectionPattern = /(^|\n)#{1,3}\s*(references|sources|citations|bibliography)\s*\n[\s\S]*?(?=\n#{1,3}\s+\S|\s*$)/im;

  if (sectionPattern.test(markdown)) {
    return markdown.replace(sectionPattern, (match, prefix = '') => `${prefix}${referenceSection}\n`);
  }

  return `${markdown.trim()}\n\n${referenceSection}`;
}

function normaliseTextOutputForDisplay(output: GeneratedOutput): GeneratedOutput {
  if (output.format === 'html' || !STRUCTURED_TEXT_OUTPUTS.includes(output.contentType)) {
    return output;
  }

  const raw = (output.textContent || output.content || '').trim();
  if (!raw) {
    return output;
  }

  output.textContent = raw;

  let display = normalizeMarkdownDocument(raw);
  display = stripReferencePlaceholderNotes(display);
  display = rebuildReferenceSection(display, output.sources);
  display = display.replace(/\n{3,}/g, '\n\n').trim();

  output.content = display;
  return output;
}

function buildFallbackTitle(prompt: string, contentType: ContentType): string {
  const trimmed = prompt.trim();
  if (!trimmed) return `${contentType.replace('-', ' ')} draft`;

  if (trimmed.length <= 72) {
    return trimmed.replace(/\.+$/, '');
  }

  return `${trimmed.slice(0, 69).trimEnd()}...`;
}

function buildStructuredFallbackDraft(
  prompt: string,
  contentType: ContentType,
  targetAudience: string,
  sources?: ContentSource[],
): string {
  const title = buildFallbackTitle(prompt, contentType);
  const contentLabel = contentType.replace('-', ' ');
  const screenedSources = sources?.slice(0, 5) || [];
  const sourceLines = screenedSources.length > 0
    ? screenedSources.map((source) => `- ${source.title} (${source.domain})`).join('\n')
    : '- No screened sources were available during this run.';

  if (contentType === 'presentation') {
    return `# ${title}

## Draft Status
This ${contentLabel} draft keeps the requested presentation structure, but factual slides still need stronger source support before publication.

### Audience
- Intended audience: ${targetAudience}
- Output type: ${contentLabel}
- Prompt focus: ${prompt}

## Slide Outline
### Slide 1: Title Slide
- [SOURCE NEEDED: opening claim or hook]
- [SOURCE NEEDED: subtitle supporting the main theme]

### Slide 2: Why It Matters
- [SOURCE NEEDED: burden, prevalence, or context data]
- [SOURCE NEEDED: audience-specific implication]

### Slide 3: Key Insights
- [SOURCE NEEDED: core supporting point]
- [SOURCE NEEDED: second evidence-backed takeaway]
- [SOURCE NEEDED: implementation or outcome signal]

### Slide 4: Recommended Actions
- [SOURCE NEEDED: action or recommendation 1]
- [SOURCE NEEDED: action or recommendation 2]
- [SOURCE NEEDED: action or recommendation 3]

## Sources
${sourceLines}`;
  }

  if (contentType === 'podcast') {
    return `# ${title}

## Show Details
- Audience: ${targetAudience}
- Format: single-host episode draft
- Prompt focus: ${prompt}

## Opening
[SOURCE NEEDED: concise opening statement or statistic to frame the episode.]

### Main Segment
- [SOURCE NEEDED: key point 1]
- [SOURCE NEEDED: key point 2]
- [SOURCE NEEDED: key point 3]

### Practical Takeaways
- [SOURCE NEEDED: recommendation or behavior change]
- [SOURCE NEEDED: clinical or educational implication]

## Closing
[SOURCE NEEDED: conclusion and next-step message.]

## Sources
${sourceLines}`;
  }

  const middleSectionHeading = contentType === 'report'
    ? '## Findings and Analysis'
    : contentType === 'white-paper'
      ? '## Analysis and Strategic Perspective'
      : '## Main Sections';

  const applicationsHeading = contentType === 'report'
    ? '## Recommendations'
    : contentType === 'white-paper'
      ? '## Strategic Actions'
      : '## Applications and Next Steps';

  return `# ${title}

## Draft Status
This ${contentLabel} draft preserves the requested structure, but it still needs stronger source support before final medical, legal, and regulatory review.

### Audience
- Intended audience: ${targetAudience}
- Output type: ${contentLabel}
- Prompt focus: ${prompt}

## Executive Summary
[SOURCE NEEDED: concise thesis, why the topic matters now, and the main takeaway.]

${middleSectionHeading}
### Background
[SOURCE NEEDED: context, scope, and definition of the problem.]

### Core Points
- [SOURCE NEEDED: primary evidence-backed point]
- [SOURCE NEEDED: supporting statistic or comparison]
- [SOURCE NEEDED: implication for the target audience]

${applicationsHeading}
- [SOURCE NEEDED: action or recommendation 1]
- [SOURCE NEEDED: action or recommendation 2]
- [SOURCE NEEDED: action or recommendation 3]

## Conclusion
[SOURCE NEEDED: closing summary and the most important next step.]

## Sources
${sourceLines}`;
}

function normaliseGeneratedOutput(
  output: GeneratedOutput,
  params: Pick<DetailedGenerationParams, 'prompt' | 'contentType' | 'targetAudience'>,
): GeneratedOutput {
  output = normaliseTextOutputForDisplay(output);

  if (output.format === 'html') {
    return output;
  }

  const original = (output.textContent || output.content || '').trim();
  const isStructuredTextFormat = STRUCTURED_TEXT_OUTPUTS.includes(output.contentType);
  const needsFallback = isStructuredTextFormat && (
    !original
    || original.length < 120
    || /^\[SOURCE NEEDED(?::[^\]]*)?\]$/i.test(original)
  );

  if (needsFallback) {
    const fallback = buildStructuredFallbackDraft(
      params.prompt,
      params.contentType,
      params.targetAudience,
      output.sources,
    );

    output.content = fallback;
    if (output.textContent !== undefined) {
      output.textContent = fallback;
    }
  }

  return output;
}

// Enhanced generation function with detailed parameters and iterative refinement support
export async function generateDetailedContent(params: DetailedGenerationParams): Promise<GeneratedOutput> {
  const namespace = params.apiNamespace || inferApiNamespace(params);
  const { sanitizedPrompt, sanitizedChangeRequest, scrubReport } = scrubGenerationInput(params);
  const originalPrompt = params.prompt;
  const { contentType, market, tone, length, scientificDepth, targetAudience, userId, previousOutput, iterationNumber } = params;
  const prompt = sanitizedPrompt;
  const changeRequest = sanitizedChangeRequest;
  const infographicProfile = buildInfographicOutputProfile({ prompt, tone, length, scientificDepth, targetAudience });

  try {
    // Build enhanced context for AI
    const enhancedContext = buildEnhancedContext({ contentType, market, tone, length, scientificDepth, targetAudience });
    
    // Build refinement context if this is an iteration
    const refinementContext = changeRequest ? buildRefinementContext(changeRequest, previousOutput) : null;
    
    // Generate content based on type with enhanced parameters
    let output: GeneratedOutput;

    switch (contentType) {
      case 'infographic':
        output = await generateEnhancedInfographic(prompt, enhancedContext, refinementContext, infographicProfile);
        break;
      case 'video':
        output = await generateEnhancedVideo(prompt, enhancedContext, refinementContext);
        break;
      case 'presentation':
        output = await generateEnhancedPresentation(prompt, enhancedContext, refinementContext);
        break;
      case 'social-post':
        output = await generateEnhancedSocialPost(prompt, enhancedContext, refinementContext);
        break;
      case 'document':
        output = await generateEnhancedDocument(prompt, enhancedContext, refinementContext);
        break;
      case 'report':
        output = await generateEnhancedReport(prompt, enhancedContext, refinementContext);
        break;
      case 'podcast':
        output = await generatePodcastScript(prompt, enhancedContext, refinementContext);
        break;
      case 'white-paper':
        output = await generateWhitePaper(prompt, enhancedContext, refinementContext);
        break;
      default:
        output = await generateEnhancedInfographic(prompt, enhancedContext, refinementContext, infographicProfile);
    }

    // Attach metadata required for PDF generation
    output.theme = originalPrompt;
    output.market = market;
    output.extent = scientificDepth;
    output.audience = targetAudience;
    output.apiNamespace = namespace;
    output = normaliseGeneratedOutput(output, { prompt, contentType, targetAudience });

    // Validate and sanitise output text against Gibberish / Hallucination boundaries
    const validationContent = output.textContent || output.content;

    if (validationContent && typeof validationContent === 'string') {
      const validationProfile = getOutputValidationProfile(output);
      const validation = validateOutput(validationContent, validationProfile);
      if (!validation.valid) {
        throw new Error(`Content generation failed safety checks:\n${validation.blocks.map(b => `- [${b.code}] ${b.message}`).join('\n')}`);
      }
      if (output.textContent) {
        output.textContent = sanitiseOutput(output.textContent);
      }

      if (output.format !== 'html') {
        output.content = sanitiseOutput(output.content);
      }
    }

    const guardrailReport = evaluateOperationalGuardrails({ market, prompt, targetAudience }, output);
    output.operationalGuardrails = guardrailReport;

    const complianceArchitecture = buildComplianceArchitectureSummary({
      generationParams: {
        ...params,
        apiNamespace: namespace,
        prompt: originalPrompt,
        changeRequest,
      },
      output,
      scrubReport,
      priorSnapshots: previousOutput?.complianceArchitecture?.snapshots,
    });
    output.complianceArchitecture = complianceArchitecture;
    output.regulatoryContentType = complianceArchitecture.regulatoryContentType;

    if (guardrailReport.locked) {
      throw new Error(`Operational guardrail lock:\n${guardrailReport.issues.filter(issue => issue.severity === 'block').map(issue => `- [${issue.code}] ${issue.message}`).join('\n')}`);
    }

    return output;
  } catch (error) {
    throw error;
  }
}


interface EnhancedContext {
  tone: string;
  lengthGuidance: string;
  depthGuidance: string;
  audienceGuidance: string;
  sopGuidance: string;
  contentType: ContentType;
  targetAudience: string;
  market: DetailedGenerationParams['market'];
  marketGuidance: string;
}

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const GOOGLE_CX = import.meta.env.VITE_GOOGLE_CX;

async function performGoogleSearch(query: string, limit: number): Promise<any> {
  if (!GOOGLE_API_KEY || !GOOGLE_CX) {
    console.warn('Google Search API keys not configured. Continuing without web search results.');
    return { organic_results: [], news_results: [] };
  }

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&num=${limit}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Google search failed. Continuing without web search results.', await response.text());
      return { organic_results: [], news_results: [] };
    }
    const data = await response.json();
    
    return {
      organic_results: (data.items || []).map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet
      })),
      news_results: []
    };
  } catch (error) {
    console.error('Error in Google web sweep:', error);
    return { organic_results: [], news_results: [] };
  }
}

// Helper function to extract and format sources from web search
async function extractSourcesFromSearch(
  request: Pick<DetailedGenerationParams, 'prompt' | 'contentType' | 'targetAudience'>,
  limit: number = 5,
): Promise<{ sources: ContentSource[]; sourcePromptBlock: string; governance: NonNullable<GeneratedOutput['sourceGovernance']> }> {
  try {
    const searchQuery = buildGovernedSearchQuery({
      prompt: request.prompt,
      contentType: request.contentType,
      targetAudience: request.targetAudience
    });
    const searchResults = await performGoogleSearch(searchQuery, Math.min(10, Math.max(limit * 2, 8)));
    const candidates = [
      ...(searchResults.organic_results || []),
      ...(searchResults.news_results || [])
    ]
      .filter((result: any) => result?.title && result?.link)
      .map((result: any) => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet
      }));

    return buildSourcePolicyBundle({
      prompt: request.prompt,
      contentType: request.contentType,
      targetAudience: request.targetAudience
    }, candidates, limit);
  } catch (error) {
    console.error('Error extracting sources:', error);
    return buildSourcePolicyBundle({
      prompt: request.prompt,
      contentType: request.contentType,
      targetAudience: request.targetAudience
    }, [], limit);
  }
}

// Removed addGeneralKnowledgeSource helper - sources are only added when credible sources are found
// No fallback sources to prevent fabrication

function buildEnhancedContext(params: Pick<DetailedGenerationParams, 'contentType' | 'market' | 'tone' | 'length' | 'scientificDepth' | 'targetAudience'>): EnhancedContext {
  const { contentType, market, tone, length, scientificDepth, targetAudience } = params;

  const lengthMap = {
    short: 'Keep it concise and to the point. Focus on key highlights only. Aim for brevity.',
    medium: 'Provide balanced depth with main points covered. Include supporting details.',
    long: 'Offer detailed exploration with examples, context, and thorough explanations.',
    comprehensive: 'Deliver in-depth analysis with full coverage, research-backed insights, and extensive detail.'
  };

  const depthMap = {
    basic: 'Use simple language without jargon. Explain concepts in layman\'s terms. Make it accessible to beginners.',
    intermediate: 'Include some technical terminology with context. Assume basic familiarity with the subject.',
    advanced: 'Use technical depth and industry-specific language. Assume strong prior knowledge.',
    expert: 'Provide highly specialized, research-level detail with advanced concepts and technical precision.'
  };

  const marketGuidanceMap = {
    global: 'Follow globally conservative medical, legal, and regulatory standards. Avoid unverifiable superiority or localization assumptions.',
    india: 'Apply India-sensitive medical content standards. Avoid superlatives such as "best", "unique", or "novel" unless directly supported by strong comparative evidence. For patient-facing content, aim for approximately Grade 6 readability.',
    singapore: 'Apply Singapore-sensitive content governance. Any evidence older than 5 years should be treated as requiring re-validation before final use.',
    dubai: 'Apply Dubai/UAE localisation caution. Patient-facing content should stay plain and should preserve critical medical terminology for Arabic localisation or transliteration review.'
  };

  const sopGuidance = `
═══════════════════════════════════════════════════════════
IDENTITY & CORE MANDATE
═══════════════════════════════════════════════════════════
You are a medical content design agent for DoneandDone, a Medical Affairs content studio. Your sole function is to transform verified, user-supplied source documents into structured content.

You are a DESIGNER and EXTRACTOR — never an AUTHOR.

You do not generate facts.
You do not recall facts from training.
You do not infer, estimate, or extrapolate facts.
You do not complete, round, or paraphrase statistics beyond surface formatting.

Every single claim, statistic, percentage, date, population size, drug name, or clinical assertion in your output MUST be directly extracted from the "FACTS:" sources provided below. If it is not in the provided facts, do not invent it. If source coverage is thin or missing, still produce the full requested structure, but insert explicit placeholders such as "[SOURCE NEEDED: burden data]" or "[SOURCE NEEDED: guideline-backed recommendation]" exactly where the missing fact belongs.

═══════════════════════════════════════════════════════════
WHAT YOU ARE ALLOWED TO GENERATE INDEPENDENTLY
═══════════════════════════════════════════════════════════
You MAY independently generate:
- Section headings and structural labels
- Connective sentences between extracted facts (e.g. "This suggests that...")
- Visual layout instructions and design directions
- Formatting suggestions
- Transition copy that does not introduce new claims

You MUST NOT independently generate:
- Any number, percentage, ratio, or quantitative value
- Any clinical claim, efficacy statement, or safety finding
- Any demographic, drug name, dose, or regulatory status

═══════════════════════════════════════════════════════════
EXTRACTION RULES & HALLUCINATION PREVENTION
═══════════════════════════════════════════════════════════
1. VERBATIM ANCHOR: For every statistic, verify your extraction matches the source verbatim. Do not round numbers or convert units.
2. SOURCE TRACEABILITY: Ensure every final message is traceable to the originating scientific evidence you cite.
3. TRAINING KNOWLEDGE FIREWALL: If you are about to write a fact based on your training data but cannot locate it in the provided documents, STOP. Write instead: [SOURCE NEEDED: {description}].
4. QUALIFIER PRESERVATION: Preserve qualifiers. "Up to 45%" must not become "45%".
5. COGNITIVE LOAD OPTIMIZATION: Respect HCP/patient mental bandwidth. Use ONLY ONE core message per visual/slide. Use progressive disclosure of complexity.

=== QUALITY & FORMATTING SOPs (STRICT INSTRUCTIONS) ===
6. Impeccable Language: Ensure flawless spelling, grammar, and punctuation.
7. Anti-Overcrowding: The output must NEVER be overcrowded. Use generous whitespace, short paragraphs, and clear formatting. Keep text minimal and impactful. Use bullet points strictly limited to 3-5 items per section. Provide clear hierarchy.
======================================================
  `.trim();

  return {
    tone: `Adopt a ${tone} tone throughout`,
    lengthGuidance: lengthMap[length],
    depthGuidance: depthMap[scientificDepth],
    audienceGuidance: `This content is for: ${targetAudience}. Tailor language, examples, and complexity accordingly.`,
    sopGuidance,
    contentType,
    targetAudience,
    market,
    marketGuidance: marketGuidanceMap[market]
  };
}

interface RefinementContext {
  changeInstructions: string;
  keepUnchanged: string;
  previousContent: string;
}

type InfographicLayoutMode = RealWorldInfographicData['layout']['mode'];

interface InfographicLayoutPlan {
  mode: InfographicLayoutMode;
  heroEyebrow: string;
  barSectionTitle: string;
  recommendationsTitle: string;
  sectionFallbackTitles: [string, string, string];
}

interface InfographicOutputProfile {
  renderVariant: 'poster' | 'longform';
  blockFamily: 'core' | 'guide';
  supportingStatCount: number;
  dataBarCount: number;
  sectionCount: number;
  recommendationCount: number;
  riskFactorCount: number;
  warningSignCount: number;
  pillarCount: number;
  keyNumberCount: number;
  timelineCount: number;
  actionPlanCount: number;
  heroLineWords: number;
  heroLineChars: number;
  subtitleWords: number;
  subtitleChars: number;
  supportingLabelWords: number;
  supportingLabelChars: number;
  barLabelWords: number;
  barLabelChars: number;
  barSublabelWords: number;
  barSublabelChars: number;
  sectionTitleWords: number;
  sectionTitleChars: number;
  bulletWords: number;
  bulletChars: number;
  recommendationWords: number;
  recommendationChars: number;
  introWords: number;
  introChars: number;
  statLabelWords: number;
  statLabelChars: number;
}

const INFOGRAPHIC_COLOR_CLASSES = ['', 'c-mint', 'c-gold', 'c-sky', 'c-purple', 'c-red'] as const;

type InfographicColorClass = RealWorldInfographicData['supportingStats'][number]['colorClass'];

function getInfographicLayoutPlan(prompt: string): InfographicLayoutPlan {
  const text = prompt.toLowerCase();

  if (/\b(vs|versus|compare|comparison|compared|difference|before and after|before-after)\b/.test(text)) {
    return {
      mode: 'comparison',
      heroEyebrow: 'Side-by-Side View',
      barSectionTitle: 'Comparison Snapshot',
      recommendationsTitle: 'Recommended Moves',
      sectionFallbackTitles: ['Side A', 'Side B', 'Decision Lens'],
    };
  }

  if (/\b(step|steps|process|workflow|journey|pathway|how to|funnel)\b/.test(text)) {
    return {
      mode: 'process',
      heroEyebrow: 'Process View',
      barSectionTitle: 'Stage Metrics',
      recommendationsTitle: 'Next Steps',
      sectionFallbackTitles: ['Start', 'Progress', 'Action'],
    };
  }

  if (/\b(timeline|roadmap|history|over time|trend|trajectory|forecast)\b/.test(text)) {
    return {
      mode: 'timeline',
      heroEyebrow: 'Trend View',
      barSectionTitle: 'Trend Markers',
      recommendationsTitle: 'What To Do Next',
      sectionFallbackTitles: ['Past', 'Current State', 'What Comes Next'],
    };
  }

  if (/\b(pillar|framework|drivers|factors|components|dimensions|themes)\b/.test(text)) {
    return {
      mode: 'framework',
      heroEyebrow: 'Framework View',
      barSectionTitle: 'Core Dimensions',
      recommendationsTitle: 'Strategic Actions',
      sectionFallbackTitles: ['Dimension 1', 'Dimension 2', 'Dimension 3'],
    };
  }

  return {
    mode: 'snapshot',
    heroEyebrow: 'Evidence Snapshot',
    barSectionTitle: 'Core Metrics',
    recommendationsTitle: 'Recommended Actions',
    sectionFallbackTitles: ['What Matters', 'What It Means', 'What To Do'],
  };
}

function buildInfographicOutputProfile(params: Pick<DetailedGenerationParams, 'prompt' | 'tone' | 'length' | 'scientificDepth' | 'targetAudience'>): InfographicOutputProfile {
  const prompt = params.prompt.toLowerCase();
  const conciseIntent = /\b(one page|one-page|poster|snapshot|summary|overview|quick|executive|scannable)\b/.test(prompt);
  const expansiveIntent = /\b(comprehensive|detailed|thorough|complete|deep dive|full guide|everything|nothing is missed|explainer)\b/.test(prompt);
  const guideIntent = /\b(guide|prevention|symptoms|screening|action plan|risk factors|what you need to know|how to prevent|warning signs)\b/.test(prompt);
  const longformBySettings = params.length === 'long'
    || params.length === 'comprehensive'
    || params.scientificDepth === 'advanced'
    || params.scientificDepth === 'expert'
    || params.tone === 'academic';
  const renderVariant: InfographicOutputProfile['renderVariant'] = conciseIntent && !expansiveIntent
    ? 'poster'
    : (expansiveIntent || longformBySettings ? 'longform' : 'poster');
  const blockFamily: InfographicOutputProfile['blockFamily'] = renderVariant === 'longform' && guideIntent ? 'guide' : 'core';

  if (renderVariant === 'longform') {
    return {
      renderVariant,
      blockFamily,
      supportingStatCount: params.length === 'comprehensive' ? 4 : 3,
      dataBarCount: params.length === 'comprehensive' ? 6 : 5,
      sectionCount: params.length === 'comprehensive' ? 5 : 4,
      recommendationCount: params.length === 'comprehensive' ? 6 : 5,
      riskFactorCount: blockFamily === 'guide' ? (params.length === 'comprehensive' ? 8 : 6) : 0,
      warningSignCount: blockFamily === 'guide' ? (params.length === 'comprehensive' ? 8 : 6) : 0,
      pillarCount: blockFamily === 'guide' ? 5 : 0,
      keyNumberCount: blockFamily === 'guide' ? (params.length === 'comprehensive' ? 6 : 4) : 0,
      timelineCount: blockFamily === 'guide' ? 4 : 0,
      actionPlanCount: blockFamily === 'guide' ? 3 : 0,
      heroLineWords: 5,
      heroLineChars: 34,
      subtitleWords: 28,
      subtitleChars: 180,
      supportingLabelWords: 11,
      supportingLabelChars: 80,
      barLabelWords: 8,
      barLabelChars: 54,
      barSublabelWords: 16,
      barSublabelChars: 110,
      sectionTitleWords: 6,
      sectionTitleChars: 40,
      bulletWords: 16,
      bulletChars: 130,
      recommendationWords: 14,
      recommendationChars: 120,
      introWords: 56,
      introChars: 260,
      statLabelWords: 10,
      statLabelChars: 72,
    };
  }

  return {
    renderVariant,
    blockFamily,
    supportingStatCount: 3,
    dataBarCount: 5,
    sectionCount: 3,
    recommendationCount: 4,
    riskFactorCount: 0,
    warningSignCount: 0,
    pillarCount: 0,
    keyNumberCount: 0,
    timelineCount: 0,
    actionPlanCount: 0,
    heroLineWords: 4,
    heroLineChars: 28,
    subtitleWords: 18,
    subtitleChars: 110,
    supportingLabelWords: 7,
    supportingLabelChars: 52,
    barLabelWords: 5,
    barLabelChars: 40,
    barSublabelWords: 9,
    barSublabelChars: 60,
    sectionTitleWords: 4,
    sectionTitleChars: 30,
    bulletWords: 10,
    bulletChars: 96,
    recommendationWords: 10,
    recommendationChars: 110,
    introWords: 32,
    introChars: 180,
    statLabelWords: 7,
    statLabelChars: 48,
  };
}

function stripMarkup(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|br|section|article|header|footer|ul|ol)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(value: unknown, fallback = '', maxLength = 160): string {
  const raw = typeof value === 'string'
    ? value
    : Array.isArray(value)
      ? value.map((item) => (typeof item === 'string' ? item : '')).filter(Boolean).join(' ')
      : value == null
        ? ''
        : String(value);

  const cleaned = stripMarkup(raw)
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return fallback;
  }

  return cleaned.length > maxLength
    ? `${cleaned.slice(0, maxLength - 1).trimEnd()}…`
    : cleaned;
}

function compactText(value: unknown, fallback = '', maxWords = 12, maxLength = 160): string {
  const base = cleanText(value, fallback, Math.max(maxLength * 2, maxLength + 40));
  const words = base.split(/\s+/).filter(Boolean);
  const compacted = words.length > maxWords
    ? `${words.slice(0, maxWords).join(' ')}…`
    : base;

  return compacted.length > maxLength
    ? `${compacted.slice(0, maxLength - 1).trimEnd()}…`
    : compacted;
}

function normaliseColorClass(value: unknown, index: number): InfographicColorClass {
  const candidate = typeof value === 'string' ? value.trim() : '';

  if (INFOGRAPHIC_COLOR_CLASSES.includes(candidate as InfographicColorClass)) {
    return candidate as InfographicColorClass;
  }

  return INFOGRAPHIC_COLOR_CLASSES[(index % (INFOGRAPHIC_COLOR_CLASSES.length - 1)) + 1];
}

function toClaimId(index: number): string {
  return `C${String(index + 1).padStart(3, '0')}`;
}

function extractClaimId(value: unknown, fallbackClaimId: string): string {
  const text = cleanText(value, '', 48);
  const match = text.match(/C\d{3,4}/i);

  return match ? match[0].toUpperCase() : fallbackClaimId;
}

function ensureClaimAnchor(value: unknown, fallbackClaimId: string): string {
  const text = cleanText(value, '', 80);
  const claimId = extractClaimId(text, fallbackClaimId);

  if (!text) {
    return `(${claimId})`;
  }

  if (text.toUpperCase() === claimId) {
    return `(${claimId})`;
  }

  return /\(C\d{3,4}\)/i.test(text) ? text : `${text} (${claimId})`;
}

function parseMetric(numberValue: unknown, unitValue: unknown) {
  let number = cleanText(numberValue, 'N/A', 16);
  let unit = cleanText(unitValue, '', 12);

  if (number !== 'N/A' && !unit) {
    const match = number.match(/^([<>~]?\s*\d[\d.,]*)(.*)$/);
    if (match) {
      number = match[1].trim();
      unit = match[2].trim();
    }
  }

  if (!unit && number.endsWith('%')) {
    number = number.slice(0, -1).trim();
    unit = '%';
  }

  return { number, unit };
}

function clampPercentage(value: unknown, displayValue: unknown, fallback: number): number {
  const numericValue = typeof value === 'number'
    ? value
    : Number.parseFloat(cleanText(value, '', 12).replace('%', ''));
  const numericDisplay = Number.parseFloat(cleanText(displayValue, '', 12).replace('%', ''));
  const candidate = Number.isFinite(numericValue)
    ? numericValue
    : Number.isFinite(numericDisplay)
      ? numericDisplay
      : fallback;

  return Math.min(100, Math.max(0, Math.round(candidate)));
}

function buildFallbackReferences(sources: ContentSource[]): RealWorldInfographicData['references'] {
  if (sources.length === 0) {
    return [{
      id: 'C001',
      citation: 'Source needed. No verified web source was available for this prompt.',
    }];
  }

  return sources.slice(0, 5).map((source, index) => ({
    id: toClaimId(index),
    citation: cleanText(
      `${source.title}. ${source.domain}${source.url ? ` - ${source.url}` : ''}`,
      `Source ${index + 1}`,
      180,
    ),
  }));
}

function buildInfographicTextSummary(data: RealWorldInfographicData): string {
  return [
    `# ${data.hero.titleLine1} ${data.hero.titleLine2}`.trim(),
    data.hero.subtitle,
    '',
    `Main stat: ${data.mainStat.number}${data.mainStat.unit ? ` ${data.mainStat.unit}` : ''} - ${data.mainStat.label} ${data.mainStat.source}`.trim(),
    '',
    '### Overview',
    `- ${data.intro.text} ${data.intro.source}`.trim(),
    ...data.supportingStats.map((stat) => `- ${stat.number} ${stat.label} ${stat.source}`.trim()),
    '',
    `### ${data.layout.barSectionTitle}`,
    ...data.dataBars.map((bar) => `- ${bar.label}: ${bar.displayValue} ${bar.source}`.trim()),
    '',
    ...(data.guideBlocks ? [
      '### Risk Factors',
      ...data.guideBlocks.riskFactors.map((risk) => `- ${risk.title}: ${risk.detail}`),
      '',
      '### Warning Signs',
      ...data.guideBlocks.warningSigns.map((sign) => `- ${sign.text}`),
      '',
      '### Prevention Pillars',
      ...data.guideBlocks.pillars.flatMap((pillar) => [`### ${pillar.title}`, ...pillar.bullets.map((bullet) => `- ${bullet}`)]),
      '',
      '### Key Numbers',
      ...data.guideBlocks.keyNumbers.map((item) => `- ${item.value}: ${item.label}`),
      '',
      '### Timeline',
      ...data.guideBlocks.timeline.map((item) => `- ${item.title}: ${item.detail}`),
      '',
      '### Action Plan',
      ...data.guideBlocks.actionPlan.flatMap((step) => [`### ${step.title}`, ...step.bullets.map((bullet) => `- ${bullet}`)]),
      '',
    ] : []),
    ...data.sections.flatMap((section) => [
      `### ${section.title}`,
      ...section.bullets.map((bullet) => `- ${bullet}`),
      `Source: ${section.claimRefs}`,
      '',
    ]),
    `### ${data.layout.recommendationsTitle}`,
    ...data.recommendations.map((recommendation) => `- ${recommendation.text} ${recommendation.source}`.trim()),
    '',
    '### References',
    ...data.references.map((reference) => `- (${reference.id}) ${reference.citation}`),
  ].join('\n');
}

function normaliseInfographicData(
  raw: unknown,
  prompt: string,
  audience: string,
  sources: ContentSource[],
  profile: InfographicOutputProfile,
): RealWorldInfographicData {
  const layoutPlan = getInfographicLayoutPlan(prompt);
  const audienceLabel = cleanText(
    audience
      .replace(/^This content is for:\s*/i, '')
      .replace(/\.\s*Tailor[\s\S]*$/i, ''),
    'Medical audience',
    25,
  );
  const sourceBackedClaims = sources.flatMap((source, index) => {
    const claimId = toClaimId(index);
    const items = [source.snippet, source.title]
      .map((entry) => cleanText(entry, '', 120))
      .filter(Boolean);

    return items.map((entry) => `${entry} (${claimId})`);
  });

  const fallbackReferences = buildFallbackReferences(sources);
  const rawObject = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
  const rawTags = (rawObject.tags && typeof rawObject.tags === 'object') ? rawObject.tags as Record<string, unknown> : {};
  const rawHero = (rawObject.hero && typeof rawObject.hero === 'object') ? rawObject.hero as Record<string, unknown> : {};
  const rawMainStat = (rawObject.mainStat && typeof rawObject.mainStat === 'object') ? rawObject.mainStat as Record<string, unknown> : {};
  const rawIntro = (rawObject.intro && typeof rawObject.intro === 'object') ? rawObject.intro as Record<string, unknown> : {};
  const rawSupportingStats = Array.isArray(rawObject.supportingStats) ? rawObject.supportingStats : [];
  const rawDataBars = Array.isArray(rawObject.dataBars) ? rawObject.dataBars : [];
  const rawSections = Array.isArray(rawObject.sections) ? rawObject.sections : [];
  const rawRecommendations = Array.isArray(rawObject.recommendations) ? rawObject.recommendations : [];
  const rawReferences = Array.isArray(rawObject.references) ? rawObject.references : [];
  const rawRiskFactors = Array.isArray(rawObject.riskFactors) ? rawObject.riskFactors : [];
  const rawWarningSigns = Array.isArray(rawObject.warningSigns) ? rawObject.warningSigns : [];
  const rawPillars = Array.isArray(rawObject.pillars) ? rawObject.pillars : [];
  const rawKeyNumbers = Array.isArray(rawObject.keyNumbers) ? rawObject.keyNumbers : [];
  const rawTimeline = Array.isArray(rawObject.timeline) ? rawObject.timeline : [];
  const rawActionPlan = Array.isArray(rawObject.actionPlan) ? rawObject.actionPlan : [];

  const references = (rawReferences.length > 0 ? rawReferences : fallbackReferences).map((reference, index) => {
    const rawReference = (reference && typeof reference === 'object') ? reference as Record<string, unknown> : {};
    const fallbackClaimId = fallbackReferences[index]?.id || toClaimId(index);
    const id = extractClaimId(rawReference.id, fallbackClaimId);
    const sourceCitation = fallbackReferences[index]?.citation || sourceBackedClaims[index] || 'Source needed for verification.';

    return {
      id,
      citation: cleanText(rawReference.citation, sourceCitation, 180),
    };
  });

  const referenceIds = references.map((reference) => reference.id);
  const claimIdAt = (index: number) => referenceIds[index % referenceIds.length] || 'C001';
  const fallbackClaimText = (index: number, fallback: string) => sourceBackedClaims[index % sourceBackedClaims.length] || `${fallback} (${claimIdAt(index)})`;

  const { number: mainStatNumber, unit: mainStatUnit } = parseMetric(rawMainStat.number, rawMainStat.unit);
  const mainStatLabel = compactText(rawMainStat.label, 'Primary verified metric', profile.statLabelWords, profile.statLabelChars);

  const supportingStats = Array.from({ length: profile.supportingStatCount }, (_, index) => {
    const rawStat = (rawSupportingStats[index] && typeof rawSupportingStats[index] === 'object')
      ? rawSupportingStats[index] as Record<string, unknown>
      : {};
    const fallback = fallbackClaimText(index + 1, `Verified point ${index + 1}`);
    const source = ensureClaimAnchor(rawStat.source, claimIdAt(index + 1));
    const { number } = parseMetric(rawStat.number, '');

    return {
      number,
      label: compactText(rawStat.label, fallback, profile.supportingLabelWords, profile.supportingLabelChars),
      source,
      colorClass: normaliseColorClass(rawStat.colorClass, index),
    };
  });

  const dataBars = Array.from({ length: profile.dataBarCount }, (_, index) => {
    const rawBar = (rawDataBars[index] && typeof rawDataBars[index] === 'object')
      ? rawDataBars[index] as Record<string, unknown>
      : {};
    const fallback = fallbackClaimText(index, `Metric ${index + 1}`);
    const percentage = clampPercentage(rawBar.percentage, rawBar.displayValue, 0);
    const displayValue = cleanText(rawBar.displayValue, percentage > 0 ? `${percentage}%` : 'Source needed', 18);

    return {
      label: compactText(rawBar.label, `Metric ${index + 1}`, profile.barLabelWords, profile.barLabelChars),
      sublabel: compactText(rawBar.sublabel, fallback, profile.barSublabelWords, profile.barSublabelChars),
      percentage,
      displayValue,
      source: ensureClaimAnchor(rawBar.source, claimIdAt(index)),
      colorClass: normaliseColorClass(rawBar.colorClass, index),
    };
  });

  const sections = Array.from({ length: profile.sectionCount }, (_, index) => {
    const rawSection = (rawSections[index] && typeof rawSections[index] === 'object')
      ? rawSections[index] as Record<string, unknown>
      : {};
    const rawBullets = Array.isArray(rawSection.bullets) ? rawSection.bullets : [];
    const bullets = Array.from({ length: 4 }, (_, bulletIndex) => {
      const rawBullet = rawBullets[bulletIndex];
      return compactText(
        rawBullet,
        fallbackClaimText(index * 2 + bulletIndex, `Evidence point ${bulletIndex + 1}`),
        profile.bulletWords,
        profile.bulletChars,
      );
    });

    return {
      title: compactText(
        rawSection.title,
        layoutPlan.sectionFallbackTitles[index] || `Key Area ${index + 1}`,
        profile.sectionTitleWords,
        profile.sectionTitleChars,
      ),
      bullets,
      claimRefs: ensureClaimAnchor(rawSection.claimRefs, claimIdAt(index)),
      colorClass: normaliseColorClass(rawSection.colorClass, index),
    };
  });

  const recommendations = Array.from({ length: profile.recommendationCount }, (_, index) => {
    const rawRecommendation = (rawRecommendations[index] && typeof rawRecommendations[index] === 'object')
      ? rawRecommendations[index] as Record<string, unknown>
      : {};

    return {
      text: compactText(
        rawRecommendation.text,
        [
          'Review the primary source evidence before publication.',
          'Keep one core message per panel to preserve readability.',
          'Retain claim anchors beside every statistic or clinical assertion.',
          'Escalate unresolved data gaps for medical review before release.',
          'Match the action plan to audience readiness and context.',
          'Separate foundational habits from follow-up monitoring steps.',
        ][index],
        profile.recommendationWords,
        profile.recommendationChars,
      ),
      source: ensureClaimAnchor(rawRecommendation.source, claimIdAt(index)),
    };
  });

  const guideBlocks = profile.blockFamily === 'guide'
    ? {
        riskFactors: Array.from({ length: profile.riskFactorCount }, (_, index) => {
          const rawRisk = (rawRiskFactors[index] && typeof rawRiskFactors[index] === 'object')
            ? rawRiskFactors[index] as Record<string, unknown>
            : {};
          return {
            title: compactText(rawRisk.title, `Risk factor ${index + 1}`, 5, 38),
            detail: compactText(
              rawRisk.detail,
              fallbackClaimText(index, `Key risk driver ${index + 1}`),
              12,
              84,
            ),
            colorClass: normaliseColorClass(rawRisk.colorClass, index),
          };
        }),
        warningSigns: Array.from({ length: profile.warningSignCount }, (_, index) => {
          const rawSign = rawWarningSigns[index];
          const text = typeof rawSign === 'string'
            ? rawSign
            : rawSign && typeof rawSign === 'object'
              ? (rawSign as Record<string, unknown>).text
              : '';

          return {
            text: compactText(text, `Warning sign ${index + 1}`, 4, 42),
          };
        }),
        pillars: Array.from({ length: profile.pillarCount }, (_, index) => {
          const rawPillar = (rawPillars[index] && typeof rawPillars[index] === 'object')
            ? rawPillars[index] as Record<string, unknown>
            : {};
          const rawBullets = Array.isArray(rawPillar.bullets) ? rawPillar.bullets : [];
          const fallbackTitles = ['Diet', 'Activity', 'Weight', 'Sleep & Stress', 'Daily Habits'];

          return {
            title: compactText(rawPillar.title, fallbackTitles[index] || `Pillar ${index + 1}`, 4, 30),
            bullets: Array.from({ length: 4 }, (_, bulletIndex) => compactText(
              rawBullets[bulletIndex],
              `Priority action ${bulletIndex + 1}`,
              10,
              90,
            )),
            colorClass: normaliseColorClass(rawPillar.colorClass, index),
          };
        }),
        keyNumbers: Array.from({ length: profile.keyNumberCount }, (_, index) => {
          const rawNumber = (rawKeyNumbers[index] && typeof rawKeyNumbers[index] === 'object')
            ? rawKeyNumbers[index] as Record<string, unknown>
            : {};
          const fallbackValue = index === 0
            ? `${mainStatNumber}${mainStatUnit || ''}`
            : supportingStats[index - 1]?.number || dataBars[index - 1]?.displayValue || `#${index + 1}`;
          const fallbackLabel = index === 0
            ? mainStatLabel
            : supportingStats[index - 1]?.label || dataBars[index - 1]?.label || `Key number ${index + 1}`;

          return {
            value: compactText(rawNumber.value, fallbackValue, 4, 20),
            label: compactText(rawNumber.label, fallbackLabel, 7, 54),
            colorClass: normaliseColorClass(rawNumber.colorClass, index),
          };
        }),
        timeline: Array.from({ length: profile.timelineCount }, (_, index) => {
          const rawItem = (rawTimeline[index] && typeof rawTimeline[index] === 'object')
            ? rawTimeline[index] as Record<string, unknown>
            : {};
          const fallbackTitles = ['Screen', 'Assess', 'Follow Up', 'Escalate'];
          return {
            title: compactText(rawItem.title, fallbackTitles[index] || `Step ${index + 1}`, 5, 40),
            detail: compactText(rawItem.detail, `Important checkpoint ${index + 1}`, 14, 110),
            colorClass: normaliseColorClass(rawItem.colorClass, index),
          };
        }),
        actionPlan: Array.from({ length: profile.actionPlanCount }, (_, index) => {
          const rawStep = (rawActionPlan[index] && typeof rawActionPlan[index] === 'object')
            ? rawActionPlan[index] as Record<string, unknown>
            : {};
          const rawBullets = Array.isArray(rawStep.bullets) ? rawStep.bullets : [];
          const fallbackTitles = ['Start', 'Build', 'Sustain'];
          return {
            title: compactText(rawStep.title, fallbackTitles[index] || `Phase ${index + 1}`, 4, 28),
            bullets: Array.from({ length: 3 }, (_, bulletIndex) => compactText(
              rawBullets[bulletIndex],
              `Action item ${bulletIndex + 1}`,
              10,
              90,
            )),
            colorClass: normaliseColorClass(rawStep.colorClass, index),
          };
        }),
      }
    : undefined;

  return {
    layout: {
      mode: layoutPlan.mode,
      barSectionTitle: layoutPlan.barSectionTitle,
      recommendationsTitle: layoutPlan.recommendationsTitle,
    },
    guideBlocks,
    tags: {
      format: cleanText(rawTags.format, 'Infographic', 15),
      extent: cleanText(rawTags.extent, 'Evidence', 15),
      audience: cleanText(rawTags.audience, audienceLabel, 25),
    },
    hero: {
      eyebrow: compactText(rawHero.eyebrow, layoutPlan.heroEyebrow, 3, 24),
      titleLine1: compactText(rawHero.titleLine1, prompt, profile.heroLineWords, profile.heroLineChars),
      titleLine2: compactText(rawHero.titleLine2, 'Key Findings', profile.heroLineWords, profile.heroLineChars),
      subtitle: compactText(
        rawHero.subtitle,
        sourceBackedClaims[0] || 'Source-backed infographic summary prepared for review.',
        profile.subtitleWords,
        profile.subtitleChars,
      ),
    },
    mainStat: {
      number: mainStatNumber,
      unit: mainStatUnit,
      label: mainStatLabel,
      source: ensureClaimAnchor(rawMainStat.source, claimIdAt(0)),
    },
    supportingStats,
    intro: {
      text: compactText(
        rawIntro.text,
        sourceBackedClaims[0] || 'Verified supporting detail is required before external use.',
        profile.introWords,
        profile.introChars,
      ),
      source: ensureClaimAnchor(rawIntro.source, claimIdAt(0)),
    },
    dataBars,
    sections,
    recommendations,
    references,
  };
}

function buildRefinementContext(changeRequest: import('@/types').ChangeRequestData, previousOutput?: GeneratedOutput): RefinementContext {
  const keepItems = changeRequest.keepExisting.length > 0 
    ? `Keep these elements unchanged: ${changeRequest.keepExisting.join(', ')}.`
    : '';

  const focusAreas = changeRequest.specificAreas.length > 0
    ? `Focus changes specifically on: ${changeRequest.specificAreas.join(', ')}.`
    : '';

  const previousSnapshot = previousOutput
    ? cleanText(
        previousOutput.textContent
          || (previousOutput.format === 'html' ? stripMarkup(previousOutput.content) : previousOutput.content),
        '',
        2000,
      )
    : '';

  const previousContent = previousSnapshot
    ? `\n\nPREVIOUS VERSION:\n${previousSnapshot}...\n`
    : '';

  return {
    changeInstructions: `REFINEMENT REQUEST: ${changeRequest.changeDescription}\n${focusAreas}\n${keepItems}`,
    keepUnchanged: keepItems,
    previousContent
  };
}

function assertSourceGovernanceUnlocked(governance: NonNullable<GeneratedOutput['sourceGovernance']>) {
  if (governance.hardLockReason) {
    throw new Error(`Operational guardrail lock:\n- [SOURCE_LOCK] ${governance.hardLockReason}`);
  }
}

// Enhanced generation functions with detailed, research-backed prompts
async function generateEnhancedInfographic(
  prompt: string,
  context: EnhancedContext,
  refinementContext: RefinementContext | null = null,
  profile: InfographicOutputProfile,
): Promise<GeneratedOutput> {
  const { sources, sourcePromptBlock, governance } = await extractSourcesFromSearch({
    prompt,
    contentType: 'infographic',
    targetAudience: context.targetAudience
  }, 5);
  assertSourceGovernanceUnlocked(governance);
  const layoutPlan = getInfographicLayoutPlan(prompt);
  const webInsights = sources.slice(0, 3).map((s, i) => `CLAIM_ID: (C00${i+1})\nSOURCE: ${s.title} (${s.domain})\nFACTS: ${s.snippet || 'N/A'}`).join('\n\n') || '';

  const refinementInstructions = refinementContext 
    ? `\n\n${refinementContext.changeInstructions}${refinementContext.previousContent}\n\nIMPORTANT: Apply the requested changes while maintaining quality. ${refinementContext.keepUnchanged}`
    : '';

  const { object } = await generateObject({
    schema: {
      tags: {
        format: "Brief format label, max 15 chars",
        extent: "Type of evidence (e.g., Scientific, RWE, HEOR)",
        audience: "Target audience summary, max 25 chars"
      },
      hero: {
        eyebrow: "Context label, e.g., Epidemiological lens",
        titleLine1: "Main title text",
        titleLine2: "Second part of title text",
        subtitle: "One-sentence summary"
      },
      mainStat: {
        number: "Just the number",
        unit: "e.g., % or x",
        label: "Descriptive label",
        source: "Must include claim ID (e.g., C001)"
      },
      supportingStats: [
        {
          number: "number",
          label: "label",
          source: "source",
          colorClass: "c-mint, c-gold, c-sky, c-purple, c-red, or empty string"
        }
      ],
      intro: {
        text: "Intro paragraph",
        source: "Source for intro"
      },
      dataBars: [
        {
          label: "label",
          sublabel: "sublabel",
          percentage: 50,
          displayValue: "50%",
          source: "source",
          colorClass: "c-mint, c-gold, c-sky, c-purple, c-red, or empty string"
        }
      ],
      sections: [
        {
          title: "Section Title",
          bullets: ["bullet 1"],
          claimRefs: "C001",
          colorClass: "c-mint, c-gold, c-sky, c-purple, c-red, or empty string"
        }
      ],
      recommendations: [
        {
          text: "recommendation text",
          source: "source"
        }
      ],
      riskFactors: [
        {
          title: "risk factor title",
          detail: "short risk factor detail",
          colorClass: "c-mint, c-gold, c-sky, c-purple, c-red, or empty string"
        }
      ],
      warningSigns: [
        {
          text: "warning sign text"
        }
      ],
      pillars: [
        {
          title: "pillar title",
          bullets: ["bullet 1"],
          colorClass: "c-mint, c-gold, c-sky, c-purple, c-red, or empty string"
        }
      ],
      keyNumbers: [
        {
          value: "number or threshold",
          label: "what the number means",
          colorClass: "c-mint, c-gold, c-sky, c-purple, c-red, or empty string"
        }
      ],
      timeline: [
        {
          title: "timeline step title",
          detail: "timeline step detail",
          colorClass: "c-mint, c-gold, c-sky, c-purple, c-red, or empty string"
        }
      ],
      actionPlan: [
        {
          title: "phase title",
          bullets: ["action 1"],
          colorClass: "c-mint, c-gold, c-sky, c-purple, c-red, or empty string"
        }
      ],
      references: [
        {
          id: "C001",
          citation: "citation text"
        }
      ]
    },
    prompt: `You are DoneandDone — a one-try content generator that produces publish-ready infographics with credible sources.${refinementInstructions}

GOAL: Create a complete, structured, brand-consistent infographic JSON output. Generate ONLY valid JSON matching the exact schema provided. Do not leave any fields blank.

TARGET SHAPE:
- supportingStats: ${profile.supportingStatCount}
- dataBars: ${profile.dataBarCount}
- sections: ${profile.sectionCount}
- recommendations: ${profile.recommendationCount}
- bullets per section: exactly 4
- include all references used

TASK: Generate an infographic for: "${prompt}"

VISUAL STORY MODE: ${layoutPlan.mode.toUpperCase()}
RENDER VARIANT: ${profile.renderVariant.toUpperCase()}
Build it like a ${layoutPlan.mode} ${profile.renderVariant === 'longform' ? 'long-form explainer' : 'poster-style snapshot'}, not a dense article.
BLOCK FAMILY: ${profile.blockFamily.toUpperCase()}

COPY DISCIPLINE:
- titleLine1: max ${profile.heroLineWords} words
- titleLine2: max ${profile.heroLineWords} words
- subtitle: max ${profile.subtitleWords} words
- mainStat label: max ${profile.statLabelWords} words
- supportingStats labels: max ${profile.supportingLabelWords} words each
- dataBars labels: max ${profile.barLabelWords} words; sublabels: max ${profile.barSublabelWords} words
- section titles: max ${profile.sectionTitleWords} words
- section bullets: max ${profile.bulletWords} words each, fragment style, no long sentences
- recommendations: max ${profile.recommendationWords} words each, imperative style
- ${profile.renderVariant === 'longform'
  ? 'Allow richer explanation, but keep every block scannable and modular.'
  : 'Prefer compression, contrast, and instant scanability over completeness.'}
- One idea per card, one metric per row, no filler paragraphs

${profile.blockFamily === 'guide' ? `GUIDE BLOCKS:
- riskFactors: ${profile.riskFactorCount}
- warningSigns: ${profile.warningSignCount}
- pillars: ${profile.pillarCount} cards with 4 bullets each
- keyNumbers: ${profile.keyNumberCount}
- timeline: ${profile.timelineCount}
- actionPlan: ${profile.actionPlanCount} phases with 3 bullets each
- These guide blocks should cover practical understanding, detection, and action steps` : 'Guide blocks may be returned as empty arrays when not needed.'}

${context.tone}. ${context.lengthGuidance}. Write source-rich but visually concise content.
${context.depthGuidance}
${context.audienceGuidance}
${context.marketGuidance}
${context.sopGuidance}
${sourcePromptBlock}

${webInsights ? `Use these credible web sources in your content:\n${webInsights}\n\nIMPORTANT: Every single statistic, metric, or factual claim you make MUST be immediately followed by its CLAIM_ID (e.g. "Over 40% of patients responded (C001)"). Do not invent citations. Do not make unsourced claims.` : ''}`
  });

  const infographicData = normaliseInfographicData(object, prompt, context.audienceGuidance, sources, profile);
  const textContent = buildInfographicTextSummary(infographicData);

  const compiledHtml = profile.renderVariant === 'longform'
    ? compileLongInfographicHtml(infographicData)
    : compilePosterInfographicHtml(infographicData);
  const imagePrompt = `Create a professional, impactful template or background illustration for an infographic about: ${prompt}. 
  Style: Modern, clean, data-driven design. ${context.tone}.
  Target audience: ${context.audienceGuidance}
  Colors: Use a vibrant, professional color palette that conveys credibility.
  Layout: Vertical format, scannable, with strong visual impact. The image MUST serve as a beautiful cover plate or graphic header. ABSOLUTELY NO TEXT, NO LETTERS, AND NO WORDS. Provide a pure abstract, textured geometric background. DO NOT DRAW ANY CHARACTERS OR NUMBERS.`;

  const { data } = await generateImage({
    prompt: imagePrompt,
    n: 1
  });

  // Validate image URL is from free source
  logValidationReport([data[0].url], 'Infographic Generation');

  // Sources already extracted earlier - use them
  const finalSources = sources.length > 0 
    ? sources.slice(0, 5) // Max 5 sources 
    : []; // No fallback - show explicit message if no sources found

  return {
    contentType: 'infographic',
    content: compiledHtml,
    textContent,
    renderVariant: profile.renderVariant,
    format: 'html',
    downloadUrl: '#',
    previewUrl: data[0].url,
    sources: finalSources,
    sourceGovernance: governance,
    infographicData: undefined // Removed in favor of pure HTML string passing for the new layout
  };
}

async function generateEnhancedVideo(prompt: string, context: EnhancedContext, refinementContext: RefinementContext | null = null): Promise<GeneratedOutput> {
  const { sources, sourcePromptBlock, governance } = await extractSourcesFromSearch({
    prompt,
    contentType: 'video',
    targetAudience: context.targetAudience
  }, 5);
  assertSourceGovernanceUnlocked(governance);
  const webInsights = sources.slice(0, 3).map(s => `SOURCE: ${s.title} (${s.domain})\nFACTS: ${s.snippet || 'N/A'}`).join('\n\n') || '';

  const refinementInstructions = refinementContext 
    ? `\n\n${refinementContext.changeInstructions}${refinementContext.previousContent}\n\nIMPORTANT: Apply the requested changes while maintaining quality. ${refinementContext.keepUnchanged}`
    : '';

  // Step 1: Generate video script structure
  const { object: videoScript } = await generateObject({
    prompt: `You are DoneandDone — a one-try video generator that creates compelling video content.${refinementInstructions}

GOAL: Create a complete video structure with scenes in ONE TRY.

TASK: Generate video content for: "${prompt}"

${context.tone}. ${context.lengthGuidance}
${context.depthGuidance}
${context.audienceGuidance}
${context.marketGuidance}
${context.sopGuidance}
${sourcePromptBlock}

${webInsights ? `Use these credible web sources:\n${webInsights}\n` : ''}

Create 3-6 video scenes with:
- Opening scene: Attention-grabbing hook (2-3 seconds)
- Middle scenes: Key message/story development (4-6 seconds each)
- Closing scene: Call-to-action or key takeaway (2-3 seconds)

Each scene needs:
- Compelling visual description (what appears on screen)
- On-screen text (if any) - short, impactful phrases
- Voiceover text (what narrator says) - conversational, engaging
- Duration in seconds

Total video should be 15-45 seconds (short-form optimized).

Make it scroll-stopping, data-backed when possible, emotionally engaging.`,
    schema: {
      type: 'object',
      properties: {
        videoTitle: { type: 'string' },
        totalDuration: { type: 'number' },
        scenes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sceneNumber: { type: 'number' },
              visualDescription: { type: 'string' },
              onScreenText: { type: 'string' },
              voiceoverText: { type: 'string' },
              durationSeconds: { type: 'number' }
            },
            required: ['sceneNumber', 'visualDescription', 'voiceoverText', 'durationSeconds']
          }
        },
        musicMood: { type: 'string' },
        colorPalette: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['videoTitle', 'totalDuration', 'scenes']
    }
  });

  console.log(`Generated video script with ${videoScript.scenes.length} scenes, total ${videoScript.totalDuration}s`);

  // Step 2: Generate key frames/visuals for each scene
  const sceneImagePromises = videoScript.scenes.map(async (scene: any) => {
    const { data } = await generateImage({
      prompt: `Create scene ${scene.sceneNumber} for a professional ${videoScript.totalDuration}-second video about: ${prompt}.
      
Scene visual: ${scene.visualDescription}
${scene.onScreenText ? `On-screen text overlay: "${scene.onScreenText}"` : ''}
${context.tone}. Target audience: ${context.audienceGuidance}

Style requirements:
- 16:9 aspect ratio (1920x1080 or similar)
- Cinematic, broadcast-quality visuals
- ${videoScript.colorPalette ? `Use colors: ${videoScript.colorPalette.join(', ')}` : 'Professional, vibrant color palette'}
- ${scene.onScreenText ? 'Include bold, readable text overlay' : 'Clean visuals without text'}
- High-impact, attention-grabbing composition
- Mobile-optimized and scroll-stopping quality`,
      n: 1
    });

    logValidationReport([data[0].url], `Video Scene ${scene.sceneNumber}`);

    return {
      sceneNumber: scene.sceneNumber,
      imageUrl: data[0].url,
      visualDescription: scene.visualDescription,
      onScreenText: scene.onScreenText || '',
      voiceoverText: scene.voiceoverText,
      duration: scene.durationSeconds
    };
  });

  const videoScenes = await Promise.all(sceneImagePromises);

  console.log(`Generated ${videoScenes.length} video scene frames`);

  // Step 3: Generate thumbnail (can be scene 1 or custom)
  const { data: thumbnailData } = await generateImage({
    prompt: `Create a cinematic, high-impact video thumbnail for: ${prompt}. 
    ${context.tone}. Target audience: ${context.audienceGuidance}
    Title overlay: "${videoScript.videoTitle}"
    Style: Professional, engaging, visually striking YouTube/social media thumbnail.
    Format: 16:9 aspect ratio, broadcast quality, compelling enough to stop scrolling.
    ${videoScript.colorPalette ? `Use colors: ${videoScript.colorPalette.join(', ')}` : ''}`,
    n: 1
  });

  logValidationReport([thumbnailData[0].url], 'Video Thumbnail');

  // Step 4: Format output with video metadata
  const videoContent = JSON.stringify({
    title: videoScript.videoTitle,
    totalDuration: videoScript.totalDuration,
    musicMood: videoScript.musicMood,
    colorPalette: videoScript.colorPalette,
    scenes: videoScenes.map(s => ({
      scene: s.sceneNumber,
      visual: s.visualDescription,
      text: s.onScreenText,
      voiceover: s.voiceoverText,
      duration: s.duration,
      imageUrl: s.imageUrl
    })),
    productionNote: 'Video frames generated. Use a video editor to combine frames with voiceover audio and transitions.'
  }, null, 2);

  // Sources already extracted earlier - use them
  const finalSources = sources.length > 0 ? sources.slice(0, 5) : [];

  return {
    contentType: 'video',
    content: videoContent,
    format: 'video-frames',
    downloadUrl: thumbnailData[0].url,
    previewUrl: thumbnailData[0].url,
    videoThumbnail: thumbnailData[0].url,
    videoScenes: videoScenes,
    sources: finalSources.length > 0 ? finalSources : undefined,
    sourceGovernance: governance
  };
}

async function generateEnhancedPresentation(prompt: string, context: EnhancedContext, refinementContext: RefinementContext | null = null): Promise<GeneratedOutput> {
  const { sources, sourcePromptBlock, governance } = await extractSourcesFromSearch({
    prompt,
    contentType: 'presentation',
    targetAudience: context.targetAudience
  }, 5);
  assertSourceGovernanceUnlocked(governance);
  const webInsights = sources.slice(0, 3).map(s => `SOURCE: ${s.title} (${s.domain})\nFACTS: ${s.snippet || 'N/A'}`).join('\n\n') || '';

  const refinementInstructions = refinementContext 
    ? `\n\n${refinementContext.changeInstructions}${refinementContext.previousContent}\n\nIMPORTANT: Apply the requested changes while maintaining quality. ${refinementContext.keepUnchanged}`
    : '';

  const { text } = await generateText({
    prompt: `You are DoneandDone — a one-try content generator that produces publish-ready presentations with credible sources.${refinementInstructions}

GOAL: Create a complete, structured presentation in ONE TRY.

TASK: Generate a presentation for: "${prompt}"

${context.tone}. ${context.lengthGuidance}
${context.depthGuidance}
${context.audienceGuidance}
${context.marketGuidance}
${context.sopGuidance}
${sourcePromptBlock}

${webInsights ? `Use these credible web sources in your content:\n${webInsights}\n` : ''}

REQUIRED STRUCTURE:

Output as markdown using this pattern:

# Presentation Title
## Subtitle

### Slide 1: Title Slide
- Main title: Compelling, clear
- Subtitle: Value proposition
- Hook: Why this matters now
- Visual suggestion: Hero image, icon, or chart direction
- Speaker notes: 1-2 lines
- Timing: 1 minute

### Slide 2: Context / Opening
- Set the stage
- Highlight why this topic matters now
- Add one sourced signal where available

### Slides 3-7: Key Points
- One clear message per slide
- 3-5 bullets max
- Add sourced data or examples where available
- Include visual suggestion and speaker notes for each slide

### Slide 8: Real-World Examples
- Specific case studies or practical examples

### Slide 9: Recommendations
- Specific, actionable steps

### Slide 10: Call to Action
- What the audience should do next

## Design Theme
- Color scheme: 3-5 hex codes
- Typography: Professional, readable
- Visual style: Clean, credible, memorable

RULES:
- Be concise, factual, and India-relevant when applicable
- Never invent or hallucinate data
- One message per slide - no cluttered slides
- Build narrative toward CTA
- Make it presentation-ready with no edits
- Use markdown headings and bullets only; do not return JSON`,
    maxTokens: 2000
  });

  const { data } = await generateImage({
    prompt: `Create a professional, impactful presentation title slide for: ${prompt}.
    ${context.tone}. Target audience: ${context.audienceGuidance}
    Style: Clean, modern, authoritative design with bold typography and strategic use of whitespace.
    Layout: Title prominent, subtitle clear, visually memorable and compelling.`,
    n: 1
  });

  // Validate image URL is from free source
  logValidationReport([data[0].url], 'Presentation Generation');

  // Sources already extracted earlier - use them
  const finalSources = sources.length > 0 ? sources.slice(0, 5) : [];

  return {
    contentType: 'presentation',
    content: text,
    format: 'pptx',
    downloadUrl: data[0].url,
    previewUrl: data[0].url,
    sources: finalSources.length > 0 ? finalSources : undefined,
    sourceGovernance: governance
  };
}

async function generateEnhancedSocialPost(prompt: string, context: EnhancedContext, refinementContext: RefinementContext | null = null): Promise<GeneratedOutput> {
  // Check if prompt mentions carousel or multiple slides
  const isCarousel = /carousel|slides|series|multi-post|swipeable/i.test(prompt);
  
  if (isCarousel) {
    return await generateCarouselPost(prompt, context, refinementContext);
  }

  const { sources, sourcePromptBlock, governance } = await extractSourcesFromSearch({
    prompt,
    contentType: 'social-post',
    targetAudience: context.targetAudience
  }, 5);
  assertSourceGovernanceUnlocked(governance);
  const webInsights = sources.slice(0, 3).map(s => `SOURCE: ${s.title} (${s.domain})\nFACTS: ${s.snippet || 'N/A'}`).join('\n\n') || '';

  const refinementInstructions = refinementContext 
    ? `\n\n${refinementContext.changeInstructions}${refinementContext.previousContent}\n\nIMPORTANT: Apply the requested changes while maintaining quality. ${refinementContext.keepUnchanged}`
    : '';

  const { text } = await generateText({
    prompt: `You are DoneandDone — a one-try content generator that produces publish-ready social posts with credible sources.${refinementInstructions}

GOAL: Create a complete, scroll-stopping social post in ONE TRY.

TASK: Generate a social post for: "${prompt}"

${context.tone}. ${context.lengthGuidance}
${context.depthGuidance}
${context.audienceGuidance}
${context.marketGuidance}
${context.sopGuidance}
${sourcePromptBlock}

${webInsights ? `Use these credible web sources in your content:\n${webInsights}\n` : ''}

REQUIRED STRUCTURE:

## Headline
- Scroll-stopping hook (create curiosity or urgency)
- 5-10 words max

## Post Copy
- Opening line: Grab attention immediately
- Body: Clear value proposition with data/insights
- Emojis: Use strategically for engagement (2-3 max)
- Length: Platform-optimized (LinkedIn=longer, Instagram=concise)
- India relevance when applicable

## Call-to-Action
- Single, clear CTA (comment, share, visit, download, etc.)
- Action-oriented language

## Hashtags
- 8-12 relevant, targeted hashtags
- Mix of popular and niche tags
- Platform-appropriate

## Visual Style
- Describe the image/graphic needed
- Color mood and composition

RULES:
- Be concise, factual, and India-relevant when applicable
- Never invent or hallucinate data - cite sources
- Include at least one specific data point or stat if available
- Make it platform-ready with no edits

Format as JSON with: headline, copy, cta, hashtags (array), visualStyle, platformNotes`,
    maxTokens: 1000
  });

  const { data } = await generateImage({
    prompt: `Create a highly engaging, scroll-stopping social media post graphic for: ${prompt}.
    ${context.tone}. Target audience: ${context.audienceGuidance}
    Style: Eye-catching, platform-optimized, shareable with strategic text overlay.
    Format: Square 1:1 aspect ratio, vibrant colors, maximum visual impact, mobile-optimized.`,
    n: 1
  });

  // Validate image URL is from free source
  logValidationReport([data[0].url], 'Social Post Generation');

  // Sources already extracted earlier - use them
  const finalSources = sources.length > 0 ? sources.slice(0, 5) : [];

  return {
    contentType: 'social-post',
    content: text,
    format: 'image',
    downloadUrl: data[0].url,
    previewUrl: data[0].url,
    sources: finalSources.length > 0 ? finalSources : undefined,
    sourceGovernance: governance
  };
}

async function generateCarouselPost(prompt: string, context: EnhancedContext, refinementContext: RefinementContext | null = null): Promise<GeneratedOutput> {
  const { sources, sourcePromptBlock, governance } = await extractSourcesFromSearch({
    prompt,
    contentType: 'social-post',
    targetAudience: context.targetAudience
  }, 5);
  assertSourceGovernanceUnlocked(governance);
  const webInsights = sources
    .slice(0, 5)
    .map((source) => `${source.title}: ${source.snippet || 'No summary available.'}`)
    .join('\n');

  // Step 2: Generate carousel content structure with web data
  const refinementInstructions = refinementContext 
    ? `\n\n${refinementContext.changeInstructions}${refinementContext.previousContent}\n\nIMPORTANT: Apply the requested changes while maintaining quality. ${refinementContext.keepUnchanged}`
    : '';

  const { object: carouselStructure } = await generateObject({
    prompt: `You are an expert social media carousel designer. Create a compelling LinkedIn/Instagram carousel about: "${prompt}"${refinementInstructions}

${context.tone}. ${context.lengthGuidance}
${context.depthGuidance}
${context.audienceGuidance}
${context.marketGuidance}
${context.sopGuidance}
${sourcePromptBlock}

Use these real-world insights from the web to make content data-driven and credible:
${webInsights}

Create 5-7 carousel slides with:
- Slide 1: Attention-grabbing cover with hook title
- Slides 2-5: Key insights with specific data, statistics, or facts from the search results
- Slide 6: Call-to-action or key takeaway
- Optional Slide 7: Credits or sources

Each slide must have:
- Short, punchy title (4-8 words max)
- 1-2 sentence description with specific data
- Visual suggestion (icon, chart type, image style)

Make it scroll-stopping, data-backed, and highly shareable.`,
    schema: {
      type: 'object',
      properties: {
        overallTheme: { type: 'string' },
        colorPalette: { 
          type: 'array',
          items: { type: 'string' }
        },
        slides: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slideNumber: { type: 'number' },
              title: { type: 'string' },
              description: { type: 'string' },
              visualSuggestion: { type: 'string' },
              dataPoint: { type: 'string' }
            },
            required: ['slideNumber', 'title', 'description']
          }
        }
      },
      required: ['overallTheme', 'slides']
    }
  });

  console.log(`Generated carousel structure with ${carouselStructure.slides.length} slides`);

  // Step 3: Generate images for each slide in parallel
  const slideGenerationPromises = carouselStructure.slides.map(async (slide: any, index: number) => {
    const { data } = await generateImage({
      prompt: `Create slide ${slide.slideNumber} of a professional ${carouselStructure.overallTheme} carousel for social media.
      
Title: "${slide.title}"
Content: "${slide.description}"
Visual style: ${slide.visualSuggestion || 'Clean, modern design'}
${context.tone}. Target audience: ${context.audienceGuidance}

Style requirements:
- Square 1:1 aspect ratio (1080x1080)
- Bold, readable typography
- Professional, eye-catching design
- ${carouselStructure.colorPalette ? `Use colors: ${carouselStructure.colorPalette.join(', ')}` : 'Use vibrant, professional colors'}
- Include slide number indicator (${slide.slideNumber}/${carouselStructure.slides.length})
- Clear visual hierarchy
- Mobile-optimized and scroll-stopping`,
      n: 1
    });

    // Validate carousel slide image URL is from free source
    logValidationReport([data[0].url], `Carousel Slide ${slide.slideNumber}`);

    return {
      id: `slide-${index + 1}`,
      imageUrl: data[0].url,
      title: slide.title,
      description: slide.description
    };
  });

  const carouselSlides = await Promise.all(slideGenerationPromises);

  console.log(`Generated ${carouselSlides.length} carousel slides`);

  // Step 4: Create summary content
  const summaryText = JSON.stringify({
    theme: carouselStructure.overallTheme,
    totalSlides: carouselSlides.length,
    slides: carouselSlides.map(s => ({ title: s.title, description: s.description })),
    webInsights: 'Content enhanced with real-time web data and statistics',
    colorPalette: carouselStructure.colorPalette
  }, null, 2);

  // Extract sources from search results used in carousel
  const carouselFinalSources = sources.length > 0 ? sources.slice(0, 5) : [];

  return {
    contentType: 'social-post',
    content: summaryText,
    format: 'carousel',
    downloadUrl: carouselSlides[0].imageUrl,
    previewUrl: carouselSlides[0].imageUrl,
    carouselSlides,
    sources: carouselFinalSources.length > 0 ? carouselFinalSources : undefined,
    sourceGovernance: governance
  };
}

async function generateEnhancedDocument(prompt: string, context: EnhancedContext, refinementContext: RefinementContext | null = null): Promise<GeneratedOutput> {
  const { sources, sourcePromptBlock, governance } = await extractSourcesFromSearch({
    prompt,
    contentType: 'document',
    targetAudience: context.targetAudience
  }, 5);
  assertSourceGovernanceUnlocked(governance);
  const webInsights = sources.slice(0, 3).map(s => `SOURCE: ${s.title} (${s.domain})\nFACTS: ${s.snippet || 'N/A'}`).join('\n\n') || '';

  const refinementInstructions = refinementContext 
    ? `\n\n${refinementContext.changeInstructions}${refinementContext.previousContent}\n\nIMPORTANT: Apply the requested changes while maintaining quality. ${refinementContext.keepUnchanged}`
    : '';

  const { text } = await generateText({
    prompt: `You are DoneandDone — a one-try content generator that produces publish-ready documents with credible sources.${refinementInstructions}

GOAL: Create a complete, structured document in ONE TRY.

TASK: Generate a document for: "${prompt}"

${context.tone}. ${context.lengthGuidance}
${context.depthGuidance}
${context.audienceGuidance}
${context.marketGuidance}
${context.sopGuidance}
${sourcePromptBlock}

${webInsights ? `Use these credible web sources in your content:\n${webInsights}\n` : ''}

REQUIRED STRUCTURE:

Output as markdown using these headings:

# Title
## Subtitle

### Executive Summary
- Clear thesis or main message
- Why this matters
- Key takeaways preview

### Main Section 1
- Evidence-based content
- Data, examples, or insights where sourced

### Main Section 2
- Practical implications
- Audience-specific guidance

### Real-World Applications
- 2-3 specific case studies or examples
- Practical implementation notes

### Conclusion
- Key takeaways summary
- Recommended next steps

## Sources
- Source Name — Report/Article Title (Year)

RULES:
- Be concise, factual, and India-relevant when applicable
- Never invent or hallucinate data
- Use clear language matched to audience
- Structure for scannability
- Make it document-ready with no edits
- Never write "[SOURCE NEEDED]" inside the final Sources section
- Never add editorial notes explaining missing references in the final draft
- Use markdown headings and bullets only; do not return JSON`,
    maxTokens: 2800
  });

  const { data } = await generateImage({
    prompt: `Create a preview image of a professional, authoritative document about: ${prompt}.
    ${context.tone}. Target audience: ${context.audienceGuidance}
    Style: Clean document layout, visible professional typography, clear structure and hierarchy.
    Layout: Portrait format, business-quality aesthetic, looks like a real professional document.`,
    n: 1
  });

  // Validate image URL is from free source
  logValidationReport([data[0].url], 'Document Generation');

  // Sources already extracted earlier - use them
  const finalSources = sources.length > 0 ? sources.slice(0, 5) : [];

  return {
    contentType: 'document',
    content: text,
    format: 'docx',
    downloadUrl: data[0].url,
    previewUrl: data[0].url,
    sources: finalSources.length > 0 ? finalSources : undefined,
    sourceGovernance: governance
  };
}

async function generateEnhancedReport(prompt: string, context: EnhancedContext, refinementContext: RefinementContext | null = null): Promise<GeneratedOutput> {
  const { sources, sourcePromptBlock, governance } = await extractSourcesFromSearch({
    prompt,
    contentType: 'report',
    targetAudience: context.targetAudience
  }, 5);
  assertSourceGovernanceUnlocked(governance);
  const webInsights = sources.slice(0, 3).map(s => `SOURCE: ${s.title} (${s.domain})\nFACTS: ${s.snippet || 'N/A'}`).join('\n\n') || '';

  const refinementInstructions = refinementContext 
    ? `\n\n${refinementContext.changeInstructions}${refinementContext.previousContent}\n\nIMPORTANT: Apply the requested changes while maintaining quality. ${refinementContext.keepUnchanged}`
    : '';

  const { text } = await generateText({
    prompt: `You are DoneandDone — a one-try content generator that produces publish-ready reports with credible sources.${refinementInstructions}

GOAL: Create a complete, data-driven report in ONE TRY.

TASK: Generate a report for: "${prompt}"

${context.tone}. ${context.lengthGuidance}
${context.depthGuidance}
${context.audienceGuidance}
${context.marketGuidance}
${context.sopGuidance}
${sourcePromptBlock}

${webInsights ? `Use these credible web sources in your content:\n${webInsights}\n` : ''}

REQUIRED STRUCTURE:

Output as markdown using these headings:

# Report Title
## Executive Summary
- Key insights
- Main recommendations upfront

### Context and Problem Statement
- Background and scope
- Why this analysis is needed

### Key Findings
- Data point: quantified metric or statistic
- Supporting evidence: research, surveys, or trends
- Visual suggestion: chart type or display treatment

### Analysis
- Methodology
- Market or context analysis
- Implications

### Recommendations
- Specific, actionable steps
- Timeline and expected outcomes

### Risk Considerations
- Potential challenges
- Mitigation strategies

### Conclusion
- Vision for impact
- Next steps summary

## Sources
- Organization — Report/Study Title (Year)

RULES:
- Be concise, factual, and India-relevant when applicable
- Never invent or hallucinate data
- Use specific, real-world data from credible sources
- Make recommendations concrete and implementable
- Make it report-ready with no edits
- Never write "[SOURCE NEEDED]" inside the final Sources section
- Never add editorial notes explaining missing references in the final draft
- Use markdown headings and bullets only; do not return JSON`,
    maxTokens: 2800
  });

  const { data } = await generateImage({
    prompt: `Create a professional, data-focused report cover or visualization for: ${prompt}.
    ${context.tone}. Target audience: ${context.audienceGuidance}
    Style: Corporate, analytical, credible with charts or data graphics.
    Layout: Professional business report aesthetic, authoritative and trustworthy.`,
    n: 1
  });

  // Validate image URL is from free source
  logValidationReport([data[0].url], 'Report Generation');

  // Sources already extracted earlier - use them
  const finalSources = sources.length > 0 ? sources.slice(0, 5) : [];

  return {
    contentType: 'report',
    content: text,
    format: 'pdf',
    downloadUrl: data[0].url,
    previewUrl: data[0].url,
    sources: finalSources.length > 0 ? finalSources : undefined,
    sourceGovernance: governance
  };
}

const ALLOWED_CONTENT_TYPES: ContentType[] = [
  'infographic',
  'video',
  'presentation',
  'social-post',
  'document',
  'report',
  'podcast',
  'white-paper'
];

const ALLOWED_TONES: DetailedGenerationParams['tone'][] = [
  'professional',
  'casual',
  'academic',
  'persuasive',
  'inspirational'
];

const ALLOWED_LENGTHS: DetailedGenerationParams['length'][] = [
  'short',
  'medium',
  'long',
  'comprehensive'
];

const ALLOWED_DEPTHS: DetailedGenerationParams['scientificDepth'][] = [
  'basic',
  'intermediate',
  'advanced',
  'expert'
];

function sanitizePromptBlueprint(theme: string, option: Partial<PromptBlueprint>, index: number): PromptBlueprint {
  const contentType = ALLOWED_CONTENT_TYPES.includes(option.recommendedContentType as ContentType)
    ? option.recommendedContentType as ContentType
    : 'infographic';
  const tone = ALLOWED_TONES.includes(option.recommendedTone as DetailedGenerationParams['tone'])
    ? option.recommendedTone as DetailedGenerationParams['tone']
    : 'professional';
  const length = ALLOWED_LENGTHS.includes(option.recommendedLength as DetailedGenerationParams['length'])
    ? option.recommendedLength as DetailedGenerationParams['length']
    : 'medium';
  const scientificDepth = ALLOWED_DEPTHS.includes(option.recommendedScientificDepth as DetailedGenerationParams['scientificDepth'])
    ? option.recommendedScientificDepth as DetailedGenerationParams['scientificDepth']
    : 'intermediate';

  return {
    id: option.id?.trim() || `option-${index + 1}`,
    label: option.label?.trim() || `Option ${index + 1}`,
    angle: option.angle?.trim() || 'A strong angle tailored to the brief',
    prompt: option.prompt?.trim() || `Create a high-quality ${contentType.replace('-', ' ')} about ${theme}.`,
    rationale: option.rationale?.trim() || 'Designed to turn a short brief into a more actionable generation prompt.',
    recommendedContentType: contentType,
    recommendedTone: tone,
    recommendedLength: length,
    recommendedScientificDepth: scientificDepth,
    recommendedAudience: option.recommendedAudience?.trim() || 'General audience'
  };
}

export async function generatePromptsFromTheme(theme: string): Promise<PromptBlueprint[]> {
  const { object } = await generateObject({
    prompt: `You are DoneandDone's briefing strategist.

A user has given a one-line brief:
"${theme}"

Return exactly 4 differentiated prompt options that help the user move from a rough one-liner to a strong production-ready prompt.

Each option must:
- take a distinct angle
- be specific enough to generate high-quality content directly
- recommend the most suitable primary output format
- recommend tone, depth, length, and audience defaults
- stay faithful to the user's brief

Diversify the four options across angles such as:
- executive summary
- educational explainer
- evidence-led analysis
- campaign/storytelling

Do not repeat the same prompt four times with minor wording changes.`,
    schema: {
      type: 'object',
      properties: {
        options: {
          type: 'array',
          minItems: 4,
          maxItems: 4,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              angle: { type: 'string' },
              prompt: { type: 'string' },
              rationale: { type: 'string' },
              recommendedContentType: { type: 'string', enum: ALLOWED_CONTENT_TYPES },
              recommendedTone: { type: 'string', enum: ALLOWED_TONES },
              recommendedLength: { type: 'string', enum: ALLOWED_LENGTHS },
              recommendedScientificDepth: { type: 'string', enum: ALLOWED_DEPTHS },
              recommendedAudience: { type: 'string' }
            },
            required: [
              'id',
              'label',
              'angle',
              'prompt',
              'rationale',
              'recommendedContentType',
              'recommendedTone',
              'recommendedLength',
              'recommendedScientificDepth',
              'recommendedAudience'
            ]
          }
        }
      },
      required: ['options']
    }
  });

  const normalized = (object.options || [])
    .slice(0, 4)
    .map((option: Partial<PromptBlueprint>, index: number) => sanitizePromptBlueprint(theme, option, index));

  while (normalized.length < 4) {
    normalized.push(sanitizePromptBlueprint(theme, {
      id: `option-${normalized.length + 1}`,
      label: `Option ${normalized.length + 1}`,
      angle: 'A flexible production-ready direction',
      prompt: `Create a high-quality ${normalized.length % 2 === 0 ? 'infographic' : 'document'} about ${theme}. Keep it specific, structured, and useful for the intended audience.`,
      rationale: 'Fallback option generated to preserve a complete selection set.',
      recommendedContentType: normalized.length % 2 === 0 ? 'infographic' : 'document',
      recommendedTone: 'professional',
      recommendedLength: normalized.length === 3 ? 'comprehensive' : 'medium',
      recommendedScientificDepth: normalized.length === 3 ? 'advanced' : 'intermediate',
      recommendedAudience: 'General audience'
    }, normalized.length));
  }

  return normalized;
}

// Podcast and White Paper specific generators
async function generatePodcastScript(prompt: string, context: EnhancedContext, refinementContext: RefinementContext | null = null): Promise<GeneratedOutput> {
  const { sources, sourcePromptBlock, governance } = await extractSourcesFromSearch({
    prompt,
    contentType: 'podcast',
    targetAudience: context.targetAudience
  }, 5);
  assertSourceGovernanceUnlocked(governance);
  const webInsights = sources.slice(0, 3).map(s => `SOURCE: ${s.title} (${s.domain})\nFACTS: ${s.snippet || 'N/A'}`).join('\n\n') || '';

  const refinementInstructions = refinementContext 
    ? `\n\n${refinementContext.changeInstructions}${refinementContext.previousContent}\n\nIMPORTANT: Apply the requested changes while maintaining quality. ${refinementContext.keepUnchanged}`
    : '';

  const { text } = await generateText({
    prompt: `You are DoneandDone — a one-try content generator that produces professional podcast scripts.${refinementInstructions}

GOAL: Create a complete podcast script in ONE TRY.

TASK: Generate a podcast script for: "${prompt}"

${context.tone}. ${context.lengthGuidance}
${context.depthGuidance}
${context.audienceGuidance}
${context.marketGuidance}
${context.sopGuidance}
${sourcePromptBlock}

${webInsights ? `Use these credible web sources in your script:\n${webInsights}\n` : ''}

REQUIRED STRUCTURE:

## Show Details
- Title: Catchy podcast episode title
- Host Name: A generic host name
- Guest Name (Optional): Relevant expert if needed

## Audio Script Content
Write the actual script as a continuous monologue for a single narrator.

RULES:
- Be conversational and natural for audio
- Cite data seamlessly
- DO NOT include section labels like "Intro", "Outro", "Segment 1", or character names in the script body.
- Format as clean text without markdown formatting within the spoken paragraphs to ensure smooth text-to-speech.
- Place any sound effects or stage directions inside parentheses ( ) or brackets [ ].

Return the full response as markdown with headings for "Show Details" and "Audio Script Content".`,
    maxTokens: 2500
  });

  const { data } = await generateImage({
    prompt: `Create a professional podcast cover art for an episode about: ${prompt}. ${context.tone}. Clean typography, modern audio visual style.`,
    n: 1
  });

  logValidationReport([data[0].url], 'Podcast Generation');
  const finalSources = sources.length > 0 ? sources.slice(0, 5) : [];

  let audioUrl = undefined;
  try {
    // Clean text for TTS: remove markdown headings, bullet points, and text in parentheses/brackets
    let ttsText = text
      .replace(/^#+\s+.*$/gm, '') // Remove headers (e.g., ## Intro)
      .replace(/^-\s+/gm, '') // Remove bullet points
      .replace(/\[.*?\]/g, '') // Remove text in brackets
      .replace(/\(.*?\)/g, '') // Remove text in parentheses
      .replace(/^(Intro|Outro|Segment \d+|Show Details|Title:|Host Name:|Guest Name:).*/gim, '') // Remove naked labels
      .replace(/\n+/g, ' ') // Replace multiple newlines with a single space
      .trim();

    const { url } = await generateSpeech({
      text: ttsText.slice(0, 4000), // Limit length for TTS API constraints if any
      voice: "nova"
    });
    audioUrl = url;
  } catch (error) {
    console.warn("Failed to generate speech for podcast:", error);
  }

  return {
    contentType: 'podcast',
    content: text,
    format: 'audio-script',
    downloadUrl: data[0].url,
    previewUrl: data[0].url,
    audioUrl: audioUrl,
    sources: finalSources.length > 0 ? finalSources : undefined,
    sourceGovernance: governance
  };
}

async function generateWhitePaper(prompt: string, context: EnhancedContext, refinementContext: RefinementContext | null = null): Promise<GeneratedOutput> {
  const { sources, sourcePromptBlock, governance } = await extractSourcesFromSearch({
    prompt,
    contentType: 'white-paper',
    targetAudience: context.targetAudience
  }, 8);
  assertSourceGovernanceUnlocked(governance);
  const webInsights = sources.slice(0, 5).map(s => `SOURCE: ${s.title} (${s.domain})\nFACTS: ${s.snippet || 'N/A'}`).join('\n\n') || '';

  const refinementInstructions = refinementContext 
    ? `\n\n${refinementContext.changeInstructions}${refinementContext.previousContent}\n\nIMPORTANT: Apply the requested changes while maintaining quality. ${refinementContext.keepUnchanged}`
    : '';

  const { text } = await generateText({
    prompt: `You are DoneandDone — a one-try content generator producing authoritative, extensive white papers.${refinementInstructions}

GOAL: Create a comprehensive white paper in ONE TRY.

TASK: Generate a white paper for: "${prompt}"

${context.tone}. ${context.lengthGuidance}
${context.depthGuidance}
${context.audienceGuidance}
${context.marketGuidance}
${context.sopGuidance}
${sourcePromptBlock}

${webInsights ? `Integrate these credible insights thoroughly:\n${webInsights}\n` : ''}

REQUIRED STRUCTURE:
- # Title Page
- ## Abstract
- ## Introduction
- ## Comprehensive Analysis
- ## Proposed Solutions / Methodology
- ## Case Studies / Evidence
- ## Conclusion & Strategic Recommendations
- ## References

RULES:
- Maintain an authoritative, analytical tone
- Never hallucinate data
- Write in full detail
- Never write "[SOURCE NEEDED]" inside the final References section
- Never add editorial notes explaining missing references in the final draft

Format as a comprehensive markdown document.`,
    maxTokens: 3500
  });

  const { data } = await generateImage({
    prompt: `Create a clean, minimalist, corporate white paper cover for: ${prompt}. Professional, authoritative.`,
    n: 1
  });

  logValidationReport([data[0].url], 'White Paper Generation');
  const finalSources = sources.length > 0 ? sources.slice(0, 8) : [];

  return {
    contentType: 'white-paper',
    content: text,
    format: 'pdf',
    downloadUrl: data[0].url,
    previewUrl: data[0].url,
    sources: finalSources.length > 0 ? finalSources : undefined,
    sourceGovernance: governance
  };
}
