const Replicate = require('replicate');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Configuration
const FLUX_MODEL = "black-forest-labs/flux-schnell";
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Create uploads directory if it doesn't exist
const UPLOADS_DIR = path.join(__dirname, '../uploads');
async function ensureUploadsDir() {
  try {
    await fsPromises.access(UPLOADS_DIR);
  } catch {
    await fsPromises.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Generate brand variations using multiple distinct prompts from Gemini
 * Backward-compatible: handles both single images and arrays
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
    
    // If we have fewer images than requested, try to generate more
    if (generatedImages.length < count) {
      console.log(`🔄 Only got ${generatedImages.length}/${count} images, trying to generate more...`);
      
      const needed = count - generatedImages.length;
      const retryPromises = [];
      
      for (let i = 0; i < needed; i++) {
        const promptIndex = i % promptsToUse.length;
        const prompt = promptsToUse[promptIndex];
        const variationNumber = generatedImages.length + i + 1;
        
        retryPromises.push(
          generateSingleImage(imageUrls, prompt, brandName, variationNumber)
        );
      }
      
      const retryResults = await Promise.allSettled(retryPromises);
      
      retryResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          generatedImages.push(result.value);
          console.log(`✅ ${brandName} retry ${index + 1} succeeded`);
        } else {
          console.error(`❌ ${brandName} retry ${index + 1} failed:`, result.reason.message);
        }
      });
    }
    
    console.log(`🎉 Final result: ${generatedImages.length} images generated for ${brandName}`);
    return generatedImages;

  } catch (error) {
    console.error(`❌ Error generating ${brandName} variations:`, error);
    throw new Error(`Failed to generate ${brandName} variations: ${error.message}`);
  }
}

/**
 * Determine MIME type from file extension
 */
function getMimeType(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.jpg':
    case '.jpeg':
    default:
      return 'image/jpeg';
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
      return combinationPrompts.slice(0, 4); // Take only first 4
    }
    
    // Try to find numbered prompts (1-4)
    const promptRegex = /(?:^|\n)\s*(?:prompt\s*)?(\d+)[.:\-\s]*(.+?)(?=\n\s*(?:prompt\s*)?\d+[.:\-\s]|\n\s*$|$)/gims;
    
    const matches = [];
    while ((match = promptRegex.exec(textString)) !== null) {
      matches.push(match);
    }
    
    if (matches.length >= 2) {
      const prompts = matches.map(match => match[2].trim()).filter(p => p.length > 20);
      console.log(`✅ Found ${prompts.length} numbered prompts`);
      return prompts.slice(0, 4); // Take only first 4
    }
    
    console.log('⚠️ Could not parse structured prompts, will use original text');
    return [];
    
  } catch (error) {
    console.error('❌ Error parsing prompts from Gemini:', error);
    return [];
  }
}

