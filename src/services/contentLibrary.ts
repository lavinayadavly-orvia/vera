import type {
  ApprovedContentBlock,
  ContentType,
  EvidenceDossier,
  GeneratedOutput,
  ModularContentLibrary,
  RulesEngineReport,
} from '@/types';

function tokenize(value: string): string[] {
  return value.toLowerCase().match(/\b[a-z0-9]{3,}\b/g) || [];
}

function overlapScore(left: string, right: string): number {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  let score = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) score += 1;
  });
  return score;
}

function inferBlockKind(text: string, index: number): ApprovedContentBlock['kind'] {
  if (index === 0) return 'headline';
  if (/%|\b\d+(?:\.\d+)?\b/.test(text)) return 'stat';
  if (/^(learn|ask|talk|download|review|join|start|schedule|contact)\b/i.test(text)) return 'cta';
  if (/disclaimer|warning|not medical advice|important safety/i.test(text)) return 'disclaimer';
  if (text.length < 80) return 'claim';
  return 'body';
}

function reusableFormatsFor(kind: ApprovedContentBlock['kind']): ContentType[] {
  if (kind === 'headline' || kind === 'disclaimer') {
    return ['infographic', 'presentation', 'social-post', 'document', 'report', 'podcast', 'white-paper', 'video'];
  }
  if (kind === 'stat') {
    return ['infographic', 'presentation', 'report', 'social-post'];
  }
  if (kind === 'cta') {
    return ['social-post', 'video', 'presentation'];
  }
  if (kind === 'claim') {
    return ['presentation', 'document', 'report', 'white-paper', 'social-post'];
  }
  return ['document', 'report', 'white-paper', 'presentation'];
}

function extractBlockCandidates(content: string): string[] {
  const unique = new Set<string>();
  const candidates = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('#'))
    .map((line) => line.replace(/^[\-\*\d.\s]+/, '').trim())
    .filter((line) => line.length >= 18)
    .filter((line) => !/\[SOURCE NEEDED:/i.test(line))
    .filter((line) => !/\bSOURCE NEEDED\b/i.test(line))
    .filter((line) => {
      if (unique.has(line)) return false;
      unique.add(line);
      return true;
    });

  return candidates.slice(0, 14);
}

export function buildModularContentLibrary(params: {
  output: GeneratedOutput;
  dossier?: EvidenceDossier;
  rulesEngine: RulesEngineReport;
}): ModularContentLibrary {
  if (!params.dossier || params.dossier.sourceDocuments.length === 0) {
    return {
      mode: 'block-library',
      blocks: [],
      reusableApprovedCount: 0,
      blockedCount: 0,
    };
  }

  const blockTexts = extractBlockCandidates(params.output.textContent || params.output.content);

  const blocks: ApprovedContentBlock[] = blockTexts.map((text, index) => {
    const matchedClaims = (params.dossier?.claims || [])
      .map((claim) => ({
        claim,
        score: overlapScore(text, claim.text),
      }))
      .filter((entry) => entry.score > 1)
      .sort((left, right) => right.score - left.score)
      .slice(0, 2)
      .map((entry) => entry.claim);
    const evidenceLinkedClaims = matchedClaims.filter(
      (claim) => claim.status === 'mapped' || claim.status === 'locator-missing',
    );

    const matchedFinding = params.rulesEngine.findings.find((finding) =>
      (finding.matchedTerms || []).some((term) => new RegExp(`\\b${term}\\b`, 'i').test(text)),
    );

    let approvalStatus: ApprovedContentBlock['approvalStatus'] = 'needs-review';
    if (matchedFinding?.severity === 'block') {
      approvalStatus = 'blocked';
    } else if (evidenceLinkedClaims.length > 0 && evidenceLinkedClaims.every((claim) => claim.status === 'mapped')) {
      approvalStatus = 'approved';
    } else if (matchedClaims.some((claim) => claim.status === 'source-needed' || claim.status === 'unmapped')) {
      approvalStatus = 'needs-review';
    } else if (evidenceLinkedClaims.length === 0 && params.rulesEngine.status === 'block') {
      approvalStatus = 'blocked';
    }

    return {
      blockId: `BLK-${String(index + 1).padStart(3, '0')}`,
      kind: inferBlockKind(text, index),
      text,
      sourceClaimIds: evidenceLinkedClaims.map((claim) => claim.claimId),
      approvalStatus,
      reusableIn: reusableFormatsFor(inferBlockKind(text, index)),
      notes: [
        evidenceLinkedClaims.length > 0
          ? `${evidenceLinkedClaims.length} linked source-backed sentence(s)`
          : 'No linked source-backed sentence yet',
        matchedFinding ? matchedFinding.title : 'No blocking rule match',
      ],
    };
  });

  return {
    mode: 'block-library',
    blocks,
    reusableApprovedCount: blocks.filter((block) => block.approvalStatus === 'approved').length,
    blockedCount: blocks.filter((block) => block.approvalStatus === 'blocked').length,
  };
}
