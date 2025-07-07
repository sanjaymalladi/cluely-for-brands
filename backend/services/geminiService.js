const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configure the model
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 1024,
  }
});

/**
 * Analyze a product image to understand its characteristics
 */
async function analyzeProduct(imageBase64, mimeType = 'image/jpeg') {
  try {
    console.log('🔑 Gemini API Key configured:', !!process.env.GEMINI_API_KEY);
    console.log('🖼️ Image data length:', imageBase64?.length || 0);
    console.log('🖼️ MIME type:', mimeType);
    
    if (!process.env.GEMINI_API_KEY) {
      console.log('⚠️ No Gemini API key found, using mock analysis for testing');
      // Return a mock analysis for testing purposes
      return `Product Analysis: This appears to be a black clothing item, likely a top or garment with white trim details. The product has a classic, minimalist aesthetic with clean lines and contrasting white piping or binding. The color scheme is predominantly black with white accents, giving it a timeless and versatile appearance. The style suggests it could appeal to a fashion-conscious audience looking for sophisticated basics. The current brand feeling conveys elegance, simplicity, and modern sophistication. Key visual elements include the contrasting trim details and the clean, structured silhouette.`;
    }
    
    if (!imageBase64 || imageBase64.length === 0) {
      throw new Error('Image data is empty or invalid');
    }
    
    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType
      }
    };

    const prompt = `
Analyze this product image and provide a detailed description focusing on:

1. Product Type: What type of product is this?
2. Visual Style: Describe the current visual presentation, colors, materials, textures
3. Target Audience: Who would typically buy this product?
4. Current Brand Feeling: What brand vibe does it currently convey?
5. Key Features: What are the standout visual elements?

Provide a comprehensive analysis that will help transform this product into different brand aesthetics.
`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    console.log('🔍 Gemini response object:', response);
    console.log('🔍 Gemini response text length:', text?.length || 0);
    console.log('🔍 Gemini response text preview:', text?.substring(0, 200) || 'No text');
    console.log('✅ Gemini product analysis completed');
    
    if (!text || text.trim() === '') {
      throw new Error('Gemini returned empty response');
    }
    
    return text;

  } catch (error) {
    console.error('❌ Gemini product analysis error:', error);
    throw new Error(`Product analysis failed: ${error.message}`);
  }
}

/**
 * Generate brand-specific marketing photoshoot prompt using fashion analysis
 */
