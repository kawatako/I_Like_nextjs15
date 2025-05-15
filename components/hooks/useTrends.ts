// components/hooks/useTrends.ts
import useSWR from 'swr';
import { supabase } from '@/lib/supabaseClient';

// --- 新着リスト ---
export function useNewList() {
  const key = ['ranking-list'] as const

  const fetcher = async () => {
    const { data, error } = await supabase
      .from('RankingList')
      .select('id,subject,createdAt')
      .order('createdAt', { ascending: false })
      .limit(50)

    if (error) throw error
    return data
  }

  const { data, error } = useSWR(key, fetcher)

  return {
    lists:     data ?? [],
    isLoading: !error && !data,
    isError:   error,
  }
}

// --- 週間／月間 トレンドタイトル ---
export function useTrendingSubjects(period: 'WEEKLY' | 'MONTHLY') {
  const key = ['trending-subjects', period] as const
  const fetcher = async () => {
    const { data, error } = await supabase
      .from('TrendingSubject')
      .select('subject,count')
      .eq('period', period)
      .order('calculationDate', { ascending: false })
      .order('count',           { ascending: false })
      .limit(100)

    if (error) throw error
    return data
  }

  const { data, error } = useSWR(key, fetcher)

  return {
    subjects:  data ?? [],
    isLoading: !error && !data,
    isError:   error,
  }
}

// --- 週間／月間 トレンドタグ ---
export function useTrendingTags(period: 'WEEKLY' | 'MONTHLY') {
  const key = ['trending-tags', period] as const
  const fetcher = async () => {
    const { data, error } = await supabase
      .from('TrendingTag')
      .select('tagName,count')
      .eq('period', period)
      .order('calculationDate', { ascending: false })
      .order('count',           { ascending: false })
      .limit(100)

    if (error) throw error
    return data
  }

  const { data, error } = useSWR(key, fetcher)

  return {
    tags:      data ?? [],
    isLoading: !error && !data,
    isError:   error,
  }
}

// --- 週間／月間 トレンドアイテム ---
export function useTrendingItems(period: 'WEEKLY' | 'MONTHLY') {
  const key = ['trending-items', period] as const
  const fetcher = async () => {
    const { data, error } = await supabase
      .from('TrendingItem')
      .select('itemName,rankScore')
      .eq('period', period)
      .order('calculationDate', { ascending: false })
      .order('rankScore',       { ascending: false })
      .limit(100)

    if (error) throw error
    return data
  }

  const { data, error } = useSWR(key, fetcher)

  return {
    items:     data ?? [],
    isLoading: !error && !data,
    isError:   error,
  }
}

//ボルダスコアの型
export interface BordaRank {
  itemName: string
  avgRank: number // ボルダスコア
  count: number
  calculationDate: string
}

// --- 平均順位(ボルダスコア順)（全期間） ---
export function useBordaItemRank(subject: string) {
  const key = ['borda-item-rank', subject] as const

  const fetcher = async (): Promise<BordaRank[]> => {
    const { data, error } = await supabase
      .from('AverageItemRank')
      .select('itemName,avgRank,count,calculationDate')
      .eq('subject', subject)
      // ボルダスコアを降順にソート
      .order('avgRank', { ascending: false })
      .limit(10)

    if (error) throw error
    return data
  }

  const { data, error } = useSWR<BordaRank[]>(key, fetcher)

  return {
    averageRanks: data ?? [],
    isLoading: !error && !data,
    isError: error,
  }
}