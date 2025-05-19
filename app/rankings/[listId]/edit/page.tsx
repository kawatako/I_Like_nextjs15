// app/rankings/[listId]/edit/page.tsx
import { notFound } from "next/navigation";
import { getRankingListForEdit } from "@/lib/data/rankingQueries";
import { generateImageUrl } from "@/lib/utils/storage";
import { RankingEdit } from "@/components/rankings/RankingEdit";

export const dynamic = "force-dynamic";

export default async function RankingEditPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;

  // ① データ取得
  const raw = await getRankingListForEdit(listId);
  if (!raw) notFound();

  // ② imageUrl（キー文字列）を署名付きURLに上書き & 元のキーは imagePath として保持
  const items = await Promise.all(
    raw.items.map(async (item) => ({
      ...item,
      imagePath: item.imageUrl,
      imageUrl: item.imageUrl ? await generateImageUrl(item.imageUrl) : null,
    }))
  );

  const rankingList = { ...raw, items };

  return (
    <div className="container mx-auto p-4">
      <RankingEdit rankingList={rankingList} />
    </div>
  );
}