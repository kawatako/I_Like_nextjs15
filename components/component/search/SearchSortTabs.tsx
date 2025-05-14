// components/component/search/SearchSortTabs.tsx
interface SearchSortTabsProps {
  current: string;
  onChange: (sort: string) => void;
  tab: "title" | "item" | "tag" | "user";
}

export default function SearchSortTabs({
  current,
  onChange,
  tab,
}: SearchSortTabsProps) {
  const SORT_ITEMS =
    tab === "user"
      ? [
          { key: "username", label: "@ユーザーネーム" },
          { key: "name", label: "表示名" },
        ]
      : [
          { key: "count", label: "件数順" },
          { key: "new", label: "新着順" },
          { key: "like", label: "いいね順" },
        ];

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
