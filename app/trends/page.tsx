// app/trends/page.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Sentiment, ListStatus } from "@prisma/client"; // Prisma Enums をインポート
import {
  getNewestPublishedRankings,
  getRankingsByCurrentUser,
  type MyRankingListItem,
  getPopularThemes,
  type PopularThemeItem,
  calculateAverageRankForTheme,
  type AveragedRankItem,
} from "@/lib/data/trendQueries"; // データ取得関数と型をインポート
import { auth } from "@clerk/nextjs/server"; // Clerk 認証情報を取得
import { Badge } from "@/components/ui/badge"; // Badge コンポーネントをインポート
import { Button } from "@/components/ui/button"; // Button コンポーネントをインポート (編集ボタン用)
import { AverageRankListView } from "@/components/component/trends/AverageRankListView"; // 平均ランク表示用コンポーネント

// ページコンポーネント: searchParams を受け取る
export default async function TrendsPage({
  searchParams,
}: {
  searchParams?: {
    tab?: string;
    sentiment?: string;
    subject?: string;
  };
}) {
  // ★★★ searchParams を await で解決し、プロパティをローカル変数に読み込む ★★★
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const tabParam = resolvedSearchParams.tab;
  const sentimentParam = resolvedSearchParams.sentiment;
  const subjectParam = resolvedSearchParams.subject;
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

  // --- 各タブで必要となるデータを並行 or 個別に取得 ---
  // (パフォーマンスを考慮する場合、選択タブに応じて取得を分けるのが理想)

  // New タブ用データ
  const newestRankings = await getNewestPublishedRankings(30);

  // For You タブ用データ
  const myRankings = await getRankingsByCurrentUser();
  const { userId: loggedInClerkId } = await auth(); // For You タブの表示制御や他で使用

  // Total タブ（初期表示）用データ
  const popularThemes = await getPopularThemes(20);

  // Total タブ（詳細表示）用のデータと状態変数
  let averageRankItems: AveragedRankItem[] = [];
  let selectedSentiment: Sentiment | null = null;
  let selectedSubject: string | null = null;

  // ローカル変数を使って条件を確認し、平均ランクデータを取得
  if (
    (sentimentParam === Sentiment.LIKE ||
      sentimentParam === Sentiment.DISLIKE) &&
    subjectParam &&
    typeof subjectParam === "string"
  ) {
    selectedSentiment = sentimentParam;
    selectedSubject = decodeURIComponent(subjectParam); // デコード
    // 条件が揃っていれば平均ランク計算関数を呼び出す
    averageRankItems = await calculateAverageRankForTheme(
      selectedSentiment,
      selectedSubject
    );
  }

  // デフォルトで表示するタブを決定
  const defaultTabValue =
    tabParam === "total" && selectedSubject ? "total" : "new";

  return (
    <div className='container mx-auto p-4 md:p-6'>
      {/* デフォルトタブを設定 */}
      <Tabs defaultValue={defaultTabValue} className='w-full'>
        {/* タブ選択ボタン */}
        <TabsList className='grid w-full grid-cols-4 mb-4'>
          <TabsTrigger value='new'>New</TabsTrigger>
          <TabsTrigger value='total'>Total</TabsTrigger>
          <TabsTrigger value='total-trends'>Total Trends</TabsTrigger>
          <TabsTrigger value='for-you'>For You</TabsTrigger>
        </TabsList>

        {/* New タブのコンテンツ */}
        <TabsContent value='new'>
          <div className='border rounded-lg p-4 min-h-[200px]'>
            {" "}
            {/* min-h は見た目用 */}
            {newestRankings.length === 0 ? (
              <p className='text-muted-foreground text-center py-4'>
                新しいランキングはまだありません。
              </p>
            ) : (
              <ul className='space-y-1'>
                {newestRankings.map((ranking) => {
                  const prefix =
                    ranking.sentiment === Sentiment.LIKE
                      ? "好きな "
                      : "嫌いな ";
                  const displayTitle = prefix + ranking.subject;
                  return (
                    <li key={ranking.id}>
                      <Link
                        href={`/rankings/${ranking.id}`}
                        className='block p-2 rounded hover:bg-muted transition-colors text-sm'
                      >
                        {displayTitle}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </TabsContent>

        {/* Total タブのコンテンツ (条件分岐表示) */}
        <TabsContent value='total'>
          <div className='border rounded-lg p-4 min-h-[200px]'>
            {/* selectedSubject があれば平均ランク表示、なければ人気テーマ表示 */}
            {selectedSentiment && selectedSubject ? (
              // 平均ランク表示コンポーネントを呼び出す
              <AverageRankListView
                sentiment={selectedSentiment}
                subject={selectedSubject}
                items={averageRankItems}
              />
            ) : (
              // 人気テーマ一覧表示
              <div>
                <h3 className='text-lg font-semibold mb-4'>人気のテーマ</h3>
                {popularThemes.length === 0 ? (
                  <p className='text-muted-foreground text-center py-4'>
                    人気のテーマはまだありません。
                  </p>
                ) : (
                  <ul className='space-y-2'>
                    {popularThemes.map((theme) => {
                      const prefix =
                        theme.sentiment === Sentiment.LIKE
                          ? "好きな "
                          : "嫌いな ";
                      const displaySubject = prefix + theme.subject;
                      // テーマ詳細表示（平均ランク表示）へのリンク
                      const themeDetailHref = `/trends?tab=total&sentiment=${
                        theme.sentiment
                      }&subject=${encodeURIComponent(theme.subject)}`;
                      return (
                        <li
                          key={`${theme.sentiment}-${theme.subject}`}
                          className='flex justify-between items-center p-2 rounded hover:bg-muted'
                        >
                          <Link
                            href={themeDetailHref}
                            className='text-sm font-medium hover:underline'
                          >
                            {displaySubject}
                          </Link>
                          <span className='text-xs text-muted-foreground'>
                            {theme.count}件のリスト
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Total Trends タブのコンテンツ (プレースホルダー) */}
        <TabsContent value='total-trends'>
          <div className='border rounded-lg p-4 min-h-[200px]'>
            <p>Total Trends タブ: 週間で活発だったテーマ一覧を表示予定...</p>
            {/* TODO: getWeeklyTrendingThemes を呼び出して表示 */}
          </div>
        </TabsContent>

        {/* For You タブのコンテンツ */}
        <TabsContent value='for-you'>
          <div className='border rounded-lg p-4 min-h-[200px]'>
            <h3 className='text-lg font-semibold mb-4'>
              あなたが作成したランキング
            </h3>
            {myRankings.length === 0 ? (
              <p className='text-muted-foreground text-center py-4'>
                {loggedInClerkId
                  ? "まだランキングを作成していません。"
                  : "ログインすると、作成したランキングが表示されます。"}
              </p>
            ) : (
              <ul className='space-y-3'>
                {myRankings.map((ranking) => {
                  const prefix =
                    ranking.sentiment === Sentiment.LIKE
                      ? "好きな "
                      : "嫌いな ";
                  const displayTitle = prefix + ranking.subject;
                  const isPublished = ranking.status === ListStatus.PUBLISHED;
                  // Totalタブのみんなのランキング表示へのリンクURL
                  const totalTabHref = `/trends?tab=total&sentiment=${
                    ranking.sentiment
                  }&subject=${encodeURIComponent(ranking.subject)}`;
                  return (
                    <li
                      key={ranking.id}
                      className='flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 border rounded-md gap-2'
                    >
                      {/* 左側: タイトル(詳細ページリンク), ステータス */}
                      <div className='flex-grow mb-2 sm:mb-0'>
                        <Link
                          href={`/rankings/${ranking.id}`}
                          className='text-sm font-medium hover:underline'
                          title={`ランキング「${ranking.subject}」を見る`}
                        >
                          {displayTitle}
                        </Link>
                        <Badge
                          variant={isPublished ? "default" : "secondary"}
                          className='ml-2 text-xs'
                        >
                          {isPublished ? "公開中" : "下書き"}
                        </Badge>
                      </div>
                      {/* 右側: 集計数(Totalタブへのリンク)と編集ボタン */}
                      <div className='flex items-center space-x-3 flex-shrink-0'>
                        <Link
                          href={totalTabHref}
                          className='text-xs text-muted-foreground hover:underline whitespace-nowrap'
                          title={`「${ranking.subject}」のみんなのランキングを見る`}
                        >
                          集計数: {ranking.aggregationCount}件
                        </Link>
                        <Link href={`/rankings/${ranking.id}/edit`} passHref>
                          <Button size='sm' variant='ghost'>
                            編集
                          </Button>
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {/* パート2（関連テーマのTotal集計）は表示しない */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
