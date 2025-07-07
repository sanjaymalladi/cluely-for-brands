"use client";

import { useState, useCallback } from "react";
import ImageUploader from "./ImageUploader";
import { BrandSelection } from "@/components/BrandSelection";
import { GenerationResults } from "@/components/GenerationResults";
import { ClientOnly } from "@/components/ClientOnly";
import { Brand } from "@/lib/brands";
import { AppStep, ProductImageSet } from "@/types/app";
import { api } from "@/lib/api";

export default function Home() {
  // Application State
  const [currentStep, setCurrentStep] = useState<AppStep>(1);
  const [productImages, setProductImages] = useState<ProductImageSet | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Handle Image Set Upload
  const handleImagesUploaded = useCallback((imageSet: ProductImageSet) => {
    console.log('📸 handleImagesUploaded called with:', imageSet);
    setProductImages(imageSet);
    setError(null);
  }, []);

  // Step 1 → Step 2: Analyze Product Images
  const handleAnalyzeProduct = useCallback(async () => {
    console.log('🔍 handleAnalyzeProduct called');
    console.log('🔍 productImages:', productImages);
    
    if (!productImages || !productImages.isComplete) {
      console.log('❌ No product images or not complete');
      return;
    }

    console.log('✅ Starting analysis...');
    setIsAnalyzing(true);
    setError(null);

    try {
      // Extract base64 data from the uploaded image (now a data URL)
      const primaryImage = productImages.images[0]; // Use first image as primary
      let analysisResponse;
      
      // Check if it's a data URL (starts with data:)
      if (primaryImage.url.startsWith('data:')) {
        // Extract base64 and mime type from data URL
        const [header, base64] = primaryImage.url.split(',');
        const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
        
        console.log('🔍 Using data URL for analysis');
        console.log('🔍 MIME type:', mimeType);
        console.log('🔍 Base64 length:', base64?.length || 0);
        
        // Analyze product with Gemini via backend
        analysisResponse = await api.analyzeProduct(base64, mimeType);
      } else {
        // Fallback for regular URLs (shouldn't happen with new upload system)
        console.log('🔍 Converting URL to base64 for analysis');
        const response = await fetch(primaryImage.url);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Remove data:image/jpeg;base64, prefix
          };
          reader.readAsDataURL(blob);
        });

        // Analyze product with Gemini via backend
        analysisResponse = await api.analyzeProduct(base64, blob.type);
      }
      console.log('📋 Analysis response:', analysisResponse);
      const analysis = analysisResponse.analysis;
      console.log('📋 Extracted analysis:', analysis);

      // Update product images with analysis and move to step 2
      const updatedProductImages = {
        ...productImages,
        analysis
      };
      console.log('📋 Updated product images:', updatedProductImages);
      setProductImages(updatedProductImages);
      
      setCurrentStep(2);

    } catch (error) {
      console.error('Product analysis failed:', error);
      setError('Failed to analyze product. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [productImages]);

  // Step 2: Handle Brand Selection
  const handleBrandSelect = useCallback((brand: Brand) => {
    console.log('🏷️ handleBrandSelect called with:', brand.name);
    setSelectedBrand(brand);
  }, []);

  // Step 2 → Step 3: Generate Brand Images
  const handleGenerate = useCallback(async () => {
    console.log('🎨 handleGenerate called!');
    console.log('🎨 productImages:', productImages);
    console.log('🎨 selectedBrand:', selectedBrand);
    
    if (!productImages || !selectedBrand) {
      console.log('❌ Missing basic requirements for generation');
      return;
    }

    if (!productImages.analysis || productImages.analysis.trim() === '') {
      console.log('❌ Missing analysis for generation');
      return;
    }

    console.log('✅ Starting generation process...');
    setIsGenerating(true);
    setCurrentStep(3);
    setError(null);

    try {
      // Generate images via API
      const brandPromptResponse = await api.generateBrandPrompt(
        productImages.analysis,
        selectedBrand
      );
      
      // Collect all image URLs for generation
      const allImageUrls = productImages.images.map(img => img.url);
      console.log('🔗 All image URLs for generation:', allImageUrls);
      
      // Generate brand images via backend using all uploaded images
      const imagesResponse = await api.generateBrandImages(
        allImageUrls,
        brandPromptResponse.brandPrompt,
        selectedBrand.id,
        4
      );
      console.log('🔍 Images Response:', imagesResponse);
      const images = imagesResponse.images;
      console.log('🔍 Generated Images:', images);
      
      // Validate images array
      if (!Array.isArray(images)) {
        throw new Error('Invalid images response format');
      }
      
      // Validate each image URL
      const validImages = images.filter((url, index) => {
        if (!url || typeof url !== 'string' || url.length < 10) {
          console.error(`❌ Invalid image URL at index ${index}:`, url);
          return false;
        }
        return true;
      });
      
      if (validImages.length === 0) {
        throw new Error('No valid image URLs received');
      }
      
      console.log(`✅ ${validImages.length}/${images.length} valid images received`);
      setGeneratedImages(validImages);

    } catch (error) {
      console.error('Generation failed:', error);
      setError('Failed to generate images. Please try again.');
      setCurrentStep(2); // Go back to brand selection
    } finally {
      setIsGenerating(false);
    }
  }, [productImages, selectedBrand]);

  // Step 3: Handle Try Another Brand
  const handleTryAnotherBrand = useCallback(() => {
    setSelectedBrand(null);
    setGeneratedImages([]);
    setCurrentStep(2);
  }, []);

  // Step 3: Handle Download All
  const handleDownloadAll = useCallback(async () => {
    if (generatedImages.length === 0) return;

    try {
      // Download each image individually
      for (let i = 0; i < generatedImages.length; i++) {
        const response = await fetch(generatedImages[i]);
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${selectedBrand?.name.toLowerCase()}-style-${i + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (error) {
      console.error('Download failed:', error);
      setError('Download failed. Please try again.');
    }
  }, [generatedImages, selectedBrand]);

  // Step 1 → Step 3: Handle Skip Analysis
  const handleSkipAnalysis = useCallback(() => {
    if (!productImages || !productImages.isComplete) {
      console.log('❌ No product images or not complete');
      return;
    }

    console.log('⏭️ Skipping analysis...');
    setCurrentStep(2);
  }, [productImages]);

  // Get progress percentage
  const getProgress = () => {
    if (currentStep === 1) return 0;
    if (currentStep === 2) return 50;
    if (currentStep === 3) return 100;
    return 0;
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return "Upload your product images";
      case 2: return "Choose your brand aesthetic";
      case 3: return "Generate and download results";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)' }}>
      {/* Professional Header */}
      <div className="glass border-b border-gray-800">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-2xl">⭐</span>
              </div>
              <h1 className="text-4xl font-bold gradient-text">
                Cluely for Brands
              </h1>
            </div>
            
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Transform your product photos into stunning brand-style images using AI. 
              Upload your images, choose your aesthetic, and get professional results.
            </p>

            {/* Step Indicators */}
            <div className="flex items-center justify-center gap-8 mb-6">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-semibold transition-all ${
                    currentStep >= step 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 border-indigo-500 text-white shadow-lg' 
                      : 'border-gray-600 text-gray-400'
                  }`}>
                    {step}
                  </div>
                  <div className="text-left">
                    <div className={`font-medium ${
                      currentStep >= step ? 'text-white' : 'text-gray-400'
                    }`}>
                      {step === 1 ? 'Upload' : step === 2 ? 'Choose' : 'Generate'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {step === 1 ? 'Product Images' : step === 2 ? 'Brand Style' : 'AI Results'}
                    </div>
                  </div>
                  {step < 3 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      currentStep > step ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : 'bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Progress Bar */}
            <div className="max-w-2xl mx-auto mb-6">
              <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                <span>{getStepDescription()}</span>
                <span>{Math.round(getProgress())}% Complete</span>
              </div>
              <div className="progress">
                <div className="progress-bar" style={{ width: `${getProgress()}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        {/* Error Display */}
        {error && (
          <div className="alert alert-error mb-8">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚨</span>
              <div>
                <strong>Error:</strong> {error}
              </div>
            </div>
          </div>
        )}

        {/* Step-specific Content */}
        <ClientOnly>
          {currentStep === 1 && (
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-white mb-4">
                  Ready to transform your product?
                </h2>
                <p className="text-lg text-gray-400 max-w-3xl mx-auto">
                  Upload 1-2 high-quality product images. Our AI will analyze them and help you create stunning brand variations.
                </p>
              </div>

              <div className="card mb-8">
                <ImageUploader onImagesChange={handleImagesUploaded} />
                
                {productImages && productImages.isComplete && (
                  <div className="mt-8 pt-8 border-t border-gray-700">
                    <div className="text-center">
                      <h3 className="text-xl font-semibold text-white mb-6">
                        What would you like to do next?
                      </h3>
                      
                      <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
                        <button
                          onClick={handleAnalyzeProduct}
                          disabled={isAnalyzing}
                          className="btn btn-primary btn-lg flex-1"
                        >
                          {isAnalyzing ? (
                            <>
                              <div className="loading-spinner mr-2"></div>
                              Analyzing Product...
                            </>
                          ) : (
                            <>
                              <span className="mr-2">🔍</span>
                              Analyze Product (Recommended)
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={handleSkipAnalysis}
                          disabled={isAnalyzing}
                          className="btn btn-secondary btn-lg flex-1"
                        >
                          <span className="mr-2">⏭️</span>
                          Skip Analysis
                        </button>
                      </div>
                      
                      <p className="text-sm text-gray-500 mt-4 max-w-xl mx-auto">
                        🧠 <strong>Recommended:</strong> Analysis helps our AI understand your product better and generate more accurate brand variations. Takes about 10-15 seconds.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && productImages && (
            <BrandSelection
              productImages={productImages}
              selectedBrand={selectedBrand}
              onBrandSelect={handleBrandSelect}
              onGenerate={handleGenerate}
            />
          )}

          {currentStep === 3 && productImages && selectedBrand && (
            <GenerationResults
              productImages={productImages}
              selectedBrand={selectedBrand}
              generatedImages={generatedImages}
              isGenerating={isGenerating}
              onTryAnotherBrand={handleTryAnotherBrand}
              onDownloadAll={handleDownloadAll}
            />
          )}
        </ClientOnly>

        {/* Footer */}
        <div className="text-center mt-16 pt-8 border-t border-gray-800">
          <p className="text-gray-500 text-sm">
            Powered by AI • Made with ❤️ for creators and brands
          </p>
        </div>
      </div>
    </div>
  );
}
