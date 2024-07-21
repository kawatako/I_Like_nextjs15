"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "./client";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";

type State = {
  error?: string;
  success: boolean;
};

type LikeState = {
  likes: string[];
  error?: string | undefined;
};

export async function addPostAction(
  prevState: State,
  formData: FormData
): Promise<State> {
  const PostTextSchema = z
    .string()
    .min(1, "ポスト内容を入力してください。")
    .max(140, "140字以内で入力してください。");

  try {
    const postText = PostTextSchema.parse(formData.get("post") as string);

    const { userId } = auth();

    if (!userId) {
      throw new Error("User is not authenticated");
    }

    // await new Promise((resolve) => setTimeout(resolve, 3000));

    await prisma.post.create({
      data: {
        authorId: userId,
        content: postText,
      },
    });

    revalidatePath("/");
    // revalidateTag("posts");

    return {
      success: true,
      error: undefined,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: error.errors.map((e) => e.message).join(", "),
        success: false,
      };
    } else if (error instanceof Error) {
      return {
        //その他のエラー
        success: false,
        error: error.message,
      };
    } else {
      //予期せぬエラー
      return {
        success: false,
        error: "An unexpected error occurred",
      };
    }
  }
}

export const likeAction = async (
  formData: FormData
  // postId: string
) => {
  const { userId } = auth();

  if (!userId) {
    return { likes: [], error: "User is not authenticated" };
  }

  const postId = formData.get("postId") as string;

  try {
    const existingLike = await prisma.like.findFirst({
      where: {
        postId,
        userId,
      },
    });

    if (existingLike) {
      await prisma.like.delete({
        where: {
          id: existingLike.id,
        },
      });

      revalidatePath("/");
    } else {
      await prisma.like.create({
        data: {
          postId,
          userId,
        },
      });

      revalidatePath("/");
    }
  } catch (err) {
    console.log(err);
  }
};

export const followAction = async (userId: string) => {
  const { userId: currentUserId } = auth();

  if (!currentUserId) {
    throw new Error("User is not authenticated");
  }

  try {
    //unfollow
    const existingFollow = await prisma.follow.findFirst({
      where: {
        followerId: currentUserId,
        followingId: userId,
      },
    });

    if (existingFollow) {
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: userId,
          },
        },
      });
    } else {
      //follow
      await prisma.follow.create({
        data: {
          followerId: currentUserId,
          followingId: userId,
        },
      });
    }

    revalidatePath(`/profile/${userId}`);
    revalidatePath(`/profile/${currentUserId}`);
  } catch (err) {
    console.log(err);
    throw new Error("Something went wrong");
  }
};
