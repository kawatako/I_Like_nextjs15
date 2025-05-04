// hooks/useTrends.ts
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