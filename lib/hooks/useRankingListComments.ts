//component/hooks/useRankingListComments.tsx
import useSWR from 'swr';

export interface RankingComment {
  id: string;
  listId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: { username: string; name: string | null };
}

export function useRankingListComments(listId: string) {
  const key = ['ranking-comments', listId] as const;
  const fetcher = async (): Promise<RankingComment[]> => {
    const res = await fetch(`/api/ranking-comments/${listId}`);
    if (!res.ok) throw new Error('Failed to fetch comments');
    return res.json();
  };
  const { data, error, mutate } = useSWR<RankingComment[]>(key, fetcher);

  const postComment = async (content: string) => {
    const res = await fetch(`/api/ranking-comments/${listId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error('Failed to post comment');
    await mutate();
  };

  const deleteComment = async (commentId: string) => {
    const res = await fetch(`/api/ranking-comments/${listId}/${commentId}`, {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 204) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to delete comment');
    }
    await mutate();
  };

  return {
    comments: data ?? [],
    isLoading: !error && !data,
    isError: !!error,
    postComment,
    deleteComment,
  };
}
