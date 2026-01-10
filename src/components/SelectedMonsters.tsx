import { Monster } from "@/types/monster";
import { X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SelectedMonstersProps {
  monsters: Monster[];
  onRemove: (slug: string) => void;
  onClear: () => void;
}

export function SelectedMonsters({ monsters, onRemove, onClear }: SelectedMonstersProps) {
  if (monsters.length === 0) {
    return null;
  }

  return (
    <div className="bg-secondary/50 rounded-lg p-4 border border-border">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-display text-sm font-semibold text-foreground">
          Selected Creatures ({monsters.length})
        </h3>
        <Button variant="ghost" size="sm" onClick={onClear} className="text-xs">
          Clear All
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {monsters.map((monster) => (
          <div
            key={monster.slug}
            className="flex items-center gap-1 bg-background rounded-md px-2 py-1 border border-border text-sm"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground cursor-move" />
            <span className="text-foreground">{monster.name}</span>
            <span className="text-muted-foreground text-xs">CR {monster.challenge_rating}</span>
            <button
              onClick={() => onRemove(monster.slug)}
              className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
