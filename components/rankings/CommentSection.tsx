// components/rankings/CommentSection.tsx
'use client';

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  useRankingListComments,
  RankingComment,
} from "@/lib/hooks/useRankingListComments";
import { DateText } from "@/components/Date.Text"

interface Props {
  listId: string;
}

export default function CommentSection({ listId }: Props) {
  const { isSignedIn } = useAuth();
  const { comments, isLoading, isError, postComment, deleteComment } =
    useRankingListComments(listId);
  const [draft, setDraft] = useState("");

  if (isLoading) return <p>Loading comments…</p>;
  if (isError) return <p className="text-red-500">Failed to load comments</p>;

  return (
    <div className="space-y-4">
      {isSignedIn && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await postComment(draft);
            setDraft("");
          }}
        >
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            placeholder="コメントを入力…"
            required
          />
          {/* 投稿ボタンを右寄せ */}
          <div className="flex justify-end mt-2">
            <Button type="submit">
              投稿
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {comments.map((c: RankingComment) => (
          <div
            key={c.id}
            className="relative block p-3 bg-gray-50 rounded hover:bg-gray-100"
          >
            <Link
              href={`/profile/${c.user.username}`}
              className="flex items-center mb-1"
            >
              <strong className="text-base">{c.user.name ?? c.user.username}</strong>
              <span className="ml-2 text-sm text-muted-foreground">
                @{c.user.username}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
              <DateText date={c.createdAt} />
              </span>
            </Link>
            <p className="mb-6">{c.content}</p> {/* 下に余白を確保 */}

            {/* 自分のコメントなら削除ボタン表示をカード右下へ */}
            {isSignedIn && (
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  if (confirm("コメントを削除しますか？")) {
                    try {
                      await deleteComment(c.id);
                    } catch (err: any) {
                      alert(err.message);
                    }
                  }
                }}
                className="absolute bottom-2 right-2 text-red-500 hover:text-red-700"
                title="コメントを削除"
              >
                🗑️
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
