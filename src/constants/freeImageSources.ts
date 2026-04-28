/**
 * Free Image Sources Documentation
 *
 * This file documents all approved free image and icon sources for Vera.
 * CRITICAL: Only these sources are allowed to prevent licensing issues.
 */

export const FREE_IMAGE_SOURCES = {
  UNSPLASH: {
    name: 'Unsplash',
    url: 'https://unsplash.com',
    description: 'Free high-resolution photos from talented photographers worldwide',
    license: 'Unsplash License (CC0)',
    attribution: 'Not required, but appreciated',
    bestFor: ['Infographics', 'Presentations', 'Social posts', 'Hero images'],
    example: 'https://images.unsplash.com/photo-xxxxx',
    usage: 'Automatic via Vera-approved image generation or manual URLs'
  },

  LUCIDE: {
    name: 'Lucide Icons',
    url: 'https://lucide.dev',
    description: 'Beautiful, consistent open-source icon library',
    license: 'MIT License',
    attribution: 'Not required',
    bestFor: ['Icons', 'UI elements', 'Infographics accent'],
    example: 'https://lucide.dev/icons/xxxx.svg',
    usage: 'Already imported in React components as SVG icons'
  },

  FEATHER: {
    name: 'Feather Icons',
    url: 'https://feathericons.com',
    description: 'Minimal set of SVG icons designed for simplicity',
    license: 'MIT License',
    attribution: 'Not required',
    bestFor: ['Simple icons', 'Line-based graphics', 'UI accents'],
    example: 'https://cdn.jsdelivr.net/npm/feather-icons/dist/icons/xxxx.svg',
    usage: 'Can be imported as SVG in components'
  },

  PIXABAY: {
    name: 'Pixabay',
    url: 'https://pixabay.com',
    description: 'Free stock photos, vectors, and illustrations',
    license: 'Pixabay License (free for commercial and non-commercial use)',
    attribution: 'Not required',
    bestFor: ['Stock photos', 'Vector graphics', 'General images'],
    example: 'https://pixabay.com/images/download/xxx.jpg',
    usage: 'Direct image URLs from Pixabay'
  },

  PEXELS: {
    name: 'Pexels',
    url: 'https://pexels.com',
    description: 'High-quality free stock photography',
    license: 'Pexels License (CC0)',
    attribution: 'Not required, but appreciated',
    bestFor: ['Photography', 'Professional images', 'Backgrounds'],
    example: 'https://images.pexels.com/photos/xxxxx/pexels-photo-xxxxx.jpeg',
    usage: 'Direct image URLs from Pexels'
  },

  ICONS8_FREE: {
    name: 'Icons8 Free Icons',
    url: 'https://icons8.com',
    description: 'Free vector icons (note: Icons8 also has paid icons, use ONLY free)',
    license: 'CC-BY or Icons8 Free License',
    attribution: 'Required for some icons, check individual license',
    bestFor: ['Icons', 'UI elements', 'Graphics accents'],
    example: 'https://icons8.com/icons/set/xxxxx',
    usage: 'Only free tier icons, verify license per icon',
    warning: 'Icons8 offers both free and paid content. Ensure using FREE tier only.'
  },

  AI_GENERATED: {
    name: 'AI-Generated',
    url: 'https://platform.openai.com',
    description: 'Custom images generated via Vera-approved AI image generation',
    license: 'Generated content - No licensing issues',
    attribution: 'Not required',
    bestFor: ['Custom infographics', 'Unique visuals', 'Branded content'],
    example: 'URLs from Vera-managed AI image generation results',
    usage: 'Automatic when image generation is called in generator.ts'
  }
};

export const APPROVED_FREE_DOMAINS = [
  'images.unsplash.com',
  'lucide.dev',
  'feathericons.com',
  'pixabay.com',
  'images.pexels.com',
  'icons8.com',
  'cdn.jsdelivr.net', // For Feather icons
  'openai', // For AI-generated images
  'gemini', // For Gemini AI generated images
];

export const BANNED_DOMAINS = [
  'gettyimages.com',
  'shutterstock.com',
  'istockphoto.com',
  'alamy.com',
  'adobe.com/stock', // Adobe Stock is paid
  'dreamstime.com',
  '123rf.com',
  'depositphotos.com',
  // Add more paid stock photo sites as needed
];

/**
 * Best Practices for Using Free Images
 */
export const FREE_IMAGE_BEST_PRACTICES = [
  '1. Always verify the license before using an image',
  '2. Use AI-generated images for custom, unique content when possible',
  '3. Unsplash is preferred for high-quality photography',
  '4. Pixabay and Pexels are excellent alternatives',
  '5. For icons, use Lucide (already integrated) or Feather',
  '6. Check Pixabay/Pexels APIs for programmatic access',
  '7. When using Unsplash API, credit the photographer when visible in UI',
  '8. Never use watermarked or trial versions of images',
  '9. Verify AI-generated image URLs are from Vera-approved generators',
  '10. Document all image sources in sample metadata for compliance'
];

/**
 * Search strategies for finding free images
 */
export const FREE_IMAGE_SEARCH_STRATEGY = {
  photography: 'Use Unsplash, Pexels, or Pixabay for general photos',
  businessImages: 'Unsplash has a business category; Pexels has professional shots',
  illustrations: 'Pixabay vectors, or generate custom with AI',
  icons: 'Lucide (built-in) or Feather icons',
  abstractArt: 'Unsplash abstract category or AI generation',
  nature: 'Pexels or Pixabay nature galleries',
  technology: 'Unsplash tech category',
  people: 'Unsplash people category (verified diverse images)',
  custom: 'Always use Vera-approved AI image generation for unique branded content'
};
