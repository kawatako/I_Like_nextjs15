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

  // ② プレビュー用の署名付きURLを別フィールドとして付与
  const itemsWithPreview = await Promise.all(
    raw.items.map(async (item) => ({
      ...item,
      // 元の item.imageUrl はストレージキーのまま保持
      // プレビュー表示用に previewUrl を追加
      previewUrl: item.imageUrl
        ? await generateImageUrl(item.imageUrl)
        : null,
    }))
  );

  // ③ 既存アイテム配列を差し替え
  const rankingList = { ...raw, items: itemsWithPreview };

  return (
    <div className="container mx-auto p-4">
      <RankingEdit rankingList={rankingList} />
    </div>
  );
}
