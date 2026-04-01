import type { ChangeRequestData, DetailedGenerationParams, PiiScrubMatch, PiiScrubReport } from '@/types';

type ScrubPattern = {
  type: PiiScrubMatch['type'];
  pattern: RegExp;
  replacer: (value: string) => string;
};

const SCRUB_PATTERNS: ScrubPattern[] = [
  {
    type: 'email',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    replacer: () => '[REDACTED_EMAIL]'
  },
  {
    type: 'phone',
    pattern: /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}\b/g,
    replacer: () => '[REDACTED_PHONE]'
  },
  {
    type: 'dob',
    pattern: /\b(?:dob|date of birth)[:\s-]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/gi,
    replacer: () => 'DOB: [REDACTED_DOB]'
  },
  {
    type: 'mrn',
    pattern: /\b(?:mrn|medical record number)[:\s-]*[A-Z0-9-]{5,}\b/gi,
    replacer: () => 'MRN: [REDACTED_MRN]'
  },
  {
    type: 'trial-id',
    pattern: /\b(?:nct|eudract|ctr)[-_:\s]?[A-Z0-9-]{6,}\b/gi,
    replacer: () => '[REDACTED_TRIAL_ID]'
  },
  {
    type: 'participant-id',
    pattern: /\b(?:subject|participant|patient)\s*(?:id|identifier|number)[:\s-]*[A-Z0-9-]{4,}\b/gi,
    replacer: () => 'Participant ID: [REDACTED_PARTICIPANT_ID]'
  }
];

function applyScrub(text: string): { text: string; matches: PiiScrubMatch[] } {
  let nextText = text;
  const matches: PiiScrubMatch[] = [];

  SCRUB_PATTERNS.forEach(({ type, pattern, replacer }) => {
    nextText = nextText.replace(pattern, (value) => {
      const replacement = replacer(value);
      matches.push({
        type,
        original: value,
        replacement,
      });
      return replacement;
    });
  });

  return { text: nextText, matches };
}

function scrubChangeRequest(changeRequest?: ChangeRequestData): {
  changeRequest?: ChangeRequestData;
  matches: PiiScrubMatch[];
} {
  if (!changeRequest) {
    return { changeRequest, matches: [] };
  }

  const description = applyScrub(changeRequest.changeDescription);
  const specificAreas = changeRequest.specificAreas.map((value) => applyScrub(value));
  const keepExisting = changeRequest.keepExisting.map((value) => applyScrub(value));

  return {
    changeRequest: {
      ...changeRequest,
      changeDescription: description.text,
      specificAreas: specificAreas.map((entry) => entry.text),
      keepExisting: keepExisting.map((entry) => entry.text),
    },
    matches: [
      ...description.matches,
      ...specificAreas.flatMap((entry) => entry.matches),
      ...keepExisting.flatMap((entry) => entry.matches),
    ],
  };
}

export function scrubGenerationInput(
  params: DetailedGenerationParams,
): {
  sanitizedPrompt: string;
  sanitizedChangeRequest?: ChangeRequestData;
  scrubReport: PiiScrubReport;
} {
  const promptResult = applyScrub(params.prompt);
  const changeRequestResult = scrubChangeRequest(params.changeRequest);
  const matches = [...promptResult.matches, ...changeRequestResult.matches];

  return {
    sanitizedPrompt: promptResult.text,
    sanitizedChangeRequest: changeRequestResult.changeRequest,
    scrubReport: {
      enabled: true,
      status: matches.length > 0 ? 'scrubbed' : 'clean',
      matchCount: matches.length,
      matches,
      notes: [
        'PII/PHI scrubber runs before any third-party LLM or media generation call.',
        matches.length > 0
          ? 'Potential identifiers were masked before provider submission.'
          : 'No obvious PII/PHI patterns were detected in the submitted input.'
      ],
    },
  };
}
