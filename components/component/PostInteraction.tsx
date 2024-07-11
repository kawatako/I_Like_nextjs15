"use client";

import React, {
  startTransition,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { HeartIcon, MessageCircleIcon, Share2Icon } from "./Icons";
import { Button } from "../ui/button";
import { likeAction } from "@/lib/actions";
import { useAuth } from "@clerk/nextjs";

//https://github.com/safak/next-social/blob/completed/src/lib/actions.ts

const PostInteraction = ({
  postId,
  likes,
  commentNumber,
}: {
  postId: string;
  likes: string[];
  commentNumber: number;
}) => {
  const { userId } = useAuth();
  //   const [likeState, setLikeState] = useState({
  //     likeCount: likes.length,
  //     isLiked: userId ? likes.includes(userId) : false,
  //   });
  const initialLikeState = {
    likeCount: likes.length,
    isLiked: userId ? likes.includes(userId) : false,
  };

  console.log(initialLikeState);

  const [optimisticLikes, addOptimisticLike] = useOptimistic<any, any>(
    initialLikeState,
    (currentState, newState) => {
      return newState;
    }
  );

  const handleLikeSubmit = async () => {
    const newIsLiked = !optimisticLikes.isLiked;
    startTransition(async () => {
      addOptimisticLike(newIsLiked);
      try {
        await likeAction(postId);
      } catch (err) {
        console.log(err);
      }
    });

    // try {
    //   await likeAction(postId);
    //   // setLikeState((state) => ({
    //   //   likeCount: likeState.isLiked
    //   //     ? state.likeCount - 1
    //   //     : state.likeCount + 1,
    //   //   isLiked: !state.isLiked,
    //   // }));
    // } catch (err) {
    //   console.log(err);
    // }
  };

  return (
    <div className="flex items-center">
      <form action={handleLikeSubmit}>
        <Button variant="ghost" size="icon">
          <HeartIcon
            className={`h-5 w-5 ${
              optimisticLikes.isLiked
                ? "text-destructive"
                : "text-muted-foreground"
            }`}
            fill={optimisticLikes.isLiked ? "currentColor" : "none"}
            stroke={optimisticLikes.isLiked ? "none" : "currentColor"}
          />
        </Button>
      </form>
      <span
        className={`-ml-1 ${optimisticLikes.isLiked ? "text-destructive" : ""}`}
      >
        {optimisticLikes.likeCount}
      </span>
      <Button variant="ghost" size="icon">
        <MessageCircleIcon className="h-5 w-5 text-muted-foreground" />
      </Button>
      <Button variant="ghost" size="icon">
        <Share2Icon className="h-5 w-5 text-muted-foreground" />
      </Button>
    </div>
  );
};

export default PostInteraction;
