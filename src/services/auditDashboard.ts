import type {
  ApiNamespace,
  AuditDashboardSummary,
  ContentType,
  Market,
  MarketAuditMetric,
  ModularContentLibrary,
  RulesEngineReport,
} from '@/types';

const MARKET_BENCHMARKS: Record<Market, Omit<MarketAuditMetric, 'market'>> = {
  global: { averageApprovalDays: 18, targetDays: 6, estimatedAssetCost: 4200, assetsTracked: 24, bottleneck: 'Cross-market evidence localization' },
  india: { averageApprovalDays: 14, targetDays: 6, estimatedAssetCost: 3200, assetsTracked: 19, bottleneck: 'UCPMP wording review' },
  singapore: { averageApprovalDays: 12, targetDays: 6, estimatedAssetCost: 3600, assetsTracked: 15, bottleneck: 'Reference currency re-validation' },
  dubai: { averageApprovalDays: 16, targetDays: 6, estimatedAssetCost: 3900, assetsTracked: 11, bottleneck: 'Arabic terminology validation' },
  germany: { averageApprovalDays: 20, targetDays: 6, estimatedAssetCost: 4700, assetsTracked: 17, bottleneck: 'SmPC and promotional compliance review' },
  us: { averageApprovalDays: 21, targetDays: 6, estimatedAssetCost: 5200, assetsTracked: 28, bottleneck: 'Fair balance and boxed warning review' },
  uk: { averageApprovalDays: 17, targetDays: 6, estimatedAssetCost: 4100, assetsTracked: 13, bottleneck: 'ABPI copy substantiation review' },
};

const FORMAT_COMPLEXITY: Record<ContentType, { cycleDays: number; cost: number }> = {
  infographic: { cycleDays: 6, cost: 1800 },
  video: { cycleDays: 9, cost: 4200 },
  presentation: { cycleDays: 7, cost: 2400 },
  'social-post': { cycleDays: 4, cost: 900 },
  document: { cycleDays: 6, cost: 1500 },
  report: { cycleDays: 8, cost: 2800 },
  podcast: { cycleDays: 7, cost: 2300 },
  'white-paper': { cycleDays: 10, cost: 3600 },
};

export function buildAuditDashboard(params: {
  market: Market;
  namespace: ApiNamespace;
  contentType: ContentType;
  rulesEngine: RulesEngineReport;
  contentLibrary: ModularContentLibrary;
  snapshotCount: number;
}): AuditDashboardSummary {
  const benchmark = MARKET_BENCHMARKS[params.market];
  const complexity = FORMAT_COMPLEXITY[params.contentType];
  const approvedRatio = params.contentLibrary.blocks.length > 0
    ? params.contentLibrary.reusableApprovedCount / params.contentLibrary.blocks.length
    : 0;
  const blockPenalty = params.rulesEngine.status === 'block' ? 4 : params.rulesEngine.status === 'warn' ? 2 : 0;
  const estimatedCycleDays = Math.max(
    3,
    Math.round(complexity.cycleDays + blockPenalty + (1 - approvedRatio) * 3),
  );
  const estimatedCost = Math.round(complexity.cost + blockPenalty * 250 + (params.contentLibrary.blocks.length * 45));

  return {
    goalLabel: 'Draft to Approved in 6 days',
    currentAsset: {
      market: params.market,
      namespace: params.namespace,
      estimatedCycleDays,
      estimatedCost,
      approvalProgress: Math.round(approvedRatio * 100),
    },
    marketBenchmarks: (Object.entries(MARKET_BENCHMARKS) as Array<[Market, Omit<MarketAuditMetric, 'market'>]>).map(([market, value]) => ({
      market,
      ...value,
    })),
    snapshotCount: params.snapshotCount,
  };
}
