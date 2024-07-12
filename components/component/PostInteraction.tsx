"use client";

import React, {
  startTransition,
  useId,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { HeartIcon, MessageCircleIcon, Share2Icon } from "./Icons";
import { Button } from "../ui/button";
import { likeAction } from "@/lib/actions";
import { useAuth } from "@clerk/nextjs";
import { useFormState } from "react-dom";

type LikeState = {
  likes: string[];
  error?: string | undefined;
};

const PostInteraction = ({
  postId,
  likes,
  commentNumber,
}: {
  postId: string;
  likes: string[];
  commentNumber: number;
}) => {
  //   const [likeState, setLikeState] = useState({
  //     likeCount: likes.length,
  //     isLiked: userId ? likes.includes(userId) : false,
  //   });

  const { userId } = useAuth();

  const initialState = {
    likes,
    error: undefined,
  };

  const [state, formAction] = useFormState(likeAction, initialState);
  const isLiked = userId ? state.likes.includes(userId) : false;

  return (
    <div className="flex items-center">
      <form
        action={formAction}
        // onSubmit={handleLikeSubmit}
      >
        <input type="hidden" name="postId" value={postId} />
        <Button variant="ghost" size="icon">
          <HeartIcon
            className={`h-5 w-5 ${
              isLiked ? "text-destructive" : "text-muted-foreground"
            }`}
            fill={isLiked ? "currentColor" : "none"}
            stroke={isLiked ? "none" : "currentColor"}
          />
        </Button>
      </form>
      <span className={`-ml-1 ${isLiked ? "text-destructive" : ""}`}>
        {state.likes.length}
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
