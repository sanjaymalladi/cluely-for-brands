"use client";

import { useState } from 'react';
import { ProductImageSet, AppState } from '../types/app';
import { Brand, getAllBrands } from '../lib/brands';
import ImageUploader from './ImageUploader';
import { BrandSelection } from '../components/BrandSelection';
import { GenerationResults } from '../components/GenerationResults';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

const API_BASE = '';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('upload');
  const [productImages, setProductImages] = useState<ProductImageSet>({
    images: [],
    isComplete: false
  });
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [productAnalysis, setProductAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { theme, setTheme } = useTheme();

  const brands = getAllBrands();

  const handleImagesChange = async (images: ProductImageSet) => {
    setProductImages(images);
    if (images.isComplete && images.images.length > 0) {
      // Analyze the product images with Gemini
      setIsAnalyzing(true);
      try {
        const analysisPromises = images.images.map(async (image) => {
          const response = await fetch(`${API_BASE}/api/analyze-product`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageBase64: image.url.split(',')[1], // Remove data:image/...;base64, prefix
              mimeType: 'image/jpeg'
            })
          });

          if (!response.ok) {
            throw new Error(`Analysis failed: ${response.status}`);
          }

          const data = await response.json();
          return data.analysis;
        });

        const analyses = await Promise.all(analysisPromises);
        const combinedAnalysis = analyses.join('\n\n');
        setProductAnalysis(combinedAnalysis);
        
        setAppState('brand-selection');
      } catch (error) {
        console.error('Product analysis failed:', error);
        // Continue to brand selection even if analysis fails
        setAppState('brand-selection');
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleBrandSelect = (brand: Brand) => {
    setSelectedBrand(brand);
    setAppState('confirm-generation');
  };

  const handleStartGeneration = async () => {
    if (!selectedBrand || !productImages.isComplete) return;
    
    setIsGenerating(true);
    setAppState('generating');
    
    try {
      // Step 1: Generate brand-specific prompts using Gemini
      const promptResponse = await fetch(`${API_BASE}/api/generate-brand-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productAnalysis: productAnalysis,
          brandData: selectedBrand
        })
      });

      if (!promptResponse.ok) {
        throw new Error(`Prompt generation failed: ${promptResponse.status}`);
      }

      const promptData = await promptResponse.json();
      
      // Step 2: Generate images using the brand prompts
      const response = await fetch(`${API_BASE}/api/generate-brand-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productImageUrls: productImages.images.map(img => img.url),
          brandPrompt: promptData.brandPrompt,
          brandId: selectedBrand.id
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.images && Array.isArray(data.images)) {
        setGeneratedImages(data.images);
        setAppState('results');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Generation failed. Please try again.');
      setAppState('brand-selection');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTryAnotherBrand = () => {
    setSelectedBrand(null);
    setGeneratedImages([]);
    setAppState('brand-selection');
  };

  const handleStartOver = () => {
    setProductImages({ images: [], isComplete: false });
    setSelectedBrand(null);
    setGeneratedImages([]);
    setAppState('upload');
  };

  const handleDownloadAll = async () => {
    for (let i = 0; i < generatedImages.length; i++) {
      const imageUrl = generatedImages[i];
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${selectedBrand?.name.toLowerCase()}-style-${i + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to download image ${i + 1}:`, error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">C</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Cluely for Brands</h1>
                <p className="text-sm text-muted-foreground">AI-powered brand styling</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                aria-label="Toggle theme"
                className="rounded-full p-2 hover:bg-muted transition-colors"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              {appState !== 'upload' && (
                <Button variant="outline" onClick={handleStartOver}>
                  Start Over
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {appState === 'upload' && (
          <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[70vh] space-y-8">
            {/* Hero Section */}
            <div className="w-full flex flex-col items-center justify-center text-center space-y-4">
              <h2 className="text-4xl font-bold tracking-tight">
                Snap a product. Pick a brand.
                <span className="text-gradient ml-2">Get its vibe.</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Upload your product images and let AI reimagine them in the style of world-renowned brands.
              </p>
            </div>

            <Separator className="my-8" />

            {/* Upload Section */}
            <Card className="p-8 w-full">
              <CardHeader className="text-center pb-6"></CardHeader>
              <CardContent>
                <ImageUploader onImagesChange={handleImagesChange} />
                {isAnalyzing && (
                  <div className="mt-4 text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Analyzing your product...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 mt-12 w-full">
              <Card className="text-center p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎨</span>
                </div>
                <h3 className="font-semibold mb-2">Brand Styling</h3>
                <p className="text-sm text-muted-foreground">
                  Choose from iconic brands like Apple, Nike, Supreme, and more
                </p>
              </Card>
              <Card className="text-center p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="font-semibold mb-2">Fast Generation</h3>
                <p className="text-sm text-muted-foreground">
                  Get 4 unique variations in under 30 seconds
                </p>
              </Card>
              <Card className="text-center p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📱</span>
              </div>
                <h3 className="font-semibold mb-2">High Quality</h3>
                <p className="text-sm text-muted-foreground">
                  Professional-grade results ready for marketing
                </p>
              </Card>
            </div>
          </div>
        )}

        {appState === 'brand-selection' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <Badge variant="secondary">Step 2 of 3</Badge>
              <h2 className="text-3xl font-bold">Choose Your Brand Style</h2>
              <p className="text-lg text-muted-foreground">
                Select a brand aesthetic to transform your product images
                </p>
              </div>

            <BrandSelection
              brands={brands}
              selectedBrand={selectedBrand}
              onBrandSelect={handleBrandSelect}
            />
          </div>
        )}

        {appState === 'confirm-generation' && selectedBrand && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <Badge variant="secondary">Step 3 of 3</Badge>
              <h2 className="text-3xl font-bold">Ready to Generate</h2>
              <p className="text-lg text-muted-foreground">
                Generate 4 unique variations in {selectedBrand.name}&apos;s style
              </p>
            </div>

            <Card className="p-6">
              <div className="flex flex-col items-center justify-center gap-6 mb-6">
                <div className="flex items-center justify-center gap-6">
                  <div className="w-20 h-20 rounded-lg overflow-hidden border">
                    <img
                      src={productImages.images[0]?.previewUrl || productImages.images[0]?.url}
                      alt="Your product"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-4xl text-muted-foreground">→</div>
                  <div className="w-20 h-20 rounded-lg overflow-hidden border">
                    <img
                      src={selectedBrand.logo}
                      alt={selectedBrand.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold">
                  Transform your product with {selectedBrand.name}&apos;s aesthetic
                </h3>
                <p className="text-muted-foreground">
                  This will generate 4 unique variations that capture {selectedBrand.name}&apos;s signature style and design philosophy.
                </p>
                <div className="pt-4">
                  <Button
                    onClick={handleStartGeneration}
                    size="lg"
                    className="w-full sm:w-auto bg-[#64B5F6] text-accent-foreground hover:bg-[#64B5F6]/90 "
                  >
                    Generate Images
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {(appState === 'generating' || appState === 'results') && selectedBrand && (
            <GenerationResults
              productImages={productImages}
              selectedBrand={selectedBrand}
              generatedImages={generatedImages}
              isGenerating={isGenerating}
              onTryAnotherBrand={handleTryAnotherBrand}
              onDownloadAll={handleDownloadAll}
            />
          )}
      </main>

        {/* Footer */}
      <footer className="border-t bg-muted/30 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2024 Cluely for Brands. Powered by AI.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
