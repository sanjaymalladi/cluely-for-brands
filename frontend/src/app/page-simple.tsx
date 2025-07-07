export default function SimplePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Snap a product. Pick a brand. Get its vibe.
        </h1>
        
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">Upload Your Product Images</h2>
          <p className="text-gray-600 mb-6">
            Drop 1-2 product images here or click to browse. We&apos;ll analyze them and generate brand variations.
          </p>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-gray-500">
              Drop your product images here
              <br />
              or click to browse (max 2 images)
            </p>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">Powered by Shop OS</p>
          </div>
        </div>
      </div>
    </div>
  );
} 