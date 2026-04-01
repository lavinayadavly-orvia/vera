import type {
  ApiNamespace,
  ClaimEdge,
  ClaimNode,
  ContentSource,
  CoordinateMap,
  EvidenceDossier,
  ReferenceDocument,
} from '@/types';

function tokenize(value: string): string[] {
  return (value.toLowerCase().match(/\b[a-z0-9]{3,}\b/g) || []).slice(0, 24);
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

function buildCoordinateMap(source: ContentSource, index: number): CoordinateMap {
  return {
    page: source.coordinateMap?.page ?? source.page ?? 1,
    paragraph: source.coordinateMap?.paragraph ?? index + 1,
    x: source.coordinateMap?.x ?? 36,
    y: source.coordinateMap?.y ?? 48 + index * 72,
    width: source.coordinateMap?.width ?? 320,
    height: source.coordinateMap?.height ?? 56,
  };
}

function buildClaimCoordinateMap(document: ReferenceDocument, sentenceIndex: number): CoordinateMap {
  return {
    page: document.coordinateMap.page,
    paragraph: sentenceIndex + 1,
    x: document.coordinateMap.x,
    y: (document.coordinateMap.y ?? 48) + sentenceIndex * 20,
    width: document.coordinateMap.width,
    height: document.coordinateMap.height,
  };
}

function toReferenceDocument(source: ContentSource, index: number): ReferenceDocument {
  const sourceDocId = source.sourceDocId || `SRC-${String(index + 1).padStart(3, '0')}`;
  const verbatimAnchor = source.verbatimAnchor || source.snippet || source.title;
  const coordinateMap = buildCoordinateMap(source, index);
  const viewerStatus = source.viewerStatus
    || (source.type === 'web' ? 'external' : source.coordinateMap || source.page ? 'available' : 'locator-missing');

  return {
    sourceDocId,
    title: source.title,
    sourceType: source.sourceType || source.type,
    domain: source.domain,
    url: source.url,
    publishedYear: source.publishedYear,
    viewerStatus,
    verbatimAnchor,
    coordinateMap,
    screeningSummary: source.screeningSummary,
  };
}

function collectCandidateClaims(content: string): string[] {
  const sentences = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('#'))
    .flatMap((line) => {
      const cleanedLine = line.replace(/^[\-\*\d.\s]+/, '').trim();
      if (!cleanedLine) return [];
      const matches = cleanedLine.match(/[^.!?]+(?:[.!?]+|$)/g);
      return (matches || [cleanedLine]).map((sentence) => sentence.trim());
    })
    .filter((sentence) => sentence.length > 18 || /\[SOURCE NEEDED:/i.test(sentence));

  const unique = new Set<string>();
  const claims: string[] = [];

  sentences.forEach((sentence) => {
    const normalized = sentence.trim();
    if (!unique.has(normalized)) {
      unique.add(normalized);
      claims.push(normalized);
    }
  });

  return claims.slice(0, 48);
}

function mapClaimToDocument(
  claimText: string,
  documents: ReferenceDocument[],
): ReferenceDocument | undefined {
  const ranked = documents
    .map((document) => ({
      document,
      score: overlapScore(claimText, `${document.title} ${document.verbatimAnchor}`),
    }))
    .sort((left, right) => right.score - left.score);

  if (ranked[0]?.score > 0) {
    return ranked[0].document;
  }

  if (documents.length === 1) {
    return documents[0];
  }

  return undefined;
}

export function buildEvidenceDossier(
  content: string,
  sources: ContentSource[] | undefined,
  namespace: ApiNamespace,
): EvidenceDossier {
  const sourceDocuments = (sources || []).map((source, index) => toReferenceDocument(source, index));
  const claimTexts = collectCandidateClaims(content);

  const claims: ClaimNode[] = claimTexts.map((claimText, index) => {
    const claimId = `CLM-${String(index + 1).padStart(3, '0')}`;

    if (/\[SOURCE NEEDED:/i.test(claimText)) {
      return {
        claimId,
        text: claimText,
        sentenceIndex: index + 1,
        status: 'source-needed',
      };
    }

    const matchedDocument = mapClaimToDocument(claimText, sourceDocuments);

    if (!matchedDocument) {
      return {
        claimId,
        text: claimText,
        sentenceIndex: index + 1,
        status: 'unmapped',
      };
    }

    const claimCoordinateMap = buildClaimCoordinateMap(matchedDocument, index);

    return {
      claimId,
      text: claimText,
      sentenceIndex: index + 1,
      sourceDocId: matchedDocument.sourceDocId,
      sourceTitle: matchedDocument.title,
      verbatimAnchor: matchedDocument.verbatimAnchor,
      coordinateMap: claimCoordinateMap,
      status: matchedDocument.viewerStatus === 'locator-missing' ? 'locator-missing' : 'mapped',
    };
  });

  const edges: ClaimEdge[] = claims.map((claim) => ({
    claimId: claim.claimId,
    sourceDocId: claim.sourceDocId,
    relationship: claim.status === 'source-needed' ? 'placeholder-for' : 'supported-by',
  }));

  const completeness = claims.length === 0
    ? 'draft'
    : claims.every((claim) => claim.status === 'mapped')
      ? 'complete'
      : 'partial';
  const mappedClaims = claims.filter((claim) => claim.status === 'mapped').length;
  const locatorBackedClaims = claims.filter((claim) => claim.status === 'mapped' || claim.status === 'locator-missing').length;

  return {
    dossierId: `dossier_${Date.now()}`,
    namespace,
    createdAt: new Date().toISOString(),
    granularity: 'sentence',
    sourceDocuments,
    claims,
    edges,
    completeness,
    mappingCoverage: claims.length > 0 ? mappedClaims / claims.length : 0,
    locatorCoverage: claims.length > 0 ? locatorBackedClaims / claims.length : 0,
    hoverHint: 'Hover over a sentence to inspect the linked source anchor and highlighted PDF region.',
  };
}
