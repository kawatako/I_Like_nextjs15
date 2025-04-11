// app/page.tsx
import LeftSidebar from "@/components/component/layouts/LeftSidebar";
import MainContent from "@/components/component/layouts/MainContent";
// import RightSidebar from "@/components/component/layouts/RightSidebar"; // 必要ならインポート
import { getCurrentLoginUserData } from "@/lib/data/userQueries";
import { getHomeFeed } from "@/lib/data/feedQueries"; // ★ getHomeFeed をインポート
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import type { FeedItemWithRelations } from "@/lib/data/feedQueries"; // 型もインポート

export default async function Home() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    redirect("/sign-in");
  }

  // --- ログインユーザーの DB 情報を取得 ---
  const currentLoginUserData = await getCurrentLoginUserData(clerkId);
  if (!currentLoginUserData?.id || !currentLoginUserData?.username) {
    console.error(
      "ログインユーザーのDB情報(ID or Username)が見つかりません。Clerk ID:",
      clerkId
    );
    // ここで適切なエラー処理 (例: エラーページ表示、ユーザー登録フローへ誘導など)
    notFound(); // とりあえず notFound
  }
  const userDbId = currentLoginUserData.id;

  // --- タイムラインの初期データを取得 ---
  const initialLimit = 20; // 1ページあたりの件数
  let initialFeedItems: FeedItemWithRelations[] = []; // 型を明示
  let initialNextCursor: string | null = null;

  try {
    const feedData = await getHomeFeed({
      userId: userDbId,
      limit: initialLimit,
      cursor: undefined,
    });
    initialFeedItems = feedData.items;
    initialNextCursor = feedData.nextCursor;
  } catch (error) {
    console.error("ホームフィードの初期データ取得に失敗しました:", error);
    // エラーが発生してもページは表示させる（空のフィードになる）
    // 必要であれば、ユーザーにエラーメッセージを表示する仕組みを追加
  }

  // --- ページ構造を定義 ---
  return (
    // grid-cols-1: モバイル / md: 左サイドバー＋メイン / lg: 3カラム (RightSidebarを使う場合)
    <div className='grid grid-cols-1 md:grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_auto] gap-4 md:gap-6 p-4 md:p-6 h-full'>
      {/* Left Sidebar */}
      <aside className='hidden md:block md:w-[240px] lg:w-[260px] h-full'>
        {/* LeftSidebar に十分な高さがないと MainContent の h-full が効かない場合がある */}
        <LeftSidebar currentLoginUserData={currentLoginUserData} />
      </aside>

      <main className='h-full min-w-0'>
        {" "}
        {/* MainContent が h-full を使うため */}
        <MainContent
          currentLoginUserData={currentLoginUserData}
          initialFeedItems={initialFeedItems}
          initialNextCursor={initialNextCursor}
        />
      </main>
    </div>
  );
}
