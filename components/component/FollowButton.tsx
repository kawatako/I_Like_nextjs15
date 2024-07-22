"use client";

import React, { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { followAction } from "@/lib/actions";

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
  const [hover, setHover] = useState(false);

  const getButtonContent = () => {
    if (isCurrentUser) {
      return "プロフィール編集";
    }
    if (isFollowing) {
      return hover ? "フォローを外す" : "フォロー中";
    }
    return "フォローする";
  };

  const getButtonVariant = (): "default" | "outline" | "secondary" => {
    if (isCurrentUser) {
      return "secondary";
    }
    if (isFollowing) {
      return "outline";
    }
    return "default";
  };

  return (
    <form action={followAction.bind(null, userId)}>
      <Button
        variant={getButtonVariant()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {getButtonContent()}
      </Button>
    </form>
  );
};

export default FollowButton;
