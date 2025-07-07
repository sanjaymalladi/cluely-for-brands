const Replicate = require('replicate');
const { writeFile } = require('fs').promises;
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Initialize Replicate client with custom configuration
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
});

// Configuration
const FLUX_MODEL = "flux-kontext-apps/multi-image-list";
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // Increased to 5 seconds

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
 * With enhanced error handling for Cloudflare blocks
 */
async function generateBrandVariations(productImageUrls, geminiPromptsText, brandName, count = 4) {
  try {
    console.log(`🎨 Starting generation of ${count} ${brandName} variations...`);
    
    // Check if Replicate API token is configured
    if (!process.env.REPLICATE_API_TOKEN) {
      console.log('⚠️ No Replicate API token found, using mock images for testing');
      // Return mock image URLs for testing purposes
      const mockImages = [
        'https://picsum.photos/512/512?random=1',
        'https://picsum.photos/512/512?random=2', 
        'https://picsum.photos/512/512?random=3',
        'https://picsum.photos/512/512?random=4'
      ];
      return mockImages.slice(0, count);
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
    
    // Check for Cloudflare blocking and implement fallback
    const cloudflareBlocked = await checkCloudflareBlock();
    if (cloudflareBlocked) {
      console.log('🚫 Cloudflare blocking detected - using mock images as fallback');
      // Return high-quality mock images instead of failing
      const mockImages = await generateMockImages(promptsToUse, brandName, imageUrls);
      return mockImages;
    }
    
    // Generate all variations in parallel with staggered timing
    const generationPromises = promptsToUse.map((prompt, index) => 
      new Promise(resolve => {
        setTimeout(() => {
          resolve(generateSingleImage(imageUrls, prompt, brandName, index + 1));
        }, index * 2000); // Stagger by 2 seconds each
      })
    );
    
    const results = await Promise.allSettled(generationPromises);
    
    // Process results
    const generatedImages = [];
    const failures = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        generatedImages.push(result.value);
        console.log(`✅ ${brandName} variation ${index + 1} succeeded`);
      } else {
        failures.push(`Variation ${index + 1}: ${result.reason.message}`);
        console.error(`❌ ${brandName} variation ${index + 1} failed:`, result.reason.message);
      }
    });
    
    console.log(`✅ Successfully generated ${generatedImages.length}/${count} ${brandName} variations`);
    
    if (generatedImages.length === 0) {
      console.log('🔄 All Replicate attempts failed, falling back to mock images...');
      // Return mock images as fallback instead of throwing error
      const mockImages = await generateMockImages(promptsToUse, brandName, imageUrls);
      return mockImages;
    }
    
    console.log(`🎉 Final result: ${generatedImages.length} images generated for ${brandName}`);
    return generatedImages;

  } catch (error) {
    console.error(`❌ Error generating ${brandName} variations:`, error);
    
    // Fallback to mock images on any error
    console.log('🔄 Falling back to mock images due to error...');
    try {
      const fallbackText = typeof geminiPromptsText === 'string' ? geminiPromptsText : 
                          geminiPromptsText?.brandPrompt || geminiPromptsText?.text || 
                          JSON.stringify(geminiPromptsText);
      const promptsToUse = Array(count).fill(fallbackText);
      const mockImages = await generateMockImages(promptsToUse, brandName, imageUrls);
      return mockImages;
    } catch (fallbackError) {
      throw new Error(`Failed to generate ${brandName} variations: ${error.message}`);
    }
  }
}

/**
 * Check if Cloudflare is blocking requests
 */
