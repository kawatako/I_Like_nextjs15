// app/trends/page.tsx（例）
"use client";
import { useState } from "react";
import { useNewList, useTrendingSubjects, useTrendingTags, useTrendingItems } from "@/components/hooks/useTrends";
import NewList from "@/components/component/trends/NewList";
import TrendingSubjects from "@/components/component/trends/TrendingSubjects";
import TrendingTags from "@/components/component/trends/TrendingTags";
import TrendingItems from "@/components/component/trends/TrendingItems";

export default function TrendsPage() {
  // ① 大項目タブ：new / weekly / monthly
  const [section, setSection] = useState<"new" | "weekly" | "monthly">("new");
  // ② 小項目タブ：titles / tags / items
  const [category, setCategory] = useState<"titles" | "tags" | "items">("titles");

  // フックを呼び出し
  const newList = useNewList();
  const weeklySubjects = useTrendingSubjects("WEEKLY");
  const monthlySubjects = useTrendingSubjects("MONTHLY");
  const weeklyTags = useTrendingTags("WEEKLY");
  const monthlyTags = useTrendingTags("MONTHLY");
  const weeklyItems = useTrendingItems("WEEKLY");
  const monthlyItems = useTrendingItems("MONTHLY");

  return (
    <div className="p-4 space-y-6">
      {/* 大タブ */}
      <div className="flex space-x-4">
        {["new", "weekly", "monthly"].map(key => (
          <button
            key={key}
            className={section === key ? "font-bold" : ""}
            onClick={() => setSection(key as any)}
          >
            {key === "new" ? "新着" : key === "weekly" ? "週間トレンド" : "月間トレンド"}
          </button>
        ))}
      </div>

      {/* 小タブ：新着は “titles” 固定 */}
      {section !== "new" && (
        <div className="flex space-x-4">
          <button onClick={() => setCategory("titles")} className={category==="titles"?"font-bold":""}>タイトル</button>
          <button onClick={() => setCategory("tags")}   className={category==="tags"  ?"font-bold":""}>タグ</button>
          <button onClick={() => setCategory("items")}  className={category==="items" ?"font-bold":""}>アイテム</button>
        </div>
      )}

      {/* コンテンツ */}
      <div>
        {section === "new" && <NewList {...newList} />}
        {section === "weekly" && category === "titles" && <TrendingSubjects {...weeklySubjects} />}
        {section === "weekly" && category === "tags"   && <TrendingTags     {...weeklyTags}     />}
        {section === "weekly" && category === "items"  && <TrendingItems    {...weeklyItems}    />}
        {section === "monthly" && category === "titles" && <TrendingSubjects {...monthlySubjects} />}
        {section === "monthly" && category === "tags"   && <TrendingTags     {...monthlyTags}     />}
        {section === "monthly" && category === "items"  && <TrendingItems    {...monthlyItems}    />}
      </div>
    </div>
  );
}
