// components/component/trends/AverageRankListView.tsx
import Link from "next/link";
import { Sentiment } from "@prisma/client";
// データ型をインポート (パスは要確認)
import type { AveragedRankItem } from "@/lib/data/trendQueries";

// コンポーネントが受け取る Props の型定義
interface AverageRankListViewProps {
  sentiment: Sentiment;
  subject: string;
  items: AveragedRankItem[]; // 平均ランク計算結果の配列
  backHref: string;
}

export function AverageRankListView({
  sentiment,
  subject,
  items,
  backHref
}: AverageRankListViewProps) {
  // 表示用のタイトルを生成
  const prefix = sentiment === Sentiment.LIKE ? "好きな " : "嫌いな ";
  const themeTitle = prefix + subject;

  return (
    <div>
      {/* テーマタイトル */}
      <h3 className='text-xl font-semibold mb-4'>
        みんなのランキング: {themeTitle}
      </h3>

      {/* 平均順位リスト */}
      {items.length > 0 ? (
        <ol className='space-y-3'>
          {items.map((item, index) => (
            <li
              key={item.itemName}
              className='flex items-baseline justify-between border-b pb-2 gap-2'
            >
              {/* 順位とアイテム名 */}
              <div className='flex items-baseline flex-grow min-w-0'>
                <span className='text-lg font-semibold w-8 text-right mr-2 text-muted-foreground flex-shrink-0'>
                  {index + 1}.
                </span>
                <span className='font-medium truncate' title={item.itemName}>
                  {item.itemName}
                </span>
              </div>
              {/* 平均ランクと票数 */}
              <div className='text-right text-sm text-muted-foreground flex-shrink-0 whitespace-nowrap'>
                <span>平均: {item.averageRank?.toFixed(2) ?? "-"}位</span>
                <span className='ml-2'>({item.count}票)</span>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        // 集計結果がない場合の表示
        <p className='text-muted-foreground text-center py-4'>
          このテーマの集計結果はありません。
        </p>
      )}
      {/* 戻るリンク */}
      <div className='mt-6'>
        <Link href={backHref} className='text-sm text-blue-600 hover:underline'>
          &larr; 一覧に戻る {/* ラベルを少し汎用的に */}
        </Link>
      </div>
    </div>
  );
}