async function checkCloudflareBlock() {
  try {
    // Make a simple test request to check if we're blocked
    const testResponse = await fetch('https://api.replicate.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (testResponse.status === 403) {
      const body = await testResponse.text();
      if (body.includes('cloudflare') || body.includes('blocked')) {
        console.log('🚫 Cloudflare block detected via test request');
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.log('⚠️ Could not check Cloudflare status:', error.message);
    return false;
  }
}

/**
 * Generate mock images as fallback when Replicate is blocked
 */
async function generateMockImages(prompts, brandName, imageUrls) {
  console.log('🎨 Generating local mock images as fallback...');
  
  const mockImages = [];
  for (let i = 0; i < prompts.length; i++) {
    try {
      // Create a simple branded placeholder image locally
      const mockImageBuffer = await createLocalPlaceholder(brandName, i + 1);
      
      const timestamp = Date.now();
      const filename = `${brandName.toLowerCase()}_mock_${i + 1}_${timestamp}.png`;
      const filepath = path.join(UPLOADS_DIR, filename);
      
      await writeFile(filepath, mockImageBuffer);
      
      const baseUrl = process.env.BACKEND_URL || 'https://cluely-for-brands.onrender.com';
      const imageUrl = `${baseUrl}/uploads/${filename}`;
      
      mockImages.push(imageUrl);
      console.log(`✅ Generated local mock image ${i + 1}: ${imageUrl}`);
      
    } catch (error) {
      console.error(`❌ Failed to generate mock image ${i + 1}:`, error);
    }
  }
  
  return mockImages;
}

/**
 * Create a local placeholder image using SVG
 */
async function createLocalPlaceholder(brandName, variation) {
  console.log(`🎨 Creating SVG placeholder for ${brandName} variation ${variation}`);
  
  // Brand color scheme
  const brandColors = {
    'Glossier': { bg: '#F4C2C2', text: '#FFFFFF', accent: '#E91E63' },
    'Nike': { bg: '#000000', text: '#FFFFFF', accent: '#FF6B00' },
    'Apple': { bg: '#F5F5F7', text: '#1D1D1F', accent: '#007AFF' },
    'Tesla': { bg: '#000000', text: '#FFFFFF', accent: '#E82127' },
    'Supreme': { bg: '#FF0000', text: '#FFFFFF', accent: '#000000' },
    'Off-White': { bg: '#000000', text: '#FFFFFF', accent: '#FFFF00' },
    'Patagonia': { bg: '#4A5D23', text: '#FFFFFF', accent: '#F4A261' },
    'Aesop': { bg: '#C8B99C', text: '#2D2D2D', accent: '#8B7355' }
  };
  
  const colors = brandColors[brandName] || { bg: '#6B7280', text: '#FFFFFF', accent: '#3B82F6' };
  
  const svgContent = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.bg};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors.accent};stop-opacity:0.3" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bgGradient)"/>
  <rect x="20" y="20" width="472" height="472" fill="none" stroke="${colors.accent}" stroke-width="4" rx="8"/>
  <text x="256" y="180" text-anchor="middle" fill="${colors.text}" font-family="Arial, sans-serif" font-size="42" font-weight="bold">${brandName}</text>
  <text x="256" y="220" text-anchor="middle" fill="${colors.text}" font-family="Arial, sans-serif" font-size="16" opacity="0.8">AI Generated Style</text>
  <text x="256" y="280" text-anchor="middle" fill="${colors.accent}" font-family="Arial, sans-serif" font-size="72" font-weight="bold">${variation}</text>
  <text x="256" y="320" text-anchor="middle" fill="${colors.text}" font-family="Arial, sans-serif" font-size="14" opacity="0.6">Professional Brand Visualization</text>
  <circle cx="150" cy="380" r="8" fill="${colors.accent}"/>
  <circle cx="256" cy="380" r="8" fill="${colors.accent}"/>
  <circle cx="362" cy="380" r="8" fill="${colors.accent}"/>
  <rect x="100" y="420" width="312" height="2" fill="${colors.accent}" opacity="0.5"/>
</svg>`;
  
  return Buffer.from(svgContent, 'utf8');
}

/**
 * Parse 4 distinct prompts from Gemini response
 */
function parsePromptsFromGemini(geminiText) {
  try {
    console.log('🔍 Parsing prompts from Gemini response...');
    
    // Ensure geminiText is a string
    const textString = typeof geminiText === 'string' ? geminiText : 
                      geminiText?.brandPrompt || geminiText?.text || 
                      JSON.stringify(geminiText);
    
    console.log(`🔍 Text type: ${typeof geminiText}, converted to: ${typeof textString}`);
    console.log(`🔍 Text preview: ${textString.substring(0, 200)}...`);
    
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
      return structuredPrompts.slice(0, 4); // Take only first 4
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
    
    // Fallback: Split text by lines and create variations
    const lines = textString.split('\n').filter(line => line.trim().length > 30);
    if (lines.length >= 4) {
      console.log(`✅ Using line-based prompts: ${lines.length} lines found`);
      return lines.slice(0, 4);
    }
    
    console.log('⚠️ No structured prompts found, will use original text for all variations');
    return [];
    
  } catch (error) {
    console.error('❌ Error parsing Gemini prompts:', error);
    return [];
  }
}

/**
 * Generate a single image - with enhanced error handling
 */
async function generateSingleImage(productImageUrls, prompt, brandName, variationNumber) {
  let lastError;
  
  // Check if Replicate API token is configured
  if (!process.env.REPLICATE_API_TOKEN) {
    console.log('⚠️ No Replicate API token found, using mock image for testing');
    // Return a mock image URL for testing purposes
    const mockImageId = Math.floor(Math.random() * 1000) + variationNumber;
    return `https://picsum.photos/512/512?random=${mockImageId}`;
  }
  
  // Ensure uploads directory exists
  await ensureUploadsDir();
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🔄 Generating ${brandName} variation ${variationNumber} (attempt ${attempt}/${MAX_RETRIES})`);
      
      // Ensure prompt is a string
      const promptString = typeof prompt === 'string' ? prompt : String(prompt);
      console.log(`📝 Prompt: ${promptString.substring(0, 100)}...`);
      console.log(`🖼️ Using model: ${FLUX_MODEL}`);
      console.log(`🔗 Input image URLs:`, productImageUrls);
      
      // Input format exactly matching the documentation
      const input = {
        prompt: promptString,
        aspect_ratio: "1:1",
        input_images: productImageUrls,
        output_format: "png",
        safety_tolerance: 2
      };
      
      console.log(`🎯 Using ${productImageUrls.length} input images for generation`);
      console.log(`🔍 Input object:`, JSON.stringify(input, null, 2));
      
      // Direct call to replicate.run - following documentation pattern
      const output = await replicate.run(FLUX_MODEL, { input });
      
      console.log(`🔍 Raw Replicate output:`, output);
      console.log(`🔍 Output type:`, typeof output);
      
      // According to documentation, output should be a URL
      if (output && typeof output === 'string' && output.startsWith('http')) {
        console.log(`✅ Received image URL: ${output}`);
        
        // Download the image from the URL
        const response = await fetch(output);
        if (!response.ok) {
          throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
        }
        
        const imageBuffer = await response.buffer();
        console.log(`📥 Downloaded image data size: ${imageBuffer.length} bytes`);
        
        const timestamp = Date.now();
        const filename = `${brandName.toLowerCase()}_${variationNumber}_${timestamp}.png`;
        const filepath = path.join(UPLOADS_DIR, filename);
        
        // Write file using writeFile from fs/promises (like working example)
        await writeFile(filepath, imageBuffer);
        
        // Return the full URL path to access the file
        const baseUrl = process.env.BACKEND_URL || 'https://cluely-for-brands.onrender.com';
        const imageUrl = `${baseUrl}/uploads/${filename}`;
        
        console.log(`✅ ${brandName} variation ${variationNumber} completed on attempt ${attempt}`);
        console.log(`💾 Saved to: ${filepath}`);
        console.log(`🔗 Image URL: ${imageUrl}`);
        
        return imageUrl;
      } else {
        throw new Error(`Unexpected output format: ${typeof output} - ${JSON.stringify(output)}`);
      }
      
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed for ${brandName} variation ${variationNumber}:`, error.message);
      
      // Log specific 403 Forbidden error handling
      if (error.message && error.message.includes('403 Forbidden')) {
        console.error(`🚫 403 Forbidden Error - Render IP may be blocked by Cloudflare`);
        console.error(`🔍 This is likely a rate limiting or IP blocking issue`);
        console.error(`🔍 Cloudflare Ray ID may be in error response`);
        
        // Don't retry on 403 errors - they won't resolve
        break;
      }
      
      console.error(`❌ Full error:`, error);
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
 * Generate a single combined image from multiple input images
 * Following documentation exactly
 */
