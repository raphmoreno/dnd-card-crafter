import { useState } from "react";
import { Monster } from "@/types/monster";
import { MonsterSearch } from "@/components/MonsterSearch";
import { SelectedMonsters } from "@/components/SelectedMonsters";
import { CardGrid } from "@/components/CardGrid";
import { PDFGenerator } from "@/components/PDFGenerator";
import { CustomCardForm } from "@/components/CustomCardForm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart3, FileText, Eye, Plus } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [selectedMonsters, setSelectedMonsters] = useState<Monster[]>([]);
  const [activeTab, setActiveTab] = useState("search");

  const handleAddMonster = (monster: Monster, quantity: number = 1) => {
    // Add the monster the specified number of times
    const newMonsters: Monster[] = [];
    for (let i = 0; i < quantity; i++) {
      newMonsters.push(monster);
    }
    setSelectedMonsters((prev) => [...prev, ...newMonsters]);
    
    // Show success toast
    if (quantity === 1) {
      toast.success(`${monster.name} added to selection`);
    } else {
      toast.success(`${quantity}x ${monster.name} added to selection`);
    }
  };

  const handleRemoveMonster = (slug: string) => {
    setSelectedMonsters((prev) => prev.filter((m) => m.slug !== slug));
  };

  const handleClearAll = () => {
    setSelectedMonsters([]);
  };

  const handleUpdateQuantity = (slug: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveMonster(slug);
      return;
    }
    
    const monster = selectedMonsters.find(m => m.slug === slug);
    if (!monster) return;

    const currentCount = selectedMonsters.filter(m => m.slug === slug).length;
    const difference = quantity - currentCount;

    if (difference > 0) {
      // Add more
      const newMonsters: Monster[] = [];
      for (let i = 0; i < difference; i++) {
        newMonsters.push(monster);
      }
      setSelectedMonsters((prev) => [...prev, ...newMonsters]);
    } else if (difference < 0) {
      // Remove some
      let removed = 0;
      setSelectedMonsters((prev) => 
        prev.filter((m) => {
          if (m.slug === slug && removed < Math.abs(difference)) {
            removed++;
            return false;
          }
          return true;
        })
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 justify-center">
            <div className="p-2 bg-red-50 rounded-lg">
              <svg className="h-8 w-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                {/* Dice 1 */}
                <rect x="2" y="2" width="8" height="8" rx="1" fill="currentColor" opacity="0.8"/>
                <circle cx="6" cy="6" r="1" fill="white"/>
                {/* Dice 2 */}
                <rect x="14" y="2" width="8" height="8" rx="1" fill="currentColor" opacity="0.8"/>
                <circle cx="16" cy="4" r="0.8" fill="white"/>
                <circle cx="20" cy="8" r="0.8" fill="white"/>
              </svg>
            </div>
            <div className="text-center">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900">
                D&D Monster Card Generator
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Create printable tent cards for your D&D 5e monsters. Search, select, and export professional cards showing monster images to players and stat blocks to you.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent border-b-0 h-auto p-0 gap-0">
              <TabsTrigger 
                value="search" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:text-red-600 px-6 py-4"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Search
              </TabsTrigger>
              <TabsTrigger 
                value="custom" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:text-red-600 px-6 py-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Custom Card
              </TabsTrigger>
              <TabsTrigger 
                value="selected" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:text-red-600 px-6 py-4"
              >
                <FileText className="h-4 w-4 mr-2" />
                Selected ({selectedMonsters.length})
              </TabsTrigger>
              <TabsTrigger 
                value="preview" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:text-red-600 px-6 py-4"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Search Tab */}
          <TabsContent value="search" className="mt-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <MonsterSearch
                onAddMonster={handleAddMonster}
                selectedMonsters={selectedMonsters}
              />
            </div>
          </TabsContent>

          {/* Custom Card Tab */}
          <TabsContent value="custom" className="mt-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <CustomCardForm onAddCard={handleAddMonster} />
            </div>
          </TabsContent>

          {/* Selected Tab */}
          <TabsContent value="selected" className="mt-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <SelectedMonsters
                monsters={selectedMonsters}
                onRemove={handleRemoveMonster}
                onClear={handleClearAll}
                onUpdateQuantity={handleUpdateQuantity}
              />
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="mt-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <PDFGenerator monsters={selectedMonsters} />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
          <p>
            Monster data from{" "}
            <a
              href="https://open5e.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-600 hover:underline"
            >
              Open5e
            </a>
            . Cards optimized for A4 landscape printing (4 per page).
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
