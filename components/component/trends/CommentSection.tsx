// components/component/trends/CommentSection.tsx
'use client'

import { useState, FormEvent } from 'react'
import Image from 'next/image'
import { useAuth, useUser } from '@clerk/nextjs'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import useSWR from 'swr'
import { supabase } from '@/lib/supabaseClient'

interface Comment {
  id: string
  content: string
  userId: string
  createdAt: string
  user: {
    username: string
    image?: string
  }
}

interface Props {
  subject: string
  itemName: string
}

export default function CommentSection({ subject, itemName }: Props) {
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const [draft, setDraft] = useState('')

  const { data: comments = [], error, mutate } = useSWR<Comment[]>(
    ['comments', subject, itemName],
    async () => {
      const { data, error } = await supabase
        .from('AverageItemComment')
        .select('id,content,createdAt,userId')
        .eq('subject', subject)
        .eq('itemName', itemName)
      if (error) throw error
      // fetch user info for each comment
      const users = await Promise.all(
        data.map(async (c) => {
          const { data: u } = await supabase
            .from('users') // your users table
            .select('username,profile_image_url')
            .eq('id', c.userId)
            .single()
          return {
            ...c,
            user: u
              ? { username: u.username, image: u.profile_image_url }
              : { username: 'Unknown', image: undefined }
          }
        })
      )
      return users
    }
  )

  if (error) return <p className="text-red-500">Failed to load comments</p>

  const postComment = async (content: string) => {
    if (!user) return
    await supabase
      .from('AverageItemComment')
      .insert({
        subject,
        itemName,
        userId: user.id,
        content
      })
    mutate() // リフレッシュ
  }

  return (
    <div>
      {isSignedIn && (
        <form
          onSubmit={async (e: FormEvent<HTMLFormElement>) => {
            e.preventDefault()
            await postComment(draft)
            setDraft('')
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

      <div className="mt-4 space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="p-3 bg-gray-50 rounded">
            <div className="flex items-center mb-1">
              {c.user.image && (
                <Image
                  src={c.user.image}
                  alt={c.user.username}
                  width={24}
                  height={24}
                  className="rounded-full mr-2"
                />
              )}
              <strong>{c.user.username}</strong>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(c.createdAt).toLocaleString()}
              </span>
            </div>
            <p>{c.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
