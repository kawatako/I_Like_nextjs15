"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "./client";
import { z } from "zod";

export async function addPostAction(formData: FormData) {
  const postText = formData.get("post") as string;
  const PostTextSchema = z.string().min(1).max(255);

  const validatePostText = PostTextSchema.safeParse(postText);

  if (!validatePostText.success) {
    console.log("postText is not valid");
    return;
  }

  const { userId } = auth();

  if (!userId) {
    throw new Error("User is not authenticated");
  }

  try {
    await prisma.post.create({
      data: {
        authorId: userId,
        content: postText,
      },
    });
  } catch (err) {
    console.log(err);
  }
}
