// components/profile/FollowButton.tsx
"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "@/components/Icons";
import { useToast } from "@/lib/hooks/use-toast";
import { useAuth } from "@clerk/nextjs";
import {
  followUserAction,
  unfollowUserAction,
} from "@/lib/actions/followActions";
import type { FollowStatusInfo } from "@/lib/types";

interface Props {
  targetUserId: string;
  targetUsername: string;
  initialFollowStatusInfo: FollowStatusInfo;
}

export function FollowButton({
  targetUserId,
  targetUsername,
  initialFollowStatusInfo,
}: Props) {
  const { isSignedIn } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState(initialFollowStatusInfo.status);
  const [isPending, startTransition] = useTransition();

  // ページ遷移時に初期値をリセット
  useEffect(() => {
    setStatus(initialFollowStatusInfo.status);
  }, [initialFollowStatusInfo.status]);

  // 自分自身の場合は何も表示しない
  if (!isSignedIn || status === "SELF") return null;

  const handleClick = () => {
    if (isPending) return;

    startTransition(async () => {
      try {
        if (status === "FOLLOWING") {
          const res = await unfollowUserAction(targetUserId);
          if (res.success) {
            setStatus("NOT_FOLLOWING");
            toast({ title: `@${targetUsername} のフォローを解除しました` });
          } else {
            throw new Error(res.error);
          }
        } else {
          const res = await followUserAction(targetUserId);
          if (res.success) {
            setStatus("FOLLOWING");
            toast({ title: `@${targetUsername} をフォローしました` });
          } else {
            throw new Error(res.error);
          }
        }
      } catch (err: any) {
        toast({
          title: "エラー",
          description: err.message,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      variant={status === "FOLLOWING" ? "outline" : "default"}
      size='sm'
      aria-label={`${
        status === "FOLLOWING" ? "フォロー中" : "フォローする"
      } @${targetUsername}`}
    >
      {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
      {status === "FOLLOWING" ? "フォロー中" : "フォローする"}
    </Button>
  );
}
