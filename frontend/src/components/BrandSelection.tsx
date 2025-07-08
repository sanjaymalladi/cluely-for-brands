"use client";

import { Brand } from "@/lib/brands";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

interface BrandSelectionProps {
  brands: Brand[];
  selectedBrand: Brand | null;
  onBrandSelect: (brand: Brand) => void;
}

export function BrandSelection({
  brands,
  selectedBrand,
  onBrandSelect,
}: BrandSelectionProps) {
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {brands.map((brand) => (
        <Card
          key={brand.id}
          className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
            selectedBrand?.id === brand.id 
              ? 'ring-2 ring-primary bg-primary/5' 
              : 'hover:bg-muted/50'
          }`}
          onClick={() => onBrandSelect(brand)}
          onMouseEnter={() => setHoveredBrand(brand.id)}
          onMouseLeave={() => setHoveredBrand(null)}
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="w-16 h-16 rounded-lg bg-background border overflow-hidden flex items-center justify-center">
                <img 
                  src={brand.logo} 
                  alt={`${brand.name} logo`}
                  className="w-full h-full object-contain"
                />
              </div>
              {selectedBrand?.id === brand.id && (
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-sm">✓</span>
                </div>
              )}
            </div>
            <div>
              <CardTitle className="text-lg">{brand.name}</CardTitle>
              <CardDescription className="text-sm">{brand.tagline}</CardDescription>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {brand.styleKeywords.slice(0, 3).map((keyword, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
              {brand.styleKeywords.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{brand.styleKeywords.length - 3}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 