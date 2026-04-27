export type ContentType = 'infographic' | 'video' | 'presentation' | 'social-post' | 'document' | 'report' | 'podcast' | 'white-paper';
export type Market = 'global' | 'india' | 'singapore' | 'dubai' | 'germany' | 'us' | 'uk';
export type ApiNamespace = 'medical' | 'marketing';
export type DeliveryReadiness = 'ready' | 'provider-required';
export type SourceAudienceSegment = 'patient' | 'hcp' | 'kol' | 'public' | 'payer';
export type SourceCommunicationIntent = 'awareness' | 'launch' | 'medical' | 'promotional' | 'cme' | 'policy' | 'education';
export type VideoAspectRatio = '16:9' | '9:16' | '1:1';
export type RegulatoryContentType =
  | 'promotional'
  | 'scientific-exchange'
  | 'medical-information'
  | 'patient-education'
  | 'disease-awareness'
  | 'policy';

export interface GenerationRequest {
  id: string;
  userId: string;
  prompt: string;
  contentType: ContentType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputUrl?: string;
  outputFormat?: string;
  market?: Market;
  audience?: string;
  sourceCount?: number;
  hasSavedOutput?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContentStrategySelection {
  contentType?: ContentType;
  market?: Market;
  apiNamespace?: ApiNamespace;
  targetAudience?: string;
}

export interface ContentSource {
  title: string;
  domain: string;
  url?: string;
  snippet?: string;
  section?: string;
  page?: number;
  type: 'web' | 'document' | 'knowledge';
  publishedYear?: number;
  tier?: 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Tier 4' | 'Tier 5' | 'Tier 6';
  sourceType?: string;
  suitability?: 'P' | 'S' | 'C' | 'X';
  recommendedRole?: 'primary' | 'supporting' | 'contextual' | 'excluded';
  evidenceUseCase?: SourceEvidenceUseCase;
  screening?: SourceScreeningCheck[];
  screeningSummary?: string;
  sourceDocId?: string;
  verbatimAnchor?: string;
  coordinateMap?: CoordinateMap;
  viewerStatus?: 'available' | 'locator-missing' | 'external';
}

export type SourceEvidenceUseCase =
  | 'hcp-detail-aid'
  | 'hcp-awareness'
  | 'hcp-training-cme'
  | 'patient-awareness'
  | 'patient-education'
  | 'patient-digital-social'
  | 'pr-media'
  | 'policy-hta-dossier';

export interface SourceScreeningCheck {
  id: string;
  label: string;
  status: 'pass' | 'caution' | 'fail' | 'unknown';
  note: string;
}

export interface SourceGovernanceSummary {
  audienceSegment: SourceAudienceSegment;
  audienceLabel: string;
  communicationIntent: SourceCommunicationIntent;
  communicationIntentLabel: string;
  communicationFormat: string;
  namespace: ApiNamespace;
  namespaceLabel: string;
  market: Market;
  marketLabel: string;
  marketAuthority: string;
  controllingReferences: string[];
  evidenceUseCase: SourceEvidenceUseCase;
  evidenceUseCaseLabel: string;
  minimumSourceStandard: string;
  preferredSourceTypes: string[];
  allowedSourceTypes: string[];
  excludedSourceTypes: string[];
  sourceSearchHints: string[];
  formatRequirements: string[];
  nonNegotiables: string[];
  regulatoryNotes: string[];
  commonFailures: string[];
  screenedSourceCount?: number;
  approvedSourceCount?: number;
  hardLockReasons?: string[];
  hardLockReason?: string;
}

export interface DeliveryContractSummary {
  contentType: ContentType;
  formatLabel: string;
  primaryDeliverable: string;
  supportingDeliverables: string[];
  providerLabel: string;
  readiness: DeliveryReadiness;
  note: string;
  finalOnly: boolean;
}

export interface ProviderStackSummary {
  text?: string;
  audio?: string;
  design?: string;
  document?: string;
  presentation?: string;
  video?: string;
}

export interface GuardrailIssue {
  severity: 'block' | 'warn' | 'info';
  code: string;
  title: string;
  message: string;
  suggestions?: string[];
}

export interface ReadabilityReport {
  scoreName: 'Flesch-Kincaid';
  gradeLevel: number | null;
  targetLabel: string;
  passed: boolean;
  difficultTerms: string[];
  simplifiedEquivalents: Array<{
    from: string;
    to: string;
  }>;
}

export interface EvidenceMapEntry {
  claimId: string;
  sourceTitle: string;
  sourceUrl?: string;
  locator: string;
  status: 'mapped' | 'locator-missing';
}

export interface CoordinateMap {
  page: number | null;
  paragraph: number | null;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
}

export interface ReferenceDocument {
  sourceDocId: string;
  title: string;
  sourceType: string;
  domain: string;
  url?: string;
  publishedYear?: number;
  viewerStatus: 'available' | 'locator-missing' | 'external';
  verbatimAnchor: string;
  coordinateMap: CoordinateMap;
  screeningSummary?: string;
}

export interface ClaimNode {
  claimId: string;
  text: string;
  sentenceIndex?: number;
  sourceDocId?: string;
  sourceTitle?: string;
  verbatimAnchor?: string;
  coordinateMap?: CoordinateMap;
  status: 'mapped' | 'locator-missing' | 'source-needed' | 'unmapped';
}

export interface ClaimEdge {
  claimId: string;
  sourceDocId?: string;
  relationship: 'supported-by' | 'placeholder-for' | 'derived-from';
}

export interface EvidenceDossier {
  dossierId: string;
  namespace: ApiNamespace;
  createdAt: string;
  granularity: 'sentence';
  sourceDocuments: ReferenceDocument[];
  claims: ClaimNode[];
  edges: ClaimEdge[];
  completeness: 'complete' | 'partial' | 'draft';
  mappingCoverage: number;
  locatorCoverage: number;
  hoverHint: string;
}

export interface ApprovedContentBlock {
  blockId: string;
  kind: 'headline' | 'claim' | 'stat' | 'body' | 'cta' | 'disclaimer';
  text: string;
  sourceClaimIds: string[];
  approvalStatus: 'approved' | 'needs-review' | 'blocked';
  reusableIn: ContentType[];
  notes: string[];
}

export interface ModularContentLibrary {
  mode: 'block-library';
  blocks: ApprovedContentBlock[];
  reusableApprovedCount: number;
  blockedCount: number;
}

export interface WithdrawalWatchSource {
  sourceDocId: string;
  title: string;
  trigger: string;
}

export interface WithdrawalMonitorSummary {
  watchStatus: 'monitoring' | 'flagged';
  watchedSources: WithdrawalWatchSource[];
  impactedBlockIds: string[];
  action: string;
  webhookReady: boolean;
}

export interface MarketAuditMetric {
  market: Market;
  averageApprovalDays: number;
  targetDays: number;
  estimatedAssetCost: number;
  assetsTracked: number;
  bottleneck: string;
}

export interface AuditDashboardSummary {
  goalLabel: string;
  currentAsset: {
    market: Market;
    namespace: ApiNamespace;
    estimatedCycleDays: number;
    estimatedCost: number;
    approvalProgress: number;
  };
  marketBenchmarks: MarketAuditMetric[];
  snapshotCount: number;
}

export interface SecurityArchitectureSummary {
  ssoRequired: boolean;
  approvalModel: 'strict-rbac';
  zeroDataRetentionPolicy: 'required';
  workflowIsolation: 'medical-vs-marketing';
  translationPolicy: string;
  roles: Array<{
    role: 'writer' | 'reviewer' | 'approver' | 'admin';
    canApprove: boolean;
    permissions: string[];
  }>;
}

export interface RulesEngineFinding {
  severity: 'block' | 'warn' | 'info';
  code: string;
  title: string;
  message: string;
  ruleId: string;
  matchedTerms?: string[];
  requiredDisclaimers?: string[];
}

export interface RulesEngineReport {
  version: string;
  namespace: ApiNamespace;
  market: Market;
  regulatoryContentType: RegulatoryContentType;
  constrainedBy: string[];
  findings: RulesEngineFinding[];
  requiredDisclaimers: string[];
  prohibitedTerms: string[];
  status: 'pass' | 'warn' | 'block';
}

export interface BrandLockProfile {
  designSystemId: string;
  tokensLocked: boolean;
  editableByUser: boolean;
  lockedTokenGroups: string[];
  rationale: string;
}

export interface ContentHierarchyNode {
  nodeId: string;
  label: string;
  level: 'parent' | 'child';
  market: Market;
  locale: string;
  inheritanceMode: 'core' | 'localized';
  notes: string;
}

export interface ContentHierarchy {
  parent: ContentHierarchyNode;
  child: ContentHierarchyNode;
  brandLock: BrandLockProfile;
}

export interface PiiScrubMatch {
  type: 'email' | 'phone' | 'mrn' | 'dob' | 'trial-id' | 'participant-id';
  original: string;
  replacement: string;
}

export interface PiiScrubReport {
  enabled: boolean;
  status: 'clean' | 'scrubbed';
  matchCount: number;
  matches: PiiScrubMatch[];
  notes: string[];
}

export interface ProviderComplianceProfile {
  provider: string;
  model: string;
  zeroDataRetention: 'enabled' | 'unsupported' | 'unknown';
  namespace: ApiNamespace;
  notes: string[];
}

export interface AuditSnapshot {
  snapshotId: string;
  createdAt: string;
  llmModel: string;
  rulesEngineVersion: string;
  namespace: ApiNamespace;
  market: Market;
  contentType: ContentType;
  regulatoryContentType: RegulatoryContentType;
  stateBlob: string;
}

export interface VeevaConnectionStatus {
  configured: boolean;
  authMode: 'oidc-oauth2';
  vaultDomain?: string;
  connectedAt?: string;
  lastWebhookEvent?: string;
  webhookReady?: boolean;
  crudCapabilities?: Array<'get' | 'post' | 'status-listen'>;
  notes: string[];
}

export interface VeevaAssetLink {
  objectType: 'Document__v';
  assetStatus: 'draft' | 'approved' | 'expired' | 'withdrawn' | 'not-synced';
  metadataFields: Record<string, string>;
  syncCapabilities: Array<'get-approved-claims' | 'post-final-asset' | 'withdrawal-webhook'>;
}

export interface ComplianceArchitectureSummary {
  namespace: ApiNamespace;
  regulatoryContentType: RegulatoryContentType;
  provider: ProviderComplianceProfile;
  dossier?: EvidenceDossier;
  contentLibrary: ModularContentLibrary;
  rulesEngine: RulesEngineReport;
  snapshots: AuditSnapshot[];
  scrubReport: PiiScrubReport;
  hierarchy: ContentHierarchy;
  withdrawalMonitor: WithdrawalMonitorSummary;
  auditDashboard: AuditDashboardSummary;
  security: SecurityArchitectureSummary;
  veeva: {
    connection: VeevaConnectionStatus;
    assetLink: VeevaAssetLink;
  };
}

export interface OperationalGuardrailReport {
  market: Market;
  locked: boolean;
  summary: string;
  issues: GuardrailIssue[];
  readability?: ReadabilityReport;
  evidenceMap?: EvidenceMapEntry[];
}

export interface InfographicData {
  hero?: {
    kicker?: string;
    title: string;
    subtitle: string;
  };
  stats?: Array<{
    value: string;
    label: string;
    colorClass?: string;
    sourceId?: string;
  }>;
  sections?: Array<{
    title: string;
    bullets: string[];
    colorClass?: string;
    sourceId?: string;
  }>;
  actions?: Array<string | {
    text: string;
    sourceId?: string;
  }>;
  references?: Array<{
    id: string;
    citation: string;
  }>;
  heroContent: {
    title: string;
    subtitle: string;
  };
  mainText: {
    heading: string;
    body: string;
    sourceId?: string;
  }[];
  insight: {
    statistic: string;
    description: string;
    sourceId?: string;
  }[];
  takeaway: {
    point: string;
    sourceId?: string;
  }[];
}

export interface GeneratedOutput {
  contentType: ContentType;
  content: string;
  textContent?: string;
  renderVariant?: 'poster' | 'longform';
  format: string;
  downloadUrl: string;
  previewUrl?: string;
  pdfUrl?: string;
  renderedVideoUrl?: string;
  audioUrl?: string;
  market?: Market;
  extent?: string;
  audience?: string;
  theme?: string;
  carouselSlides?: CarouselSlide[];
  sources?: ContentSource[];
  screenedSources?: ContentSource[];
  deliveryContract?: DeliveryContractSummary;
  sourceGovernance?: SourceGovernanceSummary;
  operationalGuardrails?: OperationalGuardrailReport;
  apiNamespace?: ApiNamespace;
  regulatoryContentType?: RegulatoryContentType;
  complianceArchitecture?: ComplianceArchitectureSummary;
  providerStack?: ProviderStackSummary;
  providerLinks?: ProviderArtifactLink[];
  videoThumbnail?: string;
  videoScenes?: VideoScene[];
  videoPackage?: VideoProductionPackage;
  videoRender?: VideoRenderSummary;
  infographicData?: InfographicData;
}

export interface ProviderArtifactLink {
  stage: 'design' | 'presentation' | 'document' | 'video' | 'audio' | 'text';
  provider: string;
  label: string;
  viewUrl?: string;
  editUrl?: string;
  downloadUrl?: string;
  generationId?: string;
  note?: string;
}

export interface CarouselSlide {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
}

export interface VideoScene {
  sceneNumber: number;
  imageUrl: string;
  sceneTitle?: string;
  beatRole?: 'hook' | 'context' | 'problem' | 'proof' | 'resolution' | 'cta';
  visualDescription: string;
  shotType?: string;
  motionCue?: string;
  onScreenText: string;
  voiceoverText: string;
  duration: number;
  transition?: string;
  editNote?: string;
  continuityAnchor?: string;
}

export interface VideoCreativeDirection {
  storyArc: string;
  hookStrategy: string;
  voiceTone: string;
  visualStyle: string;
  subjectFocus: string;
  recurringMotif: string;
  cameraLanguage: string;
  editRhythm: string;
  captionStyle: string;
  continuityNotes: string[];
  doNotShow: string[];
}

export interface VideoProductionPackage {
  title: string;
  totalDuration: number;
  aspectRatio: VideoAspectRatio;
  platformIntent: 'presentation' | 'social' | 'shorts';
  musicMood: string;
  colorPalette: string[];
  productionNotes: string[];
  narrationScript: string;
  creativeDirection?: VideoCreativeDirection;
}

export interface VideoRenderSummary {
  provider: 'luma' | 'native';
  status: 'completed' | 'skipped' | 'failed';
  mode: 'text-to-video' | 'extended-sequence' | 'storyboard-package';
  model: string;
  resolution: string;
  durationSeconds: number;
  generationId?: string;
  generationIds?: string[];
  note?: string;
}

export interface DetailedGenerationParams {
  prompt: string;
  contentType: ContentType;
  market: Market;
  apiNamespace: ApiNamespace;
  tone: 'professional' | 'casual' | 'academic' | 'persuasive' | 'inspirational';
  length: 'short' | 'medium' | 'long' | 'comprehensive';
  scientificDepth: 'basic' | 'intermediate' | 'advanced' | 'expert';
  targetAudience: string;
  userId: string;
  changeRequest?: ChangeRequestData;
  previousOutput?: GeneratedOutput;
  iterationNumber?: number;
}

export interface ChangeRequestData {
  changeDescription: string;
  specificAreas: string[];
  keepExisting: string[];
}

export interface OutputIteration {
  iterationNumber: number;
  output: GeneratedOutput;
  changeRequest?: ChangeRequestData;
  timestamp: string;
}

export interface PromptBlueprint {
  id: string;
  label: string;
  angle: string;
  prompt: string;
  rationale: string;
  recommendedContentType: ContentType;
  recommendedTone: DetailedGenerationParams['tone'];
  recommendedLength: DetailedGenerationParams['length'];
  recommendedScientificDepth: DetailedGenerationParams['scientificDepth'];
  recommendedAudience: string;
}
