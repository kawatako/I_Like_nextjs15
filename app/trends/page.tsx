// app/trends/page.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link"; // Link コンポーネントをインポート
import { Sentiment, ListStatus } from "@prisma/client";
import {
  getNewestPublishedRankings,
  getRankingsByCurrentUser,
  type MyRankingListItem,
} from "@/lib/actions/trendActions";
import { auth } from "@clerk/nextjs/server"; // auth をインポート
import { Badge } from "@/components/ui/badge"; // ステータス表示用
import { Button } from "@/components/ui/button"; // 編集ボタン用 (任意)

export default async function TrendsPage() {
  // ★ New タブ用のデータを取得 ★
  const newestRankings = await getNewestPublishedRankings(30); // 例: 最新30件
  // ★ For You タブ用のデータを取得 ★
  const myRankings = await getRankingsByCurrentUser();
  const { userId: loggedInClerkId } = await auth(); // isOwner チェックや他の処理で使う可能性も考慮

  return (
    <div className='container mx-auto p-4 md:p-6'>
      {/* <h1 className="text-2xl font-bold mb-4">トレンド</h1> */}

      <Tabs defaultValue='new' className='w-full'>
        <TabsList className='grid w-full grid-cols-4 mb-4'>
          <TabsTrigger value='new'>New</TabsTrigger>
          <TabsTrigger value='total'>Total</TabsTrigger>
          <TabsTrigger value='total-trends'>Total Trends</TabsTrigger>
          <TabsTrigger value='for-you'>For You</TabsTrigger>
        </TabsList>

        <TabsContent value='new'>
          <div className='border rounded-lg p-4'>
            {newestRankings.length === 0 ? (
              <p className='text-muted-foreground text-center py-4'>
                新しいランキングはまだありません。
              </p>
            ) : (
              <ul className='space-y-1'>
                {newestRankings.map((ranking) => {
                  // ↓↓↓ sentiment に基づいて接頭辞を決定 ↓↓↓
                  const prefix =
                    ranking.sentiment === Sentiment.LIKE
                      ? "好きな "
                      : "嫌いな ";
                  const displayTitle =
                    prefix + ranking.subject + "のランキング";

                  return (
                    <li key={ranking.id}>
                      <Link
                        href={`/rankings/${ranking.id}`}
                        className='block p-2 rounded hover:bg-muted transition-colors text-sm'
                      >
                        {/* ↓↓↓ 表示するタイトルを変更 ↓↓↓ */}
                        {displayTitle}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value='total'>
          <div className='border rounded-lg p-4 min-h-[200px]'>
            <p>
              Total タブ: 人気テーマ一覧 →
              みんなのランキング（平均順位）を表示予定...
            </p>
          </div>
        </TabsContent>
        <TabsContent value='total-trends'>
          <div className='border rounded-lg p-4 min-h-[200px]'>
            <p>Total Trends タブ: 週間で活発だったテーマ一覧を表示予定...</p>
          </div>
        </TabsContent>
        <TabsContent value="for-you">
          <div className="border rounded-lg p-4 min-h-[200px]">
            <h3 className="text-lg font-semibold mb-4">あなたが作成したランキング</h3>
            {myRankings.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {loggedInClerkId ? "まだランキングを作成していません。" : "ログインすると、作成したランキングが表示されます。"}
              </p>
            ) : (
              <ul className="space-y-3">
                {myRankings.map((ranking) => {
                  const prefix = ranking.sentiment === Sentiment.LIKE ? "好きな " : "嫌いな ";
                  const displayTitle = prefix + ranking.subject;
                  const isPublished = ranking.status === ListStatus.PUBLISHED;
                  const totalTabHref = `/trends?tab=total&sentiment=${ranking.sentiment}&subject=${encodeURIComponent(ranking.subject)}`;
                  return (
                    <li key={ranking.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 border rounded-md gap-2">
                      <div className="flex-grow mb-2 sm:mb-0">
                        {/* ↓↓↓ Link の href をランキング詳細ページに変更 (`/rankings/${ranking.id}`) ↓↓↓ */}
                        <Link href={`/rankings/${ranking.id}`} className="text-sm font-medium hover:underline" title={`ランキング「${ranking.subject}」を見る`}>
                          {displayTitle}
                        </Link>
                        <Badge variant={isPublished ? "default" : "secondary"} className="ml-2 text-xs">
                          {isPublished ? "公開中" : "下書き"}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-3 flex-shrink-0">
                      <Link href={totalTabHref} className="text-xs text-muted-foreground hover:underline whitespace-nowrap" title={`「${ranking.subject}」の平均ランキングを見る`}>
                      集計数: {ranking.aggregationCount}件
                      </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
