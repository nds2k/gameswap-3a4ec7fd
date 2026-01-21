import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { FilterTabs } from "@/components/discover/FilterTabs";
import { GameGrid } from "@/components/discover/GameGrid";
import { useLanguage } from "@/contexts/LanguageContext";

const Discover = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const { t } = useLanguage();

  return (
    <MainLayout onSearch={setSearchQuery}>
      <div className="container py-6">
        {/* Filter Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-0.5 bg-primary rounded-full" />
            <span className="text-sm font-bold text-primary uppercase tracking-wide">
              {t("discover.filters")}
            </span>
          </div>
          <FilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} />
        </div>

        {/* Game Grid */}
        <GameGrid searchQuery={searchQuery} filter={activeFilter} />
      </div>
    </MainLayout>
  );
};

export default Discover;
