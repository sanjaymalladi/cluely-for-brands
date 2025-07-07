import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { getBrandById } from '@/lib/brands';

// Configuration
const FLUX_MODEL = "flux-kontext-apps/multi-image-list";
const MAX_RETRIES = 3;
const RETRY_DELAY = 3000; // 3 seconds

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parsePromptsFromGemini(geminiText: string | object): string[] {
  try {
    console.log('🔍 Parsing prompts from Gemini response...');
    
    const geminiObj = geminiText as Record<string, unknown>;
    const textString = typeof geminiText === 'string' ? geminiText : 
                      (typeof geminiObj?.brandPrompt === 'string' ? geminiObj.brandPrompt : '') ||
                      (typeof geminiObj?.text === 'string' ? geminiObj.text : '') ||
                      JSON.stringify(geminiText);
    
    // Try to find structured prompts with **PROMPT 1:**, **PROMPT 2:**, etc.
    const structuredPrompts: string[] = [];
    const structuredRegex = /\*\*PROMPT\s+(\d+):\*\*\s*(.+?)(?=\*\*PROMPT\s+\d+:\*\*|$)/gim;
    
    let match;
    while ((match = structuredRegex.exec(textString)) !== null) {
      const promptContent = match[2].trim();
      if (promptContent.length > 20) {
        structuredPrompts.push(promptContent);
      }
    }
    
    if (structuredPrompts.length >= 4) {
      console.log(`✅ Found ${structuredPrompts.length} structured prompts`);
      return structuredPrompts.slice(0, 4);
    }
    
    console.log('⚠️ No structured prompts found, will use original text for all variations');
    return [];
    
  } catch (error) {
    console.error('❌ Error parsing Gemini prompts:', error);
    return [];
  }
}

async function generateSingleImageWithRetry(
  productImageUrls: string[], 
  prompt: string, 
  brandName: string, 
  variationNumber: number
): Promise<string> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🔄 Generating ${brandName} variation ${variationNumber} (attempt ${attempt}/${MAX_RETRIES})`);
      
      const replicate = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN!,
      });
      
      const input = {
        prompt: prompt,
        aspect_ratio: "1:1" as const,
        input_images: productImageUrls,
        output_format: "png" as const,
        safety_tolerance: 2
      };
      
      const output = await replicate.run(FLUX_MODEL, { input }) as unknown;
      
      // Handle output - should be a string URL
      if (typeof output === 'string' && output.startsWith('http')) {
        console.log(`✅ ${brandName} variation ${variationNumber} completed`);
        return output;
      } else {
        throw new Error(`Unexpected output format: ${typeof output}`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Attempt ${attempt} failed for ${brandName} variation ${variationNumber}:`, errorMessage);
      
      // Enhanced error logging for Cloudflare issues
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden') || errorMessage.includes('Cloudflare')) {
        console.error(`🚫 CLOUDFLARE BLOCK DETECTED:`, {
          attempt: attempt,
          brandName: brandName,
          variation: variationNumber,
          errorMessage: errorMessage,
          timestamp: new Date().toISOString()
        });
      }
      
      lastError = error instanceof Error ? error : new Error(errorMessage);
      
      if (attempt < MAX_RETRIES) {
        const delayTime = RETRY_DELAY * attempt; // Exponential backoff
        console.log(`⏳ Waiting ${delayTime}ms before retry...`);
        await sleep(delayTime);
      }
    }
  }
  
  throw new Error(`Failed to generate ${brandName} variation ${variationNumber} after ${MAX_RETRIES} attempts: ${lastError!.message}`);
}

export async function POST(request: NextRequest) {
  try {
    const { productImageUrls, brandPrompt, brandId, count = 4 } = await request.json();

    // Accept both single image (backward compatibility) and multiple images
    const imageUrls = Array.isArray(productImageUrls) ? productImageUrls : 
                     productImageUrls ? [productImageUrls] : [];
    
    console.log('🔍 Received image URLs:', imageUrls);
    
    if (imageUrls.length === 0 || !brandPrompt || !brandId) {
      return NextResponse.json(
        { error: "Missing required parameters: productImageUrls, brandPrompt, brandId" },
        { status: 400 }
      );
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error('Replicate API token not configured');
    }

    // Get actual brand data
    const brand = getBrandById(brandId);
    if (!brand) {
      return NextResponse.json(
        { error: "Brand not found" },
        { status: 404 }
      );
    }
    
    console.log(`🎨 Generating ${count} brand images for ${brand.name}...`);
    console.log(`📸 Using ${imageUrls.length} input images`);
    
    // Parse the 4 distinct prompts from Gemini response
    const prompts = parsePromptsFromGemini(brandPrompt);
    console.log(`📝 Parsed ${prompts.length} distinct prompts from Gemini`);
    
    // Use the parsed prompts or fall back to the original if parsing fails
    let promptsToUse: string[];
    if (prompts.length >= count) {
      promptsToUse = prompts.slice(0, count);
      console.log(`✅ Using ${promptsToUse.length} parsed prompts`);
    } else {
      // Fallback: use original text for all variations (ensure it's a string)
      const brandObj = brandPrompt as Record<string, unknown>;
      const fallbackText = typeof brandPrompt === 'string' ? brandPrompt : 
                          (typeof brandObj?.brandPrompt === 'string' ? brandObj.brandPrompt : '') ||
                          (typeof brandObj?.text === 'string' ? brandObj.text : '') ||
                          JSON.stringify(brandPrompt);
      promptsToUse = Array(count).fill(fallbackText);
      console.log(`⚠️ Using original prompt for all ${count} variations`);
    }
    
    // Generate all variations in sequence to avoid rate limiting
    const generatedImages: string[] = [];
    const failures: string[] = [];
    
    for (let i = 0; i < promptsToUse.length; i++) {
      try {
        console.log(`🔄 Generating variation ${i + 1}/${promptsToUse.length}...`);
        const result = await generateSingleImageWithRetry(imageUrls, promptsToUse[i], brand.name, i + 1);
        generatedImages.push(result);
        console.log(`✅ ${brand.name} variation ${i + 1} succeeded`);
        
        // Small delay between requests
        if (i < promptsToUse.length - 1) {
          await sleep(2000);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failures.push(`Variation ${i + 1}: ${errorMessage}`);
        console.error(`❌ ${brand.name} variation ${i + 1} failed:`, errorMessage);
      }
    }
    
    console.log(`✅ Successfully generated ${generatedImages.length}/${count} ${brand.name} variations`);
    
    if (generatedImages.length === 0) {
      throw new Error(`All ${count} variations failed: ${failures.join(', ')}`);
    }
    
    console.log(`🎉 Final result: ${generatedImages.length} images generated for ${brand.name}`);
    
    return NextResponse.json({ 
      images: generatedImages,
      brandName: brand.name,
      method: "replicate",
      success: true 
    });

  } catch (error) {
    console.error("❌ Error generating brand images:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to generate brand images: ${errorMessage}` },
      { status: 500 }
    );
  }
} 