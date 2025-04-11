// components/component/posts/PostForm.tsx
"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react"; // ★ インポート元を 'react' に変更し、useActionState を使う
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createPostAction, CreatePostActionResult } from "@/lib/actions/postActions";

// 仮のユーザー情報
const currentUser = {
  imageUrl: "/placeholder-user.png",
  fallback: "U",
};

// SubmitButton は不要になるか、isPending を props で受け取る形になる
// ここでは PostForm 内で isPending を直接使うため不要

export default function PostForm() {
  // ★ useActionState を使用 ★
  // 戻り値に isPending が含まれる
  const [state, formAction, isPending] = useActionState<CreatePostActionResult | null, FormData>(
     createPostAction,
     null // 初期状態
  );

  const formRef = useRef<HTMLFormElement>(null); // フォームリセット用

  // フォーム送信成功/失敗時の処理 (useEffect はそのまま)
  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset(); // フォームの内容をリセット
      console.log(state.message); // 例: 成功メッセージ
    } else if (state && !state.success && state.message) {
       console.error(state.message); // 例: エラーメッセージ
       // ここで Toast を表示するなど
    }
  }, [state]);

  return (
    <div className='flex space-x-4 border-b p-4'>
      <Avatar>
        <AvatarImage src={currentUser.imageUrl} />
        <AvatarFallback>{currentUser.fallback}</AvatarFallback>
      </Avatar>
      {/* action には useActionState が返した formAction を渡す */}
      <form ref={formRef} action={formAction} className='flex-1 space-y-2'>
        <Textarea
          name='content' // name 属性は必須
          placeholder='いまどうしてる？'
          rows={3}
          maxLength={280}
          className='w-full resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0'
          disabled={isPending} // ★ isPending を直接利用
          key={state?.success ? Date.now() : 'content-area'} // リセット用の key (任意)
        />
        {/* エラーメッセージ表示 */}
        {state && !state.success && state.message && (
          <p className="text-sm text-red-500">{state.message}</p>
        )}
        <div className='flex justify-end'>
          {/* ボタンの disabled と表示内容に isPending を直接利用 */}
          <Button type='submit' disabled={isPending}>
            {isPending ? "投稿中..." : "投稿する"}
          </Button>
        </div>
      </form>
    </div>
  );
}