/**
 * Generate a single image with retries (Updated for black-forest-labs/flux-schnell model)
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
      
      // Convert local URLs to base64 for Replicate
      let inputImageData;
      
      console.log(`🔍 DEBUG: productImageUrls =`, productImageUrls);
      console.log(`🔍 DEBUG: is array =`, Array.isArray(productImageUrls));
      console.log(`🔍 DEBUG: length =`, productImageUrls.length);
      
      // Check if any URLs are local
      const hasLocalUrls = productImageUrls.some(url => 
        url.startsWith('http://localhost:') || url.startsWith('/uploads/')
      );
      
      console.log(`🔍 DEBUG: has local URLs =`, hasLocalUrls);
      
      if (hasLocalUrls) {
        console.log(`🔄 Converting localhost URLs to base64...`);
        
        // Process all images
        const processedImages = [];
        
        for (const imageUrl of productImageUrls) {
          let filepath;
          
          if (imageUrl.startsWith('http://localhost:')) {
            // Extract filename from URL like "http://localhost:3001/uploads/filename.jpg"
            const urlParts = imageUrl.split('/');
            const filename = urlParts[urlParts.length - 1];
            filepath = path.join(UPLOADS_DIR, filename);
            console.log(`📁 Extracted filename from URL: ${filename}`);
          } else if (imageUrl.startsWith('/uploads/')) {
            // Handle relative path like "/uploads/filename.jpg"
            const filename = path.basename(imageUrl);
            filepath = path.join(UPLOADS_DIR, filename);
            console.log(`📁 Extracted filename from path: ${filename}`);
          } else {
            // External URL - add to processed images as-is
            processedImages.push(imageUrl);
            console.log(`🌐 Using external URL: ${imageUrl}`);
            continue;
          }
          
          console.log(`📁 Reading local file: ${filepath}`);
          
          // Check if file exists
          if (!fs.existsSync(filepath)) {
            console.error(`❌ File not found: ${filepath}`);
            continue;
          }
          
          console.log(`✅ File exists: ${filepath}`);
          
          // Read and convert to base64
          const imageBuffer = fs.readFileSync(filepath);
          const base64String = imageBuffer.toString('base64');
          console.log(`📏 Base64 length: ${base64String.length} characters`);
          
          // Determine MIME type
          const mimeType = getMimeType(filepath);
          console.log(`✅ Converted local file to base64 (${mimeType})`);
          
          // Create data URL
          const dataUrl = `data:${mimeType};base64,${base64String}`;
          console.log(`📏 Final data URL length: ${dataUrl.length} characters`);
          
          processedImages.push(dataUrl);
        }
        
        inputImageData = processedImages;
        
      } else {
        // These are already external URLs - use as is
        inputImageData = productImageUrls;
        console.log(`🌐 Using external URLs directly`);
      }
      
      console.log(`🖼️ Input images count: ${inputImageData.length}`);
      console.log(`🔗 Primary image: ${inputImageData[0]?.substring(0, 100)}...`);
      
      // Prepare input for Replicate black-forest-labs/flux-schnell model
      const input = {
        prompt: promptString,
        aspect_ratio: "1:1",
        num_outputs: 1,
        output_format: "png",
        output_quality: 90
      };
      
      console.log(`🎯 Using ${inputImageData.length} input images for generation`);
      
      const output = await replicate.run(FLUX_MODEL, { input });
      
      console.log(`🔍 Raw Replicate output type:`, typeof output);
      console.log(`🔍 Output length:`, output?.length);
      console.log(`🔍 Output value:`, output);
      
      // FLUX-schnell returns an array of URLs
      const imageUrl = Array.isArray(output) ? output[0] : output;
      
      if (imageUrl) {
        // Output is a URL string, need to download the actual image
        console.log(`🔗 Replicate returned URL: ${imageUrl}`);
        
        // Download the image from the Replicate URL
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to download image from Replicate: ${response.status}`);
        }
        
        const imageBuffer = await response.buffer();
        console.log(`📥 Downloaded image size: ${imageBuffer.length} bytes`);
        
        const timestamp = Date.now();
        const filename = `${brandName.toLowerCase()}_${variationNumber}_${timestamp}.png`;
        const filepath = path.join(UPLOADS_DIR, filename);
        
        // Save the actual image data to file
        await fsPromises.writeFile(filepath, imageBuffer);
        
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

/**
 * Generate a single combined image from multiple input images
 */
