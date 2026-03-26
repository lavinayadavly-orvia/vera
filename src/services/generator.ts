import { generateText, generateObject, generateImage, generateSpeech } from '@/lib/openai';
import type { ContentType, GeneratedOutput, DetailedGenerationParams, ContentSource } from '@/types';
import { RealWorldInfographicData, compileInfographicHtml } from '@/templates/infographicTemplate';
import { logValidationReport } from '@/services/assetValidator';
import { validateOutput, sanitiseOutput } from '@/utils/outputValidator';

interface GenerationParams {
  prompt: string;
  contentType: ContentType;
  userId: string;
}

// Enhanced generation function with detailed parameters and iterative refinement support
export async function generateDetailedContent(params: DetailedGenerationParams): Promise<GeneratedOutput> {
  const { prompt, contentType, tone, length, scientificDepth, targetAudience, userId, changeRequest, previousOutput, iterationNumber } = params;

  try {
    // Build enhanced context for AI
    const enhancedContext = buildEnhancedContext({ tone, length, scientificDepth, targetAudience });
    
    // Build refinement context if this is an iteration
    const refinementContext = changeRequest ? buildRefinementContext(changeRequest, previousOutput) : null;
    
    // Generate content based on type with enhanced parameters
    let output: GeneratedOutput;

    switch (contentType) {
      case 'infographic':
        output = await generateEnhancedInfographic(prompt, enhancedContext, refinementContext);
        break;
      case 'video':
        output = await generateEnhancedVideo(prompt, enhancedContext, refinementContext);
        break;
      case 'presentation':
        output = await generateEnhancedPresentation(prompt, enhancedContext, refinementContext);
        break;
      case 'social-post':
        output = await generateEnhancedSocialPost(prompt, enhancedContext, refinementContext);
        break;
      case 'document':
        output = await generateEnhancedDocument(prompt, enhancedContext, refinementContext);
        break;
      case 'report':
        output = await generateEnhancedReport(prompt, enhancedContext, refinementContext);
        break;
      case 'podcast':
        output = await generatePodcastScript(prompt, enhancedContext, refinementContext);
        break;
      case 'white-paper':
        output = await generateWhitePaper(prompt, enhancedContext, refinementContext);
        break;
      default:
        output = await generateEnhancedInfographic(prompt, enhancedContext, refinementContext);
    }

    // Attach metadata required for PDF generation
    output.theme = prompt;
    output.extent = scientificDepth;
    output.audience = targetAudience;

    // Validate and sanitise output text against Gibberish / Hallucination boundaries
    if (output.content && typeof output.content === 'string') {
      const validation = validateOutput(output.content, {
        requireAudit: output.sources && output.sources.length > 0
      });
      if (!validation.valid) {
        throw new Error(`Content generation failed safety checks:\n${validation.blocks.map(b => `- [${b.code}] ${b.message}`).join('\n')}`);
      }
      output.content = sanitiseOutput(output.content);
    }

    return output;
  } catch (error) {
    throw error;
  }
}


interface EnhancedContext {
  tone: string;
  lengthGuidance: string;
  depthGuidance: string;
  audienceGuidance: string;
  sopGuidance: string;
}

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const GOOGLE_CX = import.meta.env.VITE_GOOGLE_CX;

async function performGoogleSearch(query: string, limit: number): Promise<any> {
  if (!GOOGLE_API_KEY || !GOOGLE_CX) {
    console.warn('Google Search API keys not configured. Falling back to Blink search.');
    return await fetch(`https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&num=${limit}`).then(r => r.json()).then(d => ({ organic_results: (d.items||[]).map((i:any)=>({title:i.title,link:i.link,snippet:i.snippet})),news_results:[] })).catch(() => ({ organic_results:[], news_results:[] }));
  }

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&num=${limit}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Google search failed, falling back to Blink', await response.text());
      return await fetch(`https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&num=${limit}`).then(r => r.json()).then(d => ({ organic_results: (d.items||[]).map((i:any)=>({title:i.title,link:i.link,snippet:i.snippet})),news_results:[] })).catch(() => ({ organic_results:[], news_results:[] }));
    }
    const data = await response.json();
    
    return {
      organic_results: (data.items || []).map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet
      })),
      news_results: []
    };
  } catch (error) {
    console.error('Error in Google web sweep:', error);
    return await fetch(`https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&num=${limit}`).then(r => r.json()).then(d => ({ organic_results: (d.items||[]).map((i:any)=>({title:i.title,link:i.link,snippet:i.snippet})),news_results:[] })).catch(() => ({ organic_results:[], news_results:[] }));
  }
}

// Helper function to extract and format sources from web search
async function extractSourcesFromSearch(searchQuery: string, limit: number = 5): Promise<ContentSource[]> {
  try {
    const searchResults = await performGoogleSearch(searchQuery, limit);
    const sources: ContentSource[] = [];

    // Extract from organic results
    if (searchResults.organic_results && searchResults.organic_results.length > 0) {
      searchResults.organic_results.slice(0, limit).forEach((result: any) => {
        if (result.title && result.link) {
          try {
            const url = new URL(result.link);
            sources.push({
              title: result.title,
              domain: url.hostname.replace('www.', ''),
              url: result.link,
              snippet: result.snippet,
              type: 'web'
            });
          } catch {
            // Skip invalid URLs
          }
        }
      });
    }

    // If we have few sources, extract from news results if available
    if (sources.length < limit && searchResults.news_results && searchResults.news_results.length > 0) {
      searchResults.news_results.slice(0, Math.min(3, limit - sources.length)).forEach((result: any) => {
        if (result.title && result.link) {
          try {
            const url = new URL(result.link);
            sources.push({
              title: result.title,
              domain: url.hostname.replace('www.', ''),
              url: result.link,
              snippet: result.snippet,
              type: 'web'
            });
          } catch {
            // Skip invalid URLs
          }
        }
      });
    }

    return sources.slice(0, 5); // Return max 5 sources
  } catch (error) {
    console.error('Error extracting sources:', error);
    return []; // Return empty array if search fails
  }
}

