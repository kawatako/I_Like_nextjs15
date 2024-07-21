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

  return (
    <div>
      <form action={followAction.bind(null, userId)}>
        {isCurrentUser ? (
          <Button className="w-full">Edit Profile</Button>
        ) : isFollowing ? (
          <Button
            className={cn(
              buttonVariants({ variant: isFollowing ? "outline" : "default" }),
              "w-full",
              isFollowing
                ? "bg-white hover:bg-gray-100 text-gray-800 hover:text-white"
                : " text-white",
              "transition-colors duration-200 hover:bg-slate-700"
            )}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
          >
            {hover ? "フォローを外す" : "フォロー中"}
          </Button>
        ) : (
          <Button className="w-full">フォローする</Button>
        )}
      </form>
    </div>
  );
};

export default FollowButton;
