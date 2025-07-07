import { Brand } from "../lib/brands";

export type AppStep = 1 | 2 | 3;

export interface ProductImage {
  url: string;
  previewUrl?: string; // Blob URL for immediate preview
  width: number;
  height: number;
  type: 'top' | 'bottom' | 'single';
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

export interface AppState {
  currentStep: AppStep;
  productImages: ProductImageSet | null;
  selectedBrand: Brand | null;
  isAnalyzing: boolean;
  isGenerating: boolean;
  generatedImages: GenerationResult[];
  error: string | null;
}

export interface BrandSelectionProps {
  productImages: ProductImageSet;
  selectedBrand: Brand | null;
  onBrandSelect: (brand: Brand) => void;
  onGenerate: () => void;
}

export interface GenerationResultsProps {
  productImages: ProductImageSet;
  selectedBrand: Brand;
  generatedImages: GenerationResult[];
  isGenerating: boolean;
  onTryAnotherBrand: () => void;
  onDownloadAll: () => void;
  onShareResult: (result: GenerationResult) => void;
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
  onImagesUploaded: (imageSet: ProductImageSet) => void;
  isAnalyzing: boolean;
} 