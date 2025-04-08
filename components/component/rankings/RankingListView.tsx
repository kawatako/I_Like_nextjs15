// components/component/rankings/RankingListView.tsx
import { Prisma, Sentiment } from "@prisma/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Image from 'next/image'; // アイテム画像表示用

// RankingListEditView と同様のデータ型を想定 ( Prisma 型を使うのが望ましい )
const rankingListViewPayload = Prisma.validator<Prisma.RankingListDefaultArgs>()({
  include: { items: { orderBy: { rank: 'asc' } } },
});
type RankingListViewData = Prisma.RankingListGetPayload<typeof rankingListViewPayload>;

interface RankingListViewProps {
  ranking: RankingListViewData;
}

export function RankingListView({ ranking }: RankingListViewProps) {
  const sentimentLabel = ranking.sentiment === Sentiment.LIKE ? "好きな" : "嫌いな";
  const listTitle = `${sentimentLabel}${ranking.subject}`;

  return (
    <div className="space-y-6">
      {/* ランキングヘッダー情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-bold">{listTitle}</CardTitle>
          {ranking.description && (
            <CardDescription className="pt-1">{ranking.description}</CardDescription>
          )}
          {/* 必要であれば作成者名や作成日などを表示 */}
          {/* <p className="text-sm text-muted-foreground pt-2">作成者: {ranking.authorName}</p> */}
        </CardHeader>
      </Card>

      {/* アイテムリスト */}
      <Card>
        <CardContent className="pt-6">
          {ranking.items.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">アイテムが登録されていません。</p>
          ) : (
            <ol className="space-y-4">
              {ranking.items.map((item, index) => (
                <li key={item.id} className="flex items-start gap-4 p-4 border rounded-lg bg-background">
                  {/* 順位 */}
                  <div className="flex-shrink-0 pt-1">
                     <span className="text-xl font-bold text-center text-muted-foreground w-10 inline-block">{index + 1}</span>
                     <span className="text-sm text-muted-foreground">位</span>
                  </div>
                  {/* アイテム画像 (あれば) */}
                  {item.imageUrl && (
                    <div className="flex-shrink-0">
                      <Image
                        src={item.imageUrl}
                        alt={item.itemName}
                        width={80} // 表示サイズ調整
                        height={80} // 表示サイズ調整
                        className="rounded-md object-cover aspect-square border"
                      />
                    </div>
                  )}
                  {/* アイテム名と説明 */}
                  <div className="flex-grow pt-1">
                    <p className="font-semibold text-lg">{item.itemName}</p>
                    {item.itemDescription && (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{item.itemDescription}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}