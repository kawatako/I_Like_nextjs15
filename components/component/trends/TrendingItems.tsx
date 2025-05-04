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

export default function TrendingItems({ items, isLoading, isError }: Props) {
  if (isLoading) return <p>Loading…</p>;
  if (isError)   return <p>Error</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {items.map((i, idx) => (
        <div
          key={idx}
          className="rounded-lg shadow-sm bg-white p-4 hover:bg-gray-50 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <div className="w-6 text-center">
              <span
                className={`font-bold text-xl ${
                  idx === 0
                    ? "text-yellow-500"
                    : idx === 1
                    ? "text-gray-400"
                    : idx === 2
                    ? "text-amber-600"
                    : ""
                }`}
              >
                {idx + 1}
              </span>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="font-bold text-base">{i.itemName}</h3>
              <div className="text-sm text-muted-foreground mt-1">
                スコア: {i.rankScore}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
