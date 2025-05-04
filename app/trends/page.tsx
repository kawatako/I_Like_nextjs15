"use client";

import { useState } from "react";
import NewList from "@/components/component/trends/NewList";
import TrendingSubjects from "@/components/component/trends/TrendingSubjects";
import TrendingTags from "@/components/component/trends/TrendingTags";
import TrendingItems from "@/components/component/trends/TrendingItems";
import {
  useNewList,
  useTrendingSubjects,
  useTrendingTags,
  useTrendingItems,
} from "@/components/hooks/useTrends";

export default function TrendsPage() {
  const [section, setSection] = useState<"new" | "weekly" | "monthly">("new");
  const [category, setCategory] = useState<"titles" | "tags" | "items">("titles");

  const newList         = useNewList();
  const weeklySubjects  = useTrendingSubjects("WEEKLY");
  const monthlySubjects = useTrendingSubjects("MONTHLY");
  const weeklyTags      = useTrendingTags("WEEKLY");
  const monthlyTags     = useTrendingTags("MONTHLY");
  const weeklyItems     = useTrendingItems("WEEKLY");
  const monthlyItems    = useTrendingItems("MONTHLY");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 大タブ */}
      <div className="flex space-x-6 border-b">
        {["new","weekly","monthly"].map((key) => (
          <button
            key={key}
            onClick={() => setSection(key as any)}
            className={`pb-2 ${
              section === key
                ? "border-b-2 border-primary text-primary font-semibold"
                : "text-muted-foreground"
            }`}
          >
            {key === "new" ? "新着" : key === "weekly" ? "週間" : "月間"}
          </button>
        ))}
      </div>

      {/* 小タブ（週間／月間のみ） */}
      {section !== "new" && (
        <div className="flex space-x-4">
          {[
            ["titles","タイトル"],
            ["tags","タグ"],
            ["items","アイテム"],
          ].map(([val,label]) => (
            <button
              key={val}
              onClick={() => setCategory(val as any)}
              className={`pb-1 ${
                category === val
                  ? "border-b-2 border-primary text-primary font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* コンテンツ */}
      <div>
        {section === "new" && <NewList {...newList} />}

        {section === "weekly" && category === "titles" && (
          <TrendingSubjects {...weeklySubjects} />
        )}
        {section === "weekly" && category === "tags" && (
          <TrendingTags {...weeklyTags} />
        )}
        {section === "weekly" && category === "items" && (
          <TrendingItems {...weeklyItems} />
        )}

        {section === "monthly" && category === "titles" && (
          <TrendingSubjects {...monthlySubjects} />
        )}
        {section === "monthly" && category === "tags" && (
          <TrendingTags {...monthlyTags} />
        )}
        {section === "monthly" && category === "items" && (
          <TrendingItems {...monthlyItems} />
        )}
      </div>
    </div>
  );
}
