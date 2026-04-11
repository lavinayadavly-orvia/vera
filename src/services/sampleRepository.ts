/**
 * Sample Repository Service
 *
 * Centralized system for managing Vera sample outputs.
 * RULE: Only free, non-licensed images and icons are allowed.
 *
 * Approved Sources:
 * - Unsplash (https://unsplash.com) - Free high-res photos, CC0
 * - Lucide Icons (npm package) - Free open-source icons
 * - Feather Icons (https://feathericons.com) - Free vector icons, MIT license
 * - Icons8 Free (https://icons8.com) - Limited free icons under CC license
 * - Pixabay (https://pixabay.com) - Free images and vectors, Pixabay License
 * - Pexels (https://pexels.com) - Free stock photos, CC0
 * - generated via blink.ai.generateImage (AI-generated, no licensing issues)
 */

export interface SampleAsset {
  id: string;
  url: string;
  source: 'unsplash' | 'lucide' | 'feather' | 'icons8-free' | 'pixabay' | 'pexels' | 'ai-generated';
  license: string; // CC0, MIT, CC-BY, Pixabay License, etc.
  attribution?: string; // For sources that require attribution
  contentType?: string;
}

export interface Sample {
  id: string;
  title: string;
  description: string;
  contentType: 'infographic' | 'video' | 'presentation' | 'social-post' | 'document' | 'report';
  format: 'image' | 'pdf' | 'mp4' | 'pptx' | 'docx' | 'carousel';
  previewImage: SampleAsset;
  content: string; // Generated content or template
  assets: SampleAsset[]; // All assets used in this sample
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

// Whitelist of approved free image sources
const APPROVED_FREE_SOURCES = {
  unsplash: {
    domain: 'images.unsplash.com',
    license: 'CC0 - Unsplash License',
    freeToUse: true,
    requiresAttribution: false
  },
  lucide: {
    domain: 'lucide.dev',
    license: 'MIT',
    freeToUse: true,
    requiresAttribution: false
  },
  feather: {
    domain: 'feathericons.com',
    license: 'MIT',
    freeToUse: true,
    requiresAttribution: false
  },
  pixabay: {
    domain: 'pixabay.com',
    license: 'Pixabay License',
    freeToUse: true,
    requiresAttribution: false
  },
  pexels: {
    domain: 'images.pexels.com',
    license: 'CC0 - Pexels License',
    freeToUse: true,
    requiresAttribution: false
  },
  icons8_free: {
    domain: 'icons8.com',
    license: 'CC-BY or Free',
    freeToUse: true, // Only free icons, not premium
    requiresAttribution: true
  },
  ai_generated: {
    domain: 'ai-generated',
    license: 'Generated via Blink AI - No licensing issues',
    freeToUse: true,
    requiresAttribution: false
  }
};

/**
 * Verify if an image URL comes from an approved free source
 * @param url - Image URL to verify
 * @returns {boolean} True if URL is from an approved free source
 */
export function isApprovedFreeSource(url: string): boolean {
  if (!url) return false;

  const urlLower = url.toLowerCase();

  // Check for AI-generated (blink.ai URLs)
  if (urlLower.includes('blink') || urlLower.includes('gemini')) {
    return true;
  }

  // Check against whitelist
  for (const [source, config] of Object.entries(APPROVED_FREE_SOURCES)) {
    if (source === 'ai_generated') continue; // Already checked above
    if (urlLower.includes((config as any).domain)) {
      return true;
    }
  }

  return false;
}

/**
 * Get source information for a URL
 * @param url - Image URL
 * @returns {SampleAsset['source'] | null} Source type or null if not approved
 */
export function getSourceFromUrl(url: string): SampleAsset['source'] | null {
  if (!url) return null;

  const urlLower = url.toLowerCase();

  if (urlLower.includes('unsplash')) return 'unsplash';
  if (urlLower.includes('lucide')) return 'lucide';
  if (urlLower.includes('feather')) return 'feather';
  if (urlLower.includes('pixabay')) return 'pixabay';
  if (urlLower.includes('pexels')) return 'pexels';
  if (urlLower.includes('icons8')) return 'icons8-free';
  if (urlLower.includes('blink') || urlLower.includes('gemini')) return 'ai-generated';

  return null;
}

/**
 * Verify asset has valid free license
 * @param asset - Asset to verify
 * @returns {boolean} True if asset uses approved free license
 */
export function isValidFreeAsset(asset: SampleAsset): boolean {
  // Must be from approved free source
  if (!isApprovedFreeSource(asset.url)) {
    console.warn(`[SampleRepository] Rejected asset - not from approved free source: ${asset.url}`);
    return false;
  }

  // Must have source specified
  if (!asset.source || !(APPROVED_FREE_SOURCES as any)[asset.source]) {
    console.warn(`[SampleRepository] Rejected asset - invalid or unknown source: ${asset.source}`);
    return false;
  }

  return true;
}

/**
 * Validate entire sample only uses free assets
 * @param sample - Sample to validate
 * @returns {Object} Validation result with status and errors
 */
export function validateSampleAssets(sample: Sample): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check preview image
  if (!isValidFreeAsset(sample.previewImage)) {
    errors.push(`Preview image not from approved free source: ${sample.previewImage.url}`);
  }

