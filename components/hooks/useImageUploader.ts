// hooks/useImageUploader.ts
'use client'

import { useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { useToast } from '@/components/hooks/use-toast'

export function useImageUploader() {
  const { user } = useUser()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (!user) {
      const message = '認証エラー: ユーザー情報が取得できません'
      setError(message)
      toast({ title: '認証エラー', description: message, variant: 'destructive' })
      return null
    }

    setError(null)
    setIsLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('userId', user.id)

      const res = await fetch('/api/uploadImage', {
        method: 'POST',
        body: form,
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'アップロードに失敗しました')
      }

      return json.publicUrl as string
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー'
      setError(message)
      toast({
        title: 'アップロードエラー',
        description: message,
        variant: 'destructive',
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }, [user, toast])

  return { uploadImage, isLoading, error }
}
