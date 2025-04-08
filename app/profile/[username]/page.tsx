import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserProfileData, getDraftRankingLists,RankingListForProfile } from "@/lib/user/userService";
import { getLikedPosts, PostWithAuthor } from "@/lib/like/likeService"; // ★ いいね取得関数と型をインポート
import { ProfileRankingLists } from "@/components/component/rankings/ProfileRankingLists";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // ★ Tabs関連をインポート
import Link from "next/link"; // Link をインポート
// import FollowButton from "@/components/component/FollowButton";
import PostList from "@/components/component/posts/PostList"; // ★ PostList をインポート想定
import { fetchPosts } from "@/lib/post/postService"; // ★ fetchPosts をインポート想定

// searchParams を受け取るように PageProps を定義
interface ProfilePageProps {
  params: { username: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const username = params.username;
  const { userId: currentClerkId } = auth();

  // プロフィール情報と公開済みランキングリストを取得
  const userProfileData = await getUserProfileData(username);

  if (!userProfileData) {
    notFound();
  }

  const isCurrentUser = currentClerkId === userProfileData.clerkId;
  const userDbId = userProfileData.id; // DB ID

  // --- タブごとに必要なデータを取得 ---
  // 1. 投稿 (常に取得)
  // fetchPostsが username でも userDbId でも取得できるように調整が必要かもしれません
  const userPosts: PostWithAuthor[] = await fetchPosts(userDbId); // fetchPosts(userProfileData.id) などで取得

  // 2. いいねした投稿 (自分が見る場合のみ取得)
  let likedPosts: PostWithAuthor[] = [];
  if (isCurrentUser) {
    likedPosts = await getLikedPosts(userDbId);
  }
   // 3. ★ 下書きランキングリスト (自分が見る場合のみ取得) ★
   let draftLists: RankingListForProfile[] = []; // getDraftRankingLists の戻り値の型に合わせる
   if (isCurrentUser) {
       draftLists = await getDraftRankingLists(userDbId);
   }

  // --- ★ タブの定義 (isCurrentUser で分岐) ★ ---
  let tabs = [];
  const publishedLists = userProfileData.rankingLists; // 公開済みリスト

  if (isCurrentUser) {
    // 自分自身の場合: Rankings, Drafts, Posts, Likes
    tabs = [
      { value: "rankings", label: "Rankings", count: publishedLists.length, content: (
          <ProfileRankingLists userId={userDbId} username={username} rankingLists={publishedLists} isCurrentUser={isCurrentUser} />
      )},
      { value: "drafts", label: "drafts", count: draftLists.length, content: ( // ★ Drafts タブ追加 ★
          <ProfileRankingLists userId={userDbId} username={username} rankingLists={draftLists} isCurrentUser={isCurrentUser} /> // 同じコンポーネントを使い回す
      )},
      { value: "posts", label: "Posts", count: userPosts.length, content: (
          userPosts.length > 0 ? <PostList posts={userPosts ?? []} /> : <p className="text-center text-muted-foreground py-8">まだ投稿がありません。</p>
      )},
      { value: "likes", label: "Likes", count: likedPosts.length, content: (
          likedPosts.length > 0 ? <PostList posts={likedPosts ?? []} /> : <p className="text-center text-muted-foreground py-8">まだ「いいね」した投稿がありません。</p>
      )}
    ];
  } else {
    // 他のユーザーの場合: Rankings, Posts
    tabs = [
      { value: "rankings", label: "Rankings", count: publishedLists.length, content: (
          <ProfileRankingLists userId={userDbId} username={username} rankingLists={publishedLists} isCurrentUser={isCurrentUser} />
      )},
      { value: "posts", label: "Posts", count: userPosts.length, content: (
           userPosts.length > 0 ? <PostList posts={userPosts ?? []} /> : <p className="text-center text-muted-foreground py-8">まだ投稿がありません。</p>
      )},
    ];
  }
  // --------------------------------------------

  // 現在アクティブなタブ
  const activeTab = typeof searchParams.tab === 'string' && tabs.some(t => t.value === searchParams.tab)
                    ? searchParams.tab
                    : tabs[0]?.value || "rankings"; // デフォルトは最初のタブ

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-4xl">
      {/* --- プロフィールヘッダー (変更なし) --- */}
      <section className="mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 justify-between">
         {/* ... Avatar, Name, Bio, Buttons ... */}
         <div className="flex flex-col sm:flex-row items-center gap-4">
            <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border"><AvatarImage src={userProfileData.image ?? undefined} /><AvatarFallback>{userProfileData.username?.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
            <div className="text-center sm:text-left"><h1 className="text-2xl sm:text-3xl font-bold">{userProfileData.name || userProfileData.username}</h1><p className="text-muted-foreground">@{userProfileData.username}</p>{userProfileData.bio && <p className="mt-2 text-sm">{userProfileData.bio}</p>}</div>
         </div>
         <div className="mt-4 sm:mt-0">{isCurrentUser ? <Button variant="outline">プロフィールを編集</Button> : currentClerkId ? <Button variant="outline" disabled>フォロー(仮)</Button> : <Button variant="outline" disabled>フォロー</Button> }</div>
      </section>
      {/* --- プロフィールヘッダーここまで --- */}


      {/* ★★★ Tabs コンポーネントを使ってコンテンツを表示 ★★★ */}
      <Tabs defaultValue={activeTab} className="w-full">
        <TabsList className={`grid w-full ${isCurrentUser ? 'grid-cols-4' : 'grid-cols-2'} mb-4`}> {/* 列数を動的に変更 */}
          {tabs.map((tab) => (
            <TabsTrigger value={tab.value} key={tab.value} asChild>
               <Link href={`/profile/${username}?tab=${tab.value}`} className="flex-col h-auto py-1.5 px-1 sm:px-4"> {/* スタイル調整例 */}
                    <span className="text-sm sm:text-base">{tab.label}</span>
                    {/* カウント表示 (任意) */}
                    {/* <span className="text-xs text-muted-foreground">{tab.count}</span> */}
               </Link>
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent value={tab.value} key={tab.value}>
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}