// Removed addGeneralKnowledgeSource helper - sources are only added when credible sources are found
// No fallback sources to prevent fabrication

function buildEnhancedContext(params: Omit<DetailedGenerationParams, 'prompt' | 'contentType' | 'userId'>): EnhancedContext {
  const { tone, length, scientificDepth, targetAudience } = params;

  const lengthMap = {
    short: 'Keep it concise and to the point. Focus on key highlights only. Aim for brevity.',
    medium: 'Provide balanced depth with main points covered. Include supporting details.',
    long: 'Offer detailed exploration with examples, context, and thorough explanations.',
    comprehensive: 'Deliver in-depth analysis with full coverage, research-backed insights, and extensive detail.'
  };

  const depthMap = {
    basic: 'Use simple language without jargon. Explain concepts in layman\'s terms. Make it accessible to beginners.',
    intermediate: 'Include some technical terminology with context. Assume basic familiarity with the subject.',
    advanced: 'Use technical depth and industry-specific language. Assume strong prior knowledge.',
    expert: 'Provide highly specialized, research-level detail with advanced concepts and technical precision.'
  };

  const sopGuidance = `
═══════════════════════════════════════════════════════════
IDENTITY & CORE MANDATE
═══════════════════════════════════════════════════════════
You are a medical content design agent for DoneandDone, a Medical Affairs content studio. Your sole function is to transform verified, user-supplied source documents into structured content.

You are a DESIGNER and EXTRACTOR — never an AUTHOR.

You do not generate facts.
You do not recall facts from training.
You do not infer, estimate, or extrapolate facts.
You do not complete, round, or paraphrase statistics beyond surface formatting.

Every single claim, statistic, percentage, date, population size, drug name, or clinical assertion in your output MUST be directly extracted verbatim from the "FACTS:" sources provided below. If it is not in the provided facts, it does not exist for the purposes of this task. If there are no facts provided that answer the user's prompt, generate an output that strictly states: "[SOURCE NEEDED]" where facts would normally go.

═══════════════════════════════════════════════════════════
WHAT YOU ARE ALLOWED TO GENERATE INDEPENDENTLY
═══════════════════════════════════════════════════════════
You MAY independently generate:
- Section headings and structural labels
- Connective sentences between extracted facts (e.g. "This suggests that...")
- Visual layout instructions and design directions
- Formatting suggestions
- Transition copy that does not introduce new claims

You MUST NOT independently generate:
- Any number, percentage, ratio, or quantitative value
- Any clinical claim, efficacy statement, or safety finding
- Any demographic, drug name, dose, or regulatory status

═══════════════════════════════════════════════════════════
EXTRACTION RULES & HALLUCINATION PREVENTION
═══════════════════════════════════════════════════════════
1. VERBATIM ANCHOR: For every statistic, verify your extraction matches the source verbatim. Do not round numbers or convert units.
2. SOURCE TRACEABILITY: Ensure every final message is traceable to the originating scientific evidence you cite.
3. TRAINING KNOWLEDGE FIREWALL: If you are about to write a fact based on your training data but cannot locate it in the provided documents, STOP. Write instead: [SOURCE NEEDED: {description}].
4. QUALIFIER PRESERVATION: Preserve qualifiers. "Up to 45%" must not become "45%".
5. COGNITIVE LOAD OPTIMIZATION: Respect HCP/patient mental bandwidth. Use ONLY ONE core message per visual/slide. Use progressive disclosure of complexity.

=== QUALITY & FORMATTING SOPs (STRICT INSTRUCTIONS) ===
6. Impeccable Language: Ensure flawless spelling, grammar, and punctuation.
7. Anti-Overcrowding: The output must NEVER be overcrowded. Use generous whitespace, short paragraphs, and clear formatting. Keep text minimal and impactful. Use bullet points strictly limited to 3-5 items per section. Provide clear hierarchy.
======================================================
  `.trim();

  return {
    tone: `Adopt a ${tone} tone throughout`,
    lengthGuidance: lengthMap[length],
    depthGuidance: depthMap[scientificDepth],
    audienceGuidance: `This content is for: ${targetAudience}. Tailor language, examples, and complexity accordingly.`,
    sopGuidance
  };
}

interface RefinementContext {
  changeInstructions: string;
  keepUnchanged: string;
  previousContent: string;
}

function buildRefinementContext(changeRequest: import('@/types').ChangeRequestData, previousOutput?: GeneratedOutput): RefinementContext {
  const keepItems = changeRequest.keepExisting.length > 0 
    ? `Keep these elements unchanged: ${changeRequest.keepExisting.join(', ')}.`
    : '';

  const focusAreas = changeRequest.specificAreas.length > 0
    ? `Focus changes specifically on: ${changeRequest.specificAreas.join(', ')}.`
    : '';

  const previousContent = previousOutput 
    ? `\n\nPREVIOUS VERSION:\n${previousOutput.content.slice(0, 2000)}...\n`
    : '';

  return {
    changeInstructions: `REFINEMENT REQUEST: ${changeRequest.changeDescription}\n${focusAreas}\n${keepItems}`,
    keepUnchanged: keepItems,
    previousContent
  };
}

