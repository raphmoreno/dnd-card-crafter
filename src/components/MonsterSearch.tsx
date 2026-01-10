import { useState, useCallback } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchMonsters } from "@/lib/open5e";
import { Monster } from "@/types/monster";
import { useQuery } from "@tanstack/react-query";

interface MonsterSearchProps {
  onAddMonster: (monster: Monster) => void;
  selectedMonsters: Monster[];
}

export function MonsterSearch({ onAddMonster, selectedMonsters }: MonsterSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { data: monsters, isLoading } = useQuery({
    queryKey: ["monsters", debouncedQuery],
    queryFn: () => searchMonsters(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 60000,
  });

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    const timer = setTimeout(() => {
      setDebouncedQuery(value);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const isSelected = (monster: Monster) => 
    selectedMonsters.some(m => m.slug === monster.slug);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search monsters (e.g., goblin, dragon, beholder)..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 bg-secondary border-border"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Searching the bestiary...</span>
        </div>
      )}

      {monsters && monsters.length > 0 && (
        <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-2">
          {monsters.map((monster) => (
            <div
              key={monster.slug}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-colors"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-display font-semibold text-foreground truncate">
                  {monster.name}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {monster.size} {monster.type}
                  {monster.subtype && ` (${monster.subtype})`} • CR {monster.challenge_rating}
                </p>
              </div>
              <Button
                size="sm"
                variant={isSelected(monster) ? "secondary" : "default"}
                onClick={() => onAddMonster(monster)}
                disabled={isSelected(monster)}
                className="ml-3 shrink-0"
              >
                {isSelected(monster) ? (
                  "Added"
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {debouncedQuery.length >= 2 && monsters?.length === 0 && !isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          No creatures found matching "{debouncedQuery}"
        </div>
      )}

      {debouncedQuery.length < 2 && (
        <div className="text-center py-8 text-muted-foreground">
          Enter at least 2 characters to search
        </div>
      )}
    </div>
  );
}
