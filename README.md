# 🎨 Cluely for Brands

**AI-Powered Product Photography Generator**

Transform your product images into stunning brand-specific marketing content using cutting-edge AI technology.

## ✨ Features

- **📸 Smart Image Analysis**: Upload 1-2 product images and get detailed AI analysis
- **🔗 Image Stitching**: Automatically combines multiple images for better AI understanding
- **🎨 Brand Style Transfer**: Choose from 8 iconic brand aesthetics (Glossier, Tesla, Supreme, etc.)
- **🤖 AI Generation**: Creates 4 unique marketing variations with professional models
- **🎯 Perfect Color Matching**: Maintains exact colors from your original products
- **📱 Modern UI**: Clean, responsive interface with drag-and-drop functionality

## 🚀 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Sonner** - Toast notifications

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Multer** - File upload handling
- **Sharp** - Image processing and stitching
- **Gemini 2.0 Flash** - Product analysis AI
- **Replicate FLUX** - Image generation AI

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Gemini API key
- Replicate API token

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/sanjaymalladi/cluely-for-brands.git
   cd cluely-for-brands
   ```

2. **Install dependencies**
   Install dependencies for both the frontend and backend from the root directory.
```bash
npm install
```

3. **Configure Environment Variables**
   There are two separate `.env` files you need to set up.
   
   - **For the Backend:**
     - Navigate to the `backend` folder: `cd backend`
     - Copy the example file: `cp env.example .env`
     - Edit the `.env` file to add your `GEMINI_API_KEY` and `REPLICATE_API_TOKEN`.
     - Return to the root directory: `cd ..`

   - **For the Frontend:**
     - Navigate to the `frontend` folder: `cd frontend`
     - Copy the example file: `cp env.example .env.local`
     - Edit the `.env.local` file to set `NEXT_PUBLIC_BACKEND_URL=http://localhost:3001`.
     - Return to the root directory: `cd ..`

### Running the Application

All commands must be run from the **root** `cluely-for-brands` directory.

4. **Start the Backend Server**
   ```bash
   npm run start:backend
   ```
   The backend will be available at `http://localhost:3001`.

5. **Start the Frontend Dev Server**
   Open a **new terminal window** and run:
```bash
   npm run dev
   ```

6. **Visit the app**
   - Frontend: `http://localhost:3000`
   - Backend Health Check: `http://localhost:3001/health`

## 🌐 Production Deployment

### Quick Deploy
Run the deployment script:
```bash
# Windows
deploy.bat

# Mac/Linux
./deploy.sh
```

### Manual Deployment
Follow the comprehensive [DEPLOYMENT.md](./DEPLOYMENT.md) guide for step-by-step instructions.

#### Vercel (Frontend)
- Connect GitHub repository
- Set root directory to `cluely-for-brands/frontend`
- Add environment variable: `NEXT_PUBLIC_BACKEND_URL`

#### Render (Backend)
- Connect GitHub repository
- Set root directory to `cluely-for-brands/backend`
- Add environment variables: `GEMINI_API_KEY`, `REPLICATE_API_TOKEN`

## 📱 How It Works

1. **Upload**: Drag and drop 1-2 product images
2. **Analyze**: AI analyzes your products and extracts key features
3. **Choose**: Select from 8 iconic brand aesthetics
4. **Generate**: AI creates 4 unique marketing variations
5. **Download**: Get professional-quality brand images

## 🎯 Key Innovation: Image Stitching

When you upload multiple images, our system:
- Automatically stitches them side-by-side
- Sends the combined image to AI for analysis
- Ensures better color accuracy and context understanding
- Generates more cohesive marketing content

## 🔧 API Keys Setup

### Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to your environment variables

### Replicate API Token
1. Visit [Replicate Account](https://replicate.com/account/api-tokens)
2. Create a new token
3. Add to your environment variables

## 🏗️ Project Structure

```
cluely-for-brands/
├── frontend/          # Next.js frontend
│   ├── src/
│   │   ├── app/       # App Router pages
│   │   │   ├── components/ # React components
│   │   │   └── lib/       # Utilities and API client
│   │   └── package.json
│   └── package.json
├── backend/           # Express.js backend
│   ├── services/      # AI service integrations
│   ├── lib/           # Brand data and utilities
│   ├── uploads/       # Generated images storage
│   └── package.json
├── DEPLOYMENT.md      # Detailed deployment guide
└── README.md         # This file
```

## 🎨 Supported Brand Aesthetics

- **Glossier**: Soft, dreamy, pastel, dewy, youthful
- **Tesla**: Futuristic, minimalist, sleek, innovative
- **Supreme**: Bold, streetwear, exclusive, urban
- **Nike**: Athletic, dynamic, motivational, bold
- **Apple**: Clean, premium, minimalist, sophisticated
- **Aesop**: Earthy, sustainable, minimal, sophisticated
- **Patagonia**: Outdoor, rugged, sustainable, adventurous
- **Tiffany**: Luxury, elegant, timeless, sophisticated

## 📊 Performance

- **Image Processing**: Sharp library for fast stitching
- **AI Processing**: Parallel generation for 4 variations
- **Caching**: Optimized static file serving
- **Responsive**: Works on mobile and desktop

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:
1. Check the [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section
2. Review the application logs
3. Open an issue on GitHub

---

**Made with ❤️ for brands that want to stand out**
