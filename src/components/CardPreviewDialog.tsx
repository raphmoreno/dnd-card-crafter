import { Monster } from "@/types/monster";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatBlock } from "./StatBlock";
import { getMonsterImageUrl, addImageToCache } from "@/lib/monster-images";
import { generateMonsterImage } from "@/lib/monster-images-api";
import { trackImageRegeneration } from "@/lib/analytics";
import { Image as ImageIcon, RefreshCw, Check, X, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { getModifier, formatSpeed, formatSavingThrows, formatSkills } from "@/lib/open5e";

interface CardPreviewDialogProps {
  monster: Monster;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Larger StatBlock variant for dialog preview
function StatBlockLarge({ monster }: { monster: Monster }) {
  const savingThrows = formatSavingThrows(monster);
  const skills = formatSkills(monster.skills);

  return (
    <div className="text-sm leading-relaxed text-gray-900 space-y-2">
      {/* Name and Type */}
      <div className="border-b-2 border-red-600 pb-2">
        <h3 className="text-xl font-bold text-red-700 mb-1">{monster.name}</h3>
        <p className="italic text-sm text-gray-600">
          {monster.size} {monster.type}
          {monster.subtype && ` (${monster.subtype})`}, {monster.alignment}
        </p>
      </div>

      {/* Basic Stats */}
      <div className="space-y-1 text-sm">
        <p><span className="font-bold">Armor Class:</span> {monster.armor_class}</p>
        <p><span className="font-bold">Hit Points:</span> {monster.hit_points}</p>
        <p><span className="font-bold">Speed:</span> {formatSpeed(monster.speed)}</p>
      </div>

      {/* Ability Scores */}
      <div className="border-t border-gray-300 pt-2 mt-2" />
      <div className="grid grid-cols-6 gap-2 text-center py-2">
        {[
          { label: "STR", value: monster.strength },
          { label: "DEX", value: monster.dexterity },
          { label: "CON", value: monster.constitution },
          { label: "INT", value: monster.intelligence },
          { label: "WIS", value: monster.wisdom },
          { label: "CHA", value: monster.charisma },
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="text-xs font-bold text-gray-700">{label}</div>
            <div className="text-sm">{value} ({getModifier(value)})</div>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-300 pt-2 mt-2" />

      {/* Secondary Stats */}
      <div className="space-y-1 text-sm">
        {savingThrows && <p><span className="font-bold">Saving Throws:</span> {savingThrows}</p>}
        {skills && <p><span className="font-bold">Skills:</span> {skills}</p>}
        {monster.damage_resistances && <p><span className="font-bold">Damage Resistances:</span> {monster.damage_resistances}</p>}
        {monster.damage_immunities && <p><span className="font-bold">Damage Immunities:</span> {monster.damage_immunities}</p>}
        {monster.senses && <p><span className="font-bold">Senses:</span> {monster.senses}</p>}
        {monster.languages && <p><span className="font-bold">Languages:</span> {monster.languages}</p>}
        <p><span className="font-bold">Challenge Rating:</span> {monster.challenge_rating}</p>
      </div>

      {/* Special Abilities */}
      {monster.special_abilities && monster.special_abilities.length > 0 && (
        <>
          <div className="border-t border-red-600 pt-2 mt-3" />
          <div className="space-y-2 text-sm">
            <h4 className="font-bold text-red-700 text-base uppercase tracking-wide">Special Abilities</h4>
            {monster.special_abilities.map((ability, index) => (
              <p key={index}>
                <span className="font-bold italic">{ability.name}.</span> {ability.desc}
              </p>
            ))}
          </div>
        </>
      )}

      {/* Actions */}
      {monster.actions && monster.actions.length > 0 && (
        <>
          <div className="border-t border-red-600 pt-2 mt-3" />
          <div className="space-y-2 text-sm">
            <h4 className="font-bold text-red-700 text-base uppercase tracking-wide">Actions</h4>
            {monster.actions.map((action, index) => (
              <p key={index}>
                <span className="font-bold italic">{action.name}.</span> {action.desc}
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function CardPreviewDialog({ monster, open, onOpenChange }: CardPreviewDialogProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(getMonsterImageUrl(monster.name));
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [showValidationButtons, setShowValidationButtons] = useState(false);
  const [imageKey, setImageKey] = useState(0);

  // Sync with cache when monster changes or dialog opens
  useEffect(() => {
    if (open) {
      const cachedUrl = getMonsterImageUrl(monster.name);
      setImageUrl(cachedUrl);
      // Reset regeneration state when dialog opens
      setPendingImageUrl(null);
      setShowValidationButtons(false);
      setOriginalImageUrl(null);
      setImageKey(prev => prev + 1);
    }
  }, [monster.name, open]);

  // Store original image when we get one
  useEffect(() => {
    if (imageUrl && !originalImageUrl && !pendingImageUrl) {
      setOriginalImageUrl(imageUrl);
    }
  }, [imageUrl, originalImageUrl, pendingImageUrl]);

  const handleRegenerate = async () => {
    if (isGenerating) return;
    
    // Track regeneration attempt
    trackImageRegeneration(monster.name);
    
    // Store current displayed image as original in case we need to revert
    const currentDisplayUrl = pendingImageUrl || imageUrl;
    if (currentDisplayUrl) {
      setOriginalImageUrl(currentDisplayUrl);
    }
    
    setIsGenerating(true);
    try {
      const newUrl = await generateMonsterImage(monster.name);
      if (newUrl) {
        // Add cache-busting parameter to force browser to load the new image
        const cacheBustedUrl = newUrl + (newUrl.includes('?') ? '&' : '?') + `t=${Date.now()}`;
        setPendingImageUrl(cacheBustedUrl);
        setShowValidationButtons(true);
        setImageKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Failed to regenerate image:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = async () => {
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
        // Add to runtime cache immediately
        addImageToCache(monster.name, pendingImageUrl);
        setImageUrl(pendingImageUrl);
        setOriginalImageUrl(pendingImageUrl);
        setPendingImageUrl(null);
        setShowValidationButtons(false);
        setImageKey(prev => prev + 1);
      } else {
        console.error('Failed to save image');
      }
    } catch (error) {
      console.error('Error saving image:', error);
    }
  };

  const handleReject = () => {
    // Revert to original image (the one before regeneration started)
    // If we have an originalImageUrl, use it; otherwise keep current imageUrl
    if (originalImageUrl) {
      setImageUrl(originalImageUrl);
    }
    setPendingImageUrl(null);
    setShowValidationButtons(false);
    setImageKey(prev => prev + 1);
  };

  const displayImageUrl = pendingImageUrl || imageUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{monster.name} - Card Preview</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {/* Side-by-side layout: Image on left, Stat Block on right */}
          <div className="flex gap-6 items-start">
            {/* Image Section */}
            <div className="flex-shrink-0 w-1/2">
              <div className="rounded-lg border-2 border-gray-300 bg-gray-50 p-4">
                <div 
                  className="rounded-lg overflow-hidden bg-gradient-to-br from-parchment-dark to-parchment relative"
                  style={{ 
                    aspectRatio: '1024/1536',
                    width: '100%',
                    maxWidth: '400px'
                  }}
                >
                  {/* Regenerate controls - top right corner */}
                  <div className="absolute top-2 right-2 z-20 flex gap-1 flex-col">
                    {!showValidationButtons && !isGenerating && displayImageUrl && (
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 opacity-90 hover:opacity-100 bg-white/90 hover:bg-white"
                        onClick={handleRegenerate}
                        title="Regenerate image"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    {showValidationButtons && (
                      <>
                        <Button
                          variant="default"
                          size="icon"
                          className="h-8 w-8 bg-green-600 hover:bg-green-700 opacity-90 hover:opacity-100"
                          onClick={handleAccept}
                          title="Accept this image"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8 opacity-90 hover:opacity-100"
                          onClick={handleReject}
                          title="Reject and keep previous"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 opacity-90 hover:opacity-100 bg-white/90 hover:bg-white"
                          onClick={handleRegenerate}
                          title="Regenerate again"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {isGenerating && (
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 opacity-90 bg-white/90"
                        disabled
                      >
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </Button>
                    )}
                  </div>

                  {/* Loading overlay */}
                  {isGenerating && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20">
                      <div className="animate-spin rounded-full border-2 border-white/30 border-t-white w-8 h-8"></div>
                    </div>
                  )}

                  {displayImageUrl ? (
                    <img
                      key={imageKey}
                      src={displayImageUrl}
                      alt={monster.name}
                      className={`w-full h-full object-cover ${pendingImageUrl ? 'opacity-80' : ''}`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                        <p className="text-sm">No image available</p>
                      </div>
                    </div>
                  )}

                  {/* Overlay indicator when showing pending image */}
                  {pendingImageUrl && (
                    <div className="absolute inset-0 border-2 border-yellow-400 border-dashed z-10 pointer-events-none" />
                  )}
                </div>
              </div>
            </div>

            {/* Stat Block Section */}
            <div className="flex-1 min-w-0">
              <div className="rounded-lg border-2 border-gray-300 bg-white p-4">
                <div className="bg-parchment rounded p-4 border border-gray-200">
                  <StatBlockLarge monster={monster} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

