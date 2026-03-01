import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { FilterTabs } from "@/components/discover/FilterTabs";
import { GameGrid } from "@/components/discover/GameGrid";
import { AdvancedFilters, defaultAdvancedFilters, type AdvancedFilterState } from "@/components/discover/AdvancedFilters";
import { useLanguage } from "@/contexts/LanguageContext";

const Discover = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterState>(defaultAdvancedFilters);
  const { t } = useLanguage();

  return (
    <MainLayout onSearch={setSearchQuery}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Filter Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-0.5 bg-primary rounded-full" />
            <span className="text-sm font-bold text-primary uppercase tracking-wide">
              {t("discover.filters")}
            </span>
          </div>
          <FilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} />
          <div className="mt-3">
            <AdvancedFilters filters={advancedFilters} onFiltersChange={setAdvancedFilters} />
          </div>
        </div>

        {/* Game Grid */}
        <GameGrid searchQuery={searchQuery} filter={activeFilter} advancedFilters={advancedFilters} />
      </div>
    </MainLayout>
  );
};

export default Discover;
