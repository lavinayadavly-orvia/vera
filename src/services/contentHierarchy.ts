import type { BrandLockProfile, ContentHierarchy, ContentHierarchyNode, Market } from '@/types';

function buildParentNode(prompt: string): ContentHierarchyNode {
  return {
    nodeId: 'core-global-parent',
    label: 'Global Core Content',
    level: 'parent',
    market: 'global',
    locale: 'en-001',
    inheritanceMode: 'core',
    notes: `Master claim / visual lineage for: ${prompt}`,
  };
}

function buildChildNode(prompt: string, market: Market): ContentHierarchyNode {
  const localeMap: Record<Market, string> = {
    global: 'en-001',
    india: 'en-IN',
    singapore: 'en-SG',
    dubai: 'en-AE',
    germany: 'de-DE',
    us: 'en-US',
    uk: 'en-GB',
  };

  return {
    nodeId: `localized-child-${market}`,
    label: 'Local Adaptation',
    level: 'child',
    market,
    locale: localeMap[market],
    inheritanceMode: market === 'global' ? 'core' : 'localized',
    notes: market === 'global'
      ? `Global delivery remains aligned to the parent content for: ${prompt}`
      : `Local adaptation inherits the global core and applies market-specific language or regulatory adjustments for: ${prompt}`,
  };
}

function buildBrandLockProfile(): BrandLockProfile {
  return {
    designSystemId: 'dnd-dsm-core',
    tokensLocked: true,
    editableByUser: false,
    lockedTokenGroups: ['colors', 'typography', 'spacing', 'radius', 'layout-density'],
    rationale: 'Design System Manager mode keeps brand tokens read-only for most users to prevent unauthorized local drift.',
  };
}

export function buildContentHierarchy(prompt: string, market: Market): ContentHierarchy {
  return {
    parent: buildParentNode(prompt),
    child: buildChildNode(prompt, market),
    brandLock: buildBrandLockProfile(),
  };
}
