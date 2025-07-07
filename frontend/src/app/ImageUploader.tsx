"use client";

import { useState, useTransition } from 'react';
import { ProductImageSet } from '../types/app';

interface ImageUploaderProps {
  onImagesChange: (images: ProductImageSet) => void;
}

function getImageData(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function stitchImages(images: { url: string; width: number; height: number }[]): Promise<{
  url: string;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    if (images.length === 1) {
      resolve(images[0]);
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not create canvas context'));
      return;
    }

    const img1 = new Image();
    const img2 = new Image();
    
    img1.crossOrigin = 'anonymous';
    img2.crossOrigin = 'anonymous';
    
    let loadedImages = 0;
    
    const onImageLoad = () => {
      loadedImages++;
      if (loadedImages === 2) {
        // Calculate dimensions for side-by-side layout
        const maxHeight = Math.max(img1.naturalHeight, img2.naturalHeight);
        const totalWidth = img1.naturalWidth + img2.naturalWidth;
        
        // Set canvas dimensions
        canvas.width = totalWidth;
        canvas.height = maxHeight;
        
        // Fill background with white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, totalWidth, maxHeight);
        
        // Draw first image on the left
        const y1 = (maxHeight - img1.naturalHeight) / 2;
        ctx.drawImage(img1, 0, y1, img1.naturalWidth, img1.naturalHeight);
        
        // Draw second image on the right
        const y2 = (maxHeight - img2.naturalHeight) / 2;
        ctx.drawImage(img2, img1.naturalWidth, y2, img2.naturalWidth, img2.naturalHeight);
        
        // Convert canvas to blob and create URL
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            resolve({
              url,
              width: totalWidth,
              height: maxHeight
            });
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/png', 0.95);
      }
    };
    
    img1.onload = onImageLoad;
    img2.onload = onImageLoad;
    
    img1.onerror = () => reject(new Error('Failed to load first image'));
    img2.onerror = () => reject(new Error('Failed to load second image'));
    
    img1.src = images[0].url;
    img2.src = images[1].url;
  });
}

