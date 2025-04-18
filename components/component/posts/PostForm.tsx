// components/component/posts/PostForm.tsx
"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
// ★ postActions と ActionResult 型をインポート ★
import { createPostAction } from "@/lib/actions/postActions";
import type { ActionResult } from "@/lib/types"; // 共通の ActionResult 型
// ★ Clerk の useUser フックをインポート ★
import { useUser } from "@clerk/nextjs";
// ★ Toast フックをインポート ★
import { useToast } from "@/components/hooks/use-toast";
import { Loader2 } from "lucide-react"; // ローディング表示用

export default function PostForm() {
  // ★ useUser フックでログインユーザー情報を取得 ★
  const { user, isLoaded } = useUser();
  const { toast } = useToast(); // Toast フックを使用
  const formRef = useRef<HTMLFormElement>(null);

  // ★ useActionState の型引数を ActionResult に変更 ★
  //    createPostAction の戻り値も Promise<ActionResult> になっている想定
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    createPostAction,
    null // 初期状態
  );

  // フォーム送信成功/失敗時の処理 (Toast を使用)
  useEffect(() => {
    if (state?.success === true) {
      formRef.current?.reset(); // フォームの内容をリセット
      toast({ title: "投稿しました！" }); // 成功メッセージ
    } else if (state?.success === false && state.error) {
      toast({ // エラーメッセージ
        title: "投稿エラー",
        description: state.error,
        variant: "destructive",
      });
    }
  }, [state, toast]); // toast も依存配列に追加

  // Clerk がユーザー情報を読み込んでいる間は何も表示しないか、ローディング表示
  if (!isLoaded) {
    return <div className="p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  // 未ログイン時はフォームを表示しない（またはログインを促す）
  if (!user) {
    return <div className="p-4 text-center text-muted-foreground">投稿するにはログインしてください。</div>;
  }

  return (
    <div className='flex space-x-4 p-4 border-b'> {/* スタイル調整 */}
      {/* ★ ログインユーザーのアバターを表示 ★ */}
      <Avatar>
        <AvatarImage src={user.imageUrl} />
        <AvatarFallback>
          {user.firstName?.charAt(0) ?? user.username?.charAt(0) ?? "?"}
        </AvatarFallback>
      </Avatar>
      <form ref={formRef} action={formAction} className='flex-1 space-y-2'>
        <Textarea
          name='content'
          placeholder='いまどうしてる？'
          rows={3}
          maxLength={280}
          className='w-full resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent' // 背景透明化
          disabled={isPending}
          // key={state?.success ? Date.now() : "content-area"} // formRef.reset()を使うなら不要かも
        />
        {/* エラーメッセージ表示 (必要なら) */}
        {/* {state && !state.success && state.error && (
          <p className='text-sm text-red-500'>{state.error}</p>
        )} */}
        <div className='flex justify-end'>
          <Button type='submit' disabled={isPending || !formRef.current?.content.value.trim()} size="sm"> {/* 送信ボタンサイズ、空文字無効化 */}
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isPending ? "投稿中..." : "投稿する"}
          </Button>
        </div>
      </form>
    </div>
  );
}