"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { Sentiment } from "@prisma/client"; // Prisma Client から Enum をインポート
import { createRankingListAction } from "@/lib/actions/rankingActions"; // Server Action をインポート (パスは適宜調整)
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/component/SubmitButton"; // 既存の SubmitButton を利用
import { useRouter } from 'next/navigation';

// Server Action の戻り値の型 (actions.ts で定義したものと同じか、インポート)
type FormState = {
  error?: string;
  success: boolean;
  // (オプション) 成功時に新しいリストIDを返すように actions.ts を変更する場合
  newListId?: string; // actions.ts で作成したリストのIDを格納
};

const initialState: FormState = {
  success: false,
};

export function RankingListForm() {
  const [state, formAction] = useActionState(createRankingListAction, initialState);
  const formRef = useRef<HTMLFormElement>(null); // フォームリセット用
  const router = useRouter(); // ルーターを使用してページ遷移

  // 成功時(state.success が true になった時)にフォームをリセット
  useEffect(() => {
    if (state.success && state.newListId) {
      formRef.current?.reset();
      // ここで成功メッセージ表示やページ遷移などの追加処理も可能
      console.log(`RankingList ${state.newListId} created! Redirecting to edit page...`);
      // ★ 編集ページ（例）へリダイレクト ★
      // パスは実際に作成する編集ページのパスに合わせてください
      router.push(`/rankings/${state.newListId}/edit`);
    } else if (state.success) {
        // newListId が返ってこない場合 (念のためのフォールバック)
        formRef.current?.reset();
        console.log("RankingList created successfully! (No redirect ID)");
    }
  }, [state.success, state.newListId, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {/* 感情 (Sentiment) 選択 */}
      <div>
        <Label htmlFor="sentiment">ランキングの種類</Label>
        <Select name="sentiment" required>
          <SelectTrigger id="sentiment">
            <SelectValue placeholder="種類を選択..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={Sentiment.LIKE}>好き</SelectItem>
            <SelectItem value={Sentiment.DISLIKE}>嫌い</SelectItem>
          </SelectContent>
        </Select>
        {/* 補足: valueにはSentiment Enumの実際の値 ('LIKE', 'DISLIKE') が入ります */}
      </div>

      {/* テーマ (Subject) 入力 */}
      <div>
        <Label htmlFor="subject">テーマ（〇〇の部分）</Label>
        <Input
          id="subject"
          name="subject"
          type="text"
          placeholder="例: 2025年上半期の映画"
          required
          maxLength={50} // actions.ts のバリデーションと合わせる
        />
        {/* ここに将来的にサジェスト機能を追加 */}
      </div>

      {/* 説明 (Description) 入力 (任意) */}
      <div>
        <Label htmlFor="description">リストの説明（任意）</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="このランキングについての簡単な説明"
          rows={3}
        />
      </div>

      {/* エラーメッセージ表示 */}
      {state?.error && (
        <p className="text-sm text-red-500 whitespace-pre-wrap">
          {state.error}
        </p>
      )}

       {/* 成功メッセージ表示 (任意) */}
       {state?.success && !state.error && (
        <p className="text-sm text-green-500">
            ランキングリストが作成されました！
        </p>
       )}

      {/* 送信ボタン */}
      <SubmitButton />
      {/* <Button type="submit">リスト作成</Button> */}
      {/* ↑ SubmitButton を使わない場合は通常の Button でも可 */}
    </form>
  );
}