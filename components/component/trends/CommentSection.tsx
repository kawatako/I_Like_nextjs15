// components/component/trends/CommentSection.tsx
'use client'

import { useState } from 'react'
import { useAverageItemComments, Comment } from '@/components/hooks/useAverageItemComments'
import { useAuth,useUser } from '@clerk/nextjs'
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"


interface Props {
  subject: string
}

export default function CommentSection({ subject }: Props) {
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const { comments, isLoading, isError, postComment } = useAverageItemComments(subject)
  const [draft, setDraft] = useState('')

  if (isLoading) return <p>Loading comments…</p>
  if (isError)   return <p className="text-red-500">Failed to load comments</p>

  return (
    <div className="space-y-4">
      {isSignedIn && (
        <form onSubmit={async (e) => {
          e.preventDefault()
          await postComment(draft)
          setDraft('')
        }}>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            placeholder="コメントを入力…"
            required
          />
          <Button type="submit" className="mt-2">投稿</Button>
        </form>
      )}
      <div className="mt-4 space-y-3">
        {comments.map((c: Comment) => (
          <div key={c.id} className="p-3 bg-gray-50 rounded">
            <div className="flex items-center mb-1">
              {user?.username && (<strong>{user.username}</strong>)}
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(c.createdAt).toLocaleString()}
              </span>
            </div>
            <p>{c.content}</p>
          </div>
        ))}
        {comments.length === 0 && <p>まだコメントがありません。</p>}
      </div>
    </div>
  )
}