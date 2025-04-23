// components/component/profile/ProfileHeader.tsx
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { UserProfileData } from "@/lib/types"; // UserProfileData 型をインポート
import type { FollowStatusInfo } from "@/lib/actions/followActions";
import { FollowButton } from "@/components/component/follows/FollowButton";

interface ProfileHeaderProps {
  userProfileData: UserProfileData; // _count を含むユーザーデータ
  isCurrentUser: boolean; // 表示中のプロフィールが自分自身か
  initialFollowStatus: FollowStatusInfo | null;
}

export function ProfileHeader({
  userProfileData,
  isCurrentUser,
  initialFollowStatus,
}: ProfileHeaderProps) {
  const username = userProfileData.username;
  if (!username) {
    // username が null や undefined の場合のフォールバック (通常は発生しないはず)
    return <div>ユーザー情報の取得に失敗しました。</div>;
  }

  // フォロー・フォロワー数を取得 (null の場合は 0 に)
  const followingCount = userProfileData._count?.following ?? 0;
  const followersCount = userProfileData._count?.followedBy ?? 0;

  // フォロー・フォロワーページへのリンク先を生成
  const followingHref = `/follows/${username}?tab=following`;
  const followersHref = `/follows/${username}?tab=followers`;

  return (
    <section className='mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 border-b pb-8'>
      {" "}
      {/* 区切り線と余白追加 */}
      {/* 左側: アバター */}
      <Avatar className='w-24 h-24 sm:w-32 sm:h-32 border text-4xl flex-shrink-0'>
        {" "}
        {/* サイズ調整、縮小防止 */}
        <AvatarImage
          src={userProfileData.image ?? undefined}
          alt={`${username} のプロフィール画像`}
        />
        <AvatarFallback>{username?.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className='flex flex-col items-center sm:items-start gap-3 flex-1 w-full'>
        {/* 上段: ユーザー名とボタン */}
        <div className='flex flex-col sm:flex-row justify-between items-center w-full gap-2'>
          <div className='text-center sm:text-left'>
            <h1 className='text-2xl sm:text-3xl font-bold break-all'>
              {userProfileData.name || username}
            </h1>
            <p className='text-muted-foreground'>@{username}</p>
          </div>
          <div className='flex-shrink-0'>
            {isCurrentUser ? (
              <Link href='/settings/profile'>
                <Button variant='outline' size='sm'>
                  プロフィールを編集
                </Button>
              </Link>
            ) : initialFollowStatus ? (
              <FollowButton
                targetUserId={userProfileData.id} // ★ 対象ユーザーの DB ID
                targetUsername={username} // ★ 対象ユーザーの username
                initialFollowStatusInfo={initialFollowStatus} // ★ 取得したフォロー状態
              />
            ) : (
              // フォロー状態が不明な場合のフォールバック (通常は発生しないはず)
              <Button variant='secondary' size='sm' disabled>
                読み込み中...
              </Button>
            )}
          </div>
        </div>

        {/* 中段: フォロー・フォロワー数 */}
        <div className='flex gap-4 text-sm'>
          <Link href={followingHref} className='hover:underline'>
            <span className='font-semibold'>{followingCount}</span>
            <span className='text-muted-foreground ml-1'>フォロー中</span>
          </Link>
          <Link href={followersHref} className='hover:underline'>
            <span className='font-semibold'>{followersCount}</span>
            <span className='text-muted-foreground ml-1'>フォロワー</span>
          </Link>
        </div>

        {/* 下段: 自己紹介 */}
        {userProfileData.bio && (
          <p className='text-sm text-center sm:text-left max-w-prose whitespace-pre-wrap'>
            {" "}
            {/* 改行を反映 */}
            {userProfileData.bio}
          </p>
        )}
      </div>
    </section>
  );
}
