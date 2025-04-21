// components/component/posts/PostForm.tsx
"use client";

import { useEffect,useState } from "react";
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
import { Loader2 } from "@/components/component/Icons"; // Loader2 アイコンをインポート

export default function PostForm() {
  // ★ useUser フックでログインユーザー情報を取得 ★
  const { user, isLoaded } = useUser();
  const { toast } = useToast(); // Toast フックを使用
  const [content, setContent] = useState(""); // フォームの内容を管理する State

  // フォームの内容を管理する State
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    createPostAction,
    null // 初期状態
  );

  // フォーム送信成功/失敗時の処理 (Toast を使用)
  useEffect(() => {
    if (state?.success === true) {
      setContent(""); // フォームをリセット
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

  const isSubmitDisabled = isPending || content.trim().length === 0 // フォームが送信中か、内容が空かをチェック

  return (
    <div className='flex space-x-4 p-4 border-b'> 
      {/* ★ ログインユーザーのアバターを表示 ★ */}
      <Avatar>
        <AvatarImage src={user.imageUrl} />
        <AvatarFallback>
          {user.firstName?.charAt(0) ?? user.username?.charAt(0) ?? "?"}
        </AvatarFallback>
      </Avatar>
      <form action={formAction} className='flex-1 space-y-2'>
        <Textarea
          name='content'
          placeholder='いまどうしてる？'
          rows={3}
          maxLength={280}
          className='w-full resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent' // 背景透明化
          disabled={isPending}
          value={content} // State から値を取得
          onChange={(e) => setContent(e.target.value)} // 入力時に State を更新
        />
        <div className='flex justify-end'>
          <Button type='submit' disabled={isSubmitDisabled} size={"sm"}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isPending ? "投稿中..." : "投稿する"}
          </Button>
        </div>
      </form>
    </div>
  );
}