import { useState, useCallback, useMemo, useEffect } from "react";
import { Search, Plus, Loader2, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { searchMonsters } from "@/lib/open5e";
import { Monster } from "@/types/monster";
import { useQuery } from "@tanstack/react-query";

interface MonsterSearchProps {
  onAddMonster: (monster: Monster, quantity?: number) => void;
  selectedMonsters: Monster[];
}

interface Filters {
  crMin: string;
  crMax: string;
  hpMin: string;
  hpMax: string;
  size: string;
  type: string;
}

const SIZES = ["Any", "Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"] as const;
const TYPES = [
  "Any",
  "Aberration",
  "Beast",
  "Celestial",
  "Construct",
  "Dragon",
  "Elemental",
  "Fey",
  "Fiend",
  "Giant",
  "Humanoid",
  "Monstrosity",
  "Ooze",
  "Plant",
  "Undead",
] as const;

export function MonsterSearch({ onAddMonster, selectedMonsters }: MonsterSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    crMin: "",
    crMax: "",
    hpMin: "",
    hpMax: "",
    size: "Any",
    type: "Any",
  });

  const { data: monsters, isLoading } = useQuery({
    queryKey: ["monsters", debouncedQuery],
    queryFn: () => searchMonsters(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 60000,
  });

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Calculate relevance score for sorting
  const getRelevanceScore = useCallback((monster: Monster, query: string): number => {
    if (!query.trim()) return 0;
    
    const queryLower = query.toLowerCase();
    const nameLower = monster.name.toLowerCase();
    
    let score = 0;
    
    // Exact name match (highest priority)
    if (nameLower === queryLower) {
      score += 1000;
    }
    // Name starts with query
    else if (nameLower.startsWith(queryLower)) {
      score += 500;
    }
    // Name contains query
    else if (nameLower.includes(queryLower)) {
      score += 100;
    }
    
    // Bonus for type match
    if (monster.type.toLowerCase().includes(queryLower)) {
      score += 50;
    }
    
    // Bonus for size match
    if (monster.size.toLowerCase().includes(queryLower)) {
      score += 25;
    }
    
    return score;
  }, []);

  // Filter and sort monsters
  const filteredAndSortedMonsters = useMemo(() => {
    if (!monsters) return [];

    let filtered = [...monsters];

    // Apply filters
    if (filters.crMin) {
      const crMin = parseFloat(filters.crMin);
      if (!isNaN(crMin)) {
        filtered = filtered.filter((m) => m.cr >= crMin);
      }
    }
    if (filters.crMax) {
      const crMax = parseFloat(filters.crMax);
      if (!isNaN(crMax)) {
        filtered = filtered.filter((m) => m.cr <= crMax);
      }
    }
    if (filters.hpMin) {
      const hpMin = parseInt(filters.hpMin, 10);
      if (!isNaN(hpMin)) {
        filtered = filtered.filter((m) => m.hit_points >= hpMin);
      }
    }
    if (filters.hpMax) {
      const hpMax = parseInt(filters.hpMax, 10);
      if (!isNaN(hpMax)) {
        filtered = filtered.filter((m) => m.hit_points <= hpMax);
      }
    }
    if (filters.size && filters.size !== "Any") {
      filtered = filtered.filter((m) => m.size === filters.size);
    }
    if (filters.type && filters.type !== "Any") {
      filtered = filtered.filter((m) => m.type === filters.type);
    }

    // Sort by relevance
    if (debouncedQuery.trim()) {
      filtered.sort((a, b) => {
        const scoreA = getRelevanceScore(a, debouncedQuery);
        const scoreB = getRelevanceScore(b, debouncedQuery);
        return scoreB - scoreA;
      });
    }

    return filtered;
  }, [monsters, filters, debouncedQuery, getRelevanceScore]);

  const isSelected = (monster: Monster) => 
    selectedMonsters.some(m => m.slug === monster.slug);

  const handleQuantityChange = (monsterSlug: string, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      setQuantities((prev) => ({ ...prev, [monsterSlug]: Math.min(numValue, 99) }));
    } else if (value === '') {
      setQuantities((prev) => ({ ...prev, [monsterSlug]: 1 }));
    }
  };

  const handleAddMonsterWithQuantity = (monster: Monster) => {
    const quantity = quantities[monster.slug] || 1;
    onAddMonster(monster, quantity);
    // Reset quantity after adding
    setQuantities((prev) => {
      const newQuantities = { ...prev };
      delete newQuantities[monster.slug];
      return newQuantities;
    });
  };

  const getQuantity = (monsterSlug: string) => quantities[monsterSlug] || 1;

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.crMin !== "" ||
      filters.crMax !== "" ||
      filters.hpMin !== "" ||
      filters.hpMax !== "" ||
      filters.size !== "Any" ||
      filters.type !== "Any"
    );
  }, [filters]);

  const resetFilters = () => {
    setFilters({
      crMin: "",
      crMax: "",
      hpMin: "",
      hpMax: "",
      size: "Any",
      type: "Any",
    });
  };

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

      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            type="button"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  Active
                </span>
              )}
            </div>
            {filtersOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4 rounded-lg border bg-secondary/50 p-4">
            <div className="space-y-2">
              <Label htmlFor="cr-min">Challenge Rating (Min)</Label>
              <Input
                id="cr-min"
                type="number"
                placeholder="0"
                min="0"
                step="0.25"
                value={filters.crMin}
                onChange={(e) => updateFilter("crMin", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-max">Challenge Rating (Max)</Label>
              <Input
                id="cr-max"
                type="number"
                placeholder="30"
                min="0"
                step="0.25"
                value={filters.crMax}
                onChange={(e) => updateFilter("crMax", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hp-min">Hit Points (Min)</Label>
              <Input
                id="hp-min"
                type="number"
                placeholder="0"
                min="0"
                value={filters.hpMin}
                onChange={(e) => updateFilter("hpMin", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hp-max">Hit Points (Max)</Label>
              <Input
                id="hp-max"
                type="number"
                placeholder="1000"
                min="0"
                value={filters.hpMax}
                onChange={(e) => updateFilter("hpMax", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Select
                value={filters.size}
                onValueChange={(value) => updateFilter("size", value)}
              >
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={filters.type}
                onValueChange={(value) => updateFilter("type", value)}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="w-full"
            >
              Clear Filters
            </Button>
          )}
        </CollapsibleContent>
      </Collapsible>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Searching the bestiary...</span>
        </div>
      )}

      {filteredAndSortedMonsters.length > 0 && (
        <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-2">
          {filteredAndSortedMonsters.map((monster) => (
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
              <div className="flex items-center gap-2 ml-3 shrink-0">
                {!isSelected(monster) && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="1"
                      max="99"
                      value={getQuantity(monster.slug)}
                      onChange={(e) => handleQuantityChange(monster.slug, e.target.value)}
                      className="w-16 h-8 text-center"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
                <Button
                  size="sm"
                  variant={isSelected(monster) ? "secondary" : "default"}
                  onClick={() => handleAddMonsterWithQuantity(monster)}
                  disabled={isSelected(monster)}
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
            </div>
          ))}
        </div>
      )}

      {debouncedQuery.length >= 2 && 
       monsters && 
       monsters.length > 0 && 
       filteredAndSortedMonsters.length === 0 && 
       !isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          No creatures found matching your filters
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
