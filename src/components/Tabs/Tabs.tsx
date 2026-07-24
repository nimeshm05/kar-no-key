"use client";

import "./Tabs.css";

export type TabItem = {
  id: string;
  label: string;
};

type TabsProps = {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  "aria-label"?: string;
};

export default function Tabs({
  items,
  value,
  onChange,
  className,
  "aria-label": ariaLabel = "Tabs",
}: TabsProps) {
  const rootClasses = ["tabs", className].filter(Boolean).join(" ");

  return (
    <div className={rootClasses} role="tablist" aria-label={ariaLabel}>
      {items.map((item) => {
        const isSelected = item.id === value;
        const tabClasses = [
          "tabs__tab",
          "text-button-label",
          isSelected && "tabs__tab--selected",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            className={tabClasses}
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
