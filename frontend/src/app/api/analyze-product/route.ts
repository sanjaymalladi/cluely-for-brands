import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { base64Image, imageType } = await request.json();
    
    console.log('🔑 Gemini API Key configured:', !!process.env.GEMINI_API_KEY);
    console.log('🖼️ Image data length:', base64Image?.length || 0);
    console.log('🖼️ MIME type:', imageType);
    
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }
    
    if (!base64Image || base64Image.length === 0) {
      throw new Error('Image data is empty or invalid');
    }
    
    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1024,
      }
    });
    
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: imageType
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

    console.log('✅ Gemini product analysis completed');
    
    if (!text || text.trim() === '') {
      throw new Error('Gemini returned empty response');
    }
    
    return NextResponse.json({ 
      analysis: text,
      success: true 
    });

  } catch (error) {
    console.error('❌ Error analyzing product:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Product analysis failed: ${errorMessage}` },
      { status: 500 }
    );
  }
} 