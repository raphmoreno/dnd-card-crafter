import { Monster } from "@/types/monster";
import { X, Minus, Plus, Trash2, Image as ImageIcon, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo, useState, useEffect } from "react";
import { getMonsterImageUrl, addImageToCache } from "@/lib/monster-images";
import { generateMonsterImageWithCache } from "@/lib/monster-images-api";
import { CardPreviewDialog } from "./CardPreviewDialog";

interface SelectedMonstersProps {
  monsters: Monster[];
  onRemove: (slug: string) => void;
  onClear: () => void;
  onUpdateQuantity?: (slug: string, quantity: number) => void;
}

// Component for individual monster row with image preview
function MonsterRow({ 
  monster, 
  quantity, 
  onRemove, 
  onUpdateQuantity 
}: { 
  monster: Monster; 
  quantity: number;
  onRemove: (slug: string) => void;
  onUpdateQuantity?: (slug: string, quantity: number) => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(getMonsterImageUrl(monster.name));
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imageKey, setImageKey] = useState(0); // Key to force image reload

  // Sync with cache when monster name changes
  useEffect(() => {
    const cachedUrl = getMonsterImageUrl(monster.name);
    setImageUrl(cachedUrl);
  }, [monster.name]);

  // Check if image exists
  const hasImage = imageUrl !== null;
  const displayImageUrl = imageUrl;

  const handleGenerateImage = async () => {
    setIsGenerating(true);
    try {
      const generatedUrl = await generateMonsterImageWithCache(monster.name);
      if (generatedUrl) {
        // Add to runtime cache
        addImageToCache(monster.name, generatedUrl);
        // Add cache-busting parameter to force browser to load the new image
        const cacheBustedUrl = generatedUrl + (generatedUrl.includes('?') ? '&' : '?') + `t=${Date.now()}`;
        setImageUrl(cacheBustedUrl);
        // Force image reload by updating key
        setImageKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors">
      {/* Image Preview - Vertical format with 2:3 aspect ratio (matching generated images) */}
      <div className="w-16 h-24 rounded-lg border border-gray-200 bg-gray-100 flex-shrink-0 mr-4 overflow-hidden flex items-center justify-center">
        {isGenerating ? (
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        ) : displayImageUrl ? (
          <img 
            key={imageKey}
            src={displayImageUrl} 
            alt={monster.name}
            className="w-full h-full object-cover"
            onLoad={() => {
              // Image loaded successfully
            }}
            onError={(e) => {
              // Hide broken images
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <ImageIcon className="h-5 w-5 mb-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateImage}
              className="text-xs h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Generate
            </Button>
          </div>
        )}
      </div>

      {/* Monster Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-display font-semibold text-gray-900 mb-1">
          {monster.name}
        </h4>
        <div className="flex gap-2 flex-wrap">
          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
            {monster.size}
          </span>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
            {monster.type}
          </span>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
            CR {monster.challenge_rating}
          </span>
        </div>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-2 ml-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          onClick={() => setPreviewOpen(true)}
          title="Preview card"
        >
          <Search className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onUpdateQuantity?.(monster.slug, quantity - 1)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-12 text-center font-medium text-gray-900">{quantity}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onUpdateQuantity?.(monster.slug, quantity + 1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => onRemove(monster.slug)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Card Preview Dialog */}
      <CardPreviewDialog
        monster={monster}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}

export function SelectedMonsters({ monsters, onRemove, onClear, onUpdateQuantity }: SelectedMonstersProps) {
  // Group monsters by slug and count quantities
  const groupedMonsters = useMemo(() => {
    const grouped: Array<{ monster: Monster; quantity: number }> = [];
    const seen = new Map<string, number>();

    monsters.forEach((monster) => {
      const count = seen.get(monster.slug) || 0;
      seen.set(monster.slug, count + 1);
    });

    seen.forEach((quantity, slug) => {
      const monster = monsters.find((m) => m.slug === slug);
      if (monster) {
        grouped.push({ monster, quantity });
      }
    });

    return grouped;
  }, [monsters]);

  if (monsters.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="font-display text-lg mb-2">No monsters selected</p>
        <p className="text-sm">Search for monsters to add them to your collection</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display text-lg font-semibold text-gray-900">
          Selected Monsters ({monsters.length} card{monsters.length !== 1 ? "s" : ""})
        </h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClear}
          className="text-gray-600 hover:text-gray-900"
        >
          Clear All
        </Button>
      </div>
      <div className="space-y-2">
        {groupedMonsters.map(({ monster, quantity }) => (
          <MonsterRow
            key={monster.slug}
            monster={monster}
            quantity={quantity}
            onRemove={onRemove}
            onUpdateQuantity={onUpdateQuantity}
          />
        ))}
      </div>
    </div>
  );
}
