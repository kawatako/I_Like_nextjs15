import React from "react";

export interface TrendingTag {
  tagName: string;
  count: number;
}

interface Props {
  tags: TrendingTag[];
  isLoading: boolean;
  isError: any;
}

export default function TrendingTags({ tags, isLoading, isError }: Props) {
  if (isLoading) return <p>Loading…</p>;
  if (isError)   return <p>Error</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {tags.map((t, idx) => (
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
              <h3 className="font-bold text-base">{t.tagName}</h3>
              <div className="text-sm text-muted-foreground mt-1">
                登場数: {t.count}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
