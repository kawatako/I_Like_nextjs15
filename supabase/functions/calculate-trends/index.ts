// supabase/functions/calculate-trends/index.ts
// Edge Function: 期間ごとのランキングトレンドを集計し、Supabaseテーブルに保存
// @ts-nocheck
import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { sb } from "../_shared/supabaseClient.ts";

serve(async () => {
  console.log("DEBUG ▶︎ SUPABASE_URL:           ", Deno.env.get("SUPABASE_URL"));
  console.log("DEBUG ▶︎ SUPABASE_SERVICE_ROLE_KEY:", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

  const now = new Date();
  console.log(`🏁 calculate-trends invoked at ${now.toISOString()}`);

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
    const calcDate = period === "WEEKLY"
      ? lastSunday.toISOString()
      : lastMonthLast.toISOString();
    const calcDateString = calcDate.slice(0, 10);
    console.log(`\n🔄 Processing ${period} { from: "${from.toISOString()}", to: "${to.toISOString()}", calcDateString: "${calcDateString}" }`);

    // 1) RankingList を期間内で取得
    const { data: lists, error: errLists } = await sb
      .from("RankingList")
      .select("id,subject")
      .eq("status", "PUBLISHED")
      .gte("createdAt", from.toISOString())
      .lte("createdAt", to.toISOString());
    if (errLists) {
      console.error("❌ fetch RankingList error:", errLists);
      return new Response("Internal Error", { status: 500 });
    }
    console.log(`✅ fetched ${lists?.length ?? 0} lists`);
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
    console.log(`→ topSubjects (${topSubjects.length}):`, topSubjects);

    await sb
      .from("TrendingSubject")
      .delete()
      .eq("period", period)
      .eq("calculationDate", calcDateString);
    console.log("→ old TrendingSubject deleted");

    if (topSubjects.length) {
      const { data: insertedSubjects, error: subjectError } = await sb
        .from("TrendingSubject")
        .insert(
          topSubjects.map((r) => ({
            subject: r.subject,
            count: r.count,
            period,
            calculationDate: calcDate,
          }))
        );
      console.log("📝 insert TrendingSubject response:", {
        insertedSubjects,
        subjectError,
      });
    }

    // ===== TrendingTag =====
    const { data: pivots, error: errPivots } = await sb
      .from("RankingListTag")
      .select("listId,tagId")
      .in("listId", listIds);
    if (errPivots) {
      console.error("❌ fetch RankingListTag error:", errPivots);
      return new Response("Internal Error", { status: 500 });
    }
    console.log(`✅ fetched ${pivots?.length ?? 0} pivots`);

    const tagCount = new Map<string, number>();
    (pivots ?? []).forEach((p: any) => {
      tagCount.set(p.tagId, (tagCount.get(p.tagId) || 0) + 1);
    });
    const topTagEntries = Array.from(tagCount.entries())
      .map(([tagId, count]) => ({ tagId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);
    console.log(`→ topTagEntries (${topTagEntries.length}):`, topTagEntries);

    await sb
      .from("TrendingTag")
      .delete()
      .eq("period", period)
      .eq("calculationDate", calcDateString);
    console.log("→ old TrendingTag deleted");

    if (topTagEntries.length) {
      // タグ名マップ取得
      const tagIds = topTagEntries.map((e) => e.tagId);
      const { data: tagRows, error: errTags } = await sb
        .from("Tag")
        .select("id,name")
        .in("id", tagIds);
      if (errTags) {
        console.error("❌ fetch Tag error:", errTags);
        return new Response("Internal Error", { status: 500 });
      }
      const nameMap = new Map<string, string>();
      (tagRows ?? []).forEach((t: any) => nameMap.set(t.id, t.name));

      const { data: insertedTags, error: tagError } = await sb
        .from("TrendingTag")
        .insert(
          topTagEntries.map((r) => ({
            tagId: r.tagId,
            tagName: nameMap.get(r.tagId)!,
            count: r.count,
            period,
            calculationDate: calcDate,
          }))
        );
      console.log("📝 insert TrendingTag response:", {
        insertedTags,
        tagError,
      });
    }

    // ===== TrendingItem =====
    const { data: items, error: errItems } = await sb
      .from("RankedItem")
      .select("itemName,rank")
      .in("listId", listIds);
    if (errItems) {
      console.error("❌ fetch RankedItem error:", errItems);
      return new Response("Internal Error", { status: 500 });
    }
    console.log(`✅ fetched ${items?.length ?? 0} RankedItems`);

    const itemScore = new Map<string, number>();
    (items ?? []).forEach((it: any) => {
      let pts = it.rank === 1 ? 3 : it.rank === 2 ? 2 : it.rank === 3 ? 1 : 0;
      if (pts > 0) {
        itemScore.set(it.itemName, (itemScore.get(it.itemName) || 0) + pts);
      }
    });
    const topItems = Array.from(itemScore.entries())
      .map(([itemName, rankScore]) => ({ itemName, rankScore }))
      .sort((a, b) => b.rankScore - a.rankScore)
      .slice(0, 100);
    console.log(`→ topItems (${topItems.length}):`, topItems);

    await sb
      .from("TrendingItem")
      .delete()
      .eq("period", period)
      .eq("calculationDate", calcDateString);
    console.log("→ old TrendingItem deleted");

    if (topItems.length) {
      const { data: insertedItems, error: itemError } = await sb
        .from("TrendingItem")
        .insert(
          topItems.map((r) => ({
            itemName: r.itemName,
            rankScore: r.rankScore,
            period,
            calculationDate: calcDate,
          }))
        );
      console.log("📝 insert TrendingItem response:", {
        insertedItems: insertedItems?.slice(0, 5),
        itemError,
      });
    }
  }

  console.log("✅ calculate-trends done");
  return new Response(JSON.stringify({ status: "ok" }), {
    headers: { "Content-Type": "application/json" },
  });
});