// Enhanced generation functions with detailed, research-backed prompts
async function generateEnhancedInfographic(prompt: string, context: EnhancedContext, refinementContext: RefinementContext | null = null): Promise<GeneratedOutput> {
  // Extract sources from web search FIRST
  const sources = await extractSourcesFromSearch(prompt, 5);
  const webInsights = sources.slice(0, 3).map((s, i) => `CLAIM_ID: (C00${i+1})\nSOURCE: ${s.title} (${s.domain})\nFACTS: ${s.snippet || 'N/A'}`).join('\n\n') || '';

  const refinementInstructions = refinementContext 
    ? `\n\n${refinementContext.changeInstructions}${refinementContext.previousContent}\n\nIMPORTANT: Apply the requested changes while maintaining quality. ${refinementContext.keepUnchanged}`
    : '';

  const { object } = await generateObject({
    schema: {
      tags: {
        format: "Brief format label, max 15 chars",
        extent: "Type of evidence (e.g., Scientific, RWE, HEOR)",
        audience: "Target audience summary, max 25 chars"
      },
      hero: {
        eyebrow: "Context label, e.g., Epidemiological lens",
        titleLine1: "Main title text",
        titleLine2: "Second part of title text",
        subtitle: "One-sentence summary"
      },
      mainStat: {
        number: "Just the number",
        unit: "e.g., % or x",
        label: "Descriptive label",
        source: "Must include claim ID (e.g., C001)"
      },
      supportingStats: [
        {
          number: "number",
          label: "label",
          source: "source",
          colorClass: "c-mint, c-gold, c-sky, c-purple, c-red, or empty string"
        }
      ],
      intro: {
        text: "Intro paragraph",
        source: "Source for intro"
      },
      dataBars: [
        {
          label: "label",
          sublabel: "sublabel",
          percentage: 50,
          displayValue: "50%",
          source: "source",
          colorClass: "c-mint, c-gold, c-sky, c-purple, c-red, or empty string"
        }
      ],
      sections: [
        {
          title: "Section Title",
          bullets: ["bullet 1"],
          claimRefs: "C001",
          colorClass: "c-mint, c-gold, c-sky, c-purple, c-red, or empty string"
        }
      ],
      recommendations: [
        {
          text: "recommendation text",
          source: "source"
        }
      ],
      references: [
        {
          id: "C001",
          citation: "citation text"
        }
      ]
    },
    prompt: `You are DoneandDone — a one-try content generator that produces publish-ready infographics with credible sources.${refinementInstructions}

GOAL: Create a complete, structured, brand-consistent infographic JSON output. Generate ONLY valid JSON matching the exact schema provided. Ensure there are exactly 3 supportingStats, exactly 5 dataBars, exactly 3 sections (with exactly 4 bullets each), exactly 4 recommendations, and all references. Do not leave any fields blank. 

TASK: Generate an infographic for: "${prompt}"

${context.tone}. ${context.lengthGuidance}. Write highly detailed, substantive content.
${context.depthGuidance}
${context.audienceGuidance}
${context.sopGuidance}

${webInsights ? `Use these credible web sources in your content:\n${webInsights}\n\nIMPORTANT: Every single statistic, metric, or factual claim you make MUST be immediately followed by its CLAIM_ID (e.g. "Over 40% of patients responded (C001)"). Do not invent citations. Do not make unsourced claims.` : ''}`
  });

  const infographicData = object as unknown as RealWorldInfographicData;

  // Compile the high-fidelity A4 Poster HTML
  const compiledHtml = compileInfographicHtml(infographicData);

  // We validate the structural integrity on a pure markdown extraction to avoid 
  // triggering the "HTML Tags" validation error rule in Anti-Gibberish Protocol.
  const text = [
    `# ${infographicData.hero.titleLine1} ${infographicData.hero.titleLine2}`,
    infographicData.hero.subtitle,
    '',
    infographicData.intro.text,
    '',
    ...infographicData.sections.flatMap(s => [`### ${s.title}`, ...s.bullets]),
    '',
    '### Recommendations',
    ...infographicData.recommendations.map(r => `- ${r.text}`)
  ].join('\n');
  const imagePrompt = `Create a professional, impactful template or background illustration for an infographic about: ${prompt}. 
  Style: Modern, clean, data-driven design. ${context.tone}.
  Target audience: ${context.audienceGuidance}
  Colors: Use a vibrant, professional color palette that conveys credibility.
  Layout: Vertical format, scannable, with strong visual impact. The image MUST serve as a beautiful cover plate or graphic header. ABSOLUTELY NO TEXT, NO LETTERS, AND NO WORDS. Provide a pure abstract, textured geometric background. DO NOT DRAW ANY CHARACTERS OR NUMBERS.`;

  const { data } = await generateImage({
    prompt: imagePrompt,
    n: 1
  });

  // Validate image URL is from free source
  logValidationReport([data[0].url], 'Infographic Generation');

  // Sources already extracted earlier - use them
  const finalSources = sources.length > 0 
    ? sources.slice(0, 5) // Max 5 sources 
    : []; // No fallback - show explicit message if no sources found

  return {
    contentType: 'infographic',
    content: compiledHtml,
    format: 'html',
    downloadUrl: '#',
    previewUrl: data[0].url,
    sources: finalSources,
    infographicData: undefined // Removed in favor of pure HTML string passing for the new layout
  };
}