export default function ImageUploader({ onImagesChange }: ImageUploaderProps) {
  const [images, setImages] = useState<ProductImageSet>({
    images: [],
    isComplete: false
  });
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    
    // Allow maximum 2 images
    const fileArray = Array.from(files).slice(0, 2);
    
    startTransition(async () => {
      try {
        const uploadedImages = await Promise.all(
          fileArray.map(async (file, index) => {
            // Get image dimensions for UI
            const data = await getImageData(file);
            
            // Create a preview blob URL for immediate display
            const previewUrl = URL.createObjectURL(file);
        
            // Upload file to backend and get proper HTTP URL
            const formData = new FormData();
            formData.append('file', file);
            
            console.log('📤 Uploading file to backend:', file.name);
            
            const uploadResponse = await fetch('http://localhost:3001/api/upload/single', {
              method: 'POST',
              body: formData
            });
            
            if (!uploadResponse.ok) {
              throw new Error(`Upload failed: ${uploadResponse.status}`);
            }
            
            const uploadResult = await uploadResponse.json();
            console.log('✅ File uploaded successfully:', uploadResult);
            
            return {
              url: uploadResult.url,
              previewUrl,
              width: data.width,
              height: data.height,
              type: 'single' as const,
              file
            };
          })
        );

        // If we have 2 images, create a stitched version
        let finalImages = uploadedImages;
        if (uploadedImages.length === 2) {
          console.log('🔗 Stitching 2 images together...');
          try {
            const stitchedImage = await stitchImages(uploadedImages);
            
            // Upload the stitched image to backend
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            await new Promise<void>((resolve, reject) => {
              img.onload = () => {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                ctx?.drawImage(img, 0, 0);
                
                canvas.toBlob(async (blob) => {
                  if (blob) {
                    const formData = new FormData();
                    formData.append('file', blob, 'stitched-image.png');
                    
                    const uploadResponse = await fetch('http://localhost:3001/api/upload/single', {
                      method: 'POST',
                      body: formData
                    });
                    
                    if (uploadResponse.ok) {
                      const uploadResult = await uploadResponse.json();
                      
                      // Replace the array with a single stitched image
                      finalImages = [{
                        url: uploadResult.url,
                        previewUrl: stitchedImage.url,
                        width: stitchedImage.width,
                        height: stitchedImage.height,
                        type: 'stitched' as const,
                        file: blob as any
                      }];
                      
                      console.log('✅ Stitched image uploaded successfully');
                      resolve();
                    } else {
                      console.error('Failed to upload stitched image');
                      resolve(); // Continue with original images
                    }
                  } else {
                    resolve();
                  }
                }, 'image/png', 0.95);
              };
              
              img.onerror = reject;
              img.src = stitchedImage.url;
            });
          } catch (error) {
            console.error('Error stitching images:', error);
            // Continue with original images if stitching fails
          }
        }

        const newImages = {
          images: finalImages,
          isComplete: true
        };
        
        setImages(newImages);
        onImagesChange(newImages);
        
      } catch (error) {
        console.error('Error uploading images:', error);
        alert('Error uploading images. Please try again.');
      }
    });
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    handleFiles(files);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files);
  }

  function removeImage(index: number) {
    const newImages = {
      images: images.images.filter((_, i) => i !== index),
      isComplete: images.images.length > 1
    };
    setImages(newImages);
    onImagesChange(newImages);
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-3">
          📸 Upload Your Product Images
        </h2>
        <p className="text-gray-400 text-lg leading-relaxed">
          Drop 1-2 product images here or click to browse. We'll analyze them and generate brand variations.
          {images.images.length === 0 && (
            <span className="block mt-2 text-sm text-gray-500">
              💡 Tip: Upload 2 images and we'll automatically stitch them together for better results!
            </span>
          )}
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`upload-area ${isDragOver ? 'dragover' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          className="hidden"
          disabled={isPending}
        />
        
        {isPending ? (
          <div className="text-center">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="text-lg text-gray-300 mb-2">
              {images.images.length === 2 ? 'Stitching images together...' : 'Uploading images...'}
            </p>
            <p className="text-sm text-gray-500">
              {images.images.length === 2 ? 'Creating a combined image for better AI analysis' : 'Please wait while we process your images'}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-6xl mb-4 opacity-80">
              {isDragOver ? '📥' : '📸'}
            </div>
            <p className="text-xl text-gray-300 mb-2">
              {isDragOver ? 'Drop your images here' : 'Drop your product images here'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              or click to browse (max 2 images)
            </p>
            <div className="inline-flex items-center gap-2 text-sm text-gray-400">
              <span>📱</span>
              <span>Supports: JPG, PNG, WebP</span>
            </div>
          </div>
        )}
      </div>

      {/* Image Previews */}
      {images.images.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">
              {images.images[0].type === 'stitched' ? '🔗 Stitched Image' : '📸 Uploaded Images'}
            </h3>
            {images.images[0].type === 'stitched' && (
              <div className="badge">
                Auto-combined for better AI analysis
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {images.images.map((image, index) => (
              <div key={index} className="card group relative">
                <div className="aspect-video rounded-lg overflow-hidden bg-gray-800 mb-4">
                  <img 
                    src={image.previewUrl || image.url} 
                    alt={`Product ${index + 1}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    <p className="font-medium">
                      {image.type === 'stitched' ? '🔗 Combined Image' : `📸 Image ${index + 1}`}
                    </p>
                    <p className="text-xs mt-1">
                      {image.width} × {image.height}px
                    </p>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(index);
                    }}
                    className="btn btn-secondary px-4 py-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {images.isComplete && (
            <div className="mt-6 p-4 bg-green-900/20 border border-green-700 rounded-lg">
              <div className="flex items-center gap-2 text-green-400">
                <span>✅</span>
                <span className="font-medium">Ready for analysis!</span>
              </div>
              <p className="text-sm text-green-300 mt-1">
                Your images are uploaded and ready. Click "Analyze Product" to continue.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
