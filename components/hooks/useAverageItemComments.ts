// lib/hooks/useAverageItemComments.ts
import useSWR from 'swr';
import { supabase } from '@/lib/supabaseClient';

export interface Comment {
  id: string;
  userId: string;
  user: { username: string; image: string | null };
  content: string;
  createdAt: string;
}

export function useAverageItemComments(subject: string, itemName: string) {
  const key = [`/api/average-comments/${encodeURIComponent(subject)}/${encodeURIComponent(itemName)}`];
  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data, error, mutate } = useSWR<Comment[]>(key, fetcher);
  const postComment = async (content: string) => {
    const res = await fetch(key[0], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const newComment = await res.json();
    mutate([newComment, ...(data ?? [])], false);
  };
  return { comments: data ?? [], isLoading: !error && !data, isError: error, postComment };
}
