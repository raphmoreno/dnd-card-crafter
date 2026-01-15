import { useState, useCallback, useMemo, useEffect, memo } from "react";
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
import { trackSearch, trackMonsterAdded } from "@/lib/analytics";
import { CardPreviewDialog } from "./CardPreviewDialog";

const ITEMS_PER_PAGE = 50;

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

// Memoized monster row component to prevent unnecessary re-renders
const MonsterRow = memo(({ 
  monster, 
  isSelected, 
  quantity, 
  onQuantityChange, 
  onAddMonster 
}: {
  monster: Monster;
  isSelected: boolean;
  quantity: number;
  onQuantityChange: (value: string) => void;
  onAddMonster: () => void;
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between p-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors">
        <div className="flex-1 min-w-0">
          <h4 className="font-display font-semibold text-gray-900 truncate mb-1">
            {monster.name}
          </h4>
          <div className="flex gap-2 flex-wrap mb-1">
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
          <p className="text-sm text-gray-600">
            AC {monster.armor_class} • HP {monster.hit_points}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            onClick={() => setPreviewOpen(true)}
            title="Preview card"
          >
            <Search className="h-4 w-4" />
          </Button>
          {!isSelected && (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min="1"
                max="99"
                value={quantity}
                onChange={(e) => onQuantityChange(e.target.value)}
                className="w-16 h-8 text-center border-gray-300"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <Button
            size="sm"
            variant={isSelected ? "secondary" : "default"}
            onClick={onAddMonster}
            disabled={isSelected}
            className={isSelected ? "bg-gray-200 text-gray-600" : "bg-gray-900 hover:bg-gray-800 text-white"}
          >
            {isSelected ? (
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

      {/* Card Preview Dialog */}
      <CardPreviewDialog
        monster={monster}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </>
  );
});

MonsterRow.displayName = "MonsterRow";

export function MonsterSearch({ onAddMonster, selectedMonsters }: MonsterSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [debouncedFilters, setDebouncedFilters] = useState<Filters>({
    crMin: "",
    crMax: "",
    hpMin: "",
    hpMax: "",
    size: "Any",
    type: "Any",
  });
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
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);

  const { data: monsters, isLoading, error } = useQuery({
    queryKey: ["monsters", debouncedQuery],
    queryFn: () => searchMonsters(debouncedQuery),
    enabled: true, // Always enabled to show all monsters by default
    staleTime: 60000,
    retry: 2, // Retry failed requests twice
    retryDelay: 1000, // Wait 1 second between retries
    onSuccess: (data) => {
      // Track search when results are loaded (only for actual searches, not initial load)
      if (debouncedQuery.length >= 2) {
        trackSearch(debouncedQuery, data?.length || 0);
      }
    },
  });

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setDisplayCount(ITEMS_PER_PAGE); // Reset display count when query changes
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Debounce filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
      setDisplayCount(ITEMS_PER_PAGE); // Reset display count when filters change
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

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

  // Memoize selected monster slugs as a Set for O(1) lookups
  const selectedSlugs = useMemo(() => {
    return new Set(selectedMonsters.map(m => m.slug));
  }, [selectedMonsters]);

  // Filter and sort monsters - optimized single-pass filtering
  const filteredAndSortedMonsters = useMemo(() => {
    if (!monsters) return [];

    // Parse filter values once
    const crMin = debouncedFilters.crMin ? parseFloat(debouncedFilters.crMin) : NaN;
    const crMax = debouncedFilters.crMax ? parseFloat(debouncedFilters.crMax) : NaN;
    const hpMin = debouncedFilters.hpMin ? parseInt(debouncedFilters.hpMin, 10) : NaN;
    const hpMax = debouncedFilters.hpMax ? parseInt(debouncedFilters.hpMax, 10) : NaN;
    const sizeFilter = debouncedFilters.size !== "Any" && debouncedFilters.size !== "" ? debouncedFilters.size : null;
    const typeFilter = debouncedFilters.type !== "Any" && debouncedFilters.type !== "" ? debouncedFilters.type : null;
    const hasQuery = debouncedQuery.trim().length > 0;

    // Single pass filter - more efficient than multiple filter() calls
    const filtered: Monster[] = [];
    for (const monster of monsters) {
      // Apply all filters in a single pass
      if (!isNaN(crMin) && monster.cr < crMin) continue;
      if (!isNaN(crMax) && monster.cr > crMax) continue;
      if (!isNaN(hpMin) && monster.hit_points < hpMin) continue;
      if (!isNaN(hpMax) && monster.hit_points > hpMax) continue;
      if (sizeFilter && monster.size !== sizeFilter) continue;
      if (typeFilter && monster.type !== typeFilter) continue;
      
      filtered.push(monster);
    }

    // Sort by relevance if there's a query, otherwise sort alphabetically
    if (hasQuery) {
      filtered.sort((a, b) => {
        const scoreA = getRelevanceScore(a, debouncedQuery);
        const scoreB = getRelevanceScore(b, debouncedQuery);
        return scoreB - scoreA;
      });
    } else {
      // Sort alphabetically by name when no query
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [monsters, debouncedFilters, debouncedQuery, getRelevanceScore]);

  // Get paginated results
  const paginatedMonsters = useMemo(() => {
    return filteredAndSortedMonsters.slice(0, displayCount);
  }, [filteredAndSortedMonsters, displayCount]);

  const hasMore = filteredAndSortedMonsters.length > displayCount;


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
    // Track analytics
    trackMonsterAdded(monster.name, quantity);
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
      debouncedFilters.crMin !== "" ||
      debouncedFilters.crMax !== "" ||
      debouncedFilters.hpMin !== "" ||
      debouncedFilters.hpMax !== "" ||
      (debouncedFilters.size !== "Any" && debouncedFilters.size !== "") ||
      (debouncedFilters.type !== "Any" && debouncedFilters.type !== "")
    );
  }, [debouncedFilters]);

  const loadMore = useCallback(() => {
    setDisplayCount(prev => prev + ITEMS_PER_PAGE);
  }, []);

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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search monsters..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 bg-white border-gray-300 focus:border-red-500 focus:ring-red-500"
        />
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select
          value={filters.size === "Any" ? "all" : filters.size}
          onValueChange={(value) => updateFilter("size", value === "all" ? "Any" : value)}
        >
          <SelectTrigger className="w-[140px] bg-white border-gray-300">
            <SelectValue placeholder="All Sizes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sizes</SelectItem>
            {SIZES.filter(s => s !== "Any").map((size) => (
              <SelectItem key={size} value={size}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.type === "Any" ? "all" : filters.type}
          onValueChange={(value) => updateFilter("type", value === "all" ? "Any" : value)}
        >
          <SelectTrigger className="w-[140px] bg-white border-gray-300">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TYPES.filter(t => t !== "Any").map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.crMin || filters.crMax ? `${filters.crMin || "0"}-${filters.crMax || "30"}` : "all"}
          onValueChange={(value) => {
            if (value === "all") {
              updateFilter("crMin", "");
              updateFilter("crMax", "");
            } else {
              const [min, max] = value.split("-");
              updateFilter("crMin", min);
              updateFilter("crMax", max);
            }
          }}
        >
          <SelectTrigger className="w-[140px] bg-white border-gray-300">
            <SelectValue placeholder="All CR" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All CR</SelectItem>
            <SelectItem value="0-1">CR 0-1</SelectItem>
            <SelectItem value="2-4">CR 2-4</SelectItem>
            <SelectItem value="5-10">CR 5-10</SelectItem>
            <SelectItem value="11-20">CR 11-20</SelectItem>
            <SelectItem value="21-30">CR 21-30</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="border-gray-300"
          >
            <Filter className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>

      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between border-gray-300"
            type="button"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span>Advanced Filters</span>
              {hasActiveFilters && (
                <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
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
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
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
          <Loader2 className="h-6 w-6 animate-spin text-red-600" />
          <span className="ml-2 text-gray-600">
            {debouncedQuery ? "Searching the bestiary..." : "Loading all monsters..."}
          </span>
        </div>
      )}

      {error && (
        <div className="text-center py-8">
          <p className="text-red-600 font-semibold mb-2">Error loading monsters</p>
          <p className="text-sm text-gray-600 mb-4">
            {error instanceof Error ? error.message : "Failed to fetch monsters from the API"}
          </p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="text-sm"
          >
            Reload Page
          </Button>
        </div>
      )}

      {paginatedMonsters.length > 0 && (
        <>
          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2">
            {paginatedMonsters.map((monster) => (
              <MonsterRow
                key={monster.slug}
                monster={monster}
                isSelected={selectedSlugs.has(monster.slug)}
                quantity={getQuantity(monster.slug)}
                onQuantityChange={(value) => handleQuantityChange(monster.slug, value)}
                onAddMonster={() => handleAddMonsterWithQuantity(monster)}
              />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={loadMore}
                className="border-gray-300"
              >
                Load More ({filteredAndSortedMonsters.length - displayCount} remaining)
              </Button>
            </div>
          )}
          {filteredAndSortedMonsters.length > 0 && (
            <div className="text-center text-sm text-gray-500 pt-2">
              Showing {paginatedMonsters.length} of {filteredAndSortedMonsters.length} monsters
            </div>
          )}
        </>
      )}

      {debouncedQuery.length >= 2 && 
       monsters && 
       monsters.length > 0 && 
       filteredAndSortedMonsters.length === 0 && 
       !isLoading && (
        <div className="text-center py-8 text-gray-500">
          No creatures found matching your filters
        </div>
      )}

      {debouncedQuery.length >= 2 && monsters?.length === 0 && !isLoading && (
        <div className="text-center py-8 text-gray-500">
          No creatures found matching "{debouncedQuery}"
        </div>
      )}

      {!isLoading && monsters && monsters.length === 0 && debouncedQuery.length < 2 && (
        <div className="text-center py-8 text-gray-500">
          Loading monsters...
        </div>
      )}
    </div>
  );
}
