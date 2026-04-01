import type { ModularContentLibrary, VeevaAssetLink, WithdrawalMonitorSummary } from '@/types';
import { buildWithdrawalWebhookDescriptor } from '@/services/veevaVault';

export function buildWithdrawalMonitor(params: {
  contentLibrary: ModularContentLibrary;
  watchedSources: Array<{ sourceDocId: string; title: string; sourceType: string }>;
  veevaAssetLink: VeevaAssetLink;
}): WithdrawalMonitorSummary {
  const regulatorySources = params.watchedSources.filter((source) =>
    /label|smpc|prescribing|regulatory|pi/i.test(`${source.sourceType} ${source.title}`),
  );
  const impactedBlockIds = params.contentLibrary.blocks
    .filter((block) => block.approvalStatus === 'approved')
    .map((block) => block.blockId);
  const webhookDescriptor = buildWithdrawalWebhookDescriptor();

  return {
    watchStatus: regulatorySources.length > 0 ? 'monitoring' : 'flagged',
    watchedSources: (regulatorySources.length > 0 ? regulatorySources : params.watchedSources).map((source) => ({
      sourceDocId: source.sourceDocId,
      title: source.title,
      trigger: webhookDescriptor.trigger,
    })),
    impactedBlockIds,
    action: regulatorySources.length > 0
      ? 'If a monitored label changes, mark every linked block and asset for withdrawal or mandatory update.'
      : 'No label-grade source is linked yet. Do not allow reusable approval until a monitored reference is attached.',
    webhookReady: params.veevaAssetLink.syncCapabilities.includes('withdrawal-webhook'),
  };
}
