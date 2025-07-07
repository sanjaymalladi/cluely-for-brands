// API service for communicating with Vercel Functions
import { Brand } from './brands';

// No need for backend URL - using relative paths for Vercel Functions
const API_BASE = '';

// API Response Types
interface AnalyzeProductResponse {
  analysis: string;
}

interface GenerateBrandPromptResponse {
  brandPrompt: string;
  brandName: string;
  success: boolean;
}

interface GenerateBrandImagesResponse {
  images: string[];
}

interface UploadFileResponse {
  url: string;
}

interface HealthCheckResponse {
  status: string;
}

interface CombineImagesResponse {
  imageUrl: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

class ApiError extends Error {
  constructor(public status: number, message: string, public details?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiCall<T = unknown>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    console.log(`🌐 API Call: ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, defaultOptions);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        response.status,
        data.error || `HTTP ${response.status}`,
        data.details
      );
    }

    console.log(`✅ API Success: ${endpoint}`);
    return data;
    
  } catch (error) {
    console.error(`❌ API Error: ${endpoint}`, error);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new ApiError(0, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// API Methods
export const api = {
  // Analyze product image
  analyzeProduct: async (imageBase64: string, mimeType: string): Promise<AnalyzeProductResponse> => {
    return apiCall<AnalyzeProductResponse>('/api/analyze-product', {
      method: 'POST',
      body: JSON.stringify({
        imageBase64,
        mimeType
      })
    });
  },

  // Generate brand-specific prompt
  generateBrandPrompt: async (
    productAnalysis: string,
    brandData: Brand
  ): Promise<GenerateBrandPromptResponse> => {
    return apiCall<GenerateBrandPromptResponse>('/api/generate-brand-prompt', {
      method: 'POST',
      body: JSON.stringify({
        productAnalysis,
        brandData
      })
    });
  },

  // Generate brand images (supports multiple input images)
  generateBrandImages: async (
    productImageUrls: string | string[],
    brandPrompt: string,
    brandId: string,
    count: number = 4
  ): Promise<GenerateBrandImagesResponse> => {
    return apiCall<GenerateBrandImagesResponse>('/api/generate-brand-images', {
      method: 'POST',
      body: JSON.stringify({
        productImageUrls,
        brandPrompt,
        brandId,
        count
      })
    });
  },

  // Upload file
  uploadFile: async (file: File): Promise<UploadFileResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    return apiCall<UploadFileResponse>('/api/upload/single', {
      method: 'POST',
      headers: {}, // Don't set Content-Type for FormData
      body: formData
    });
  },

  // Health check
  healthCheck: async (): Promise<HealthCheckResponse> => {
    return apiCall<HealthCheckResponse>('/health');
  },

  // Combine multiple images into a single scene
  combineImages: async (
    productImageUrls: string[],
    combinationPrompt: string,
    brandName?: string
  ): Promise<CombineImagesResponse> => {
    return apiCall<CombineImagesResponse>('/api/combine-images', {
      method: 'POST',
      body: JSON.stringify({
        productImageUrls,
        combinationPrompt,
        brandName
      })
    });
  },
};

export { ApiError };
export type { ApiResponse }; 