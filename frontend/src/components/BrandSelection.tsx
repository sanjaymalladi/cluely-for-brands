"use client";

import { Brand, getAllBrands } from "@/lib/brands";
import { ProductImageSet } from "@/types/app";
import { useState } from "react";

interface BrandSelectionProps {
  productImages: ProductImageSet;
  selectedBrand: Brand | null;
  onBrandSelect: (brand: Brand) => void;
  onGenerate: () => void;
}

export function BrandSelection({
  productImages,
  selectedBrand,
  onBrandSelect,
  onGenerate,
}: BrandSelectionProps) {
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(null);
  const brands = getAllBrands();
  
  // Use the first image as primary for display
  const primaryImage = productImages.images[0];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Enhanced Header */}
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-white mb-6">
          Choose Your <span className="gradient-text">Brand Aesthetic</span>
        </h2>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
          Select a brand style that resonates with your vision. Each aesthetic brings its unique personality, 
          color palette, and design philosophy to transform your product images.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Side - Product Analysis */}
        <div className="xl:col-span-1">
          <div className="card sticky top-8">
            <div className="card-header">
              <h3 className="card-title flex items-center gap-3">
                <span className="text-2xl">📸</span>
                <span>Your Product</span>
              </h3>
            </div>
            <div className="card-content space-y-6">
              {/* Primary Image Display */}
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-800 border border-gray-700">
                <img
                  src={primaryImage.previewUrl || primaryImage.url}
                  alt="Your product"
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Image Type Indicator */}
              {primaryImage.type === 'stitched' && (
                <div className="flex items-center justify-center gap-2 p-3 bg-purple-900/20 border border-purple-700 rounded-lg">
                  <span className="text-purple-400">🔗</span>
                  <span className="text-sm font-medium text-purple-300">
                    Combined Image for Better Analysis
                  </span>
                </div>
              )}
              
              {/* Multiple Images Preview */}
              {productImages.images.length > 1 && primaryImage.type !== 'stitched' && (
                <div>
                  <p className="text-sm font-semibold text-gray-400 mb-3">
                    📱 All Uploaded Images
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {productImages.images.map((image, index) => (
                      <div 
                        key={index}
                        className="aspect-square rounded-lg overflow-hidden bg-gray-800 border border-gray-700"
                      >
                        <img
                          src={image.previewUrl || image.url}
                          alt={`Product ${image.type}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* AI Analysis */}
              {productImages.analysis && (
                <div className="border-t border-gray-700 pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🧠</span>
                    <p className="text-sm font-semibold text-gray-300">
                      AI Analysis
                    </p>
                  </div>
                  <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {productImages.analysis}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Brand Selection */}
        <div className="xl:col-span-2 space-y-8">
          {/* Brand Grid */}
          <div>
            <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3">
              <span className="text-2xl">🎨</span>
              Select Your Brand Style
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {brands.map((brand) => (
                <div
                  key={brand.id}
                  className={`card cursor-pointer hover-lift transition-all duration-300 ${
                    selectedBrand?.id === brand.id ? 'selected' : ''
                  } ${hoveredBrand === brand.id ? 'scale-[1.02]' : ''}`}
                  onClick={() => {
                    console.log('🏷️ Brand selected:', brand.name);
                    onBrandSelect(brand);
                  }}
                  onMouseEnter={() => setHoveredBrand(brand.id)}
                  onMouseLeave={() => setHoveredBrand(null)}
                >
                  <div className="flex items-start justify-between mb-4">
                    {/* Enhanced Brand Logo */}
                    <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-sm border border-gray-600 p-4 shadow-xl flex items-center justify-center">
                      <img 
                        src={brand.logo} 
                        alt={`${brand.name} logo`}
                        className="w-full h-full object-contain filter brightness-125 contrast-110"
                        style={{ display: 'block' }}
                      />
                    </div>
                    
                    {/* Selection Indicator */}
                    {selectedBrand?.id === brand.id && (
                      <div className="checkmark text-lg">✓</div>
                    )}
                  </div>
                  
                  {/* Brand Name */}
                  <h4 className="text-xl font-bold text-white mb-2">
                    {brand.name}
                  </h4>
                  
                  {/* Tagline */}
                  <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                    {brand.tagline}
                  </p>
                  
                  {/* Style Keywords */}
                  <div className="flex flex-wrap gap-2">
                    {brand.styleKeywords.slice(0, 4).map((keyword, index) => (
                      <span key={index} className="badge">
                        {keyword}
                      </span>
                    ))}
                    {brand.styleKeywords.length > 4 && (
                      <span className="badge opacity-60">
                        +{brand.styleKeywords.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Generate Section */}
          <div className="card bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-600">
            <div className="text-center space-y-6">
              <div>
                <h3 className="text-2xl font-semibold text-white mb-3">
                  Ready to Generate?
                </h3>
                <p className="text-gray-400">
                  {selectedBrand 
                    ? `Create stunning ${selectedBrand.name}-style variations of your product`
                    : 'Select a brand style above to continue'
                  }
                </p>
              </div>
              
              {selectedBrand && (
                <div className="p-4 bg-indigo-900/20 border border-indigo-700 rounded-lg mb-6">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="w-20 h-20 rounded-xl bg-white/10 backdrop-blur-sm border border-gray-600 p-3 shadow-lg flex items-center justify-center">
                      <img 
                        src={selectedBrand.logo} 
                        alt={`${selectedBrand.name} logo`}
                        className="w-full h-full object-contain filter brightness-125 contrast-110"
                        style={{ display: 'block' }}
                      />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-white">{selectedBrand.name}</p>
                      <p className="text-sm text-indigo-300">{selectedBrand.tagline}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {selectedBrand.styleKeywords.slice(0, 3).map((keyword, index) => (
                      <span key={index} className="badge bg-indigo-800 border-indigo-600 text-indigo-200">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <button
                onClick={() => {
                  console.log('🔵 Generate button clicked!');
                  console.log('🔵 selectedBrand:', selectedBrand);
                  if (selectedBrand) {
                    console.log('🔵 Calling onGenerate...');
                    onGenerate();
                  } else {
                    console.log('❌ No selected brand!');
                  }
                }}
                disabled={!selectedBrand}
                className="btn btn-primary btn-lg btn-full max-w-md mx-auto shadow-xl"
              >
                {selectedBrand ? (
                  <>
                    <span className="text-xl mr-3">✨</span>
                    Generate {selectedBrand.name} Style
                  </>
                ) : (
                  <>
                    <span className="mr-2">👆</span>
                    Select a Brand Style Above
                  </>
                )}
              </button>
              
              {selectedBrand && (
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-400">
                    🎯 This will generate <strong className="text-white">4 unique variations</strong> in {selectedBrand.name}&apos;s signature style
                  </p>
                  <p className="text-xs text-gray-500">
                    ⏱️ Usually takes 30-60 seconds depending on image complexity
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 