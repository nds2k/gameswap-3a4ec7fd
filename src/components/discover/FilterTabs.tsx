import { useLanguage } from "@/contexts/LanguageContext";

interface FilterTabsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export const FilterTabs = ({ activeFilter, onFilterChange }: FilterTabsProps) => {
  const { t } = useLanguage();

  const filters = [
    { id: "all", labelKey: "discover.all" },
    { id: "sale", labelKey: "discover.sale" },
    { id: "trade", labelKey: "discover.trade" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          className={`filter-pill ${
            activeFilter === filter.id
              ? "filter-pill-active"
              : "filter-pill-inactive"
          }`}
        >
          {t(filter.labelKey)}
        </button>
      ))}
    </div>
  );
};