  // Check all assets
  sample.assets.forEach((asset, index) => {
    if (!isValidFreeAsset(asset)) {
      errors.push(`Asset ${index + 1} not from approved free source: ${asset.url}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create asset with source validation
 * @param url - Image URL
 * @param source - Source type
 * @returns {SampleAsset} Validated asset
 * @throws {Error} If URL is not from approved free source
 */
export function createFreeAsset(url: string, source: SampleAsset['source']): SampleAsset {
  if (!isApprovedFreeSource(url)) {
    throw new Error(
      `[SampleRepository] Rejected asset - URL must be from approved free source. Got: ${url}\n` +
      `Approved sources: Unsplash, Lucide, Feather, Pixabay, Pexels, Icons8 (free only), AI-generated`
    );
  }

  const sourceConfig = (APPROVED_FREE_SOURCES as any)[source];
  if (!sourceConfig) {
    throw new Error(
      `[SampleRepository] Invalid source type: ${source}. Must be one of: unsplash, lucide, feather, pixabay, pexels, icons8-free, ai-generated`
    );
  }

  return {
    id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    url,
    source,
    license: sourceConfig.license,
    attribution: sourceConfig.requiresAttribution ? `From ${source}` : undefined
  };
}

/**
 * Sample repository for storing and retrieving approved samples
 * Enforces free-only asset usage
 */
export class SampleRepositoryManager {
  private samples: Map<string, Sample> = new Map();

  /**
   * Add a new sample with validation
   * @param sample - Sample to add
   * @throws {Error} If sample contains non-free assets
   */
  addSample(sample: Sample): void {
    const validation = validateSampleAssets(sample);
    if (!validation.isValid) {
      throw new Error(
        `[SampleRepository] Cannot add sample "${sample.title}" - contains non-free assets:\n` +
        validation.errors.join('\n')
      );
    }

    this.samples.set(sample.id, sample);
    console.log(`[SampleRepository] Added sample: "${sample.title}" (${sample.id})`);
  }

  /**
   * Get sample by ID
   * @param id - Sample ID
   * @returns {Sample | undefined} Sample or undefined if not found
   */
  getSample(id: string): Sample | undefined {
    return this.samples.get(id);
  }

  /**
   * Get all samples
   * @returns {Sample[]} All samples
   */
  getAllSamples(): Sample[] {
    return Array.from(this.samples.values());
  }

  /**
   * Filter samples by content type
   * @param contentType - Content type to filter by
   * @returns {Sample[]} Matching samples
   */
  getSamplesByContentType(contentType: Sample['contentType']): Sample[] {
    return Array.from(this.samples.values()).filter(
      (sample) => sample.contentType === contentType
    );
  }

  /**
   * Filter samples by tags
   * @param tags - Tags to filter by
   * @returns {Sample[]} Samples matching any of the tags
   */
  getSamplesByTags(tags: string[]): Sample[] {
    return Array.from(this.samples.values()).filter((sample) =>
      sample.tags.some((tag) => tags.includes(tag))
    );
  }

  /**
   * Get all free sources used in samples
   * @returns {Set<string>} Set of approved free sources
   */
  getFreeSourcesToUse(): Set<string> {
    return new Set(Object.keys(APPROVED_FREE_SOURCES).filter(s => s !== 'ai_generated').concat(['ai_generated']));
  }

  /**
   * Get attribution requirements for samples
   * @returns {Map<string, string>} Source to license/attribution mapping
   */
  getAttributionRequirements(): Map<string, string> {
    const requirements = new Map<string, string>();
    for (const [source, config] of Object.entries(APPROVED_FREE_SOURCES)) {
      requirements.set(source, (config as any).license);
    }
    return requirements;
  }
}

// Singleton instance
export const sampleRepository = new SampleRepositoryManager();
