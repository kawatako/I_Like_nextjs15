// supabase/functions/calculate-trends/index.ts
// @ts-nocheck
import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { sb } from "../_shared/supabaseClient.ts";

serve(async () => {
  const now = new Date();

  // ── 期間算出（カレンダー方式） ──
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setHours(23, 59, 59, 999);

  const thisMonthFirst = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthLast = new Date(thisMonthFirst);
  lastMonthLast.setDate(0);
  lastMonthLast.setHours(23, 59, 59, 999);
  const lastMonthFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  for (const [period, from, to] of [
    ["WEEKLY", lastMonday, lastSunday],
    ["MONTHLY", lastMonthFirst, lastMonthLast],
  ] as const) {
    const calcDate =
      period === "WEEKLY"
        ? lastSunday.toISOString()
        : lastMonthLast.toISOString();
    const calcDateString = calcDate.slice(0, 10);

    // ===== 1) RankingList を期間内で取得 =====
    const { data: lists, error: errLists } = await sb
      .from("RankingList")
      .select("id,subject")
      .eq("status", "PUBLISHED")
      .gte("createdAt", from.toISOString())
      .lte("createdAt", to.toISOString());
    if (errLists) {
      console.error("fetch RankingList error:", errLists);
      return new Response("Internal Error", { status: 500 });
    }
    const listIds = (lists ?? []).map((l: any) => l.id);

    // ===== TrendingSubject =====
    const subjectCount = new Map<string, number>();
    (lists ?? []).forEach((l: any) => {
      subjectCount.set(l.subject, (subjectCount.get(l.subject) || 0) + 1);
    });
    const topSubjects = Array.from(subjectCount.entries())
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);

    await sb
      .from("TrendingSubject")
      .delete()
      .eq("period", period)
      .eq("calculationDate", calcDateString);
    if (topSubjects.length) {
      await sb.from("TrendingSubject").insert(
        topSubjects.map((r) => ({
          subject: r.subject,
          count: r.count,
          period,
          calculationDate: calcDate,
        }))
      );
    }

    // ===== TrendingTag =====
    // 2) Prisma の暗黙的 M-N テーブル `_RankingListTags` から tagId を集計
    const { data: pivots, error: errPivots } = await sb
      .from("_RankingListTags")
      // A が RankingList.id、B が Tag.id という列名なのでリネームして取得
      .select("A,B")
      .in("A", listIds);
    if (errPivots) {
      console.error("fetch _RankingListTags error:", errPivots);
      return new Response("Internal Error", { status: 500 });
    }
    const tagCount = new Map<string, number>();
    (pivots ?? []).forEach((p: any) => {
      const tagId = p.B;
      tagCount.set(tagId, (tagCount.get(tagId) || 0) + 1);
    });
    const topTagEntries = Array.from(tagCount.entries())
      .map(([tagId, count]) => ({ tagId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);
    const tagIds = topTagEntries.map((e) => e.tagId);

    // 3) Tag テーブルから名前を取得
    const { data: tagRows, error: errTags } = await sb
      .from("Tag")
      .select("id,name")
      .in("id", tagIds);
    if (errTags) {
      console.error("fetch Tag error:", errTags);
      return new Response("Internal Error", { status: 500 });
    }
    const nameMap = new Map<string, string>();
    (tagRows ?? []).forEach((t: any) => {
      nameMap.set(t.id, t.name);
    });

    // 4) TrendingTag を置き換え
    await sb
      .from("TrendingTag")
      .delete()
      .eq("period", period)
      .eq("calculationDate", calcDateString);
    if (topTagEntries.length) {
      await sb.from("TrendingTag").insert(
        topTagEntries.map((r) => ({
          tagId: r.tagId,
          tagName: nameMap.get(r.tagId)!,
          count: r.count,
          period,
          calculationDate: calcDate,
        }))
      );
    }

    // ===== TrendingItem =====
    // 2) RankedItem を取得
    const { data: items, error: errItems } = await sb
      .from("RankedItem")
      .select("itemName,rank")
      .in("listId", listIds);
    if (errItems) {
      console.error("fetch RankedItem error:", errItems);
      return new Response("Internal Error", { status: 500 });
    }
    // 3) スコア計算
    const itemScore = new Map<string, number>();
    (items ?? []).forEach((it: any) => {
      let pts = 0;
      if (it.rank === 1) pts = 3;
      else if (it.rank === 2) pts = 2;
      else if (it.rank === 3) pts = 1;
      if (pts > 0) {
        itemScore.set(it.itemName, (itemScore.get(it.itemName) || 0) + pts);
      }
    });
    const topItems = Array.from(itemScore.entries())
      .map(([itemName, rankScore]) => ({ itemName, rankScore }))
      .sort((a, b) => b.rankScore - a.rankScore)
      .slice(0, 100);

    // 4) TrendingItem を置き換え
    await sb
      .from("TrendingItem")
      .delete()
      .eq("period", period)
      .eq("calculationDate", calcDateString);
    if (topItems.length) {
      await sb.from("TrendingItem").insert(
        topItems.map((r) => ({
          itemName: r.itemName,
          rankScore: r.rankScore,
          period,
          calculationDate: calcDate,
        }))
      );
    }
  }

  return new Response(JSON.stringify({ status: "ok" }), {
    headers: { "Content-Type": "application/json" },
  });
});
