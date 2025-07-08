"use client";

import { Brand } from "@/lib/brands";
import { ProductImageSet } from "@/types/app";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface GenerationResultsProps {
  productImages: ProductImageSet;
  selectedBrand: Brand;
  generatedImages: string[];
  isGenerating: boolean;
  onTryAnotherBrand: () => void;
  onDownloadAll: () => void;
}

export function GenerationResults({
  productImages,
  selectedBrand,
  generatedImages,
  isGenerating,
  onTryAnotherBrand,
  onDownloadAll,
}: GenerationResultsProps) {
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  
  // Use the first image as primary for display
  const primaryImage = productImages.images[0];

  const handleDownloadSingle = async (imageUrl: string, index: number) => {
    setDownloadingIndex(index);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedBrand.name.toLowerCase()}-style-${index + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloadingIndex(null);
    }
  };

  const handleShare = (imageUrl: string, platform: "twitter" | "linkedin") => {
    const text = `Check out my product styled with ${selectedBrand.name}&apos;s brand aesthetic! Made with Cluely for Brands ✨`;
    const url = encodeURIComponent(window.location.href);
    
    let shareUrl = "";
    if (platform === "twitter") {
      shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`;
    } else if (platform === "linkedin") {
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${encodeURIComponent(text)}`;
    }
    
    window.open(shareUrl, "_blank", "width=600,height=400");
  };

  if (isGenerating) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <Badge variant="secondary">Generating Images</Badge>
          <h2 className="text-3xl font-bold">Creating Your {selectedBrand.name} Style</h2>
          <p className="text-lg text-muted-foreground">
            Our AI is working its magic to transform your product
          </p>
        </div>

        <Card className="p-8">
          <div className="text-center space-y-6">
            {/* Visual Preview */}
            <div className="flex items-center justify-center gap-6">
              <div className="w-20 h-20 rounded-lg overflow-hidden border">
                <img
                  src={primaryImage.previewUrl || primaryImage.url}
                  alt="Your product"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-3xl text-muted-foreground">→</div>
              <div className="w-20 h-20 rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            </div>
            
            {/* Progress */}
            <div className="space-y-3">
              <Progress value={65} className="w-full max-w-xs mx-auto" />
              <p className="text-sm text-muted-foreground">
                Generating 4 unique variations • Usually takes ~30 seconds
              </p>
            </div>
            
            {/* Status */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-primary">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="font-medium">AI is creating your {selectedBrand.name} variations</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          ✨ Generation Complete
        </Badge>
        <h2 className="text-3xl font-bold">
          Your {selectedBrand.name} Style is Ready!
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Here are 4 unique variations of your product in {selectedBrand.name}&apos;s signature aesthetic
        </p>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {generatedImages.map((imageUrl, index) => {
          // Validate image URL
          if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.length < 10) {
            return (
              <Card key={index} className="aspect-square">
                <CardContent className="h-full flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <p>Image failed to load</p>
                    <p className="text-sm mt-1">URL: {String(imageUrl).substring(0, 50)}...</p>
                  </div>
                </CardContent>
              </Card>
            );
          }
          
          return (
            <Card key={index} className="group overflow-hidden hover:shadow-lg transition-all duration-200">
              <CardContent className="p-0">
                <div className="relative">
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={`${selectedBrand.name} style variation ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <Button
                      onClick={() => handleDownloadSingle(imageUrl, index)}
                      disabled={downloadingIndex === index}
                      variant="secondary"
                      size="sm"
                    >
                      {downloadingIndex === index ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <span className="mr-2">⬇️</span>
                          Download
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* Variation Badge */}
                  <Badge className="absolute top-3 left-3" variant="outline">
                    Variation {index + 1}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Action Buttons */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button onClick={onDownloadAll} size="lg" className="w-full sm:w-auto">
            <span className="mr-2">📦</span>
            Download All Images
          </Button>
          
          <Button 
            onClick={() => handleShare(generatedImages[0], "twitter")}
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
          >
            <span className="mr-2">🐦</span>
            Share on Twitter
          </Button>
          
          <Button 
            onClick={() => handleShare(generatedImages[0], "linkedin")}
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
          >
            <span className="mr-2">💼</span>
            Share on LinkedIn
          </Button>
          
          <Button 
            onClick={onTryAnotherBrand}
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto"
          >
            <span className="mr-2">🎨</span>
            Try Another Brand
          </Button>
        </div>
      </Card>

      {/* Success Message */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            <CardTitle className="text-green-800">Generation Successful!</CardTitle>
          </div>
          <CardDescription className="text-green-700">
            Your images have been successfully transformed with {selectedBrand.name}&apos;s brand aesthetic. 
            Each variation captures unique elements of their design philosophy while maintaining your product&apos;s core features.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
} 