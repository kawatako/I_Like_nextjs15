// components/component/search/SearchSortTabs.tsx
"use client";

import React from "react";

interface SearchSortTabsProps {
  current: "count" | "new" | "like";
  onChange: (sort: "count" | "new" | "like") => void;
}

const SORT_ITEMS: { key: SearchSortTabsProps["current"]; label: string }[] = [
  { key: "count", label: "件数順" },
  { key: "new", label: "新着順" },
  { key: "like", label: "いいね順" },
];

export default function SearchSortTabs({
  current,
  onChange,
}: SearchSortTabsProps) {
  return (
    <div className="flex border-b">
      {SORT_ITEMS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-4 py-2 -mb-px ${
            current === key
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
