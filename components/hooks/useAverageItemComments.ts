// lib/hooks/useAverageItemComments.ts

import useSWR from 'swr'

export interface AverageComment {
  id: string
  subject: string
  userId: string
  content: string
  createdAt: string
  user: { username: string; name: string | null }
}

export function useAverageItemComments(subject: string) {
  const key = ['average-comments', subject] as const
  const fetcher = async (): Promise<AverageComment[]> => {
    const res = await fetch(`/api/average-comments/${encodeURIComponent(subject)}`)
    if (!res.ok) throw new Error('Failed to fetch comments')
    return res.json()
  }
  const { data, error, mutate } = useSWR<AverageComment[]>(key, fetcher)

  const postComment = async (content: string) => {
    const res = await fetch(`/api/average-comments/${encodeURIComponent(subject)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (!res.ok) throw new Error('Failed to post comment')
    await mutate()
  }

  const deleteComment = async (commentId: string) => {
    const res = await fetch(
      `/api/average-comments/${encodeURIComponent(subject)}/${commentId}`,
      { method: 'DELETE' }
    )
    if (!res.ok && res.status !== 204) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || 'Failed to delete comment')
    }
    await mutate()
  }

  return {
    comments: data ?? [],
    isLoading: !error && !data,
    isError: !!error,
    postComment,
    deleteComment,
  }
}
