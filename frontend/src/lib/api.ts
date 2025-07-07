// API service for communicating with the backend
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface ApiResponse<T = any> {
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

async function apiCall<T = any>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${BACKEND_URL}${endpoint}`;
  
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
  analyzeProduct: async (imageBase64: string, mimeType: string) => {
    return apiCall('/api/analyze-product', {
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
    brandData: any
  ) => {
    return apiCall('/api/generate-brand-prompt', {
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
  ) => {
    return apiCall('/api/generate-brand-images', {
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
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return apiCall('/api/upload', {
      method: 'POST',
      headers: {}, // Don't set Content-Type for FormData
      body: formData
    });
  },

  // Health check
  healthCheck: async () => {
    return apiCall('/health');
  },

  // Combine multiple images into a single scene
  combineImages: async (
    productImageUrls: string[],
    combinationPrompt: string,
    brandName?: string
  ) => {
    return apiCall('/api/combine-images', {
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