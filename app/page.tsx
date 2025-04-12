// app/page.tsx
import MainContentForHome from "@/components/component/layouts/MainContentForHome";
import { getCurrentLoginUserData } from "@/lib/data/userQueries";
import { getHomeFeed } from "@/lib/data/feedQueries";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import type { FeedItemWithRelations } from "@/lib/data/feedQueries";

export default async function Home() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    redirect("/sign-in");
  }

  // ★ LeftSidebar 用のデータ取得は layout.tsx に移ったが、
  //    MainContentForHome (中のPostFormなど) が別途必要とするなら残す ★
  const currentLoginUserData = await getCurrentLoginUserData(clerkId);
  if (!currentLoginUserData?.id || !currentLoginUserData?.username) {
    console.error("ログインユーザーのDB情報が見つかりません。");
    notFound();
  }
  const userDbId = currentLoginUserData.id;

  // タイムラインデータ取得 (変更なし)
  const initialLimit = 20;
  let initialFeedItems: FeedItemWithRelations[] = [];
  let initialNextCursor: string | null = null;
  try {
    const feedData = await getHomeFeed({ userId: userDbId, limit: initialLimit, cursor: undefined });
    initialFeedItems = feedData.items;
    initialNextCursor = feedData.nextCursor;
  } catch (error) { /* ... */ }

  return (
    <MainContentForHome
      initialFeedItems={initialFeedItems}
      initialNextCursor={initialNextCursor}
    />
  );
}