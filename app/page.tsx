// app/page.tsx (Home - 前回のリファクタリング後の状態)
import LeftSidebar from "@/components/component/layouts/LeftSidebar";
import MainContentForHome from "@/components/component/layouts/MainContentForHome"; // ホーム用のMainContent (必要なら名前変更)
import { getCurrentLoginUserData } from "@/lib/data/userQueries";
import { getHomeFeed } from "@/lib/data/feedQueries";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import type { FeedItemWithRelations } from '@/lib/data/feedQueries';

export default async function Home() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    redirect("/sign-in");
  }

  const currentLoginUserData = await getCurrentLoginUserData(clerkId);
  if (!currentLoginUserData?.id || !currentLoginUserData?.username) {
     console.error("ログインユーザーのDB情報が見つかりません。");
     notFound();
  }
  const userDbId = currentLoginUserData.id;

  // --- タイムラインの初期データを取得 ---
  const initialLimit = 20;
  let initialFeedItems: FeedItemWithRelations[] = [];
  let initialNextCursor: string | null = null;
  try {
    const feedData = await getHomeFeed({ userId: userDbId, limit: initialLimit, cursor: undefined });
    initialFeedItems = feedData.items;
    initialNextCursor = feedData.nextCursor;
  } catch (error) {
    console.error("ホームフィードの初期データ取得に失敗しました:", error);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_auto] gap-4 md:gap-6 p-4 md:p-6 h-full">
      <aside className="hidden md:block md:w-[240px] lg:w-[260px] h-full">
        <LeftSidebar currentLoginUserData={currentLoginUserData} />
      </aside>
      <main className="h-full min-w-0">
        {/* ホーム用の MainContent を使う (名前は MainContentForHome などに変更推奨) */}
        <MainContentForHome
          // PostForm をここに含めるか、MainContentForHome 内に含める
          initialFeedItems={initialFeedItems}
          initialNextCursor={initialNextCursor}
        />
      </main>
      {/* <aside className="hidden lg:block lg:w-[240px] xl:w-[280px]"> <RightSidebar /> </aside> */}
    </div>
  );
}