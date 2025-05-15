import useSWR from 'swr'

export interface Comment {
  id: string
  subject: string
  content: string
  userId: string
  createdAt: string
}

export function useAverageItemComments(subject: string) {
  const key = ['average-comments', subject] as const
  const fetcher = async (): Promise<Comment[]> => {
    const res = await fetch(`/api/average-comments/${encodeURIComponent(subject)}`)
    if (!res.ok) throw new Error('Failed to fetch comments')
    return res.json()
  }
  const { data, error, mutate } = useSWR<Comment[]>(key, fetcher)
  const postComment = async (content: string) => {
    await fetch(`/api/average-comments/${encodeURIComponent(subject)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    mutate()
  }
  return {
    comments: data ?? [],
    isLoading: !error && !data,
    isError: error,
    postComment,
  }
}
