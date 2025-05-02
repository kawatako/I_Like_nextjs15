// components/component/trends/TrendingItems.tsx
import React from "react";

export interface TrendingItem {
  itemName: string;
  rankScore: number;
}

interface Props {
  items: TrendingItem[];
  isLoading: boolean;
  isError: any;
}

export default function TrendingItems({
  items,
  isLoading,
  isError
}: Props) {
  if (isLoading) return <p>Loading…</p>;
  if (isError)   return <p>Error</p>;

  return (
    <ul>
      {items.map((i: TrendingItem, idx: number) => (
        <li key={idx}>
          {i.itemName} ({i.rankScore})
        </li>
      ))}
    </ul>
  );
}
