/**
 * DoneandDone — Output Quality & Anti-Gibberish Library
 * ======================================================
 * Drop this file into your agent pipeline.
 * Every AI response passes through validateOutput() before
 * it is shown to the user or passed to the PDF renderer.
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export const CONFIG = {
  // Length bounds (characters)
  MIN_CONTENT_LENGTH:        400,
  MAX_CONTENT_LENGTH:        12000,
  MAX_PADDING_RATIO:         0.25,   // >25% filler phrases → reject

  // Repetition
  MAX_DUPLICATE_SENTENCE_RATIO: 0.15, // >15% duplicate sentences → reject
  MIN_SENTENCE_UNIQUE_RATIO:    0.80, // <80% unique sentences → warn

  // Coherence
  MAX_GIBBERISH_RATIO:       0.08,   // >8% gibberish tokens → reject
  MIN_WORD_LENGTH_AVG:       3.5,    // average word length floor
  MAX_WORD_LENGTH_AVG:       12.0,   // average word length ceiling (catches base64 etc)

  // Medical accuracy
  REQUIRE_CLAIM_IDS:         true,   // every stat must have a (CXXX) anchor
  MAX_UNSOURCED_STATS:       0,      // zero tolerance for bare numbers

  // Structure
  MIN_SECTIONS:              2,      // at least 2 ### headings
  MIN_BULLETS:               3,      // at least 3 bullet points

  // Retry
  MAX_RETRIES:               3,
  RETRY_DELAY_MS:            800,
};

// ─────────────────────────────────────────────────────────────────────────────
// RESULT HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const SEVERITY = { BLOCK: 'BLOCK', WARN: 'WARN', INFO: 'INFO' };

export interface Issue {
  severity: string;
  code: string;
  message: string;
  detail: string;
}

export interface ValidationResult {
  valid: boolean;
  score: number;
  blocks: Issue[];
  warns: Issue[];
  infos: Issue[];
  all: Issue[];
  summary: string;
  attempt?: number;
}

function issue(severity: string, code: string, message: string, detail: string = ''): Issue {
  return { severity, code, message, detail };
}

function passed(checks: Issue[]): boolean {
  return checks.every(c => c.severity !== SEVERITY.BLOCK);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. STRUCTURAL INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────

export function checkStructure(text: string): Issue[] {
  const issues: Issue[] = [];

  // Must have at least one # heading
  if (!/^#{1,3}\s+\S/m.test(text)) {
    issues.push(issue(SEVERITY.BLOCK, 'STRUCT_NO_HEADING',
      'No markdown headings found.',
      'Response must contain at least one # or ### heading.'));
  }

  // Count ### sections
  const sectionCount = (text.match(/^###\s+\S/gm) || []).length;
  if (sectionCount < CONFIG.MIN_SECTIONS) {
    issues.push(issue(SEVERITY.WARN, 'STRUCT_FEW_SECTIONS',
      `Only ${sectionCount} section(s) found, expected ≥ ${CONFIG.MIN_SECTIONS}.`));
  }

  // Count bullets
  const bulletCount = (text.match(/^[\-\*]\s+\S/gm) || []).length;
  if (bulletCount < CONFIG.MIN_BULLETS) {
    issues.push(issue(SEVERITY.WARN, 'STRUCT_FEW_BULLETS',
      `Only ${bulletCount} bullet(s) found, expected ≥ ${CONFIG.MIN_BULLETS}.`));
  }

  // Detect unclosed markdown formatting
  const boldOpens   = (text.match(/\*\*/g) || []).length;
  if (boldOpens % 2 !== 0) {
    issues.push(issue(SEVERITY.WARN, 'STRUCT_UNCLOSED_BOLD',
      'Unclosed ** bold marker detected.',
      'Odd number of ** occurrences suggests broken formatting.'));
  }

  const italicOpens = (text.match(/(?<!\*)\*(?!\*)/g) || []).length;
  if (italicOpens % 2 !== 0) {
    issues.push(issue(SEVERITY.WARN, 'STRUCT_UNCLOSED_ITALIC',
      'Unclosed * italic marker detected.'));
  }

  // Detect raw markdown table without proper pipe alignment
  if (/^\|.+\|/m.test(text) && !/^\|[-:| ]+\|/m.test(text)) {
    issues.push(issue(SEVERITY.WARN, 'STRUCT_BROKEN_TABLE',
      'Markdown table missing alignment row.'));
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. HALLUCINATION SIGNAL DETECTION
// ─────────────────────────────────────────────────────────────────────────────

// Phrases the model uses when it's making things up or uncertain
const HALLUCINATION_PHRASES = [
  /\bas (of|at) my (knowledge|training) (cutoff|date)\b/i,
  /\bbased on (general|my) knowledge\b/i,
  /\bi (believe|think|assume|recall|seem to recall)\b/i,
  /\bit('s| is) (likely|possible|probable) that\b/i,
  /\bi('m| am) not (sure|certain|aware)\b/i,
  /\bi (don't|do not) have (access|specific|exact)/i,
  /\bapproximately[\s\d]+% (of|in|among)\b/i,   // bare approx with no source
  /\bstudies (show|suggest|indicate)\b(?!.*\(C\d{3}\))/i,  // "studies show" without claim ID
  /\bresearch (shows|suggests|indicates)\b(?!.*\(C\d{3}\))/i,
  /\bexperts (say|believe|suggest)\b/i,
  /\bit (has been|is) (well[- ])?established that\b/i,
  /\bgenerally (speaking|accepted)\b/i,
  /\bin general\b/i,
  /\btypically\b.*\d+%/i,  // "typically X%" without source
];

// Fake citation patterns — model inventing references
const FAKE_CITATION_PATTERNS = [
  /\b(Smith|Jones|Brown|Johnson|Williams)\s+et\s+al\.\s*,?\s*(19|20)\d{2}\b/i,
  /\(\s*[A-Z][a-z]+\s+et\s+al\.\s*,?\s*(19|20)\d{2}\s*\)/,
  /\bJournal of\s+[A-Z][a-zA-Z\s]+,?\s*(19|20)\d{2}\b/,
  /Vol\.\s*\d+\s*,?\s*No\.\s*\d+/i,
  /pp\.\s*\d+[\–\-]\d+/i,   // page numbers — unlikely to be accurate
];

export function checkHallucinations(text: string): Issue[] {
  const issues: Issue[] = [];

  HALLUCINATION_PHRASES.forEach((pattern, i) => {
    const match = text.match(pattern);
    if (match) {
      issues.push(issue(SEVERITY.BLOCK, `HALLUC_PHRASE_${i}`,
        `Hallucination signal detected: "${match[0]}"`,
        'Remove hedging language or replace with a source-anchored claim.'));
    }
  });

  FAKE_CITATION_PATTERNS.forEach((pattern, i) => {
    const match = text.match(pattern);
    if (match) {
      issues.push(issue(SEVERITY.BLOCK, `HALLUC_CITATION_${i}`,
        `Possible invented citation: "${match[0]}"`,
        'All citations must come from uploaded source documents with valid CLAIM_IDs.'));
    }
  });

  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. REPETITION DETECTION
// ─────────────────────────────────────────────────────────────────────────────

function normaliseSentence(s: string): string {
  return s.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

export function checkRepetition(text: string): Issue[] {
  const issues: Issue[] = [];

  // Split into sentences
  const raw = text.match(/[^.!?\n]+[.!?\n]+/g) || [];
  const sentences = raw.map(normaliseSentence).filter(s => s.length > 20);

  if (sentences.length === 0) return issues;

  const seen = new Map<string, number>();
  let duplicates = 0;
  sentences.forEach(s => {
    seen.set(s, (seen.get(s) || 0) + 1);
    if (seen.get(s) === 2) duplicates++;
  });

  const dupRatio = duplicates / sentences.length;

  if (dupRatio > CONFIG.MAX_DUPLICATE_SENTENCE_RATIO) {
    issues.push(issue(SEVERITY.BLOCK, 'REPEAT_HIGH_DUPLICATE',
      `${Math.round(dupRatio * 100)}% of sentences are duplicated (limit: ${CONFIG.MAX_DUPLICATE_SENTENCE_RATIO * 100}%).`,
      'Response appears to be looping or padding. Regenerate.'));
  } else if (dupRatio > 0.05) {
    issues.push(issue(SEVERITY.WARN, 'REPEAT_SOME_DUPLICATE',
      `${Math.round(dupRatio * 100)}% of sentences are repeated.`));
  }

  // Check for repeated paragraphs
  const paragraphs = text.split(/\n{2,}/).map(p => normaliseSentence(p)).filter(p => p.length > 40);
  const paraSeen = new Set<string>();
  paragraphs.forEach(p => {
    if (paraSeen.has(p)) {
      issues.push(issue(SEVERITY.BLOCK, 'REPEAT_PARAGRAPH',
        'Duplicate paragraph detected.',
        `"${p.slice(0, 80)}…" appears more than once.`));
    }
    paraSeen.add(p);
  });

  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. TRUNCATION DETECTION
// ─────────────────────────────────────────────────────────────────────────────

export function checkTruncation(text: string, finishReason: string = 'stop'): Issue[] {
  const issues: Issue[] = [];

  // API-level signal
  if (finishReason === 'length' || finishReason === 'max_tokens') {
    issues.push(issue(SEVERITY.BLOCK, 'TRUNC_MAX_TOKENS',
      'Response was cut off by token limit.',
      'Increase max_tokens or split the request.'));
    return issues;
  }

  const trimmed = text.trimEnd();

  // Ends mid-sentence (no terminal punctuation)
  if (!/[.!?)\]"'`]$/.test(trimmed)) {
    issues.push(issue(SEVERITY.BLOCK, 'TRUNC_NO_TERMINAL',
      'Response ends without terminal punctuation — likely truncated.',
      `Last chars: "${trimmed.slice(-40)}"`));
  }

  // Ends with an open list indicator
  if (/(\-|\*|\d+\.)\s*$/.test(trimmed)) {
    issues.push(issue(SEVERITY.BLOCK, 'TRUNC_OPEN_LIST',
      'Response ends with an open list item — truncated mid-list.',
      `Last chars: "${trimmed.slice(-40)}"`));
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. INJECTION / LEAKAGE DETECTION
// ─────────────────────────────────────────────────────────────────────────────

const INJECTION_PATTERNS = [
  // Prompt leakage
  /you are a (helpful|medical|senior|professional)/i,
  /system prompt/i,
  /your (role|job|task|mandate) is to/i,
  /as (an|a) ai (language model|assistant|agent)/i,
  /i('m| am) (claude|gpt|openai|anthropic|chatgpt|an? ai)/i,
  // Raw data leakage
  /```json[\s\S]{0,2000}```/,
  /"role"\s*:\s*"(system|user|assistant)"/,
  /"content"\s*:\s*"/,
  // Internal instruction leakage
  /CLAIM_ID\s*[\|—]\s*Claim \(verbatim\)/,
  /═{5,}/,           // our own system prompt decorators
  /Zone \d — (Verified|AI|Automated|Human|Approved)/,
  // Code leakage
  /^(import|export|const|let|var|function|class)\s+\w+/m,
  /^<\?php/m,
  /^SELECT\s+.+FROM\s+\w+/im,
];

export function checkInjection(text: string): Issue[] {
  const issues: Issue[] = [];

  INJECTION_PATTERNS.forEach((pattern, i) => {
    const match = text.match(pattern);
    if (match) {
      issues.push(issue(SEVERITY.BLOCK, `INJECT_${i}`,
        `Potential prompt leakage or injection detected.`,
        `Matched: "${String(match[0]).slice(0, 80)}"`));
    }
  });

  // Detect raw HTML tags (shouldn't appear in markdown medical content)
  const htmlTags = text.match(/<[a-z]+[\s>]/gi) || [];
  const allowedTags = ['<br', '<b>', '<i>', '<em>', '<strong>', '<sup>', '<sub>'];
  const badTags = htmlTags.filter(t => !allowedTags.some(a => t.toLowerCase().startsWith(a)));
  if (badTags.length > 0) {
    issues.push(issue(SEVERITY.WARN, 'INJECT_HTML',
      `Raw HTML detected: ${badTags.slice(0, 3).join(', ')}`,
      'HTML tags should not appear in markdown medical content.'));
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. MEDICAL CLAIM GUARDS
// ─────────────────────────────────────────────────────────────────────────────

export function checkMedicalClaims(text: string): Issue[] {
  const issues: Issue[] = [];

  if (!CONFIG.REQUIRE_CLAIM_IDS) return issues;

  // Find all statistics (number + unit pattern)
  const statPattern = /\b\d[\d,\.]*\s*(%|percent|million|billion|fold|mg|kg|mmol|nmol|µg|mg\/dL|mmol\/L|HR|OR|RR|CI|p\s*[<=>]\s*[\d\.]+)/gi;
  
  // Unsourced stats = stats found without a nearby claim ID
  // Heuristic: check each stat's surrounding 120 chars for a claim ID
  let unsourced = 0;
  const lines = text.split('\n');
  lines.forEach(line => {
    const lineStats = line.match(statPattern) || [];
    if (lineStats.length > 0 && !/\(C\d{3,4}\)/.test(line)) {
      unsourced++;
    }
  });

  if (unsourced > CONFIG.MAX_UNSOURCED_STATS) {
    issues.push(issue(SEVERITY.BLOCK, 'MEDICAL_UNSOURCED_STATS',
      `${unsourced} line(s) contain statistics without CLAIM_ID references.`,
      'Every quantitative claim must be followed by its (CXXX) source anchor.'));
  }

  // Detect off-label flags that were stripped
  const mlrNeededPhrases = [
    /\boff[- ]label\b/i,
    /\binvestigational\b/i,
    /\bnot (approved|indicated|licensed)\b/i,
    /\bcompassionate use\b/i,
    /\bunlicensed\b/i,
  ];
  mlrNeededPhrases.forEach(p => {
    const match = text.match(p);
    if (match && !/\[REQUIRES MLR REVIEW\]/i.test(text)) {
      issues.push(issue(SEVERITY.BLOCK, 'MEDICAL_MLR_FLAG_MISSING',
        `Off-label/investigational language detected without [REQUIRES MLR REVIEW] flag.`,
        `Phrase: "${match[0]}"`));
    }
  });

  // Hazard ratios without confidence intervals
  const hrPattern = /\bHR\s*=?\s*[\d\.]+(?!\s*[\(\[]\s*[\d\.]+\s*[\–\-])/g;
  const bareHRs = text.match(hrPattern) || [];
  if (bareHRs.length > 0) {
    issues.push(issue(SEVERITY.WARN, 'MEDICAL_HR_NO_CI',
      `Hazard ratio(s) found without confidence intervals: ${bareHRs.slice(0,2).join(', ')}`,
      'Always present HR with 95% CI for regulatory-quality content.'));
  }

  // P-values without context
  const pPattern = /\bp\s*[<=>]\s*0\.0[0-9]+\b/gi;
  const pValues = text.match(pPattern) || [];
  pValues.forEach(pv => {
    const idx = text.indexOf(pv);
    const surrounding = text.slice(Math.max(0, idx - 80), idx + 80);
    if (!/endpoint|outcome|primary|secondary|significant/i.test(surrounding)) {
      issues.push(issue(SEVERITY.WARN, 'MEDICAL_PVALUE_NO_CONTEXT',
        `p-value "${pv}" appears without endpoint context.`));
    }
  });

  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. LANGUAGE COHERENCE (gibberish detection)
// ─────────────────────────────────────────────────────────────────────────────

// Common English words — if word-token ratio against this is too low, text is incoherent
const COMMON_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'is','are','was','were','be','been','being','have','has','had','do',
  'does','did','will','would','could','should','may','might','shall',
  'that','this','these','those','it','its','their','they','them','there',
  'which','who','what','when','where','how','why','if','then','than',
  'not','no','so','as','by','from','into','through','during','before',
  'after','above','below','between','among','through','within','without',
  'about','against','along','across','behind','beyond','under','over',
  'each','all','any','both','few','more','most','other','some','such',
  'up','out','off','down','here','only','also','just','first','last',
  'new','high','low','large','small','major','significant','clinical',
  'medical','health','data','study','risk','rate','percent','patients',
  'population','evidence','treatment','age','women','men','year','years',
]);

export function checkCoherence(text: string): Issue[] {
  const issues: Issue[] = [];

  // Extract just body text (strip markdown syntax)
  const body = text
    .replace(/^#+\s.+$/gm, '')          // headings
    .replace(/^[\-\*]\s/gm, '')          // bullet markers
    .replace(/\*\*(.+?)\*\*/g, '$1')     // bold
    .replace(/\(C\d{3,4}\)/g, '')        // claim IDs
    .replace(/\[.+?\]/g, '')             // flags
    .trim();

  const words = body.split(/\s+/).filter(w => w.length > 0);

  if (words.length < 30) {
    issues.push(issue(SEVERITY.WARN, 'COHERENCE_TOO_SHORT',
      'Too few words to assess coherence reliably.'));
    return issues;
  }

  // Average word length check (catches base64, garbled output)
  const avgLen = words.reduce((s, w) => s + w.replace(/[^a-z]/gi, '').length, 0) / words.length;
  if (avgLen < CONFIG.MIN_WORD_LENGTH_AVG || avgLen > CONFIG.MAX_WORD_LENGTH_AVG) {
    issues.push(issue(SEVERITY.BLOCK, 'COHERENCE_BAD_WORD_LENGTH',
      `Average word length is ${avgLen.toFixed(1)} characters (expected ${CONFIG.MIN_WORD_LENGTH_AVG}–${CONFIG.MAX_WORD_LENGTH_AVG}).`,
      'Output may contain garbled text, base64, or non-linguistic content.'));
  }

  // Vocabulary coherence: ratio of recognised words
  const cleanWords = words.map(w => w.toLowerCase().replace(/[^a-z]/g, '')).filter(w => w.length > 2);
  const knownCount = cleanWords.filter(w => COMMON_WORDS.has(w)).length;
  // For medical text ~15–40% should be common words
  const knownRatio = knownCount / cleanWords.length;
  if (knownRatio < 0.08) {
    issues.push(issue(SEVERITY.BLOCK, 'COHERENCE_LOW_COMMON_WORDS',
      `Only ${Math.round(knownRatio * 100)}% of words are recognisable English tokens.`,
      'Output may be non-English, garbled, or contain excessive jargon/codes.'));
  }

  // Detect runs of random-looking uppercase strings (model confusion)
  const capsRuns = text.match(/\b[A-Z]{6,}\b/g) || [];
  const legitimateCaps = capsRuns.filter(w =>
    !['REQUIRES','REVIEW','BLOCK','WARN','CLAIM','AUDIT','KNHANES','NHANES','NEJM',
      'JAMA','OECD','WHO','MLR','RCT','HCP','FDA','EMA','NICE','ESC','AHA'].includes(w)
  );
  if (legitimateCaps.length > 4) {
    issues.push(issue(SEVERITY.WARN, 'COHERENCE_CAPS_ANOMALY',
      `Unusual uppercase strings: ${legitimateCaps.slice(0,4).join(', ')}`,
      'May indicate model confusion or encoding issues.'));
  }

  // Detect excessive punctuation (!!!!, ????, …… etc)
  const excessPunct = text.match(/[!?]{3,}|\.{4,}|,{2,}/g) || [];
  if (excessPunct.length > 2) {
    issues.push(issue(SEVERITY.WARN, 'COHERENCE_EXCESS_PUNCT',
      `Excessive punctuation patterns detected: ${excessPunct.slice(0,3).join(' ')}`,
      'May indicate model instability or prompt injection.'));
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. LENGTH SANITY
// ─────────────────────────────────────────────────────────────────────────────

// Phrases that indicate padding / filler
const PADDING_PHRASES = [
  /\bof course\b/gi,
  /\bcertainly\b/gi,
  /\bsure(ly)?\b/gi,
  /\bgreat (question|point)\b/gi,
  /\bi hope this helps\b/gi,
  /\bplease (note|be aware|keep in mind) that\b/gi,
  /\bit('s| is) worth (noting|mentioning)\b/gi,
  /\bneedless to say\b/gi,
  /\bwithout further ado\b/gi,
  /\bto summarize (what|the)\b/gi,
  /\bin conclusion,? (it is|we can|as)\b/gi,
  /\bas (mentioned|stated|noted|discussed) (above|earlier|previously|before)\b/gi,
  /\bthank you for (your|the)\b/gi,
  /\bfeel free to\b/gi,
  /\bdon't hesitate to\b/gi,
  /\bi('ll| will) now\b/gi,
  /\blet('s| us) (dive|explore|look at|examine)\b/gi,
  /\bin (today's|this) (article|post|piece|response|output)\b/gi,
];

export function checkLength(text: string): Issue[] {
  const issues: Issue[] = [];
  const len = text.length;

  if (len < CONFIG.MIN_CONTENT_LENGTH) {
    issues.push(issue(SEVERITY.BLOCK, 'LENGTH_TOO_SHORT',
      `Content is ${len} characters — below minimum ${CONFIG.MIN_CONTENT_LENGTH}.`,
      'Response is too thin. Regenerate with higher min length instruction.'));
  }

  if (len > CONFIG.MAX_CONTENT_LENGTH) {
    issues.push(issue(SEVERITY.WARN, 'LENGTH_TOO_LONG',
      `Content is ${len} characters — above maximum ${CONFIG.MAX_CONTENT_LENGTH}.`,
      'Consider splitting into multiple infographic sections.'));
  }

  // Padding ratio
  let paddingHits = 0;
  PADDING_PHRASES.forEach(p => {
    const matches = text.match(p) || [];
    paddingHits += matches.length;
  });
  const wordCount = (text.match(/\b\w+\b/g) || []).length;
  const paddingRatio = paddingHits / Math.max(wordCount / 10, 1);

  if (paddingRatio > CONFIG.MAX_PADDING_RATIO) {
    issues.push(issue(SEVERITY.BLOCK, 'LENGTH_EXCESSIVE_PADDING',
      `High filler phrase density detected (${paddingHits} instances).`,
      'Response contains too much padding. Regenerate with instruction to be direct and factual.'));
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. ENCODING ARTEFACTS
// ─────────────────────────────────────────────────────────────────────────────

const ENCODING_PATTERNS = [
  { pattern: /\\u[0-9a-fA-F]{4}/g,      code: 'ENC_UNICODE_ESCAPE',    msg: 'Raw Unicode escape sequences' },
  { pattern: /\\n\\n|\\t/g,             code: 'ENC_LITERAL_ESCAPES',   msg: 'Literal \\n or \\t escape strings' },
  { pattern: /&(amp|lt|gt|nbsp|quot);/g, code: 'ENC_HTML_ENTITY',       msg: 'HTML entities in plain text output' },
  { pattern: /\uFFFD/g,                  code: 'ENC_REPLACEMENT_CHAR',  msg: 'Unicode replacement character (broken encoding)' },
  { pattern: /[\x00-\x08\x0B\x0C\x0E-\x1F]/g, code: 'ENC_CONTROL_CHARS', msg: 'Non-printable control characters' },
  { pattern: /[^\x00-\x7F]{10,}/g,      code: 'ENC_NON_ASCII_RUN',     msg: 'Long run of non-ASCII characters (possible encoding corruption)' },
  { pattern: /={20,}/g,                  code: 'ENC_BASE64_LIKE',       msg: 'Possible base64 or binary data in output' },
  { pattern: /\b[0-9a-f]{32,}\b/gi,      code: 'ENC_HEX_HASH',         msg: 'Hash-like hex string in content' },
];

export function checkEncoding(text: string): Issue[] {
  const issues: Issue[] = [];

  ENCODING_PATTERNS.forEach(({ pattern, code, msg }) => {
    const matches = text.match(pattern) || [];
    if (matches.length > 0) {
      const sev = ['ENC_REPLACEMENT_CHAR','ENC_CONTROL_CHARS','ENC_BASE64_LIKE'].includes(code)
        ? SEVERITY.BLOCK : SEVERITY.WARN;
      issues.push(issue(sev, code,
        `${msg} (${matches.length} occurrence${matches.length > 1 ? 's' : ''}).`,
        `Sample: "${String(matches[0]).slice(0, 40)}"`));
    }
  });

  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. SOURCE AUDIT GATE
// ─────────────────────────────────────────────────────────────────────────────

export function checkSourceAudit(text: string): Issue[] {
  const issues: Issue[] = [];

  // Verify claim IDs exist at all
  const claimIds = text.match(/\(C\d{3,4}\)/g) || [];
  if (claimIds.length === 0 && CONFIG.REQUIRE_CLAIM_IDS) {
    issues.push(issue(SEVERITY.BLOCK, 'AUDIT_NO_CLAIM_IDS',
      'No CLAIM_IDs (CXXX) found in output.',
      'Every factual claim must be anchored to a source document via its CLAIM_ID.'));
  }

  // Verify reference list is present
  if (!/^#{1,3}\s*(reference|source|citation|bibliography)/im.test(text)) {
    issues.push(issue(SEVERITY.WARN, 'AUDIT_NO_REFERENCES',
      'No References section detected.',
      'Output must include a full Vancouver-format reference list.'));
  }

  // Check for [SOURCE NEEDED] placeholders — these are good, but need flagging
  const sourceNeeded = text.match(/\[SOURCE NEEDED[^\]]*\]/g) || [];
  if (sourceNeeded.length > 0) {
    issues.push(issue(SEVERITY.WARN, 'AUDIT_SOURCE_GAPS',
      `${sourceNeeded.length} [SOURCE NEEDED] placeholder(s) in output.`,
      `Gaps: ${sourceNeeded.slice(0,3).join('; ')}`));
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER VALIDATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * validateOutput(text, options)
 * ─────────────────────────────
 * Run all checks against an AI response.
 */
export function validateOutput(text: string, options: any = {}): ValidationResult {
  const finishReason   = options.finishReason  ?? 'stop';
  const requireAudit   = options.requireAudit  ?? CONFIG.REQUIRE_CLAIM_IDS;

  const originalConfig = CONFIG.REQUIRE_CLAIM_IDS;
  CONFIG.REQUIRE_CLAIM_IDS = requireAudit;

  const allIssues = [
    ...checkStructure(text),
    ...checkHallucinations(text),
    ...checkRepetition(text),
    ...checkTruncation(text, finishReason),
    ...checkInjection(text),
    ...checkMedicalClaims(text),
    ...checkCoherence(text),
    ...checkLength(text),
    ...checkEncoding(text),
    ...checkSourceAudit(text),
  ];

  CONFIG.REQUIRE_CLAIM_IDS = originalConfig;

  const blocks  = allIssues.filter(i => i.severity === SEVERITY.BLOCK);
  const warns   = allIssues.filter(i => i.severity === SEVERITY.WARN);
  const infos   = allIssues.filter(i => i.severity === SEVERITY.INFO);
  const isValid = blocks.length === 0;

  return {
    valid:    isValid,
    score:    Math.max(0, 100 - blocks.length * 25 - warns.length * 5),
    blocks,
    warns,
    infos,
    all:      allIssues,
    summary:  isValid
      ? `✓ Output passed all checks (${warns.length} warning${warns.length !== 1 ? 's' : ''})`
      : `✗ Output blocked: ${blocks.length} critical issue${blocks.length !== 1 ? 's' : ''}, ${warns.length} warning${warns.length !== 1 ? 's' : ''}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT SANITISER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * sanitiseOutput(text)
 * ─────────────────────
 * Apply safe, non-destructive fixes that do not change meaning.
 */
export function sanitiseOutput(text: string): string {
  if (!text) return '';
  
  return text
    // Fix encoding artefacts
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    // Normalise line endings
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    // Collapse 3+ blank lines to 2
    .replace(/\n{3,}/g, '\n\n')
    // Remove trailing whitespace per line
    .split('\n').map(l => l.trimEnd()).join('\n')
    // Normalise smart quotes to straight (for PDF rendering compatibility)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Normalise dashes
    .replace(/\u2013/g, '–')   // en-dash: keep
    .replace(/\u2014/g, '—')   // em-dash: keep
    // Strip zero-width chars
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
    // Trim
    .trim();
}