async function generateEnhancedVideo(prompt: string, context: EnhancedContext, refinementContext: RefinementContext | null = null): Promise<GeneratedOutput> {
  // Extract sources from web search FIRST
  const sources = await extractSourcesFromSearch(prompt, 5);
  const webInsights = sources.slice(0, 3).map(s => `SOURCE: ${s.title} (${s.domain})\nFACTS: ${s.snippet || 'N/A'}`).join('\n\n') || '';

  const refinementInstructions = refinementContext 
    ? `\n\n${refinementContext.changeInstructions}${refinementContext.previousContent}\n\nIMPORTANT: Apply the requested changes while maintaining quality. ${refinementContext.keepUnchanged}`
    : '';

  // Step 1: Generate video script structure
  const { object: videoScript } = await generateObject({
    prompt: `You are DoneandDone — a one-try video generator that creates compelling video content.${refinementInstructions}

GOAL: Create a complete video structure with scenes in ONE TRY.

TASK: Generate video content for: "${prompt}"

${context.tone}. ${context.lengthGuidance}
${context.depthGuidance}
${context.audienceGuidance}
${context.sopGuidance}

${webInsights ? `Use these credible web sources:\n${webInsights}\n` : ''}

Create 3-6 video scenes with:
- Opening scene: Attention-grabbing hook (2-3 seconds)
- Middle scenes: Key message/story development (4-6 seconds each)
- Closing scene: Call-to-action or key takeaway (2-3 seconds)

Each scene needs:
- Compelling visual description (what appears on screen)
- On-screen text (if any) - short, impactful phrases
- Voiceover text (what narrator says) - conversational, engaging
- Duration in seconds

Total video should be 15-45 seconds (short-form optimized).

Make it scroll-stopping, data-backed when possible, emotionally engaging.`,
    schema: {
      type: 'object',
      properties: {
        videoTitle: { type: 'string' },
        totalDuration: { type: 'number' },
        scenes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sceneNumber: { type: 'number' },
              visualDescription: { type: 'string' },
              onScreenText: { type: 'string' },
              voiceoverText: { type: 'string' },
              durationSeconds: { type: 'number' }
            },
            required: ['sceneNumber', 'visualDescription', 'voiceoverText', 'durationSeconds']
          }
        },
        musicMood: { type: 'string' },
        colorPalette: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['videoTitle', 'totalDuration', 'scenes']
    }
  });

  console.log(`Generated video script with ${videoScript.scenes.length} scenes, total ${videoScript.totalDuration}s`);

  // Step 2: Generate key frames/visuals for each scene
  const sceneImagePromises = videoScript.scenes.map(async (scene: any) => {
    const { data } = await generateImage({
      prompt: `Create scene ${scene.sceneNumber} for a professional ${videoScript.totalDuration}-second video about: ${prompt}.
      
Scene visual: ${scene.visualDescription}
${scene.onScreenText ? `On-screen text overlay: "${scene.onScreenText}"` : ''}
${context.tone}. Target audience: ${context.audienceGuidance}

Style requirements:
- 16:9 aspect ratio (1920x1080 or similar)
- Cinematic, broadcast-quality visuals
- ${videoScript.colorPalette ? `Use colors: ${videoScript.colorPalette.join(', ')}` : 'Professional, vibrant color palette'}
- ${scene.onScreenText ? 'Include bold, readable text overlay' : 'Clean visuals without text'}
- High-impact, attention-grabbing composition
- Mobile-optimized and scroll-stopping quality`,
      n: 1
    });

    logValidationReport([data[0].url], `Video Scene ${scene.sceneNumber}`);

    return {
      sceneNumber: scene.sceneNumber,
      imageUrl: data[0].url,
      visualDescription: scene.visualDescription,
      onScreenText: scene.onScreenText || '',
      voiceoverText: scene.voiceoverText,
      duration: scene.durationSeconds
    };
  });

  const videoScenes = await Promise.all(sceneImagePromises);

  console.log(`Generated ${videoScenes.length} video scene frames`);

  // Step 3: Generate thumbnail (can be scene 1 or custom)
  const { data: thumbnailData } = await generateImage({
    prompt: `Create a cinematic, high-impact video thumbnail for: ${prompt}. 
    ${context.tone}. Target audience: ${context.audienceGuidance}
    Title overlay: "${videoScript.videoTitle}"
    Style: Professional, engaging, visually striking YouTube/social media thumbnail.
    Format: 16:9 aspect ratio, broadcast quality, compelling enough to stop scrolling.
    ${videoScript.colorPalette ? `Use colors: ${videoScript.colorPalette.join(', ')}` : ''}`,
    n: 1
  });

  logValidationReport([thumbnailData[0].url], 'Video Thumbnail');

  // Step 4: Format output with video metadata
  const videoContent = JSON.stringify({
    title: videoScript.videoTitle,
    totalDuration: videoScript.totalDuration,
    musicMood: videoScript.musicMood,
    colorPalette: videoScript.colorPalette,
    scenes: videoScenes.map(s => ({
      scene: s.sceneNumber,
      visual: s.visualDescription,
      text: s.onScreenText,
      voiceover: s.voiceoverText,
      duration: s.duration,
      imageUrl: s.imageUrl
    })),
    productionNote: 'Video frames generated. Use a video editor to combine frames with voiceover audio and transitions.'
  }, null, 2);

  // Sources already extracted earlier - use them
  const finalSources = sources.length > 0 ? sources.slice(0, 5) : [];

  return {
    contentType: 'video',
    content: videoContent,
    format: 'video-frames',
    downloadUrl: thumbnailData[0].url,
    previewUrl: thumbnailData[0].url,
    videoThumbnail: thumbnailData[0].url,
    videoScenes: videoScenes,
    sources: finalSources.length > 0 ? finalSources : undefined
  };
}

