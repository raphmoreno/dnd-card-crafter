import { Monster } from "@/types/monster";
import { MonsterCard } from "./MonsterCard";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CardGridProps {
  monsters: Monster[];
  onRemoveMonster: (slug: string) => void;
}

export function CardGrid({ monsters, onRemoveMonster }: CardGridProps) {
  if (monsters.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="font-display text-lg mb-2">No creatures selected</p>
        <p className="text-sm">Search for monsters above to add them to your print sheet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-4 justify-center">
      {monsters.map((monster) => (
        <div key={monster.slug} className="relative group">
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-red-600 hover:bg-red-700"
            onClick={() => onRemoveMonster(monster.slug)}
          >
            <X className="h-3 w-3" />
          </Button>
          <MonsterCard monster={monster} />
        </div>
      ))}
    </div>
  );
}
