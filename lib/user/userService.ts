import prisma from "../client";
import { ListStatus, Prisma, Sentiment } from "@prisma/client";

export async function getCurrentLoginUserData(
  // パラメータ名を clerkUserId に変更すると、何のIDか分かりやすくなります
  clerkUserId: string
) {
  // Promise<...> の型定義を削除し、Prisma の select から型推論させる例
  console.log(`userService: Searching for user with clerkId: ${clerkUserId}`); // 動作確認用ログ
  try {
    const user = await prisma.user.findUnique({
      where: {
        // ★★★ 修正点: id ではなく clerkId で検索 ★★★
        clerkId: clerkUserId,
      },
      // select で必要な情報を取得 (LeftSidebar などで使う情報も)
      select: {
        id: true, // DB 内部 ID (CUID)
        clerkId: true, // Clerk ID
        username: true,
        image: true,
        name: true,
        bio: true,
        coverImageUrl: true,
        socialLinks: true,
      },
    });
    console.log(
      `userService: Found user data:`,
      user ? "User found" : "User not found"
    ); // ログ変更
    return user; // user オブジェクト (見つかった場合) または null (見つからない場合) を返す
  } catch (error) {
    console.error(
      `userService: Error fetching user data for clerkId ${clerkUserId}:`,
      error
    );
    return null; // エラー時も null を返し、page.tsx で notFound() が呼ばれるようにする
  }
}

//プロフィールページ表示に必要なユーザー情報と、そのユーザーが作成した「公開済み」のランキングリスト一覧を取得する関数
// param username プロフィールを表示したいユーザーの username
// returns User オブジェクト (公開済みの rankingLists を含む) または null
export async function getUserProfileData(username: string) {
  console.log(`userService: Fetching profile data for username: ${username}`);
  try {
    const userWithLists = await prisma.user.findUnique({
      where: { username: username },
      include: {
        rankingLists: {
          where: { status: ListStatus.PUBLISHED },
          // ★★★ ここの select 句を修正・確認 ★★★
          select: {
            id: true,
            sentiment: true,
            subject: true,
            listImageUrl: true, // ★ 必要 ★
            status: true,       // ★ 必要 ★
            _count: {           // ★ 必要 ★
              select: { items: true }
            },
            createdAt: true,
            items: {            // ★ 必要 ★
              select: { id: true, itemName: true, rank: true },
              orderBy: { rank: 'asc' },
              // take: 3, // 必要なら件数制限
            }
          },
          // ★★★ --------------------- ★★★
          orderBy: { createdAt: 'desc' },
        },
        // ...
      },
    });
    // ...
    // ★ getUserProfileData の戻り値の型も RankingListForProfile を使うように合わせる ★
    // 例: return userWithLists as (User & { rankingLists: RankingListForProfile[] }) | null;
    // または Prisma の型生成をうまく使う
    return userWithLists; // Prisma の推論に任せる場合

  } catch (error) {
    return null;
  }
}

// ProfileRankingLists コンポーネントが期待するリストの型 (必要なら調整)
// getUserProfileData 内の select と合わせるのが理想
export type RankingListForProfile = {
  id: string;
  sentiment: Sentiment;
  subject: string;
  listImageUrl: string | null;
  _count: { items: number };
  createdAt: Date;
  items: { id: string; itemName: string; rank: number }[]; // getUserProfileData が返す型に合わせる
  status: ListStatus; // ★ Status も含める ★
}

/**
* 特定のユーザーが作成した「下書き」状態のランキングリスト一覧を取得する関数
* @param userDbId 対象ユーザーの DB ID (CUID)
* @returns 下書きの RankingList の配列 (Promise)
*/
export async function getDraftRankingLists(userDbId: string): Promise<RankingListForProfile[]> {
  console.log(`userService: Fetching DRAFT ranking lists for userDbId: ${userDbId}`);
  try {
      const draftLists = await prisma.rankingList.findMany({
          where: {
              authorId: userDbId,
              status: ListStatus.DRAFT, // ★ 下書き状態のリストのみ取得 ★
          },
          select: { // ProfileRankingLists が必要とするフィールドを取得
              id: true,
              sentiment: true,
              subject: true,
              listImageUrl: true,
              status: true, // ★ status も取得 ★
              _count: { select: { items: true } },
              createdAt: true,
              items: { // プロフィール一覧表示にアイテムが必要か？ (getUserProfileDataに合わせて必要なら)
                  select: { id: true, itemName: true, rank: true },
                  orderBy: { rank: 'asc' },
                  // take: 3, // 例えば上位3件だけ
              }
          },
          orderBy: {
              updatedAt: 'desc', // 下書きは更新日時順が良いかも？
          },
      });
      console.log(`userService: Found ${draftLists.length} draft lists for userDbId: ${userDbId}`);
      return draftLists;
  } catch (error) {
      console.error(`userService: Error fetching draft lists for userDbId ${userDbId}:`, error);
      return []; // エラー時は空配列
  }
}