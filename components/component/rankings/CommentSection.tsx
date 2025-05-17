'use client';

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  useRankingListComments,
  RankingComment,
} from "@/components/hooks/useRankingListComments";

interface Props {
  listId: string;
}

export default function CommentSection({ listId }: Props) {
  const { isSignedIn } = useAuth();
  const { comments, isLoading, isError, postComment } =
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
          <Button type="submit" className="mt-2">
            投稿
          </Button>
        </form>
      )}

      <div className="space-y-3">
        {comments.map((c: RankingComment) => (
          <Link
            key={c.id}
            href={`/profile/${c.user.username}`}
            className="block p-3 bg-gray-50 rounded hover:bg-gray-100"
          >
            <div className="flex items-center mb-1">
              <strong className="text-base">{c.user.name ?? c.user.username}</strong>
              <span className="ml-2 text-sm text-muted-foreground">
                @{c.user.username}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(c.createdAt).toLocaleString()}
              </span>
            </div>
            <p>{c.content}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
