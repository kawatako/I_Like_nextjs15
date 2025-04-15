// app/trends/page.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Sentiment, ListStatus } from "@prisma/client";
import {
  getNewestPublishedRankings,
  getRankingsByCurrentUser,
  type MyRankingListItem,
  getPopularThemes,
  type PopularThemeItem,
  calculateAverageRankForTheme,
  type AveragedRankItem,
  getWeeklyTrendingThemes,
  type WeeklyThemeItem
} from "@/lib/data/trendQueries";
import { auth } from "@clerk/nextjs/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AverageRankListView } from "@/components/component/trends/AverageRankListView";

export default async function TrendsPage(
  props: {
    searchParams?: Promise<{
      tab?: string;
      sentiment?: string;
      subject?: string;
    }>;
  }
) {
  const searchParams = await props.searchParams;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const tabParam = resolvedSearchParams.tab;
  const sentimentParam = resolvedSearchParams.sentiment;
  const subjectParam = resolvedSearchParams.subject;

  const newestRankings = await getNewestPublishedRankings(30);
  const myRankings = await getRankingsByCurrentUser();
  const { userId: loggedInClerkId } = await auth();
  const popularThemes = await getPopularThemes(20);
  const weeklyThemes = await getWeeklyTrendingThemes(20);

  // --- 平均ランクデータの条件付き取得 ---
  let averageRankItems: AveragedRankItem[] = [];
  let selectedSentiment: Sentiment | null = null;
  let selectedSubject: string | null = null;
  let showAverageRankForTotalTab = false;
  let showAverageRankForTrendsTab = false;

  // URLパラメータを検証し、有効なら平均ランク取得の準備
  if (
    (sentimentParam === Sentiment.LIKE ||
      sentimentParam === Sentiment.DISLIKE) &&
    subjectParam
  ) {
    const validSentiment = sentimentParam;
    const validSubject = decodeURIComponent(subjectParam);

    // どのタブが詳細表示を要求しているか判断
    if (tabParam === "total") {
      selectedSentiment = validSentiment;
      selectedSubject = validSubject;
      averageRankItems = await calculateAverageRankForTheme(
        selectedSentiment,
        selectedSubject
      );
      showAverageRankForTotalTab = true;
    } else if (tabParam === "total-trends") {
      selectedSentiment = validSentiment;
      selectedSubject = validSubject;
      averageRankItems = await calculateAverageRankForTheme(
        selectedSentiment,
        selectedSubject
      );
      showAverageRankForTrendsTab = true;
    }
    // For You タブからのリンクも tab=total を使うので上記 total の条件で処理される
  }

  // デフォルトで表示するタブを決定
  const defaultTabValue = showAverageRankForTotalTab
    ? "total"
    : showAverageRankForTrendsTab
    ? "total-trends"
    : tabParam === "for-you"
    ? "for-you"
    : "new";

  return (
    <>
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
          <h3 className='text-lg font-semibold mb-4'>最新のランキング</h3>
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
            {showAverageRankForTotalTab &&
            selectedSentiment &&
            selectedSubject ? (
              // 平均ランク表示コンポーネントを呼び出す
              (<AverageRankListView
                sentiment={selectedSentiment}
                subject={selectedSubject}
                items={averageRankItems}
                backHref='/trends?tab=total' // 戻り先を指定
              />)
            ) : (
              // 人気テーマ一覧表示
              (<div>
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
              </div>)
            )}
          </div>
        </TabsContent>

        {/* Total Trends タブのコンテンツ (条件分岐表示) */}
        <TabsContent value='total-trends'>
          <div className='border rounded-lg p-4 min-h-[200px]'>
            {showAverageRankForTrendsTab &&
            selectedSentiment &&
            selectedSubject ? (
              // 平均ランク表示
              (<AverageRankListView
                sentiment={selectedSentiment}
                subject={selectedSubject}
                items={averageRankItems}
                backHref='/trends?tab=total-trends' // 戻り先を指定
              />)
            ) : (
              // 週間トレンドテーマ一覧表示
              (<div>
                <h3 className='text-lg font-semibold mb-4'>
                  週間トレンドテーマ
                </h3>
                {weeklyThemes.length === 0 ? (
                  <p className='text-muted-foreground text-center py-4'>
                    今週のトレンドテーマはまだありません。
                  </p>
                ) : (
                  <ul className='space-y-2'>
                    {weeklyThemes.map((theme, index) => {
                      const prefix =
                        theme.sentiment === Sentiment.LIKE
                          ? "好きな "
                          : "嫌いな ";
                      const displaySubject = prefix + theme.subject;
                      // テーマ詳細表示（平均ランク表示）へのリンク (tab=total-trends を指定)
                      const themeDetailHref = `/trends?tab=total-trends&sentiment=${
                        theme.sentiment
                      }&subject=${encodeURIComponent(theme.subject)}`;
                      return (
                        <li
                          key={`${theme.sentiment}-${theme.subject}`}
                          className='flex justify-between items-center p-2 rounded hover:bg-muted'
                        >
                          <div className='flex items-center gap-2'>
                            {/* <span className="font-medium text-muted-foreground w-6 text-right">{index + 1}.</span> */}
                            <Link
                              href={themeDetailHref}
                              className='text-sm font-medium hover:underline'
                            >
                              {displaySubject}
                            </Link>
                          </div>
                          <span className='text-xs text-muted-foreground'>
                            {theme.count}件更新
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>)
            )}
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
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
