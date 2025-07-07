"use client";

import { Brand } from "@/lib/brands";
import { ProductImageSet } from "@/types/app";
import { useState } from "react";

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

  return (
    <div className="container mx-auto py-8 space-y-8">
      {isGenerating ? (
        // Loading State
        <div className="card max-w-2xl mx-auto">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-6">
              <div className="w-16 h-16 relative">
                <img
                  src={primaryImage.previewUrl || primaryImage.url}
                  alt="Your product"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <span className="text-gray-400 text-2xl">→</span>
              <div className="brand-logo w-16 h-16 text-xl">
                {selectedBrand.name.charAt(0)}
              </div>
            </div>
            
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                <span className="mr-2">✨</span>
                Generating your {selectedBrand.name} vibe...
              </h2>
              <div className="badge mb-4">
                AI is working its magic
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="progress max-w-xs mx-auto">
                <div className="progress-bar" style={{ width: '65%' }}></div>
              </div>
              <p className="text-sm text-gray-400">
                Creating 4 unique variations • Usually takes ~30 seconds
              </p>
            </div>
            
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent"></div>
            </div>
          </div>
        </div>
      ) : (
        // Results State
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              <span className="mr-2">✨</span>
              Your {selectedBrand.name} vibe is ready!
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Here are unique variations of your product in {selectedBrand.name}'s signature style
            </p>
          </div>
          
          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {generatedImages.map((imageUrl, index) => {
              console.log(`🖼️ Rendering image ${index + 1}:`, imageUrl);
              
              // Validate image URL
              if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.length < 10) {
                console.error(`❌ Invalid image URL at index ${index}:`, imageUrl);
                return (
                  <div key={index} className="card aspect-square">
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <p>Image failed to load</p>
                        <p className="text-sm mt-1">URL: {String(imageUrl).substring(0, 50)}...</p>
                      </div>
                    </div>
                  </div>
                );
              }
              
              return (
                <div key={index} className="card group overflow-hidden hover-lift cursor-pointer">
                  <div className="relative">
                    <div className="aspect-square overflow-hidden rounded-lg">
                      <img
                        src={imageUrl}
                        alt={`${selectedBrand.name} style variation ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <button
                        onClick={() => handleDownloadSingle(imageUrl, index)}
                        disabled={downloadingIndex === index}
                        className="btn btn-secondary"
                      >
                        {downloadingIndex === index ? (
                          <>
                            <span className="animate-spin mr-2">⟳</span>
                            Downloading...
                          </>
                        ) : (
                          <>
                            <span className="mr-2">⬇️</span>
                            Download
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Variation Badge */}
                    <div className="badge absolute top-3 left-3">
                      #{index + 1}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-4xl mx-auto">
            <button onClick={onDownloadAll} className="btn btn-primary btn-lg">
              <span className="mr-2">📦</span>
              Download All
            </button>
            
            <button 
              onClick={() => handleShare(generatedImages[0], "twitter")}
              className="btn btn-secondary btn-lg"
            >
              <span className="mr-2">🐦</span>
              Share on Twitter
            </button>
            
            <button 
              onClick={() => handleShare(generatedImages[0], "linkedin")}
              className="btn btn-secondary btn-lg"
            >
              <span className="mr-2">💼</span>
              Share on LinkedIn
            </button>
          </div>
          
          {/* Try Another Brand */}
          <div className="text-center pt-8 border-t border-gray-700">
            <p className="text-gray-400 mb-4">
              Want to try a different brand aesthetic?
            </p>
            <button 
              onClick={onTryAnotherBrand}
              className="btn btn-secondary"
            >
              <span className="mr-2">🎨</span>
              Try Another Brand
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 