const Replicate = require('replicate');
const { writeFile } = require('fs').promises;
const fs = require('fs');
const path = require('path');

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Configuration
const FLUX_MODEL = "flux-kontext-apps/multi-image-list";
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Create uploads directory if it doesn't exist
const UPLOADS_DIR = path.join(__dirname, '../uploads');
async function ensureUploadsDir() {
  try {
    await writeFile;
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Error ensuring uploads directory:', error);
  }
}

/**
 * Generate brand variations using multiple distinct prompts from Gemini
 * Simplified version based on working local implementation
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
    
    // Generate all variations in parallel
    const generationPromises = promptsToUse.map((prompt, index) => 
      generateSingleImage(imageUrls, prompt, brandName, index + 1)
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
 * Generate a single image - simplified version based on working local code
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
      
      // Simple input format based on working example
      const input = {
        prompt: promptString,
        aspect_ratio: "1:1",
        input_images: productImageUrls
      };
      
      console.log(`🎯 Using ${productImageUrls.length} input images for generation`);
      console.log(`🔍 Input object:`, JSON.stringify(input, null, 2));
      
      // Direct call to replicate.run - simplified approach
      const output = await replicate.run(FLUX_MODEL, { input });
      
      console.log(`🔍 Raw Replicate output type:`, typeof output);
      console.log(`🔍 Output length:`, output?.length);
      console.log(`🔍 Output is Buffer:`, Buffer.isBuffer(output));
      
      if (output) {
        // Handle output as binary data
        const imageBuffer = Buffer.isBuffer(output) ? output : Buffer.from(output);
        console.log(`📥 Received image data size: ${imageBuffer.length} bytes`);
        
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
        throw new Error('No output received from Replicate');
      }
      
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed for ${brandName} variation ${variationNumber}:`, error.message);
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
 * Simplified version
 */
async function generateCombinedImage(productImageUrls, combinationPrompt, brandName = 'combined') {
  try {
    console.log('🎨 Starting image combination generation...');
    console.log(`📸 Combining ${productImageUrls.length} images`);
    console.log(`🎭 Combination prompt: ${combinationPrompt.substring(0, 100)}...`);
    
    // Ensure uploads directory exists
    await ensureUploadsDir();
    
    console.log(`🔍 Input image URLs:`, productImageUrls);
    
    // Simple input format based on working example
    const input = {
      prompt: combinationPrompt,
      aspect_ratio: "1:1",
      input_images: productImageUrls
    };
    
    console.log(`🎯 Combining ${productImageUrls.length} images into single scene`);
    console.log(`🔍 Input object:`, JSON.stringify(input, null, 2));
    
    // Direct call to replicate.run - simplified approach
    const output = await replicate.run(FLUX_MODEL, { input });
    
    console.log(`🔍 Raw Replicate output type:`, typeof output);
    console.log(`🔍 Output length:`, output?.length);
    console.log(`🔍 Output is Buffer:`, Buffer.isBuffer(output));
    
    if (output) {
      // Handle output as binary data
      const imageBuffer = Buffer.isBuffer(output) ? output : Buffer.from(output);
      console.log(`📥 Received combined image data size: ${imageBuffer.length} bytes`);
      
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
      throw new Error('No output received from Replicate');
    }
    
  } catch (error) {
    console.error('❌ Error generating combined image:', error);
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