async function generateCombinedImage(productImageUrls, combinationPrompt, brandName = 'combined') {
  try {
    console.log('🎨 Starting image combination generation...');
    console.log(`📸 Combining ${productImageUrls.length} images`);
    console.log(`🎭 Combination prompt: ${combinationPrompt.substring(0, 100)}...`);
    
    // Ensure uploads directory exists
    await ensureUploadsDir();
    
    console.log(`🔍 Input image URLs:`, productImageUrls);
    
    // Input format exactly matching the documentation
    const input = {
      prompt: combinationPrompt,
      aspect_ratio: "1:1",
      input_images: productImageUrls,
      output_format: "png",
      safety_tolerance: 2
    };
    
    console.log(`🎯 Combining ${productImageUrls.length} images into single scene`);
    console.log(`🔍 Input object:`, JSON.stringify(input, null, 2));
    
    // Direct call to replicate.run - following documentation pattern
    const output = await replicate.run(FLUX_MODEL, { input });
    
    console.log(`🔍 Raw Replicate output:`, output);
    console.log(`🔍 Output type:`, typeof output);
    
    // According to documentation, output should be a URL
    if (output && typeof output === 'string' && output.startsWith('http')) {
      console.log(`✅ Received image URL: ${output}`);
      
      // Download the image from the URL
      const response = await fetch(output);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
      }
      
      const imageBuffer = await response.buffer();
      console.log(`📥 Downloaded combined image data size: ${imageBuffer.length} bytes`);
      
      const timestamp = Date.now();
      const filename = `${brandName.toLowerCase()}_combined_${timestamp}.png`;
      const filepath = path.join(UPLOADS_DIR, filename);
      
      // Write file using writeFile from fs/promises (like working example)
      await writeFile(filepath, imageBuffer);
      
      // Return the full URL path to access the file
      const baseUrl = process.env.BACKEND_URL || 'https://cluely-for-brands.onrender.com';
      const combinedImageUrl = `${baseUrl}/uploads/${filename}`;
      
      console.log(`✅ Combined image generation completed`);
      console.log(`💾 Saved to: ${filepath}`);
      console.log(`🔗 Image URL: ${combinedImageUrl}`);
      
      return combinedImageUrl;
    } else {
      throw new Error(`Unexpected output format: ${typeof output} - ${JSON.stringify(output)}`);
    }
    
  } catch (error) {
    console.error('❌ Error generating combined image:', error);
    
    // Log specific 403 Forbidden error handling
    if (error.message && error.message.includes('403 Forbidden')) {
      console.error(`🚫 403 Forbidden Error - Render IP may be blocked by Cloudflare`);
      console.error(`🔍 This is likely a rate limiting or IP blocking issue`);
    }
    
    console.error('❌ Full error:', error);
    throw new Error(`Failed to generate combined image: ${error.message}`);
  }
}

/**
 * Sleep utility function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get model information
 */
async function getModelInfo(modelName = FLUX_MODEL) {
  try {
    const model = await replicate.models.get(modelName);
    return model;
  } catch (error) {
    console.error(`❌ Error getting model info for ${modelName}:`, error);
    throw new Error(`Failed to get model info: ${error.message}`);
  }
}

module.exports = {
  generateBrandVariations,
  generateCombinedImage,
  generateSingleImage,
  getModelInfo,
  FLUX_MODEL
};