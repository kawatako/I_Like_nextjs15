// components/hooks/useImageUploader.ts
'use client'

import { useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { useToast } from '@/components/hooks/use-toast'

export function useImageUploader() {
  const { user } = useUser()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const uploadImage = useCallback(
    async (file: File): Promise<{ path: string; signedUrl: string } | null> => {
      if (!user) {
        toast({ title: '認証エラー', description: 'ログインしてください', variant: 'destructive' })
        return null
      }
      setIsLoading(true)
      try {
        const form = new FormData()
        form.append('file', file)
        form.append('userId', user.id)

        const res = await fetch('/api/uploadImage', { method: 'POST', body: form })
        const json = await res.json()
        if (!res.ok || !json.path || !json.signedUrl) {
          throw new Error(json.error || 'アップロード失敗')
        }
        return { path: json.path, signedUrl: json.signedUrl }
      } catch (err: any) {
        toast({ title: 'アップロードエラー', description: err.message, variant: 'destructive' })
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [user, toast]
  )

  return { uploadImage, isLoading }
}
