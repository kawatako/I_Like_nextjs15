// components/component/profile/FollowButton.tsx
"use client";

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from "@/components/component/Icons";
import { useToast } from "@/components/hooks/use-toast";
// ★ 関連するサーバーアクションをインポート
import {
  followUserAction,
  unfollowUserAction,
  cancelFollowRequestAction
} from '@/lib/actions/followActions';
import type { FollowStatusInfo, FollowStatus } from '@/lib/types';

interface FollowButtonProps {
  targetUserId: string;                  // フォロー対象ユーザーの DB ID
  targetUsername: string;                // フォロー対象ユーザーの username (キャッシュ再検証用)
  initialFollowStatusInfo: FollowStatusInfo; // サーバーから渡される初期状態
}

export function FollowButton({ targetUserId, targetUsername, initialFollowStatusInfo }: FollowButtonProps) {
  const { toast } = useToast();
  // ボタンの現在の状態を管理 (初期値はサーバーから取得したもの)
  const [currentStatus, setCurrentStatus] = useState<FollowStatus>(initialFollowStatusInfo.status);
  // サーバーアクション実行中のローディング状態
  const [isPending, startTransition] = useTransition();
  // フォロー中/リクエスト済み ボタンのホバー状態 (表示切り替え用)
  const [isHovering, setIsHovering] = useState(false);

  // initialFollowStatusInfo が変更された場合（ページ遷移など）に state を更新
  useEffect(() => {
    setCurrentStatus(initialFollowStatusInfo.status);
  }, [initialFollowStatusInfo.status]);


  // ボタンクリック時の処理
  const handleClick = () => {
    // すでに処理中の場合は何もしない
    if (isPending) return;

    // サーバーアクションを呼び出し、完了後に状態を更新
    startTransition(async () => {
      let result; // アクション結果を格納
      try {
        // 現在のフォロー状態に応じて呼び出すアクションを分岐
        if (currentStatus === "FOLLOWING") {
          result = await unfollowUserAction(targetUserId);
          if (result.success) {
            setCurrentStatus("NOT_FOLLOWING"); // 状態を更新
            toast({ title: `@${targetUsername} のフォローを解除しました` });
          } else { throw new Error(result.error); }

        } else if (currentStatus === "NOT_FOLLOWING" || currentStatus === "REQUEST_RECEIVED") {
          // REQUEST_RECEIVED は相手からのリクエストなので、こちらからはフォロー/リクエストアクションが可能
          result = await followUserAction(targetUserId);
          if (result.success) {
             // 相手が非公開かどうかに基づいて状態を更新
            const nextStatus = initialFollowStatusInfo.targetIsPrivate ? "REQUEST_SENT" : "FOLLOWING";
            setCurrentStatus(nextStatus);
            toast({ title: nextStatus === "REQUEST_SENT" ? `@${targetUsername} にフォローリクエストを送信しました` : `@${targetUsername} をフォローしました` });
          } else { throw new Error(result.error); }

        } else if (currentStatus === "REQUEST_SENT") {
          result = await cancelFollowRequestAction(targetUserId);
          if (result.success) {
            setCurrentStatus("NOT_FOLLOWING"); // 状態を更新
            toast({ title: `@${targetUsername} へのフォローリクエストを取り消しました` });
          } else { throw new Error(result.error); }
        }
        // 他の状態 (SELF, CANNOT_FOLLOW など) ではボタンは disabled になっているはず
      } catch (error) {
        console.error("Follow button action failed:", error);
        toast({ title: "エラー", description: error instanceof Error ? error.message : "操作に失敗しました", variant: "destructive" });
        // エラー発生時は状態を元に戻すことも検討 (ここでは行わない)
      }
    });
  };

  // --- ボタンの表示内容とスタイルを決定 ---
  let buttonText: string = "";
  let buttonVariant: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link" = "secondary"; // デフォルトは secondary
  let isDisabled = isPending; // 処理中は常に無効
  let showHoverEffect = false;

  switch (currentStatus) {
    case "FOLLOWING":
      buttonText = isHovering ? "フォロー解除" : "フォロー中";
      buttonVariant = isHovering ? "destructive" : "outline";
      showHoverEffect = true; // ホバー効果を有効に
      break;
    case "REQUEST_SENT":
      buttonText = isHovering ? "リクエスト取消" : "リクエスト済み";
      buttonVariant = isHovering ? "destructive" : "outline";
      showHoverEffect = true; // ホバー効果を有効に
      break;
    case "NOT_FOLLOWING":
    case "REQUEST_RECEIVED": // 相手のプロフィールでは「フォローする/リクエスト」ボタンを表示
      buttonText = initialFollowStatusInfo.targetIsPrivate ? "フォローリクエスト" : "フォローする";
      buttonVariant = "default"; // フォローを促すスタイル
      break;
    case "CANNOT_FOLLOW": // 拒否された場合など
      buttonText = "リクエストできません";
      buttonVariant = "secondary";
      isDisabled = true; // クリック不可
      break;
    case "SELF":
      // 自分自身の場合は ProfileHeader 側で「編集」ボタンが表示されるので、
      // このコンポーネントはレンダリングされないはず。念のため null を返す。
      return null;
    default:
      // 不明な状態やエラー時
      buttonText = "状態不明";
      isDisabled = true;
  }
  // --- 表示決定ここまで ---

  return (
    <Button
      variant={buttonVariant}
      onClick={handleClick}
      disabled={isDisabled} // 処理中 or フォロー不可なら disabled
      // ホバー効果が必要な場合に onMouseEnter/Leave を設定
      onMouseEnter={() => { if(showHoverEffect) setIsHovering(true) }}
      onMouseLeave={() => { if(showHoverEffect) setIsHovering(false) }}
      // アクセシビリティのためのラベル
      aria-label={`${buttonText} ${targetUsername}`}
      size="sm" // サイズは ProfileHeader に合わせて調整
    >
      {/* 処理中ならスピナーを表示 */}
      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {buttonText}
    </Button>
  );
}