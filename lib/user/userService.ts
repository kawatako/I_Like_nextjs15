import prisma from "../client";

// UserData インターフェースも、必要に応じて select に合わせるか、
// Prisma が生成する型を使うようにするとより良いです。
// 例: import { User } from '@prisma/client'; type UserData = Pick<User, 'id' | 'clerkId' | 'username' | 'image'> | null;
// もしくは関数の戻り値型を Prisma に推論させる

export async function getCurrentLoginUserData(
  // パラメータ名を clerkUserId に変更すると、何のIDか分かりやすくなります
  clerkUserId: string
) { // Promise<...> の型定義を削除し、Prisma の select から型推論させる例
  console.log(`userService: Searching for user with clerkId: ${clerkUserId}`); // 動作確認用ログ
  try {
    const user = await prisma.user.findUnique({
      where: {
        // ★★★ 修正点: id ではなく clerkId で検索 ★★★
        clerkId: clerkUserId
      },
      // select で必要な情報を取得 (LeftSidebar などで使う情報も)
      select: {
        id: true,       // DB 内部 ID (CUID)
        clerkId: true,  // Clerk ID
        username: true,
        image: true,
        name: true,     // 必要に応じて name や bio も取得
        bio: true,
      },
    });
    console.log(`userService: Found user data:`, user ? 'User found' : 'User not found'); // ログ変更
    return user; // user オブジェクト (見つかった場合) または null (見つからない場合) を返す
  } catch (error) {
      console.error(`userService: Error fetching user data for clerkId ${clerkUserId}:`, error);
      return null; // エラー時も null を返し、page.tsx で notFound() が呼ばれるようにする
  }
}