"use client";

import { useState } from "react";
import { ClientOnly } from "../../components/ClientOnly";
import { api } from "../../lib/api";

export default function TestPage() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState("Initial message");
  const [combinedImage, setCombinedImage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [combineStatus, setCombineStatus] = useState("");

  const handleClick = () => {
    setCount(prev => prev + 1);
    setMessage(`Button clicked ${count + 1} times`);
    console.log("Button clicked!", count + 1);
    alert(`Count is now: ${count + 1}`);
  };

  const testImageCombination = async () => {
    setIsLoading(true);
    setCombineStatus("Starting image combination test...");
    setCombinedImage("");

    try {
      // Use the two most recent uploaded images from your logs
      const imageUrls = [
        "http://localhost:3001/uploads/upload_1751830546139_agr9d04zw3.jpg",
        "http://localhost:3001/uploads/upload_1751830546144_wgnqemz7zi.jpg"
      ];

      const combinationPrompt = "Combine these two images into one cohesive fashion scene. Show both items being worn by the same model in a single outfit - the skirt from the first image paired with any top that complements it. Create a harmonious fashion photoshoot with professional studio lighting, clean white background, and elegant pose.";

      setCombineStatus("Calling image combination API...");

      const response = await api.combineImages(
        imageUrls,
        combinationPrompt,
        "test"
      );

      console.log("✅ Combination response:", response);
      setCombinedImage(response.imageUrl);
      setCombineStatus(`✅ Successfully combined images!`);

    } catch (error) {
      console.error("❌ Combination failed:", error);
      setCombineStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <h1 className="text-4xl font-bold mb-8">React Interaction Test</h1>
      
      <ClientOnly>
        <div className="space-y-8">
          {/* Original Tests */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Basic Interaction Tests</h2>
            <p>Count: {count}</p>
            <p>Message: {message}</p>
            
            <button
              onClick={handleClick}
              className="bg-primary hover:bg-primary/80 text-primary-foreground px-6 py-3 rounded-lg transition-colors"
            >
              Click Me - Test Interaction
            </button>
            
            <button
              onClick={() => {
                console.log("Console test");
                alert("Direct alert test");
              }}
              className="bg-green-500 hover:bg-green-600 text-primary-foreground px-6 py-3 rounded-lg transition-colors ml-4"
            >
              Console & Alert Test
            </button>
          </div>

          {/* Image Combination Test */}
          <div className="space-y-4 border-t border-foreground/20 pt-8">
            <h2 className="text-2xl font-bold">Image Combination Test</h2>
            <p className="text-foreground/70">Test the new image combination functionality using your uploaded images</p>
            
            <button
              onClick={testImageCombination}
              disabled={isLoading}
              className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-primary-foreground px-6 py-3 rounded-lg transition-colors"
            >
              {isLoading ? (
                <div className="inline-flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin"></div>
                  <span>Combining Images...</span>
                </div>
              ) : (
                "🔄 Test Image Combination"
              )}
            </button>

            {combineStatus && (
              <div className={`p-4 rounded-lg ${
                combineStatus.includes('✅') ? 'bg-green-500/20 border border-green-500/50' :
                combineStatus.includes('❌') ? 'bg-red-500/20 border border-red-500/50' :
                'bg-purple-500/20 border border-purple-500/50'
              }`}>
                <p>{combineStatus}</p>
              </div>
            )}

            {combinedImage && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Combined Result:</h3>
                <div className="bg-card p-4 rounded-lg">
                  <img 
                    src={combinedImage} 
                    alt="Combined Image Result" 
                    className="max-w-full h-auto rounded"
                    onError={(e) => {
                      console.error("Error loading combined image:", e);
                      setCombineStatus("❌ Error loading combined image");
                    }}
                  />
                </div>
                <p className="text-sm text-foreground/70">Image URL: {combinedImage}</p>
              </div>
            )}
          </div>
        </div>
      </ClientOnly>
    </div>
  );
} 