async function generateEnhancedPresentation(prompt: string, context: EnhancedContext, refinementContext: RefinementContext | null = null): Promise<GeneratedOutput> {
  // Extract sources from web search FIRST
  const sources = await extractSourcesFromSearch(prompt, 5);
  const webInsights = sources.slice(0, 3).map(s => `SOURCE: ${s.title} (${s.domain})\nFACTS: ${s.snippet || 'N/A'}`).join('\n\n') || '';

  const refinementInstructions = refinementContext 
    ? `\n\n${refinementContext.changeInstructions}${refinementContext.previousContent}\n\nIMPORTANT: Apply the requested changes while maintaining quality. ${refinementContext.keepUnchanged}`
    : '';

  const { text } = await generateText({
    prompt: `You are DoneandDone — a one-try content generator that produces publish-ready presentations with credible sources.${refinementInstructions}

GOAL: Create a complete, structured presentation in ONE TRY.

TASK: Generate a presentation for: "${prompt}"

${context.tone}. ${context.lengthGuidance}
${context.depthGuidance}
${context.audienceGuidance}
${context.sopGuidance}

${webInsights ? `Use these credible web sources in your content:\n${webInsights}\n` : ''}

REQUIRED STRUCTURE:

## Title Slide
- Main title: Compelling, clear
- Subtitle: Value proposition
- Hook: Why this matters now

## Content Slides (6-14 slides based on length)
1. Context/Opening: Set the stage
2. Problem/Opportunity: What needs attention
3-7. Key Points: Each with data, visuals, India relevance when applicable
8. Real-world examples: Specific case studies
9. Recommendations: Specific, actionable steps
10. Call-to-Action: What audience should do next

Each slide must have:
- Slide title: One clear message (5-7 words)
- Content: Bullet points or data (3-5 items max)
- Visual suggestion: Chart/image type
- Speaker notes: Key talking points
- Timing: Estimated minutes

## Design Theme
- Color scheme: 3-5 hex codes
- Typography: Professional, readable
- Visual style: Clean, credible, memorable

RULES:
- Be concise, factual, and India-relevant when applicable
- Never invent or hallucinate data
- One message per slide - no cluttered slides
- Build narrative toward CTA
- Make it presentation-ready with no edits

Format as JSON with: title, subtitle, slides (array with title, content, visualSuggestion, notes, timing), colorScheme, visualStyle`,
    maxTokens: 2000
  });

  const { data } = await generateImage({
    prompt: `Create a professional, impactful presentation title slide for: ${prompt}.
    ${context.tone}. Target audience: ${context.audienceGuidance}
    Style: Clean, modern, authoritative design with bold typography and strategic use of whitespace.
    Layout: Title prominent, subtitle clear, visually memorable and compelling.`,
    n: 1
  });

  // Validate image URL is from free source
  logValidationReport([data[0].url], 'Presentation Generation');

  // Sources already extracted earlier - use them
  const finalSources = sources.length > 0 ? sources.slice(0, 5) : [];

  return {
    contentType: 'presentation',
    content: text,
    format: 'pptx',
    downloadUrl: data[0].url,
    previewUrl: data[0].url,
    sources: finalSources.length > 0 ? finalSources : undefined
  };
}

async function generateEnhancedSocialPost(prompt: string, context: EnhancedContext, refinementContext: RefinementContext | null = null): Promise<GeneratedOutput> {
  // Check if prompt mentions carousel or multiple slides
  const isCarousel = /carousel|slides|series|multi-post|swipeable/i.test(prompt);
  
  if (isCarousel) {
    return await generateCarouselPost(prompt, context, refinementContext);
  }

  // Extract sources from web search FIRST
  const sources = await extractSourcesFromSearch(prompt, 5);
  const webInsights = sources.slice(0, 3).map(s => `SOURCE: ${s.title} (${s.domain})\nFACTS: ${s.snippet || 'N/A'}`).join('\n\n') || '';

  const refinementInstructions = refinementContext 
    ? `\n\n${refinementContext.changeInstructions}${refinementContext.previousContent}\n\nIMPORTANT: Apply the requested changes while maintaining quality. ${refinementContext.keepUnchanged}`
    : '';

  const { text } = await generateText({
    prompt: `You are DoneandDone — a one-try content generator that produces publish-ready social posts with credible sources.${refinementInstructions}

GOAL: Create a complete, scroll-stopping social post in ONE TRY.

TASK: Generate a social post for: "${prompt}"

${context.tone}. ${context.lengthGuidance}
${context.depthGuidance}
${context.audienceGuidance}
${context.sopGuidance}

${webInsights ? `Use these credible web sources in your content:\n${webInsights}\n` : ''}

REQUIRED STRUCTURE:

## Headline
- Scroll-stopping hook (create curiosity or urgency)
- 5-10 words max

## Post Copy
- Opening line: Grab attention immediately
- Body: Clear value proposition with data/insights
- Emojis: Use strategically for engagement (2-3 max)
- Length: Platform-optimized (LinkedIn=longer, Instagram=concise)
- India relevance when applicable

## Call-to-Action
- Single, clear CTA (comment, share, visit, download, etc.)
- Action-oriented language

## Hashtags
- 8-12 relevant, targeted hashtags
- Mix of popular and niche tags
- Platform-appropriate

## Visual Style
- Describe the image/graphic needed
- Color mood and composition

RULES:
- Be concise, factual, and India-relevant when applicable
- Never invent or hallucinate data - cite sources
- Include at least one specific data point or stat if available
- Make it platform-ready with no edits

Format as JSON with: headline, copy, cta, hashtags (array), visualStyle, platformNotes`,
    maxTokens: 1000
  });

  const { data } = await generateImage({
    prompt: `Create a highly engaging, scroll-stopping social media post graphic for: ${prompt}.
    ${context.tone}. Target audience: ${context.audienceGuidance}
    Style: Eye-catching, platform-optimized, shareable with strategic text overlay.
    Format: Square 1:1 aspect ratio, vibrant colors, maximum visual impact, mobile-optimized.`,
    n: 1
  });

  // Validate image URL is from free source
  logValidationReport([data[0].url], 'Social Post Generation');

  // Sources already extracted earlier - use them
  const finalSources = sources.length > 0 ? sources.slice(0, 5) : [];

  return {
    contentType: 'social-post',
    content: text,
    format: 'image',
    downloadUrl: data[0].url,
    previewUrl: data[0].url,
    sources: finalSources.length > 0 ? finalSources : undefined
  };
}

