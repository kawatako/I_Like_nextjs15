// components/component/search/SearchTabs.tsx
"use client";

import React from "react";

interface SearchTabsProps {
  current: "title" | "item" | "tag"|"user";
  onChange: (tab: "title" | "item" | "tag"|"user") => void;
}

const TAB_ITEMS: { key: SearchTabsProps["current"]; label: string }[] = [
  { key: "title", label: "タイトル" },
  { key: "item", label: "アイテム" },
  { key: "tag", label: "タグ" },
  { key: "user", label: "ユーザー" },
];

export default function SearchTabs({ current, onChange }: SearchTabsProps) {
  return (
    <div className="flex border-b">
      {TAB_ITEMS.map(({ key, label }) => (
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
