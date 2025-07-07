const Replicate = require('replicate');
const { writeFile } = require('fs').promises;
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Initialize Replicate client with different configurations to bypass Cloudflare
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
  userAgent: 'replicate-js/0.25.1',
  fetch: fetch
});

// Configuration
const FLUX_MODEL = "flux-kontext-apps/multi-image-list";
const MAX_RETRIES = 3;
const RETRY_DELAY = 3000; // 3 seconds

// Create uploads directory if it doesn't exist
const UPLOADS_DIR = path.join(__dirname, '../uploads');
async function ensureUploadsDir() {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Error ensuring uploads directory:', error);
  }
}

/**
 * Generate brand variations using 4 distinct prompts from Gemini
 * Focus on making Replicate work, no fallbacks
 */
async function generateBrandVariations(productImageUrls, geminiPromptsText, brandName, count = 4) {
  try {
    console.log(`🎨 Starting generation of ${count} ${brandName} variations...`);
    
    // Check if Replicate API token is configured
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error('Replicate API token not configured');
    }
    
    // Handle both single image and multiple images (backward compatibility)
    let imageUrls;
    if (Array.isArray(productImageUrls)) {
      imageUrls = productImageUrls;
    } else if (typeof productImageUrls === 'string') {
      imageUrls = [productImageUrls];
    } else {
      throw new Error('Invalid productImageUrls format');
    }
    
    console.log(`📸 Processing ${imageUrls.length} input images:`, imageUrls);
    
    // Parse the 4 distinct prompts from Gemini response
    const prompts = parsePromptsFromGemini(geminiPromptsText);
    console.log(`📝 Parsed ${prompts.length} distinct prompts from Gemini`);
    
    // Use the parsed prompts or fall back to the original if parsing fails
    let promptsToUse;
    if (prompts.length >= count) {
      promptsToUse = prompts.slice(0, count);
      console.log(`✅ Using ${promptsToUse.length} parsed prompts`);
    } else {
      // Fallback: use original text for all variations (ensure it's a string)
      const fallbackText = typeof geminiPromptsText === 'string' ? geminiPromptsText : 
                          geminiPromptsText?.brandPrompt || geminiPromptsText?.text || 
                          JSON.stringify(geminiPromptsText);
      promptsToUse = Array(count).fill(fallbackText);
      console.log(`⚠️ Using original prompt for all ${count} variations`);
    }
    
    // Generate all variations in sequence to avoid rate limiting
    const generatedImages = [];
    const failures = [];
    
    for (let i = 0; i < promptsToUse.length; i++) {
      try {
        console.log(`🔄 Generating variation ${i + 1}/${promptsToUse.length}...`);
        const result = await generateSingleImageWithRetry(imageUrls, promptsToUse[i], brandName, i + 1);
        generatedImages.push(result);
        console.log(`✅ ${brandName} variation ${i + 1} succeeded`);
        
        // Small delay between requests
        if (i < promptsToUse.length - 1) {
          await sleep(2000);
        }
      } catch (error) {
        failures.push(`Variation ${i + 1}: ${error.message}`);
        console.error(`❌ ${brandName} variation ${i + 1} failed:`, error.message);
      }
    }
    
    console.log(`✅ Successfully generated ${generatedImages.length}/${count} ${brandName} variations`);
    
    if (generatedImages.length === 0) {
      throw new Error(`All ${count} variations failed: ${failures.join(', ')}`);
    }
    
    console.log(`🎉 Final result: ${generatedImages.length} images generated for ${brandName}`);
    return generatedImages;

  } catch (error) {
    console.error(`❌ Error generating ${brandName} variations:`, error);
    throw new Error(`Failed to generate ${brandName} variations: ${error.message}`);
  }
}

/**
 * Generate a single image with enhanced retry logic and different approaches
 */
async function generateSingleImageWithRetry(productImageUrls, prompt, brandName, variationNumber) {
  let lastError;
  
  // Ensure uploads directory exists
  await ensureUploadsDir();
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🔄 Generating ${brandName} variation ${variationNumber} (attempt ${attempt}/${MAX_RETRIES})`);
      
      // Try different approaches based on attempt number
      let result;
      switch (attempt) {
        case 1:
          // Standard approach
          result = await generateWithStandardMethod(productImageUrls, prompt, brandName, variationNumber);
          break;
        case 2:
          // Try with different headers
          result = await generateWithCustomHeaders(productImageUrls, prompt, brandName, variationNumber);
          break;
        case 3:
          // Try with direct HTTP request
          result = await generateWithDirectHTTP(productImageUrls, prompt, brandName, variationNumber);
          break;
        default:
          result = await generateWithStandardMethod(productImageUrls, prompt, brandName, variationNumber);
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed for ${brandName} variation ${variationNumber}:`, error.message);
      lastError = error;
      
      if (attempt < MAX_RETRIES) {
        console.log(`⏳ Waiting ${RETRY_DELAY}ms before retry...`);
        await sleep(RETRY_DELAY);
      }
    }
  }
  
  throw new Error(`Failed to generate ${brandName} variation ${variationNumber} after ${MAX_RETRIES} attempts: ${lastError.message}`);
}

/**
 * Standard Replicate method
 */
async function generateWithStandardMethod(productImageUrls, prompt, brandName, variationNumber) {
  const promptString = typeof prompt === 'string' ? prompt : String(prompt);
  console.log(`📝 Standard method - Prompt: ${promptString.substring(0, 100)}...`);
  
  const input = {
    prompt: promptString,
    aspect_ratio: "1:1",
    input_images: productImageUrls,
    output_format: "png",
    safety_tolerance: 2
  };
  
  const output = await replicate.run(FLUX_MODEL, { input });
  return await saveImageFromOutput(output, brandName, variationNumber);
}

