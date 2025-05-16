// app/rankings/[listId]/edit/page.tsx
import { notFound } from "next/navigation";
import { getRankingListForEdit } from "@/lib/data/rankingQueries";
import { generateImageUrl } from "@/lib/utils/storage";
import { RankingEdit } from "@/components/component/rankings/RankingEdit";

export const dynamic = "force-dynamic";

export default async function RankingEditPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;

  // ① 認証・権限チェック込みで下書きデータ取得
  const raw = await getRankingListForEdit(listId);
  if (!raw) notFound();

  // ② 既存アイテム画像のパスを全て署名付き URL に変換
  const itemsWithSigned = await Promise.all(
    raw.items.map(async (item) => ({
      ...item,
      imageUrl: item.imageUrl
        ? await generateImageUrl(item.imageUrl)
        : null,
    }))
  );

  // ③ 変換後のアイテム配列を元データに差し替え
  const rankingList = { ...raw, items: itemsWithSigned };

  return (
    <div className="container mx-auto p-4">
      <RankingEdit rankingList={rankingList} />
    </div>
  );
}