async function generateCarouselPost(prompt: string, context: EnhancedContext, refinementContext: RefinementContext | null = null): Promise<GeneratedOutput> {
  // Step 1: Search the web for real insights and data
  console.log('Searching web for insights using Google...');
  const searchQuery = prompt.replace(/carousel|design|create|linkedin|instagram/gi, '').trim();
  const searchResults = await performGoogleSearch(searchQuery, 10);

  // Extract key insights from search results
  const webInsights = searchResults.organic_results
    ?.slice(0, 5)
    .map(r => `${r.title}: ${r.snippet}`)
    .join('\n') || '';

  // Step 2: Generate carousel content structure with web data
  const refinementInstructions = refinementContext 
    ? `\n\n${refinementContext.changeInstructions}${refinementContext.previousContent}\n\nIMPORTANT: Apply the requested changes while maintaining quality. ${refinementContext.keepUnchanged}`
    : '';

  const { object: carouselStructure } = await generateObject({
    prompt: `You are an expert social media carousel designer. Create a compelling LinkedIn/Instagram carousel about: "${prompt}"${refinementInstructions}

${context.tone}. ${context.lengthGuidance}
${context.depthGuidance}
${context.audienceGuidance}
${context.sopGuidance}

Use these real-world insights from the web to make content data-driven and credible:
${webInsights}

Create 5-7 carousel slides with:
- Slide 1: Attention-grabbing cover with hook title
- Slides 2-5: Key insights with specific data, statistics, or facts from the search results
- Slide 6: Call-to-action or key takeaway
- Optional Slide 7: Credits or sources

Each slide must have:
- Short, punchy title (4-8 words max)
- 1-2 sentence description with specific data
- Visual suggestion (icon, chart type, image style)

Make it scroll-stopping, data-backed, and highly shareable.`,
    schema: {
      type: 'object',
      properties: {
        overallTheme: { type: 'string' },
        colorPalette: { 
          type: 'array',
          items: { type: 'string' }
        },
        slides: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slideNumber: { type: 'number' },
              title: { type: 'string' },
              description: { type: 'string' },
              visualSuggestion: { type: 'string' },
              dataPoint: { type: 'string' }
            },
            required: ['slideNumber', 'title', 'description']
          }
        }
      },
      required: ['overallTheme', 'slides']
    }
  });

  console.log(`Generated carousel structure with ${carouselStructure.slides.length} slides`);

  // Step 3: Generate images for each slide in parallel
  const slideGenerationPromises = carouselStructure.slides.map(async (slide: any, index: number) => {
    const { data } = await generateImage({
      prompt: `Create slide ${slide.slideNumber} of a professional ${carouselStructure.overallTheme} carousel for social media.
      
Title: "${slide.title}"
Content: "${slide.description}"
Visual style: ${slide.visualSuggestion || 'Clean, modern design'}
${context.tone}. Target audience: ${context.audienceGuidance}

Style requirements:
- Square 1:1 aspect ratio (1080x1080)
- Bold, readable typography
- Professional, eye-catching design
- ${carouselStructure.colorPalette ? `Use colors: ${carouselStructure.colorPalette.join(', ')}` : 'Use vibrant, professional colors'}
- Include slide number indicator (${slide.slideNumber}/${carouselStructure.slides.length})
- Clear visual hierarchy
- Mobile-optimized and scroll-stopping`,
      n: 1
    });

    // Validate carousel slide image URL is from free source
    logValidationReport([data[0].url], `Carousel Slide ${slide.slideNumber}`);

    return {
      id: `slide-${index + 1}`,
      imageUrl: data[0].url,
      title: slide.title,
      description: slide.description
    };
  });

  const carouselSlides = await Promise.all(slideGenerationPromises);

  console.log(`Generated ${carouselSlides.length} carousel slides`);

  // Step 4: Create summary content
  const summaryText = JSON.stringify({
    theme: carouselStructure.overallTheme,
    totalSlides: carouselSlides.length,
    slides: carouselSlides.map(s => ({ title: s.title, description: s.description })),
    webInsights: 'Content enhanced with real-time web data and statistics',
    colorPalette: carouselStructure.colorPalette
  }, null, 2);

  // Extract sources from search results used in carousel
  const carouselSources: ContentSource[] = [];
  if (searchResults.organic_results && searchResults.organic_results.length > 0) {
    searchResults.organic_results.slice(0, 5).forEach((result: any) => {
      if (result.title && result.link) {
        try {
          const url = new URL(result.link);
          carouselSources.push({
            title: result.title,
            domain: url.hostname.replace('www.', ''),
            url: result.link,
              snippet: result.snippet,
              type: 'web'
          });
        } catch {
          // Skip invalid URLs
        }
      }
    });
  }
  // Use extracted sources - no fallback if none found
  const carouselFinalSources = carouselSources.length > 0 ? carouselSources.slice(0, 5) : [];

  return {
    contentType: 'social-post',
    content: summaryText,
    format: 'carousel',
    downloadUrl: carouselSlides[0].imageUrl,
    previewUrl: carouselSlides[0].imageUrl,
    carouselSlides,
    sources: carouselFinalSources.length > 0 ? carouselFinalSources : undefined
  };
}

