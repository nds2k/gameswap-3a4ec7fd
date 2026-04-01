import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { GameGrid } from "@/components/discover/GameGrid";
import { AdvancedFilters, defaultAdvancedFilters, type AdvancedFilterState } from "@/components/discover/AdvancedFilters";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterState>(defaultAdvancedFilters);

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Full search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un jeu..."
            className="pl-10 h-11 text-sm rounded-xl"
            autoFocus
          />
        </div>

        {/* Filters */}
        <AdvancedFilters
          filters={advancedFilters}
          onFiltersChange={setAdvancedFilters}
          activeTypeFilter={activeFilter}
          onTypeFilterChange={setActiveFilter}
        />

        {/* Results */}
        <GameGrid searchQuery={searchQuery} filter={activeFilter} advancedFilters={advancedFilters} />
      </div>
    </MainLayout>
  );
};

export default SearchPage;