async function generateCombinedImage(productImageUrls, combinationPrompt, brandName = 'combined') {
  try {
    console.log('🎨 Starting image combination generation...');
    console.log(`📸 Combining ${productImageUrls.length} images`);
    console.log(`🎭 Combination prompt: ${combinationPrompt.substring(0, 100)}...`);
    
    // Ensure uploads directory exists
    await ensureUploadsDir();
    
    // Convert local URLs to base64 for Replicate
    let inputImageData;
    
    console.log(`🔍 DEBUG: productImageUrls =`, productImageUrls);
    console.log(`🔍 DEBUG: is array =`, Array.isArray(productImageUrls));
    console.log(`🔍 DEBUG: length =`, productImageUrls.length);
    
    // Check if any URLs are local
    const hasLocalUrls = productImageUrls.some(url => 
      url.startsWith('http://localhost:') || url.startsWith('/uploads/')
    );
    
    console.log(`🔍 DEBUG: has local URLs =`, hasLocalUrls);
    
    if (hasLocalUrls) {
      console.log(`🔄 Converting localhost URLs to base64...`);
      
      // Process all images
      const processedImages = [];
      
      for (const imageUrl of productImageUrls) {
        let filepath;
        
        if (imageUrl.startsWith('http://localhost:')) {
          // Extract filename from URL like "http://localhost:3001/uploads/filename.jpg"
          const urlParts = imageUrl.split('/');
          const filename = urlParts[urlParts.length - 1];
          filepath = path.join(UPLOADS_DIR, filename);
          console.log(`📁 Extracted filename from URL: ${filename}`);
        } else if (imageUrl.startsWith('/uploads/')) {
          // Handle relative path like "/uploads/filename.jpg"
          const filename = path.basename(imageUrl);
          filepath = path.join(UPLOADS_DIR, filename);
          console.log(`📁 Extracted filename from path: ${filename}`);
        } else {
          // External URL - add to processed images as-is
          processedImages.push(imageUrl);
          console.log(`🌐 Using external URL: ${imageUrl}`);
          continue;
        }
        
        console.log(`📁 Reading local file: ${filepath}`);
        
        // Check if file exists
        if (!fs.existsSync(filepath)) {
          console.error(`❌ File not found: ${filepath}`);
          continue;
        }
        
        console.log(`✅ File exists: ${filepath}`);
        
        // Read and convert to base64
        const imageBuffer = fs.readFileSync(filepath);
        const base64String = imageBuffer.toString('base64');
        console.log(`📏 Base64 length: ${base64String.length} characters`);
        
        // Determine MIME type
        const mimeType = getMimeType(filepath);
        console.log(`✅ Converted local file to base64 (${mimeType})`);
        
        // Create data URL
        const dataUrl = `data:${mimeType};base64,${base64String}`;
        console.log(`📏 Final data URL length: ${dataUrl.length} characters`);
        
        processedImages.push(dataUrl);
      }
      
      inputImageData = processedImages;
      
    } else {
      // These are already external URLs - use as is
      inputImageData = productImageUrls;
      console.log(`🌐 Using external URLs directly`);
    }
    
    console.log(`🖼️ Input images count: ${inputImageData.length}`);
    console.log(`🔗 Input images for combination:`, inputImageData.map(img => img.substring(0, 100) + '...'));
    
    // Prepare input for Replicate black-forest-labs/flux-schnell model
    const input = {
      prompt: combinationPrompt,
      aspect_ratio: "1:1",
      num_outputs: 1,
      output_format: "png",
      output_quality: 90
    };
    
    console.log(`🎯 Combining ${inputImageData.length} images into single scene`);
    
    const output = await replicate.run(FLUX_MODEL, { input });
    
    console.log(`🔍 Raw Replicate output type:`, typeof output);
    console.log(`🔍 Output length:`, output?.length);
    console.log(`🔍 Output value:`, output);
    
    // FLUX-schnell returns an array of URLs
    const imageUrl = Array.isArray(output) ? output[0] : output;
    
    if (imageUrl) {
      // Output is a URL string, need to download the actual image
      console.log(`🔗 Replicate returned URL: ${imageUrl}`);
      
      // Download the image from the Replicate URL
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image from Replicate: ${response.status}`);
      }
      
      const imageBuffer = await response.buffer();
      console.log(`📥 Downloaded combined image size: ${imageBuffer.length} bytes`);
      
      const timestamp = Date.now();
      const filename = `${brandName.toLowerCase()}_combined_${timestamp}.png`;
      const filepath = path.join(UPLOADS_DIR, filename);
      
      // Save the actual image data to file
      await fsPromises.writeFile(filepath, imageBuffer);
      
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
    throw new Error(`Failed to generate combined image: ${error.message}`);
  }
}

module.exports = {
  generateBrandVariations,
  generateCombinedImage,
  generateSingleImage,
  getModelInfo,
  FLUX_MODEL
}; 