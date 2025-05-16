// app/rankings/[listId]/edit/page.tsx
import { notFound } from "next/navigation";
import { getRankingListForEdit } from "@/lib/data/rankingQueries";
import { generateImageUrl } from "@/lib/utils/storage";   // 追加
import { RankingEdit } from "@/components/component/rankings/RankingEdit";

export const dynamic = "force-dynamic";

export default async function RankingEditPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;

  // 1) 編集用データ取得
  const raw = await getRankingListForEdit(listId);
  if (!raw) return notFound();

  // 2) 既存アイテムの imageUrl に署名付き URL を付与
  const itemsWithSigned = await Promise.all(
    raw.items.map(async (item) => ({
      ...item,
      imageUrl: item.imageUrl
        ? await generateImageUrl(item.imageUrl)
        : null,
    }))
  );

  // 3) RankingEdit コンポーネントに渡す形に整形
  const rankingList = {
    ...raw,
    items: itemsWithSigned,
  };

  return (
    <div className="container mx-auto p-4">
      <RankingEdit rankingList={rankingList} />
    </div>
  );
}
