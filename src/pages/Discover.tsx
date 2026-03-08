import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { GameGrid } from "@/components/discover/GameGrid";
import { AdvancedFilters, defaultAdvancedFilters, type AdvancedFilterState } from "@/components/discover/AdvancedFilters";
import { useLanguage } from "@/contexts/LanguageContext";
import { Search, ScanLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Discover = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterState>(defaultAdvancedFilters);
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <MainLayout showSearch={false}>
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 sm:py-6">
        {/* Large Search Bar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("discover.searchPlaceholder") || "Rechercher un jeu..."}
              className="pl-10 h-11 text-sm rounded-xl"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-xl shrink-0"
            onClick={() => navigate("/scanner")}
          >
            <ScanLine className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-4">
          <AdvancedFilters
            filters={advancedFilters}
            onFiltersChange={setAdvancedFilters}
            activeTypeFilter={activeFilter}
            onTypeFilterChange={setActiveFilter}
          />
        </div>

        {/* Game Grid */}
        <GameGrid searchQuery={searchQuery} filter={activeFilter} advancedFilters={advancedFilters} />
      </div>
    </MainLayout>
  );
};

export default Discover;
