// components/component/feeds/cards/CardHeader.tsx
"use client"; // ★ インタラクションを持つため Client Component に ★

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserSnippet } from "@/lib/types";
import { formatDistanceToNowStrict } from "date-fns";
import { ja } from "date-fns/locale";
// ★ Button, AlertDialog, Icons をインポート ★
import { Button } from "@/components/ui/button";
import { TrashIcon, Loader2 } from "@/components/component/Icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ★ Props に isOwner, onDelete, isDeleting を追加 ★
interface CardHeaderProps {
  user: UserSnippet | null;
  createdAt: Date | null;
  feedItemId: string | null;
  isOwner: boolean; // このアイテムがログインユーザー自身のものか
  onDelete: () => void; // 削除ボタンが押されたときに呼び出す関数
  isDeleting: boolean; // 削除処理が実行中か (ボタンのローディング表示用)
}

export default function CardHeader({
  user,
  createdAt,
  feedItemId,
  isOwner, // ★ Props で受け取る ★
  onDelete, // ★ Props で受け取る ★
  isDeleting, // ★ Props で受け取る ★
}: CardHeaderProps) {
  // user や createdAt が null の場合のガード
  if (!user || !createdAt || !feedItemId) {
    return <div className='h-10'></div>;
  }

  const timeAgo = formatDistanceToNowStrict(new Date(createdAt), {
    addSuffix: true,
    locale: ja,
  });

  return (
    <div className='flex items-center space-x-3'>
      {/* Left: Avatar */}
      <div>
        <Link href={`/profile/${user.username}`}>
          <Avatar className='w-10 h-10'>
            <AvatarImage src={user.image ?? undefined} />
            <AvatarFallback>
              {user.name
                ? user.name.charAt(0).toUpperCase()
                : user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>

      {/* Right: User Info & Timestamp & Actions */}
      <div className='flex-1 flex items-center space-x-1 text-sm min-w-0'>
        {" "}
        {/* ★ min-w-0 を追加して内容の省略を有効に */}
        {/* User Info */}
        <div className='flex-shrink truncate mr-1'>
          {" "}
          {/* ★ 名前/ユーザー名が長い場合に省略されるように */}
          <Link
            href={`/profile/${user.username}`}
            className='font-semibold hover:underline text-gray-900 dark:text-gray-100 truncate'
          >
            {user.name ?? user.username}
          </Link>
          <span className='text-gray-500 dark:text-gray-400 ml-1 truncate'>
            @{user.username}
          </span>
        </div>
        {/* Timestamp */}
        <span className='text-gray-500 dark:text-gray-400 flex-shrink-0'>
          ·
        </span>
        <Link
          href={`/feeds/${feedItemId}`}
          className='text-gray-500 dark:text-gray-400 hover:underline flex-shrink-0'
        >
          <time dateTime={new Date(createdAt).toISOString()}>{timeAgo}</time>
        </Link>
        {/* ★★★ 削除ボタン (自分の投稿の場合のみ表示) ★★★ */}
        {isOwner && (
          <div className='ml-auto flex-shrink-0'>
            {" "}
            {/* 右端に配置 */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7'
                  disabled={isDeleting}
                  title='削除する'
                >
                  {isDeleting ? (
                    <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
                  ) : (
                    <TrashIcon className='h-4 w-4 text-muted-foreground hover:text-destructive' />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  {/* TODO: 削除対象に応じてタイトルを変える */}
                  <AlertDialogTitle>投稿を削除しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    この操作は元に戻せません。関連する情報も削除される場合があります。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} disabled={isDeleting}>
                    {isDeleting ? "削除中..." : "削除する"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
        {/* ★★★ 削除ボタンここまで ★★★ */}
      </div>
    </div>
  );
}
