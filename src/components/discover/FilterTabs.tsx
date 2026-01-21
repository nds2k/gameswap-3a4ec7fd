interface FilterTabsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const filters = [
  { id: "all", label: "Tout" },
  { id: "sale", label: "Vente" },
  { id: "trade", label: "Échange" },
  { id: "showcase", label: "Présentation" },
];

export const FilterTabs = ({ activeFilter, onFilterChange }: FilterTabsProps) => {
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
          {filter.label}
        </button>
      ))}
    </div>
  );
};
