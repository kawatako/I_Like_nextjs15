// components/posts/PostForm.tsx
"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { addPostAction } from "@/lib/actions/postActions";
import { useCallback, useRef, useState } from "react";
import { SubmitButton } from "../SubmitButton";
import { useFormState } from "react-dom";
import { UserData } from "@/types/user";

interface LeftSidebarProps {
  currentLoginUserData: UserData | null;
}

export default function PostForm({ currentLoginUserData }: LeftSidebarProps) {
  const initialState = {
    error: undefined,
    success: false,
  };
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction] = useFormState(addPostAction, initialState);

  if (state.success && formRef.current) {
    formRef.current.reset();
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar className="w-10 h-10">
          <AvatarImage src={currentLoginUserData?.image ?? undefined} />
          <AvatarFallback>AC</AvatarFallback>
        </Avatar>
        <form
          ref={formRef}
          action={formAction}
          className="flex items-center flex-1"
        >
          <Input
            type="text"
            placeholder="What's on your mind?"
            className="flex-1 rounded-full bg-muted px-4 py-2"
            name="post"
          />
          <SubmitButton />
        </form>
      </div>
      {state.error && (
        <p className="text-red-500 mt-1 flex items-center ml-14">
          {state.error}
        </p>
      )}
    </div>
  );
}
