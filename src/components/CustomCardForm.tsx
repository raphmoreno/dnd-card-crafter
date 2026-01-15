import { useState } from "react";
import { Monster } from "@/types/monster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, Plus, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addImageToCache } from "@/lib/monster-images";

interface CustomCardFormProps {
  onAddCard: (monster: Monster, quantity?: number) => void;
}

export function CustomCardForm({ onAddCard }: CustomCardFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    size: "Medium",
    type: "humanoid",
    subtype: "",
    alignment: "neutral",
    armor_class: 10,
    hit_points: 10,
    hit_dice: "1d8",
    challenge_rating: "0",
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    walk: 30,
    fly: 0,
    swim: 0,
    languages: "Common",
    senses: "passive Perception 10",
    damage_resistances: "",
    damage_immunities: "",
    damage_vulnerabilities: "",
    condition_immunities: "",
    actions: "",
    special_abilities: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [aiDescription, setAiDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleAiGenerate = async (cardType: "monster" | "npc") => {
    if (!aiDescription.trim()) {
      toast.error("Please enter a description for AI generation");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: aiDescription,
          cardType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate card");
      }

      const data = await response.json();
      const { monster, image } = data;

      // Populate form with AI-generated data
      setFormData({
        name: monster.name || "",
        size: monster.size || "Medium",
        type: monster.type || (cardType === "monster" ? "beast" : "humanoid"),
        subtype: monster.subtype || "",
        alignment: monster.alignment || "neutral",
        armor_class: monster.armor_class || 10,
        hit_points: monster.hit_points || 10,
        hit_dice: monster.hit_dice || "1d8",
        challenge_rating: monster.challenge_rating || "0",
        strength: monster.strength || 10,
        dexterity: monster.dexterity || 10,
        constitution: monster.constitution || 10,
        intelligence: monster.intelligence || 10,
        wisdom: monster.wisdom || 10,
        charisma: monster.charisma || 10,
        walk: monster.speed?.walk || 30,
        fly: monster.speed?.fly || 0,
        swim: monster.speed?.swim || 0,
        languages: monster.languages || "Common",
        senses: monster.senses || "passive Perception 10",
        damage_resistances: monster.damage_resistances || "",
        damage_immunities: monster.damage_immunities || "",
        damage_vulnerabilities: monster.damage_vulnerabilities || "",
        condition_immunities: monster.condition_immunities || "",
        actions: monster.actions
          ? monster.actions.map((a: { name: string; desc: string }) => `${a.name}: ${a.desc}`).join("\n")
          : "",
        special_abilities: monster.special_abilities
          ? monster.special_abilities.map((a: { name: string; desc: string }) => `${a.name}: ${a.desc}`).join("\n")
          : "",
      });

      // Set image if generated (clear any previously uploaded file)
      if (image) {
        setImageFile(null);
        setImagePreview(image);
        // Add to cache so it displays correctly
        addImageToCache(monster.name, image);
      }

      toast.success(`${cardType === "monster" ? "Monster" : "NPC"} card generated successfully!`);
    } catch (error) {
      console.error("Error generating card:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate card");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSlug = (name: string): string => {
    return `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
  };

  const createMonster = (): Monster | null => {
    if (!formData.name.trim()) {
      toast.error("Please enter a name for your custom card");
      return null;
    }

    // Convert image to data URL if provided
    let imageUrl: string | null = null;
    if (imagePreview) {
      imageUrl = imagePreview;
      // Add to cache so MonsterCard can find it
      addImageToCache(formData.name.trim(), imagePreview);
    }

    // Parse actions if provided
    const actions: Monster["actions"] = [];
    if (formData.actions.trim()) {
      const actionLines = formData.actions.split("\n").filter((line) => line.trim());
      actionLines.forEach((line) => {
        const colonIndex = line.indexOf(":");
        if (colonIndex > 0) {
          actions.push({
            name: line.substring(0, colonIndex).trim(),
            desc: line.substring(colonIndex + 1).trim(),
          });
        } else {
          actions.push({
            name: "Action",
            desc: line.trim(),
          });
        }
      });
    }

    // Parse special abilities if provided
    const special_abilities: Monster["special_abilities"] = [];
    if (formData.special_abilities.trim()) {
      const abilityLines = formData.special_abilities.split("\n").filter((line) => line.trim());
      abilityLines.forEach((line) => {
        const colonIndex = line.indexOf(":");
        if (colonIndex > 0) {
          special_abilities.push({
            name: line.substring(0, colonIndex).trim(),
            desc: line.substring(colonIndex + 1).trim(),
          });
        } else {
          special_abilities.push({
            name: "Special Ability",
            desc: line.trim(),
          });
        }
      });
    }

    // Build speed object
    const speed: Monster["speed"] = {};
    if (formData.walk > 0) speed.walk = formData.walk;
    if (formData.fly > 0) speed.fly = formData.fly;
    if (formData.swim > 0) speed.swim = formData.swim;

    // Calculate CR as number
    const cr = parseFloat(formData.challenge_rating) || 0;

    const monster: Monster = {
      slug: generateSlug(formData.name),
      name: formData.name.trim(),
      size: formData.size,
      type: formData.type,
      subtype: formData.subtype || "",
      alignment: formData.alignment,
      armor_class: formData.armor_class,
      armor_desc: "",
      hit_points: formData.hit_points,
      hit_dice: formData.hit_dice,
      speed,
      strength: formData.strength,
      dexterity: formData.dexterity,
      constitution: formData.constitution,
      intelligence: formData.intelligence,
      wisdom: formData.wisdom,
      charisma: formData.charisma,
      strength_save: null,
      dexterity_save: null,
      constitution_save: null,
      intelligence_save: null,
      wisdom_save: null,
      charisma_save: null,
      perception: null,
      skills: {},
      damage_vulnerabilities: formData.damage_vulnerabilities || "",
      damage_resistances: formData.damage_resistances || "",
      damage_immunities: formData.damage_immunities || "",
      condition_immunities: formData.condition_immunities || "",
      senses: formData.senses || "",
      languages: formData.languages || "",
      challenge_rating: formData.challenge_rating,
      cr,
      actions,
      bonus_actions: [],
      reactions: [],
      legendary_desc: "",
      legendary_actions: [],
      special_abilities,
      spell_list: [],
      img_main: imageUrl,
      document__slug: "custom",
      document__title: "Custom Cards",
    };

    return monster;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const monster = createMonster();
    if (monster) {
      onAddCard(monster, quantity);
      toast.success(`${quantity}x ${monster.name} added to selection`);
      // Reset form
      setFormData({
        name: "",
        size: "Medium",
        type: "humanoid",
        subtype: "",
        alignment: "neutral",
        armor_class: 10,
        hit_points: 10,
        hit_dice: "1d8",
        challenge_rating: "0",
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
        walk: 30,
        fly: 0,
        swim: 0,
        languages: "Common",
        senses: "passive Perception 10",
        damage_resistances: "",
        damage_immunities: "",
        damage_vulnerabilities: "",
        condition_immunities: "",
        actions: "",
        special_abilities: "",
      });
      setImageFile(null);
      setImagePreview(null);
      setQuantity(1);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Generation Section */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h3 className="font-display text-lg font-semibold text-gray-900">
            AI-Powered Card Generation
          </h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Describe your character or monster in natural language, and AI will generate a complete stat block.
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-description">Description</Label>
            <Textarea
              id="ai-description"
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              placeholder='e.g., "Red dragonborn monk specialized in climbing and mountainous terrain - level 3" or "Monster mix between a Lion and a Mandrake, CR 4 with 165 HP, with 2 actions Dragon breath and Mandrake yell dealing each 2d4+4 fire and sound damage"'
              rows={3}
              disabled={isGenerating}
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={() => handleAiGenerate("monster")}
              disabled={isGenerating || !aiDescription.trim()}
              className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Monster
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={() => handleAiGenerate("npc")}
              disabled={isGenerating || !aiDescription.trim()}
              variant="outline"
              className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate NPC
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Manual Form Section */}
      <div className="border-t pt-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-display text-lg font-semibold text-gray-900">
            Manual Card Creation
          </h3>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column - Basic Info */}
        <div className="space-y-4">
          <h3 className="font-display text-lg font-semibold text-gray-900 border-b pb-2">
            Basic Information
          </h3>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="e.g., Goblin Chief"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Select
                value={formData.size}
                onValueChange={(value) => handleInputChange("size", value)}
              >
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tiny">Tiny</SelectItem>
                  <SelectItem value="Small">Small</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Large">Large</SelectItem>
                  <SelectItem value="Huge">Huge</SelectItem>
                  <SelectItem value="Gargantuan">Gargantuan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                value={formData.type}
                onChange={(e) => handleInputChange("type", e.target.value)}
                placeholder="e.g., humanoid, beast"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subtype">Subtype (optional)</Label>
              <Input
                id="subtype"
                value={formData.subtype}
                onChange={(e) => handleInputChange("subtype", e.target.value)}
                placeholder="e.g., goblinoid"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alignment">Alignment</Label>
              <Select
                value={formData.alignment}
                onValueChange={(value) => handleInputChange("alignment", value)}
              >
                <SelectTrigger id="alignment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lawful good">Lawful Good</SelectItem>
                  <SelectItem value="neutral good">Neutral Good</SelectItem>
                  <SelectItem value="chaotic good">Chaotic Good</SelectItem>
                  <SelectItem value="lawful neutral">Lawful Neutral</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="chaotic neutral">Chaotic Neutral</SelectItem>
                  <SelectItem value="lawful evil">Lawful Evil</SelectItem>
                  <SelectItem value="neutral evil">Neutral Evil</SelectItem>
                  <SelectItem value="chaotic evil">Chaotic Evil</SelectItem>
                  <SelectItem value="unaligned">Unaligned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="armor_class">AC</Label>
              <Input
                id="armor_class"
                type="number"
                min="0"
                value={formData.armor_class}
                onChange={(e) => handleInputChange("armor_class", parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hit_points">HP</Label>
              <Input
                id="hit_points"
                type="number"
                min="1"
                value={formData.hit_points}
                onChange={(e) => handleInputChange("hit_points", parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="challenge_rating">CR</Label>
              <Input
                id="challenge_rating"
                value={formData.challenge_rating}
                onChange={(e) => handleInputChange("challenge_rating", e.target.value)}
                placeholder="e.g., 1/2, 1, 2"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hit_dice">Hit Dice</Label>
            <Input
              id="hit_dice"
              value={formData.hit_dice}
              onChange={(e) => handleInputChange("hit_dice", e.target.value)}
              placeholder="e.g., 2d8+2"
            />
          </div>
        </div>

        {/* Right Column - Stats & Image */}
        <div className="space-y-4">
          <h3 className="font-display text-lg font-semibold text-gray-900 border-b pb-2">
            Ability Scores
          </h3>

          <div className="grid grid-cols-3 gap-4">
            {[
              { key: "strength", label: "STR" },
              { key: "dexterity", label: "DEX" },
              { key: "constitution", label: "CON" },
              { key: "intelligence", label: "INT" },
              { key: "wisdom", label: "WIS" },
              { key: "charisma", label: "CHA" },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type="number"
                  min="1"
                  max="30"
                  value={formData[key as keyof typeof formData] as number}
                  onChange={(e) =>
                    handleInputChange(key, parseInt(e.target.value) || 10)
                  }
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Speed (feet per round)</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="walk" className="text-xs">Walk</Label>
                <Input
                  id="walk"
                  type="number"
                  min="0"
                  value={formData.walk}
                  onChange={(e) => handleInputChange("walk", parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fly" className="text-xs">Fly</Label>
                <Input
                  id="fly"
                  type="number"
                  min="0"
                  value={formData.fly}
                  onChange={(e) => handleInputChange("fly", parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="swim" className="text-xs">Swim</Label>
                <Input
                  id="swim"
                  type="number"
                  min="0"
                  value={formData.swim}
                  onChange={(e) => handleInputChange("swim", parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="languages">Languages</Label>
            <Input
              id="languages"
              value={formData.languages}
              onChange={(e) => handleInputChange("languages", e.target.value)}
              placeholder="e.g., Common, Orcish"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="senses">Senses</Label>
            <Input
              id="senses"
              value={formData.senses}
              onChange={(e) => handleInputChange("senses", e.target.value)}
              placeholder="e.g., darkvision 60 ft."
            />
          </div>
        </div>
      </div>

      {/* Image Upload */}
      <div className="space-y-4">
        <h3 className="font-display text-lg font-semibold text-gray-900 border-b pb-2">
          Card Image
        </h3>
        <div className="space-y-2">
          <Label htmlFor="image">Upload Image (optional)</Label>
          {imagePreview ? (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-xs max-h-48 rounded-lg border border-gray-200"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={removeImage}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <label
                htmlFor="image"
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <Upload className="h-4 w-4" />
                <span>Choose Image</span>
              </label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <span className="text-sm text-gray-500">Max 5MB</span>
            </div>
          )}
        </div>
      </div>

      {/* Optional Fields */}
      <div className="space-y-4">
        <h3 className="font-display text-lg font-semibold text-gray-900 border-b pb-2">
          Optional Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="damage_resistances">Damage Resistances</Label>
            <Input
              id="damage_resistances"
              value={formData.damage_resistances}
              onChange={(e) => handleInputChange("damage_resistances", e.target.value)}
              placeholder="e.g., fire, cold"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="damage_immunities">Damage Immunities</Label>
            <Input
              id="damage_immunities"
              value={formData.damage_immunities}
              onChange={(e) => handleInputChange("damage_immunities", e.target.value)}
              placeholder="e.g., poison"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="actions">
            Actions (one per line, format: "Name: Description")
          </Label>
          <Textarea
            id="actions"
            value={formData.actions}
            onChange={(e) => handleInputChange("actions", e.target.value)}
            placeholder="e.g.,&#10;Scimitar: Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.&#10;Shortbow: Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage."
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="special_abilities">
            Special Abilities (one per line, format: "Name: Description")
          </Label>
          <Textarea
            id="special_abilities"
            value={formData.special_abilities}
            onChange={(e) => handleInputChange("special_abilities", e.target.value)}
            placeholder="e.g.,&#10;Nimble Escape: The goblin can take the Disengage or Hide action as a bonus action on each of its turns."
            rows={3}
          />
        </div>
      </div>

      {/* Quantity and Submit */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-4">
          <Label htmlFor="quantity">Quantity:</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <X className="h-4 w-4" />
            </Button>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 text-center"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button type="submit" className="gap-2">
          <Plus className="h-4 w-4" />
          Add to Print Set
        </Button>
      </div>
    </form>
    </div>
  );
}

