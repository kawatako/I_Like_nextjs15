// app/trends/page.tsx
"use client";

import { useState } from "react";
import NewList from "@/components/trends/NewList";
import TrendingSubjects from "@/components/trends/TrendingSubjects";
import { useNewList, useTrendingSubjects } from "@/lib/hooks/useTrends";

export default function TrendsPage() {
  // セクション：新着 / 週間 / 月間
  const [section, setSection] = useState<"new" | "weekly" | "monthly">("new");

  // フックでデータ取得
  const newList = useNewList();
  const weeklySubjects  = useTrendingSubjects("WEEKLY");
  const monthlySubjects = useTrendingSubjects("MONTHLY");

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

      {/* コンテンツ */}
      <div>
        {section === "new" && <NewList {...newList} />}

        {section === "weekly" && (
          <TrendingSubjects {...weeklySubjects} />
        )}
        {section === "monthly" && (
          <TrendingSubjects {...monthlySubjects} />
        )}
      </div>
    </div>
  );
}
