import { Monster } from "@/types/monster";
import { StatBlock } from "./StatBlock";
import { addImageToCache } from "@/lib/monster-images";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, X, Loader2 } from "lucide-react";
import { useMonsterImage } from "@/hooks/use-monster-image";

interface MonsterCardProps {
  monster: Monster;
  forPrint?: boolean;
}

export function MonsterCard({ monster, forPrint = false }: MonsterCardProps) {
  // Use centralized image generation hook
  // Only preview cards (forPrint=false) trigger generation
  // Print cards just listen and display results
  const { imageUrl, isGenerating, error, regenerate } = useMonsterImage(
    monster.name,
    forPrint,
    !forPrint // Only preview cards should generate
  );

  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [showValidationButtons, setShowValidationButtons] = useState(false);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Update imageError from hook error state
  useEffect(() => {
    setImageError(error);
  }, [error]);

  // Store original image when we get one
  useEffect(() => {
    if (imageUrl && !originalImageUrl) {
      setOriginalImageUrl(imageUrl);
    }
  }, [imageUrl, originalImageUrl]);

  // Function to regenerate image (only works for preview cards)
  const handleRegenerate = async () => {
    if (isGenerating || forPrint) return;
    
    // Store current image as original in case we need to revert
    if (!originalImageUrl && imageUrl) {
      setOriginalImageUrl(imageUrl);
    }
    
    const newUrl = await regenerate();
    if (newUrl) {
      setPendingImageUrl(newUrl);
      setShowValidationButtons(true);
    } else {
      setImageError(true);
    }
  };

  // Function to validate/save the regenerated image
  const handleValidate = async () => {
    if (!pendingImageUrl) return;
    
    try {
      // Save to database via API
      const response = await fetch('/api/save-monster-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          monsterName: monster.name,
          imageUrl: pendingImageUrl 
        }),
      });

      if (response.ok) {
        // Add to runtime cache immediately so other cards know about it
        addImageToCache(monster.name, pendingImageUrl);
        setOriginalImageUrl(pendingImageUrl);
        setPendingImageUrl(null);
        setShowValidationButtons(false);
        // Update the display URL to the saved one
        // Note: The hook will pick this up on next check via cache
      } else {
        console.error('Failed to save image');
      }
    } catch (error) {
      console.error('Error saving image:', error);
    }
  };

  // Function to reject the regenerated image
  const handleReject = () => {
    // Revert to pending image to null, which will show original imageUrl from hook
    setPendingImageUrl(null);
    setShowValidationButtons(false);
  };

  const displayImageUrl = pendingImageUrl || imageUrl;
  const showImage = displayImageUrl && !imageError;
  
  // For print: width ~72mm (fits 4 on A4 landscape 297mm with minimal gaps), height ~200mm (fills A4 height 210mm)
  // For preview: scaled down version
  const cardStyle = forPrint 
    ? { width: "72mm", height: "200mm" }
    : { width: "100px", height: "280px" };

  return (
    <div 
      className="mtg-card-border rounded-lg p-[4px] flex flex-col relative"
      style={cardStyle}
    >
      {/* Regeneration controls - only show in preview mode */}
      {!forPrint && (
        <div className="absolute top-1 right-1 z-20 flex gap-1 flex-col">
          {!showValidationButtons && !isGenerating && imageUrl && (
            <Button
              variant="secondary"
              size="icon"
              className="h-6 w-6 opacity-80 hover:opacity-100"
              onClick={handleRegenerate}
              title="Regenerate image"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
          {showValidationButtons && (
            <>
              <Button
                variant="default"
                size="icon"
                className="h-6 w-6 bg-green-600 hover:bg-green-700 opacity-90 hover:opacity-100"
                onClick={handleValidate}
                title="Accept this image"
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="h-6 w-6 opacity-90 hover:opacity-100"
                onClick={handleReject}
                title="Reject and revert"
              >
                <X className="h-3 w-3" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-6 w-6 opacity-80 hover:opacity-100"
                onClick={handleRegenerate}
                title="Regenerate again"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </>
          )}
          {isGenerating && (
            <Button
              variant="secondary"
              size="icon"
              className="h-6 w-6 opacity-80"
              disabled
            >
              <Loader2 className="h-3 w-3 animate-spin" />
            </Button>
          )}
        </div>
      )}

      {/* TOP HALF: Image section (upside down for tent fold - players see this) */}
      <div className="card-inner-frame rounded-t flex-1 overflow-hidden upside-down relative">
        {/* Content is already upside-down from parent, so we flip it back for correct display when folded */}
        <div className="upside-down w-full h-full bg-gradient-to-br from-parchment-dark to-parchment flex items-center justify-center relative">
          {isGenerating ? (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="animate-spin rounded-full border-2 border-ink/20 border-t-ink/60 w-8 h-8"></div>
            </div>
          ) : displayImageUrl && !imageError ? (
            <img
              src={displayImageUrl}
              alt={monster.name}
              className={`w-full h-full object-cover ${pendingImageUrl ? 'opacity-80' : ''}`}
              style={forPrint ? { transform: 'rotate(180deg)' } : undefined}
              onError={() => setImageError(true)}
              loading={forPrint ? "eager" : "lazy"}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg 
                className={`${forPrint ? 'w-16 h-16' : 'w-12 h-12'} text-ink/40`}
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
            </div>
          )}
          {/* Overlay indicator when showing pending image */}
          {pendingImageUrl && !forPrint && (
            <div className="absolute inset-0 border-2 border-yellow-400 border-dashed z-10 pointer-events-none" />
          )}
        </div>
      </div>

      {/* Fold line indicator */}
      <div className="h-[2px] bg-ink/20 flex-shrink-0 relative">
        <div className="absolute inset-0 border-t border-dashed border-ink/30" />
      </div>

      {/* BOTTOM HALF: Stat block section (GM sees this) */}
      <div className="card-inner-frame rounded-b flex-1 overflow-hidden px-1.5 py-1">
        <StatBlock monster={monster} />
      </div>
    </div>
  );
}
