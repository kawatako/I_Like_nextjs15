"use client";

import { Button } from "@/components/ui/button";
import { SendIcon } from "./Icons";
import { useFormState, useFormStatus } from "react-dom";
import { addPostAction } from "@/lib/actions";
import { useActionState } from "react";

// 初期状態の型定義
type State = {
  error?: string;
  success: boolean;
};

const initialState: State = {
  success: false,
};

export function SubmitButton() {
  const { pending } = useFormStatus();
  const [state, formAction] = useFormState(addPostAction, initialState);

  return (
    <>
      <Button type="submit" variant="ghost" size="icon" disabled={pending}>
        <SendIcon className="h-5 w-5 text-muted-foreground" />
        <span className="sr-only">Post</span>
      </Button>
      {state.error && <p className="text-red-500 mt-2">{state.error}</p>}
      {state.success && (
        <p className="text-green-500 mt-2">投稿が成功しました！</p>
      )}
    </>
  );
}
