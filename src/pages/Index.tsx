import { useState } from "react";
import { Monster } from "@/types/monster";
import { MonsterSearch } from "@/components/MonsterSearch";
import { SelectedMonsters } from "@/components/SelectedMonsters";
import { CardGrid } from "@/components/CardGrid";
import { PDFGenerator } from "@/components/PDFGenerator";
import { Scroll, Sword } from "lucide-react";

const Index = () => {
  const [selectedMonsters, setSelectedMonsters] = useState<Monster[]>([]);

  const handleAddMonster = (monster: Monster) => {
    if (!selectedMonsters.some((m) => m.slug === monster.slug)) {
      setSelectedMonsters((prev) => [...prev, monster]);
    }
  };

  const handleRemoveMonster = (slug: string) => {
    setSelectedMonsters((prev) => prev.filter((m) => m.slug !== slug));
  };

  const handleClearAll = () => {
    setSelectedMonsters([]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-secondary/30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Scroll className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                D&D Monster Card Generator
              </h1>
              <p className="text-muted-foreground text-sm">
                Create printable tent cards for your tabletop sessions
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Search Section */}
        <section className="bg-card rounded-xl p-6 border border-border shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Sword className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-card-foreground">
              Search the Bestiary
            </h2>
          </div>
          <MonsterSearch
            onAddMonster={handleAddMonster}
            selectedMonsters={selectedMonsters}
          />
        </section>

        {/* Selected Monsters */}
        <SelectedMonsters
          monsters={selectedMonsters}
          onRemove={handleRemoveMonster}
          onClear={handleClearAll}
        />

        {/* Card Preview Grid */}
        <section className="bg-card rounded-xl p-6 border border-border shadow-lg">
          <h2 className="font-display text-lg font-semibold text-card-foreground mb-4">
            Card Preview
          </h2>
          <CardGrid 
            monsters={selectedMonsters} 
            onRemoveMonster={handleRemoveMonster} 
          />
        </section>

        {/* PDF Generator */}
        <section className="bg-card rounded-xl p-6 border border-border shadow-lg">
          <PDFGenerator monsters={selectedMonsters} />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary/30 py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>
            Monster data provided by{" "}
            <a
              href="https://open5e.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Open5e
            </a>
            . Fold cards along the middle to create tent cards.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
