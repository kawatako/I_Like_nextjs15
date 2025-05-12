// components/common/ClientOnly.tsx
//ページ全体をクライアントコンポーネントにせずに、サーバーコンポーネントのまま動的な「クライアント専用部分」だけを安全に切り出すためのラッパー
'use client'

import { ReactNode, useEffect, useState } from 'react'

interface Props {
  children: ReactNode
}

export default function ClientOnly({ children }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  // サーバー初回レンダリング時は何も返さず、クライアントでマウントされたら children を描画
  return mounted ? <>{children}</> : null
}
