const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import services
const { analyzeProduct, generateBrandPrompt } = require('./services/geminiService');
const { generateBrandVariations, generateSingleImage, generateCombinedImage, stitchImages } = require('./services/replicateService');
const { getBrandById } = require('./lib/brands');

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
    'http://127.0.0.1:3000',
    'http://192.168.1.8:3000', // Allow network access
    'https://cluely-for-brands.vercel.app', // Common Vercel domain
    'https://cluely-for-brands-git-main.vercel.app', // Vercel git branch domain
    /^https:\/\/cluely-for-brands.*\.vercel\.app$/ // Any Vercel deployment
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
  res.header('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
  next();
}, express.static(path.join(__dirname, 'uploads')));

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
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Cluely for Brands API',
    version: '1.0.0',
    endpoints: {
      'GET /health': 'Health check',
      'POST /api/analyze-product': 'Analyze product with Gemini',
      'POST /api/generate-brand-prompt': 'Generate brand-specific prompt',
      'POST /api/generate-brand-images': 'Generate brand variations',
      'POST /api/upload': 'Upload multiple files',
      'POST /api/upload/single': 'Upload single file'
    }
  });
});

// Analyze product endpoint (supports multiple images with stitching)
app.post('/api/analyze-product', async (req, res) => {
  try {
    const { imageBase64, mimeType, imageUrls } = req.body;
    
    console.log('🔍 Analyzing product image...');
    
    let finalImageBase64, finalMimeType;
    
    // Handle multiple images by stitching them together
    if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 1) {
      console.log(`🔗 Multiple images detected (${imageUrls.length}), stitching together...`);
      
      // Stitch images together
      const stitchedImageUrl = await stitchImages(imageUrls);
      console.log(`✅ Images stitched: ${stitchedImageUrl}`);
      
      // Convert stitched image to base64 for Gemini
      const urlParts = stitchedImageUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      const filepath = path.join(__dirname, 'uploads', filename);
      
      const imageBuffer = fs.readFileSync(filepath);
      finalImageBase64 = imageBuffer.toString('base64');
      finalMimeType = 'image/jpeg';
      
      console.log(`📏 Stitched image converted to base64: ${finalImageBase64.length} characters`);
      
    } else {
      // Single image - use as provided
      if (!imageBase64 || !mimeType) {
        return res.status(400).json({
          error: "Missing imageBase64 or mimeType for single image analysis"
        });
      }
      
      finalImageBase64 = imageBase64;
      finalMimeType = mimeType;
      console.log(`📸 Single image analysis`);
    }
    
    const analysis = await analyzeProduct(finalImageBase64, finalMimeType);
    
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

// Upload single file endpoint
app.post('/api/upload/single', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const timestamp = Date.now();
    const fileExtension = path.extname(req.file.originalname) || '.jpg';
    const filename = `upload_${timestamp}_${Math.random().toString(36).substring(2, 15)}${fileExtension}`;
    
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    const filepath = path.join(uploadPath, filename);
    fs.writeFileSync(filepath, req.file.buffer);

    const baseUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
    const fileUrl = `${baseUrl}/uploads/${filename}`;

    console.log(`📁 Saved uploaded file: ${filename}`);
    console.log(`🔗 Accessible URL: ${fileUrl}`);

    res.json({
      url: fileUrl,
      filename: req.file.originalname,
      savedAs: filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

// Upload multiple files endpoint
app.post('/api/upload', upload.array('files', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  try {
    const uploadedFiles = req.files.map(file => {
      const timestamp = Date.now();
      const fileExtension = path.extname(file.originalname) || '.jpg';
      const filename = `upload_${timestamp}_${Math.random().toString(36).substring(2, 15)}${fileExtension}`;
      
      const uploadPath = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      const filepath = path.join(uploadPath, filename);
      fs.writeFileSync(filepath, file.buffer);

      const baseUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
      const fileUrl = `${baseUrl}/uploads/${filename}`;

      console.log(`📁 Saved uploaded file: ${filename}`);
      console.log(`🔗 Accessible URL: ${fileUrl}`);

      return {
        url: fileUrl,
        filename: file.originalname,
        savedAs: filename,
        size: file.size,
        mimetype: file.mimetype
      };
    });

    res.json({
      files: uploadedFiles,
      count: uploadedFiles.length
    });
  } catch (error) {
    console.error('Error saving files:', error);
    res.status(500).json({ error: 'Failed to save files' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    details: error instanceof Error ? error.message : 'Unknown error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`📁 Created uploads directory: ${uploadsDir}`);
  }
});

module.exports = app; 