async function generateBrandPrompt(productAnalysis, brandData) {
  try {
    // Use style keywords for brand aesthetic
    const styleKeywords = brandData.styleKeywords || ['modern', 'stylish', 'premium'];
    const styleDescription = styleKeywords.join(', ');
    const brandName = brandData.name;
    
    if (!process.env.GEMINI_API_KEY) {
      console.log('⚠️ No Gemini API key found, using mock brand prompt for testing');
      // Return a mock brand prompt for testing purposes
      return `**PROMPT 1:**
Combine these product images into one cohesive scene: Professional fashion model wearing the black top with white trim in a ${styleDescription} studio setting, front pose, clean white background, premium lighting, ${brandName} aesthetic, high-fashion photography, model looking directly at camera, confident pose, minimalist composition.

**PROMPT 2:**
Combine these product images into one cohesive scene: Professional fashion model wearing the black top with white trim in a ${styleDescription} environment, profile side pose, elegant lighting, ${brandName} brand aesthetic, sophisticated styling, model in three-quarter turn, premium fashion photography.

**PROMPT 3:**
Combine these product images into one cohesive scene: Professional fashion model wearing the black top with white trim in motion, dynamic pose, ${styleDescription} setting, ${brandName} brand energy, lifestyle photography, model walking or moving naturally, capturing fabric flow and movement.

**PROMPT 4:**
Combine these product images into one cohesive scene: Professional fashion model wearing the black top with white trim, close-up detail shot focusing on the garment, ${styleDescription} styling, ${brandName} brand quality, premium fabric texture visible, artistic composition, model partially visible.`;
    }
    
    // Determine if this is a clothing/fashion item that requires human models
    const isClothingItem = productAnalysis.toLowerCase().includes('clothing') || 
                          productAnalysis.toLowerCase().includes('shirt') || 
                          productAnalysis.toLowerCase().includes('dress') || 
                          productAnalysis.toLowerCase().includes('skirt') || 
                          productAnalysis.toLowerCase().includes('pants') || 
                          productAnalysis.toLowerCase().includes('pajama') || 
                          productAnalysis.toLowerCase().includes('top') || 
                          productAnalysis.toLowerCase().includes('bottom') || 
                          productAnalysis.toLowerCase().includes('fashion') || 
                          productAnalysis.toLowerCase().includes('wear') || 
                          productAnalysis.toLowerCase().includes('garment');
    
    const prompt = `
You are an expert **Fashion Marketing Image Prompt Generator** specializing in creating high-quality marketing photoshoot content.

**Your Task:** Transform the analyzed product into 4 different marketing photoshoot prompts with different poses but maintaining the same outfit and ${styleDescription} aesthetic.

**Product Analysis:**
${productAnalysis}

**Brand Style Requirements:**
- Style Aesthetic: ${styleDescription}
- Brand Identity: ${brandName}
- Marketing Focus: Professional photoshoot content

**CRITICAL REQUIREMENTS:**
${isClothingItem ? `
- **MANDATORY HUMAN MODELS**: Since this is a clothing/fashion item, ALL prompts MUST include professional human models wearing the product
- **NO FLAT LAY SHOTS**: No laying flat, no product-only shots - models must be wearing the items
- **DIVERSE POSES**: Each prompt must show the model in different poses while wearing the exact same outfit
` : `
- **PRODUCT FOCUS**: Show the product in premium marketing presentation
- **LIFESTYLE CONTEXT**: Include relevant lifestyle or usage context
`}

**Instructions:**
1. **Analyze the Outfit Image:** Extract core outfit features from the analysis:
   - Garment Type (be highly specific)
   - Color Palette (exact colors and tones)
   - Texture/Material (fabric details)
   - Pattern/Print (if any)
   - Fit/Silhouette (how it fits the body)

2. **Apply Brand Aesthetic:** Incorporate ${styleDescription} style throughout:
   - Setting should reflect ${styleDescription} aesthetic
   - Lighting should enhance ${styleDescription} mood
   - Overall vibe should embody ${styleDescription} brand essence

3. **Generate 4 IMAGE COMBINATION Prompts:** Create 4 distinct prompts that COMBINE/MERGE multiple input images:
   - **COMBINE INPUT IMAGES:** Each prompt must start with "Combine these product images into one cohesive scene"
   - **MERGE ELEMENTS:** Blend styling elements from all input images seamlessly
   - **UNIFIED COMPOSITION:** Create one unified photograph from multiple source images
   - **Different Poses:** Vary model poses, angles, and compositions
   - **Consistent Style:** Maintain ${styleDescription} aesthetic in all
   - **Professional Quality:** Studio/lifestyle marketing photography
   ${isClothingItem ? `- **Human Models Required:** Professional models wearing the clothing in every shot` : ''}

**Output Format:**
Generate EXACTLY 4 separate, detailed IMAGE COMBINATION prompts. Use this EXACT format:

**PROMPT 1:**
Combine these product images into one cohesive scene: [detailed prompt for front pose]

**PROMPT 2:**
Combine these product images into one cohesive scene: [detailed prompt for profile/side pose]

**PROMPT 3:**
Combine these product images into one cohesive scene: [detailed prompt for dynamic/movement pose]

**PROMPT 4:**
Combine these product images into one cohesive scene: [detailed prompt for close-up/detail pose]

**Requirements for Each Prompt:**
- **MUST START WITH:** "Combine these product images into one cohesive scene:"
- **MANDATORY ELEMENTS:** Show professional model wearing ALL clothing items from BOTH input images
- **EXACT COLORS:** Use the EXACT colors from the input images - do NOT change colors to match brand aesthetic
- **CLOTHING ACCURACY:** Use the precise clothing items shown in the input images, not brand-inspired alternatives
- **HUMAN MODELS:** Every prompt must include "professional model wearing both the [exact top from input] and [exact skirt from input]"
- **COMPLETE OUTFIT:** Show the FULL outfit from both input images combined
- **COLOR OVERRIDE:** Maintain original clothing colors even if they don't match ${styleDescription} palette
- **DIFFERENT POSES:** Vary poses: (1) front pose, (2) profile/side pose, (3) dynamic/movement pose, (4) close-up/detail pose
- **PROFESSIONAL QUALITY:** Studio lighting, premium marketing photography
${isClothingItem ? `
- **NO EXCEPTIONS:** No flat lay, no product-only shots, no partial outfits
- **COMPLETE COMBINATION:** Show model wearing items from BOTH input images simultaneously
- **COLOR ACCURACY:** Maintain exact colors from original images
` : ''}

**CRITICAL:** Generate ONLY the 4 prompts in the exact format above. Do not add extra explanations or text. Each prompt must show a model wearing the complete outfit from both input images.
`;

    console.log('📝 Generating fashion marketing prompts...');
    console.log('🎨 Brand aesthetic:', styleDescription);
    console.log('🏷️ Brand:', brandName);
    console.log('👤 Clothing item requiring models:', isClothingItem);
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const marketingPrompts = response.text();
    
    console.log('✅ Fashion marketing prompts generated successfully');
    console.log('📋 Generated prompts preview:', marketingPrompts.substring(0, 150) + '...');
      
    return marketingPrompts;
  } catch (error) {
    console.error('❌ Error generating fashion marketing prompts:', error);
    throw new Error(`Failed to generate marketing prompts: ${error.message}`);
  }
}

module.exports = {
  analyzeProduct,
  generateBrandPrompt
}; 