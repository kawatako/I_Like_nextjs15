// components/component/rankings/RankingView.tsx
// ★ Sentiment を削除 ★
import { Prisma } from "@prisma/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Image from "next/image";
// ★ ローカルのペイロード定義を削除 ★
// const rankingListViewPayload = ...;
// type RankingListViewData = ...;
// ★ lib/types.ts からインポート ★
import type { RankingListViewData } from "@/lib/types";
// ★ Tag 表示用に Badge をインポート (任意) ★
import { Badge } from "@/components/ui/badge";

interface RankingListViewProps {
  ranking: RankingListViewData; // ★ インポートした型を使用 ★
}

// ★ export default function に変更推奨 ★
export function RankingView({ ranking }: RankingListViewProps) {

  // ★ Sentiment 関連のロジックを削除 ★
  // const sentimentLabel = ...;
  // const listTitle = `${sentimentLabel}${ranking.subject}`;
  const listTitle = ranking.subject; // タイトルは subject のみ

  return (
    <div className='space-y-6'>
      {/* ランキングヘッダー情報 */}
      <Card>
        {/* ★ ヘッダー画像表示を追加 ★ */}
        {ranking.listImageUrl && (
           <div className="relative aspect-[16/5] w-full overflow-hidden rounded-t-lg"> {/* 例: 横長 */}
              <Image src={ranking.listImageUrl} alt={`${listTitle} ヘッダー画像`} fill className="object-cover"/>
           </div>
        )}
        <CardHeader>
          {/* ★ タイトル表示を修正 ★ */}
          <CardTitle className='text-2xl md:text-3xl font-bold'>
            {listTitle}
          </CardTitle>
          {/* ★ タグ表示を追加 ★ */}
          {ranking.tags && ranking.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              {ranking.tags.map(tagRelation => (
                <Badge key={tagRelation.id} variant="secondary">{tagRelation.name}</Badge>
              ))}
            </div>
          )}
          {ranking.description && (
            <CardDescription className='pt-2'> {/* pt-2 に変更 */}
              {ranking.description}
            </CardDescription>
          )}
           {/* TODO: 作成者情報、インタラクションボタンを追加 */}
        </CardHeader>
      </Card>

      {/* アイテムリスト */}
      <Card>
        <CardHeader>
          <CardTitle>ランキングアイテム ({ranking._count?.items ?? 0}件)</CardTitle>
        </CardHeader>
        <CardContent className='pt-0'> {/* pt-6 から pt-0 へ */}
          {ranking.items.length === 0 ? (
            <p className='text-muted-foreground text-center py-4'>アイテムが登録されていません。</p>
          ) : (
            <ol className='space-y-4'>
              {ranking.items.map((item, index) => (
                <li key={item.id} className='flex items-start gap-4 p-4 border rounded-lg bg-background'>
                  {/* 順位 */}
                  <div className='flex-shrink-0 pt-1'><span className='...'>{index + 1}</span><span className='...'>位</span></div>
                  {/* アイテム画像 */}
                  {item.imageUrl && ( <div className='flex-shrink-0'><Image src={item.imageUrl} alt={item.itemName} width={80} height={80} className='rounded-md object-cover aspect-square border'/></div> )}
                  {/* アイテム名と説明 */}
                  <div className='flex-grow pt-1'>
                    <p className='font-semibold text-lg'>{item.itemName}</p>
                    {item.itemDescription && ( <p className='text-sm text-muted-foreground mt-1 whitespace-pre-wrap'>{item.itemDescription}</p> )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
      {/* TODO: コメントセクション */}
    </div>
  );
}