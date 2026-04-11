/**
 * Asset Validator Service
 *
 * Ensures all assets (images, icons) used in Vera are from approved free sources.
 * Prevents accidental use of licensed or paid content.
 */

import { APPROVED_FREE_DOMAINS, BANNED_DOMAINS } from '@/constants/freeImageSources';

export interface ValidationResult {
  isValid: boolean;
  message: string;
  source?: string;
}

/**
 * Validate if a URL is from an approved free source
 * @param url - Image/asset URL to validate
 * @returns ValidationResult with isValid flag and details
 */
export function validateAssetUrl(url: string): ValidationResult {
  if (!url) {
    return {
      isValid: false,
      message: 'Asset URL is empty or null'
    };
  }

  const urlLower = url.toLowerCase();

  if (urlLower.startsWith('blob:') || urlLower.startsWith('data:image/')) {
    return {
      isValid: true,
      message: '✓ Valid: locally generated preview asset',
      source: 'local-generated'
    };
  }

  // First check: is it on the banned list?
  for (const bannedDomain of BANNED_DOMAINS) {
    if (urlLower.includes(bannedDomain)) {
      return {
        isValid: false,
        message: `❌ BLOCKED: Asset from paid/licensed source: ${bannedDomain}. Use only free sources from: Unsplash, Pexels, Pixabay, Lucide, Feather, or AI-generated.`,
        source: bannedDomain
      };
    }
  }

  // Second check: is it from an approved free source?
  let foundApprovedSource: string | undefined;
  for (const domain of APPROVED_FREE_DOMAINS) {
    if (urlLower.includes(domain)) {
      foundApprovedSource = domain;
      break;
    }
  }

  if (foundApprovedSource) {
    return {
      isValid: true,
      message: `✓ Valid: Asset is from approved free source: ${foundApprovedSource}`,
      source: foundApprovedSource
    };
  }

  // If not on approved list and not obviously free, reject it
  return {
    isValid: false,
    message: `⚠️ UNKNOWN SOURCE: Asset URL domain not recognized as free. Must use: Unsplash, Pexels, Pixabay, Lucide, Feather, or AI-generated images. URL: ${url}`
  };
}

/**
 * Validate multiple asset URLs
 * @param urls - Array of image/asset URLs
 * @returns Array of validation results
 */
export function validateMultipleAssets(urls: string[]): ValidationResult[] {
  return urls.map((url) => validateAssetUrl(url));
}

/**
 * Check if all assets are valid
 * @param urls - Array of image/asset URLs
 * @returns boolean - true if all are valid
 */
export function areAllAssetsValid(urls: string[]): boolean {
  return urls.every((url) => validateAssetUrl(url).isValid);
}

/**
 * Get detailed validation report
 * @param urls - Array of image/asset URLs
 * @returns Object with summary and details
 */
export function getValidationReport(urls: string[]): {
  totalAssets: number;
  validAssets: number;
  invalidAssets: number;
  blockedAssets: string[];
  unknownAssets: string[];
  results: ValidationResult[];
} {
  const results = validateMultipleAssets(urls);
  const blockedAssets: string[] = [];
  const unknownAssets: string[] = [];

  results.forEach((result, index) => {
    if (!result.isValid) {
      if (result.message.includes('BLOCKED')) {
        blockedAssets.push(urls[index]);
      } else {
        unknownAssets.push(urls[index]);
      }
    }
  });

  return {
    totalAssets: urls.length,
    validAssets: results.filter((r) => r.isValid).length,
    invalidAssets: results.filter((r) => !r.isValid).length,
    blockedAssets,
    unknownAssets,
    results
  };
}

/**
 * Recommend a free image source based on image purpose
 * @param purpose - What the image is for (e.g., 'hero', 'icon', 'background')
 * @returns Recommended source
 */
export function recommendFreeSource(purpose: string): string {
  const purposeLower = purpose.toLowerCase();

  if (purposeLower.includes('icon') || purposeLower.includes('ui') || purposeLower.includes('symbol')) {
    return 'Lucide Icons (https://lucide.dev) - Already integrated, use LucideIcon components';
  }

  if (purposeLower.includes('background') || purposeLower.includes('hero') || purposeLower.includes('cover')) {
    return 'Unsplash (https://unsplash.com) - High-quality photography perfect for backgrounds';
  }

  if (purposeLower.includes('illustration') || purposeLower.includes('vector') || purposeLower.includes('graphic')) {
    return 'Pixabay (https://pixabay.com) - Excellent vector and illustration collection';
  }

  if (purposeLower.includes('custom') || purposeLower.includes('unique') || purposeLower.includes('branded')) {
    return 'AI-Generated (blink.ai.generateImage) - Create unique, custom images on-the-fly';
  }

  if (purposeLower.includes('professional') || purposeLower.includes('business')) {
    return 'Pexels (https://pexels.com) - Professional, high-quality business photography';
  }

  // Default recommendation
  return 'Unsplash (https://unsplash.com) or use blink.ai.generateImage for AI-generated custom content';
}

/**
 * Log validation report for debugging
 * @param urls - Asset URLs to validate
 * @param context - Optional context string for logs
 */
export function logValidationReport(urls: string[], context: string = 'Asset Validation'): void {
  const report = getValidationReport(urls);

  console.group(`[${context}] Free Image Validation Report`);
  console.log(`Total Assets: ${report.totalAssets}`);
  console.log(`✓ Valid (Free): ${report.validAssets}`);
  console.log(`✗ Invalid: ${report.invalidAssets}`);

  if (report.blockedAssets.length > 0) {
    console.error('BLOCKED (Paid/Licensed) Assets:', report.blockedAssets);
  }

  if (report.unknownAssets.length > 0) {
    console.warn('UNKNOWN SOURCE Assets (review required):', report.unknownAssets);
  }

  report.results.forEach((result, index) => {
    if (result.isValid) {
      console.log(`[${index + 1}] ✓ ${result.message}`);
    } else {
      console.error(`[${index + 1}] ✗ ${result.message}`);
    }
  });

  console.groupEnd();
}

/**
 * Sanitize and validate an image URL before using it
 * Throws error if URL is from banned source
 * @param url - Image URL
 * @param throwOnInvalid - If true, throws error for invalid URLs
 * @returns Validated URL or empty string
 */
export function sanitizeImageUrl(url: string, throwOnInvalid: boolean = false): string {
  const validation = validateAssetUrl(url);

  if (!validation.isValid) {
    if (throwOnInvalid) {
      throw new Error(
        `[Asset Validator] Invalid image source. ${validation.message}\n` +
        `Recommended source: ${recommendFreeSource('general')}`
      );
    }
    console.warn(`[Asset Validator] ${validation.message}`);
    return '';
  }

  return url;
}
