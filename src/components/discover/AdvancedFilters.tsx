import { useState } from "react";
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/contexts/LanguageContext";

const GAME_CATEGORIES = [
  { value: "strategy", labelFr: "Stratégie" },
  { value: "adventure", labelFr: "Aventure" },
  { value: "family", labelFr: "Famille" },
  { value: "party", labelFr: "Ambiance" },
  { value: "cooperative", labelFr: "Coopératif" },
  { value: "horror", labelFr: "Horreur" },
  { value: "fantasy", labelFr: "Fantastique" },
  { value: "scifi", labelFr: "Science-fiction" },
  { value: "war", labelFr: "Guerre" },
  { value: "cards", labelFr: "Cartes" },
  { value: "dice", labelFr: "Dés" },
  { value: "puzzle", labelFr: "Puzzle" },
  { value: "trivia", labelFr: "Culture générale" },
  { value: "rpg", labelFr: "Jeu de rôle" },
  { value: "other", labelFr: "Autre" },
];

const CONDITIONS = [
  { value: "Comme neuf", label: "Comme neuf" },
  { value: "Excellent", label: "Excellent" },
  { value: "Très bon", label: "Très bon" },
  { value: "Bon", label: "Bon" },
  { value: "Correct", label: "Correct" },
];

export interface AdvancedFilterState {
  categories: string[];
  priceRange: [number, number];
  conditions: string[];
}

interface AdvancedFiltersProps {
  filters: AdvancedFilterState;
  onFiltersChange: (filters: AdvancedFilterState) => void;
}

export const defaultAdvancedFilters: AdvancedFilterState = {
  categories: [],
  priceRange: [0, 200],
  conditions: [],
};

export const AdvancedFilters = ({ filters, onFiltersChange }: AdvancedFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();

  const activeCount =
    filters.categories.length +
    filters.conditions.length +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 200 ? 1 : 0);

  const toggleCategory = (value: string) => {
    const updated = filters.categories.includes(value)
      ? filters.categories.filter((c) => c !== value)
      : [...filters.categories, value];
    onFiltersChange({ ...filters, categories: updated });
  };

  const toggleCondition = (value: string) => {
    const updated = filters.conditions.includes(value)
      ? filters.conditions.filter((c) => c !== value)
      : [...filters.conditions, value];
    onFiltersChange({ ...filters, conditions: updated });
  };

  const resetFilters = () => onFiltersChange(defaultAdvancedFilters);

  return (
    <div className="space-y-3">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-sm font-medium"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filtres avancés
        {activeCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
            {activeCount}
          </span>
        )}
        {isOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
      </button>

      {isOpen && (
        <div className="bg-card rounded-2xl border border-border p-4 space-y-5 animate-fade-in">
          {/* Categories */}
          <div>
            <p className="text-sm font-semibold mb-2">Catégorie</p>
            <div className="flex flex-wrap gap-2">
              {GAME_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => toggleCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filters.categories.includes(cat.value)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat.labelFr}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div>
            <p className="text-sm font-semibold mb-2">
              Prix : {filters.priceRange[0]}€ — {filters.priceRange[1]}€{filters.priceRange[1] >= 200 ? "+" : ""}
            </p>
            <Slider
              min={0}
              max={200}
              step={5}
              value={filters.priceRange}
              onValueChange={(v) => onFiltersChange({ ...filters, priceRange: v as [number, number] })}
              className="mt-2"
            />
          </div>

          {/* Condition */}
          <div>
            <p className="text-sm font-semibold mb-2">État</p>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map((cond) => (
                <button
                  key={cond.value}
                  onClick={() => toggleCondition(cond.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filters.conditions.includes(cond.value)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cond.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reset */}
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground">
              <X className="h-3.5 w-3.5 mr-1" />
              Réinitialiser les filtres
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
