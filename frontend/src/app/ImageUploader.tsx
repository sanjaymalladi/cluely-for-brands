"use client";

import { useState, useTransition } from 'react';
import { ProductImageSet, ProductImage } from '../types/app';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { Sun, Moon } from "lucide-react";

// Using Vercel Functions - no backend URL needed (empty string for relative paths)
const API_BASE = '';

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

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Prevents hydration mismatch

  return (
    <button
      aria-label="Toggle theme"
      className="rounded-full p-2 hover:bg-muted transition-colors"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
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
          fileArray.map(async (file) => {
            // Get image dimensions for UI
            const data = await getImageData(file);
            
            // Create a preview blob URL for immediate display
            const previewUrl = URL.createObjectURL(file);
        
            // Upload file to backend and get proper HTTP URL
            const formData = new FormData();
            formData.append('file', file);
            
            const uploadUrl = `${API_BASE}/api/upload/single`;
            
            const uploadResponse = await fetch(uploadUrl, {
              method: 'POST',
              body: formData
            });
            
            if (!uploadResponse.ok) {
              throw new Error(`Upload failed: ${uploadResponse.status}`);
            }
            
            const uploadResult = await uploadResponse.json();
            
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
        let finalImages: ProductImage[] = uploadedImages;
        if (uploadedImages.length === 2) {
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
                    
                    const uploadUrl = `${API_BASE}/api/upload/single`;
                    
                    const uploadResponse = await fetch(uploadUrl, {
                      method: 'POST',
                      body: formData
                    });
                    
                    if (uploadResponse.ok) {
                      const uploadResult = await uploadResponse.json();
                      
                      // Replace the array with a single stitched image
                      const stitchedProductImage: ProductImage = {
                        url: uploadResult.url,
                        previewUrl: stitchedImage.url,
                        width: stitchedImage.width,
                        height: stitchedImage.height,
                        type: 'stitched',
                        file: blob as File
                      };
                      finalImages = [stitchedProductImage];
                      
                      resolve();
                    } else {
                      reject(new Error('Failed to upload stitched image'));
                    }
                  } else {
                    reject(new Error('Failed to create stitched blob'));
                  }
                }, 'image/png', 0.95);
              };
              
              img.onerror = reject;
              img.src = stitchedImage.url;
            });
          } catch (error) {
            console.warn('Failed to stitch images, using individual images:', error);
          }
        }

        const newImageSet: ProductImageSet = {
          images: finalImages,
          isComplete: true
        };

        setImages(newImageSet);
        onImagesChange(newImageSet);

      } catch (error) {
        console.error('Upload failed:', error);
        alert('Upload failed. Please try again.');
      }
    });
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
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
    const newImages = images.images.filter((_, i) => i !== index);
    const newImageSet: ProductImageSet = {
      images: newImages,
      isComplete: newImages.length > 0
    };
    setImages(newImageSet);
    onImagesChange(newImageSet);
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`upload-zone ${isDragOver ? 'dragover' : ''} ${
          isPending ? 'opacity-50 pointer-events-none' : ''
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <div className="text-center space-y-4">
          {isPending ? (
            <>
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Uploading...</h3>
                <p className="text-muted-foreground">Please wait while we process your images</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="text-lg font-semibold">
                  {images.images.length > 0 ? 'Add More Images' : 'Upload 1-2 high-quality images of your product for best results'}
                </h3>
                <p className="text-muted-foreground">
                  Drag and drop your images here, or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports JPG, PNG • Max 2 images • 10MB each
                </p>
              </div>
              <Button variant="outline" className="mt-4">
                Choose Files
              </Button>
            </>
          )}
        </div>
      </div>

      <input
        id="file-input"
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Preview Grid */}
      {images.images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold">Uploaded Images</h4>
            <Badge variant="secondary">
              {images.images.length} image{images.images.length > 1 ? 's' : ''}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {images.images.map((image, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative group">
                    <div className="aspect-square">
                      <img
                        src={image.previewUrl || image.url}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeImage(index)}
                      >
                        Remove
                      </Button>
                    </div>

                    {/* Type Badge */}
                    <Badge 
                      className="absolute top-2 left-2"
                      variant={image.type === 'stitched' ? 'default' : 'secondary'}
                    >
                      {image.type === 'stitched' ? '🔗 Combined' : `📷 Image ${index + 1}`}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
