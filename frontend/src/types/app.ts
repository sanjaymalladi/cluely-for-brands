import { Brand } from "../lib/brands";

export type AppStep = 1 | 2 | 3;

// New app state type for the redesigned flow
export type AppState = 'upload' | 'brand-selection' | 'confirm-generation' | 'generating' | 'results';

export interface ProductImage {
  url: string;
  previewUrl?: string; // Blob URL for immediate preview
  width: number;
  height: number;
  type: 'top' | 'bottom' | 'single' | 'stitched';
  file?: File;
}

export interface ProductImageSet {
  images: ProductImage[];
  analysis?: string;
  isComplete: boolean; // true when user has uploaded desired images
}

export interface GenerationResult {
  id: string;
  imageUrl: string;
  brandId: string;
  brandName: string;
  prompt: string;
  createdAt: Date;
}

// Legacy app state interface - keeping for compatibility
export interface LegacyAppState {
  currentStep: AppStep;
  productImages: ProductImageSet | null;
  selectedBrand: Brand | null;
  isAnalyzing: boolean;
  isGenerating: boolean;
  generatedImages: GenerationResult[];
  error: string | null;
}

export interface BrandSelectionProps {
  brands: Brand[];
  selectedBrand: Brand | null;
  onBrandSelect: (brand: Brand) => void;
}

export interface GenerationResultsProps {
  productImages: ProductImageSet;
  selectedBrand: Brand;
  generatedImages: string[];
  isGenerating: boolean;
  onTryAnotherBrand: () => void;
  onDownloadAll: () => void;
}

export interface ProductAnalysis {
  productType: string;
  visualStyle: string;
  colorPalette: string[];
  targetAudience: string;
  currentBrandFeeling: string;
  suggestedBrands: string[];
}

export interface ImageUploadProps {
  onImagesChange: (imageSet: ProductImageSet) => void;
} 