/**
 * Try with custom headers to bypass Cloudflare
 */
async function generateWithCustomHeaders(productImageUrls, prompt, brandName, variationNumber) {
  const promptString = typeof prompt === 'string' ? prompt : String(prompt);
  console.log(`📝 Custom headers method - Prompt: ${promptString.substring(0, 100)}...`);
  
  // Create a new Replicate instance with custom fetch
  const customReplicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
    fetch: (url, options) => {
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
    }
  });
  
  const input = {
    prompt: promptString,
    aspect_ratio: "1:1",
    input_images: productImageUrls,
    output_format: "png",
    safety_tolerance: 2
  };
  
  const output = await customReplicate.run(FLUX_MODEL, { input });
  return await saveImageFromOutput(output, brandName, variationNumber);
}

/**
 * Try with direct HTTP request to Replicate API
 */
async function generateWithDirectHTTP(productImageUrls, prompt, brandName, variationNumber) {
  const promptString = typeof prompt === 'string' ? prompt : String(prompt);
  console.log(`📝 Direct HTTP method - Prompt: ${promptString.substring(0, 100)}...`);
  
  const input = {
    prompt: promptString,
    aspect_ratio: "1:1",
    input_images: productImageUrls,
    output_format: "png",
    safety_tolerance: 2
  };
  
  // Make direct HTTP request to Replicate API
  const response = await fetch(`https://api.replicate.com/v1/models/${FLUX_MODEL}/predictions`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Origin': 'https://replicate.com',
      'Referer': 'https://replicate.com/'
    },
    body: JSON.stringify({ input })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  
  const prediction = await response.json();
  console.log(`🔍 Direct HTTP prediction created:`, prediction.id);
  
  // Poll for completion
  const completedPrediction = await pollPrediction(prediction.id);
  return await saveImageFromOutput(completedPrediction.output, brandName, variationNumber);
}

/**
 * Poll prediction status until completion
 */
async function pollPrediction(predictionId) {
  const maxPolls = 60; // 5 minutes max
  const pollInterval = 5000; // 5 seconds
  
  for (let i = 0; i < maxPolls; i++) {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to poll prediction: ${response.status}`);
    }
    
    const prediction = await response.json();
    console.log(`🔄 Prediction ${predictionId} status: ${prediction.status}`);
    
    if (prediction.status === 'succeeded') {
      return prediction;
    } else if (prediction.status === 'failed') {
      throw new Error(`Prediction failed: ${prediction.error}`);
    }
    
    await sleep(pollInterval);
  }
  
  throw new Error('Prediction timed out');
}

/**
 * Save image from Replicate output
 */
async function saveImageFromOutput(output, brandName, variationNumber) {
  console.log(`🔍 Replicate output:`, output);
  
  if (output && typeof output === 'string' && output.startsWith('http')) {
    const imageUrl = output;
    console.log(`✅ Received image URL: ${imageUrl}`);
    
    // Download the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    const imageBuffer = await response.buffer();
    console.log(`📥 Downloaded image data size: ${imageBuffer.length} bytes`);
    
    const timestamp = Date.now();
    const filename = `${brandName.toLowerCase()}_${variationNumber}_${timestamp}.png`;
    const filepath = path.join(UPLOADS_DIR, filename);
    
    await writeFile(filepath, imageBuffer);
    
    const baseUrl = process.env.BACKEND_URL || 'https://cluely-for-brands.onrender.com';
    const localImageUrl = `${baseUrl}/uploads/${filename}`;
    
    console.log(`✅ ${brandName} variation ${variationNumber} completed`);
    console.log(`💾 Saved to: ${filepath}`);
    console.log(`🔗 Image URL: ${localImageUrl}`);
    
    return localImageUrl;
  } else {
    throw new Error(`Unexpected output format: ${typeof output} - ${JSON.stringify(output)}`);
  }
}

/**
 * Parse 4 distinct prompts from Gemini response
 */
function parsePromptsFromGemini(geminiText) {
  try {
    console.log('🔍 Parsing prompts from Gemini response...');
    
    const textString = typeof geminiText === 'string' ? geminiText : 
                      geminiText?.brandPrompt || geminiText?.text || 
                      JSON.stringify(geminiText);
    
    // Try to find structured prompts with **PROMPT 1:**, **PROMPT 2:**, etc.
    const structuredPrompts = [];
    const structuredRegex = /\*\*PROMPT\s+(\d+):\*\*\s*(.+?)(?=\*\*PROMPT\s+\d+:\*\*|$)/gims;
    
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
    
    // Try to find prompts that start with "Combine these product images"
    const combinationPrompts = [];
    const combinationRegex = /Combine these product images into one cohesive scene:?\s*(.+?)(?=\n\s*Combine these product images|$)/gims;
    
    while ((match = combinationRegex.exec(textString)) !== null) {
      const promptContent = `Combine these product images into one cohesive scene: ${match[1].trim()}`;
      if (promptContent.length > 50) {
        combinationPrompts.push(promptContent);
      }
    }
    
    if (combinationPrompts.length >= 4) {
      console.log(`✅ Found ${combinationPrompts.length} combination prompts`);
      return combinationPrompts.slice(0, 4);
    }
    
    console.log('⚠️ No structured prompts found, will use original text for all variations');
    return [];
    
  } catch (error) {
    console.error('❌ Error parsing Gemini prompts:', error);
    return [];
  }
}

/**
 * Sleep utility function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  generateBrandVariations,
  generateSingleImageWithRetry,
  FLUX_MODEL
};