"use client";

import React, { useOptimistic, useState } from "react";
import { Button } from "@/components/ui/button";
import { followAction } from "@/lib/actions/followActions";

interface FollowButtonProps {
  isFollowing: boolean;
  userId: string;
  isCurrentUser: boolean;
}

const FollowButton = ({
  isFollowing,
  userId,
  isCurrentUser,
}: FollowButtonProps) => {
  const [optimisticFollow, addOptimisticFollow] = useOptimistic<
    { isFollowing: boolean },
    void
  >({ isFollowing }, (currentState) => ({
    isFollowing: !currentState.isFollowing,
  }));

  const getButtonContent = () => {
    if (isCurrentUser) {
      return "プロフィール編集";
    }
    if (optimisticFollow.isFollowing) {
      return "フォロー中";
    }
    return "フォローする";
  };

  const getButtonVariant = (): "default" | "outline" | "secondary" => {
    if (isCurrentUser) {
      return "secondary";
    }
    if (optimisticFollow.isFollowing) {
      return "outline";
    }
    return "default";
  };

  const handleFollowAction = async (formData: FormData) => {
    if (!isCurrentUser) {
      addOptimisticFollow();
    }
    try {
      await followAction(userId);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    // <form action={followAction.bind(null, userId)}>
    <form action={handleFollowAction}>
      <Button className="w-full" variant={getButtonVariant()}>
        {getButtonContent()}
      </Button>
    </form>
  );
};

export default FollowButton;