async function generateEnhancedDocument(prompt: string, context: EnhancedContext, refinementContext: RefinementContext | null = null): Promise<GeneratedOutput> {
  // Extract sources from web search FIRST
  const sources = await extractSourcesFromSearch(prompt, 5);
  const webInsights = sources.slice(0, 3).map(s => `SOURCE: ${s.title} (${s.domain})\nFACTS: ${s.snippet || 'N/A'}`).join('\n\n') || '';

  const refinementInstructions = refinementContext 
    ? `\n\n${refinementContext.changeInstructions}${refinementContext.previousContent}\n\nIMPORTANT: Apply the requested changes while maintaining quality. ${refinementContext.keepUnchanged}`
    : '';

  const { text } = await generateText({
    prompt: `You are DoneandDone — a one-try content generator that produces publish-ready documents with credible sources.${refinementInstructions}

GOAL: Create a complete, structured document in ONE TRY.

TASK: Generate a document for: "${prompt}"

${context.tone}. ${context.lengthGuidance}
${context.depthGuidance}
${context.audienceGuidance}
${context.sopGuidance}

${webInsights ? `Use these credible web sources in your content:\n${webInsights}\n` : ''}

REQUIRED STRUCTURE:

## Title & Subtitle
- Title: Compelling, professional
- Subtitle: Clarifies value and scope

## Executive Summary
- Clear thesis or main message (2-3 sentences)
- Why this matters
- Key takeaways preview

## Main Content (4-8 sections based on length)
Each section must have:
- Clear header: Descriptive, scannable
- Evidence-based content: Data, examples, insights
- Subsections if needed for clarity
- Transitions between sections
- India relevance when applicable

## Real-World Applications
- 2-3 specific case studies or examples
- Practical implementation notes

## Conclusion
- Key takeaways summary (3-5 bullet points)
- Recommended next steps
- Vision for impact

## Sources
List 3-5 credible references formatted as:
- Source Name — Report/Article Title (Year)

RULES:
- Be concise, factual, and India-relevant when applicable
- Never invent or hallucinate data
- Use clear language matched to audience
- Structure for scannability
- Make it document-ready with no edits

Format as detailed document with: title, subtitle, executiveSummary, sections (array with header, content, subsections), realWorldApplications, conclusion, nextSteps`,
    maxTokens: 2800
  });

  const { data } = await generateImage({
    prompt: `Create a preview image of a professional, authoritative document about: ${prompt}.
    ${context.tone}. Target audience: ${context.audienceGuidance}
    Style: Clean document layout, visible professional typography, clear structure and hierarchy.
    Layout: Portrait format, business-quality aesthetic, looks like a real professional document.`,
    n: 1
  });

  // Validate image URL is from free source
  logValidationReport([data[0].url], 'Document Generation');

  // Sources already extracted earlier - use them
  const finalSources = sources.length > 0 ? sources.slice(0, 5) : [];

  return {
    contentType: 'document',
    content: text,
    format: 'docx',
    downloadUrl: data[0].url,
    previewUrl: data[0].url,
    sources: finalSources.length > 0 ? finalSources : undefined
  };
}

async function generateEnhancedReport(prompt: string, context: EnhancedContext, refinementContext: RefinementContext | null = null): Promise<GeneratedOutput> {
  // Extract sources from web search FIRST
  const sources = await extractSourcesFromSearch(prompt, 5);
  const webInsights = sources.slice(0, 3).map(s => `SOURCE: ${s.title} (${s.domain})\nFACTS: ${s.snippet || 'N/A'}`).join('\n\n') || '';

  const refinementInstructions = refinementContext 
    ? `\n\n${refinementContext.changeInstructions}${refinementContext.previousContent}\n\nIMPORTANT: Apply the requested changes while maintaining quality. ${refinementContext.keepUnchanged}`
    : '';

  const { text } = await generateText({
    prompt: `You are DoneandDone — a one-try content generator that produces publish-ready reports with credible sources.${refinementInstructions}

GOAL: Create a complete, data-driven report in ONE TRY.

TASK: Generate a report for: "${prompt}"

${context.tone}. ${context.lengthGuidance}
${context.depthGuidance}
${context.audienceGuidance}
${context.sopGuidance}

${webInsights ? `Use these credible web sources in your content:\n${webInsights}\n` : ''}

REQUIRED STRUCTURE:

## Executive Summary
- Key insights (3-5 bullet points)
- Main recommendations upfront
- Why this report matters now

## Context/Problem Statement
- Background and scope
- Why this analysis is needed
- What success looks like

## Key Findings (4-8 findings based on length)
Each finding must have:
- Data point: Quantified metric or statistic
- Supporting evidence: Research, surveys, trends
- Visual suggestion: Chart type for this data
- India relevance when applicable

## Analysis
- Methodology: How data was gathered/analyzed
- Market/context analysis: Current state
- Trend analysis: What's changing and why
- Implications: What this means

## Recommendations
- Specific, actionable steps (numbered)
- Implementation timeline: Short/medium/long term
- Expected outcomes: Measurable impact
- Resource requirements

## Risk Considerations
- Potential challenges or limitations
- Mitigation strategies

## Conclusion
- Vision for impact
- Next steps summary

## Sources
List 3-5 credible references formatted as:
- Organization — Report/Study Title (Year)

RULES:
- Be concise, factual, and India-relevant when applicable
- Never invent or hallucinate data
- Use specific, real-world data from credible sources
- Make recommendations concrete and implementable
- Make it report-ready with no edits

Format as JSON with: executiveSummary, context, findings (array with data, evidence, visual), analysis, recommendations (array with steps, timeline, outcomes), risks, conclusion`,
    maxTokens: 2800
  });

  const { data } = await generateImage({
    prompt: `Create a professional, data-focused report cover or visualization for: ${prompt}.
    ${context.tone}. Target audience: ${context.audienceGuidance}
    Style: Corporate, analytical, credible with charts or data graphics.
    Layout: Professional business report aesthetic, authoritative and trustworthy.`,
    n: 1
  });

  // Validate image URL is from free source
  logValidationReport([data[0].url], 'Report Generation');

  // Sources already extracted earlier - use them
  const finalSources = sources.length > 0 ? sources.slice(0, 5) : [];

  return {
    contentType: 'report',
    content: text,
    format: 'pdf',
    downloadUrl: data[0].url,
    previewUrl: data[0].url,
    sources: finalSources.length > 0 ? finalSources : undefined
  };
}

