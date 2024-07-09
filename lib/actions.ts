"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "./client";
import { z } from "zod";
import { revalidatePath } from "next/cache";

type State = {
  error?: string;
  success: boolean;
};

export async function addPostAction(formData: FormData): Promise<State> {
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

export const likeAction = async (postId: string) => {
  const { userId } = auth();

  if (!userId) throw new Error("User is not authenticated");

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
    } else {
      await prisma.like.create({
        data: {
          postId,
          userId,
        },
      });
    }
  } catch (err) {
    console.log(err);
    throw new Error("Something went wrong");
  }
};
