const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import services
const { analyzeProduct, generateBrandPrompt } = require('./services/geminiService');
const { generateBrandVariations, generateSingleImage, generateCombinedImage } = require('./services/replicateService');
const { getBrandById } = require('../lib/brands');
const Replicate = require('replicate');

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for file uploads (in-memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:3006',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:3006',
    'http://192.168.1.8:3000',
    'http://192.168.1.8:3002',
    'http://192.168.1.8:3006', // Allow network access
    'https://cluely-for-brands.vercel.app' // Allow Vercel frontend
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving with proper headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Note: Frontend is hosted separately on Vercel
// Only serving API endpoints and uploads from this backend

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    service: 'Cluely for Brands Backend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    configuration: {
      gemini: process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Missing',
      replicate: process.env.REPLICATE_API_TOKEN ? '✅ Configured' : '❌ Missing',
      port: PORT
    },
    tokens: {
      gemini: process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 15)}...` : 'Not found',
      replicate: process.env.REPLICATE_API_TOKEN ? `${process.env.REPLICATE_API_TOKEN.substring(0, 15)}...` : 'Not found'
    }
  });
});

// Test Replicate connection endpoint
app.get('/test-replicate', async (req, res) => {
  try {
    console.log('🔍 Testing Replicate connection...');
    console.log('🔑 Token from env:', process.env.REPLICATE_API_TOKEN ? `${process.env.REPLICATE_API_TOKEN.substring(0, 15)}...` : 'NOT FOUND');
    console.log('🔑 Token length:', process.env.REPLICATE_API_TOKEN ? process.env.REPLICATE_API_TOKEN.length : 0);
    
    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({
        error: 'Replicate API token not configured'
      });
    }

    // Try the manual approach like the user's example
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
    
    console.log('🔧 Created Replicate client');
    console.log('🔧 Client auth:', replicate.auth ? 'SET' : 'NOT SET');

    // Test the connection by listing models
    console.log('🔍 Attempting to list models...');
    const models = await replicate.models.list();
    console.log('✅ Models listed successfully');
    
    res.json({
      status: 'success',
      message: 'Replicate connection working',
      token: `${process.env.REPLICATE_API_TOKEN.substring(0, 15)}...`,
      modelCount: models.results?.length || 0
    });
  } catch (error) {
    console.error('❌ Replicate test failed:', error);
    console.error('❌ Error type:', error.constructor.name);
    console.error('❌ Error status:', error.status);
    console.error('❌ Error response:', error.response);
    
    res.status(500).json({
      error: 'Replicate connection failed',
      details: error.message,
      token: process.env.REPLICATE_API_TOKEN ? `${process.env.REPLICATE_API_TOKEN.substring(0, 15)}...` : 'Not found',
      errorType: error.constructor.name,
      errorStatus: error.status || 'unknown'
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Cluely for Brands API',
    version: '1.0.0',
    endpoints: {
      'GET /health': 'Health check',
      'GET /test-replicate': 'Test Replicate connection',
      'POST /api/analyze-product': 'Analyze product with Gemini',
      'POST /api/generate-brand-prompt': 'Generate brand-specific prompt',
      'POST /api/generate-brand-images': 'Generate brand variations',
      'POST /api/upload': 'Upload multiple files',
      'POST /api/upload/single': 'Upload single file'
    }
  });
});

// Analyze product endpoint
app.post('/api/analyze-product', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    
    if (!imageBase64 || !mimeType) {
      return res.status(400).json({
        error: "Missing imageBase64 or mimeType"
      });
    }

    console.log('🔍 Analyzing product image...');
    
    const analysis = await analyzeProduct(imageBase64, mimeType);
    
    console.log('✅ Product analysis completed');
    
    res.json({ 
      analysis: analysis,
      success: true 
    });

  } catch (error) {
    console.error("❌ Error analyzing product:", error);
    res.status(500).json({
      error: "Failed to analyze product",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Generate brand prompt endpoint
app.post('/api/generate-brand-prompt', async (req, res) => {
  try {
    const { 
      productAnalysis, 
      brandData
    } = req.body;

    if (!productAnalysis || !brandData) {
      return res.status(400).json({
        error: "Missing productAnalysis or brandData"
      });
    }

    console.log(`🎨 Generating brand prompt for ${brandData.name}...`);
    
    const brandPrompt = await generateBrandPrompt(
      productAnalysis,
      brandData
    );
    
    console.log(`✅ Brand prompt generated for ${brandData.name}`);
    
    res.json({ 
      brandPrompt: brandPrompt,
      brandName: brandData.name,
      success: true 
    });

  } catch (error) {
    console.error("❌ Error generating brand prompt:", error);
    res.status(500).json({
      error: "Failed to generate brand prompt",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Generate brand images (handles multiple product images)
app.post('/api/generate-brand-images', async (req, res) => {
  try {
    const { productImageUrls, brandPrompt, brandId, count = 4 } = req.body;

    // Accept both single image (backward compatibility) and multiple images
    const imageUrls = Array.isArray(productImageUrls) ? productImageUrls : 
                     productImageUrls ? [productImageUrls] : 
                     req.body.productImageUrl ? [req.body.productImageUrl] : [];
    
    console.log('🔍 Received image URLs:', imageUrls);
    
    if (imageUrls.length === 0 || !brandPrompt || !brandId) {
      return res.status(400).json({
        error: "Missing required parameters: productImageUrls, brandPrompt, brandId"
      });
    }

    const brand = getBrandById(brandId);
    if (!brand) {
      return res.status(404).json({
        error: "Brand not found"
      });
    }

    console.log(`🎨 Generating ${count} brand images for ${brand.name}...`);
    console.log(`📸 Using ${imageUrls.length} input images`);
    
    // Use all images for generation
    const generatedImages = await generateBrandVariations(
      imageUrls, // Pass all image URLs
      brandPrompt,
      brand.name,
      count
    );
    
    console.log(`✅ Successfully generated ${generatedImages.length} images for ${brand.name}`);
    console.log(`🔍 Generated Images Array:`, generatedImages);
    
    res.json({ 
      images: generatedImages,
      brandName: brand.name,
      method: "replicate",
      success: true 
    });

  } catch (error) {
    console.error("❌ Error generating brand images:", error);
    res.status(500).json({
      error: "Failed to generate brand images",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Combine multiple images into a single scene
app.post('/api/combine-images', async (req, res) => {
  try {
    const { productImageUrls, combinationPrompt, brandName = 'combined' } = req.body;
    
    // Accept both single image and multiple images
    const imageUrls = Array.isArray(productImageUrls) ? productImageUrls : 
                     productImageUrls ? [productImageUrls] : [];
    
    console.log('🔍 Received image URLs for combination:', imageUrls);
    
    if (imageUrls.length === 0 || !combinationPrompt) {
      return res.status(400).json({
        error: "Missing required parameters: productImageUrls, combinationPrompt"
      });
    }

    if (imageUrls.length < 2) {
      return res.status(400).json({
        error: "Image combination requires at least 2 images"
      });
    }

    console.log(`🎨 Combining ${imageUrls.length} images into single scene...`);
    console.log(`🎭 Combination prompt: ${combinationPrompt.substring(0, 100)}...`);
    
    // Use the new generateCombinedImage function
    const combinedImageUrl = await generateCombinedImage(
      imageUrls,
      combinationPrompt,
      brandName
    );
    
    console.log(`✅ Successfully combined ${imageUrls.length} images`);
    console.log(`🔍 Combined Image URL:`, combinedImageUrl);
    
    res.json({ 
      image: combinedImageUrl,
      inputImageCount: imageUrls.length,
      method: "replicate",
      success: true 
    });

  } catch (error) {
    console.error("❌ Error combining images:", error);
    res.status(500).json({
      error: "Failed to combine images",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Multiple file upload endpoint
app.post('/api/upload', upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Ensure uploads directory exists
    const fs = require('fs').promises;
    const uploadsDir = path.join(__dirname, 'uploads');
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    const uploadedFiles = await Promise.all(req.files.map(async (file) => {
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const extension = path.extname(file.originalname) || '.jpg';
      const filename = `upload_${timestamp}_${randomString}${extension}`;
      const filepath = path.join(uploadsDir, filename);
      
      // Save file to disk
      await fs.writeFile(filepath, file.buffer);
      
      // Return HTTP URL that Replicate can access
      const baseUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
      const url = `${baseUrl}/uploads/${filename}`;
      
      console.log(`📁 Saved uploaded file: ${filename}`);
      console.log(`🔗 Accessible URL: ${url}`);
      
      return {
        url: url,
        filename: file.originalname,
        savedAs: filename,
        size: file.size,
        mimetype: file.mimetype
      };
    }));
    
    res.json({ 
      files: uploadedFiles,
      count: uploadedFiles.length,
      success: true
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed',
      details: error.message 
    });
  }
});

// Single file upload endpoint (for backward compatibility)
app.post('/api/upload/single', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Ensure uploads directory exists
    const fs = require('fs').promises;
    const uploadsDir = path.join(__dirname, 'uploads');
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(req.file.originalname) || '.jpg';
    const filename = `upload_${timestamp}_${randomString}${extension}`;
    const filepath = path.join(uploadsDir, filename);
    
    // Save file to disk
    await fs.writeFile(filepath, req.file.buffer);
    
    // Return HTTP URL that Replicate can access
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
    const url = `${baseUrl}/uploads/${filename}`;
    
    console.log(`📁 Saved uploaded file: ${filename}`);
    console.log(`🔗 Accessible URL: ${url}`);
    
    res.json({ 
      url: url,
      filename: req.file.originalname,
      savedAs: filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed',
      details: error.message 
    });
  }
});

// Replicate proxy routes
app.get('/api/replicate/models/*', async (req, res) => {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({
        error: "Replicate API token not configured"
      });
    }

    const modelPath = req.params[0];
    const url = `https://api.replicate.com/v1/models/${modelPath}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Replicate API error (model info): ${response.status} ${errorText}`);
      return res.status(response.status).json({
        error: `Replicate API error: ${response.status}`
      });
    }

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error("Error proxying Replicate model request:", error);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler for API routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    message: 'This is the Cluely for Brands API. Frontend is hosted at https://cluely-for-brands.vercel.app/'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
}); 