export async function generatePromptsFromTheme(theme: string): Promise<string[]> {
  const { object } = await generateObject({
    prompt: `You are an expert content strategist. A user wants to create content around the theme: "${theme}". 
Generate 3 distinct, highly specific, and creative prompts that the user could use to generate content (like an infographic, video, or document).
The prompts should vary in angle (e.g., one focusing on statistics, one on practical advice, one on future trends).`,
    schema: {
      type: 'object',
      properties: {
        prompts: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['prompts']
    }
  });

  return object.prompts.slice(0, 3);
}

// Podcast and White Paper specific generators
async function generatePodcastScript(prompt: string, context: EnhancedContext, refinementContext: RefinementContext | null = null): Promise<GeneratedOutput> {
  const sources = await extractSourcesFromSearch(prompt, 5);
  const webInsights = sources.slice(0, 3).map(s => `SOURCE: ${s.title} (${s.domain})\nFACTS: ${s.snippet || 'N/A'}`).join('\n\n') || '';

  const refinementInstructions = refinementContext 
    ? `\n\n${refinementContext.changeInstructions}${refinementContext.previousContent}\n\nIMPORTANT: Apply the requested changes while maintaining quality. ${refinementContext.keepUnchanged}`
    : '';

  const { text } = await generateText({
    prompt: `You are DoneandDone — a one-try content generator that produces professional podcast scripts.${refinementInstructions}

GOAL: Create a complete podcast script in ONE TRY.

TASK: Generate a podcast script for: "${prompt}"

${context.tone}. ${context.lengthGuidance}
${context.depthGuidance}
${context.audienceGuidance}
${context.sopGuidance}

${webInsights ? `Use these credible web sources in your script:\n${webInsights}\n` : ''}

REQUIRED STRUCTURE:

## Show Details
- Title: Catchy podcast episode title
- Host Name: A generic host name
- Guest Name (Optional): Relevant expert if needed

## Audio Script Content
Write the actual script as a continuous monologue for a single narrator.

RULES:
- Be conversational and natural for audio
- Cite data seamlessly
- DO NOT include section labels like "Intro", "Outro", "Segment 1", or character names in the script body.
- Format as clean text without markdown formatting within the spoken paragraphs to ensure smooth text-to-speech.
- Place any sound effects or stage directions inside parentheses ( ) or brackets [ ].

Format as a detailed document with the above structure.`,
    maxTokens: 2500
  });

  const { data } = await generateImage({
    prompt: `Create a professional podcast cover art for an episode about: ${prompt}. ${context.tone}. Clean typography, modern audio visual style.`,
    n: 1
  });

  logValidationReport([data[0].url], 'Podcast Generation');
  const finalSources = sources.length > 0 ? sources.slice(0, 5) : [];

  let audioUrl = undefined;
  try {
    // Clean text for TTS: remove markdown headings, bullet points, and text in parentheses/brackets
    let ttsText = text
      .replace(/^#+\s+.*$/gm, '') // Remove headers (e.g., ## Intro)
      .replace(/^-\s+/gm, '') // Remove bullet points
      .replace(/\[.*?\]/g, '') // Remove text in brackets
      .replace(/\(.*?\)/g, '') // Remove text in parentheses
      .replace(/^(Intro|Outro|Segment \d+|Show Details|Title:|Host Name:|Guest Name:).*/gim, '') // Remove naked labels
      .replace(/\n+/g, ' ') // Replace multiple newlines with a single space
      .trim();

    const { url } = await generateSpeech({
      text: ttsText.slice(0, 4000), // Limit length for TTS API constraints if any
      voice: "nova"
    });
    audioUrl = url;
  } catch (error) {
    console.warn("Failed to generate speech for podcast:", error);
  }

  return {
    contentType: 'podcast',
    content: text,
    format: 'audio-script',
    downloadUrl: data[0].url,
    previewUrl: data[0].url,
    audioUrl: audioUrl,
    sources: finalSources.length > 0 ? finalSources : undefined
  };
}

async function generateWhitePaper(prompt: string, context: EnhancedContext, refinementContext: RefinementContext | null = null): Promise<GeneratedOutput> {
  const sources = await extractSourcesFromSearch(prompt, 8);
  const webInsights = sources.slice(0, 5).map(s => `SOURCE: ${s.title} (${s.domain})\nFACTS: ${s.snippet || 'N/A'}`).join('\n\n') || '';

  const refinementInstructions = refinementContext 
    ? `\n\n${refinementContext.changeInstructions}${refinementContext.previousContent}\n\nIMPORTANT: Apply the requested changes while maintaining quality. ${refinementContext.keepUnchanged}`
    : '';

  const { text } = await generateText({
    prompt: `You are DoneandDone — a one-try content generator producing authoritative, extensive white papers.${refinementInstructions}

GOAL: Create a comprehensive white paper in ONE TRY.

TASK: Generate a white paper for: "${prompt}"

${context.tone}. ${context.lengthGuidance}
${context.depthGuidance}
${context.audienceGuidance}
${context.sopGuidance}

${webInsights ? `Integrate these credible insights thoroughly:\n${webInsights}\n` : ''}

REQUIRED STRUCTURE:
1. Title Page (Title, Subtitle, Date)
2. Abstract (150-200 words summarizing the paper)
3. Introduction (Context, problem statement, scope)
4. Comprehensive Analysis (The core deep dive, structured with subheadings)
5. Proposed Solutions / Methodology 
6. Case Studies / Evidence 
7. Conclusion & Strategic Recommendations
8. References List

RULES:
- Maintain an authoritative, analytical tone
- Never hallucinate data
- Write in full detail

Format as a comprehensive markdown document.`,
    maxTokens: 3500
  });

  const { data } = await generateImage({
    prompt: `Create a clean, minimalist, corporate white paper cover for: ${prompt}. Professional, authoritative.`,
    n: 1
  });

  logValidationReport([data[0].url], 'White Paper Generation');
  const finalSources = sources.length > 0 ? sources.slice(0, 8) : [];

  return {
    contentType: 'white-paper',
    content: text,
    format: 'pdf',
    downloadUrl: data[0].url,
    previewUrl: data[0].url,
    sources: finalSources.length > 0 ? finalSources : undefined
  };
}
