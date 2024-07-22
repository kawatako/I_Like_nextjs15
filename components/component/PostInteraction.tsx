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

interface LikeState {
  count: number;
  isLiked: boolean;
}

const PostInteraction = ({
  postId,
  // likes,
  initialLikes,
  // initialIsLiked,
  commentNumber,
}: {
  postId: string;
  // likes: string[];
  initialLikes: string[];
  // initialIsLiked: boolean;
  commentNumber: number;
}) => {
  //   const [likeState, setLikeState] = useState({
  //     likeCount: likes.length,
  //     isLiked: userId ? likes.includes(userId) : false,
  //   });

  const { userId } = useAuth();

  const initialState: LikeState = {
    count: initialLikes.length,
    isLiked: userId ? initialLikes.includes(userId) : false,
  };

  // const initialState = {

  //   likes,
  //   error: undefined,
  // };

  // const [state, formAction] = useFormState(likeAction, initialState);

  const [optimisticLike, addOptimisticLike] = useOptimistic<LikeState, void>(
    initialState,
    //updateFn
    (currentState) => ({
      count: currentState.isLiked
        ? currentState.count - 1
        : currentState.count + 1,
      isLiked: !currentState.isLiked,
    })
  );

  const handleLikeSubmit = async (formData: FormData) => {
    addOptimisticLike();

    try {
      await likeAction(formData);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="flex items-center">
      <form
        // action={formAction}
        action={handleLikeSubmit}
      >
        <input type="hidden" name="postId" value={postId} />
        <Button variant="ghost" size="icon">
          <HeartIcon
            className={`h-5 w-5 ${
              optimisticLike.isLiked
                ? "text-destructive"
                : "text-muted-foreground"
            }`}
            fill={optimisticLike.isLiked ? "currentColor" : "none"}
            stroke={optimisticLike.isLiked ? "none" : "currentColor"}
          />
        </Button>
      </form>
      <span
        className={`-ml-1 ${optimisticLike.isLiked ? "text-destructive" : ""}`}
      >
        {optimisticLike.count}
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
