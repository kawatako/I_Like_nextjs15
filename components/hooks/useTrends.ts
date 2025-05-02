// hooks/useTrends.ts
import useSWR from 'swr';
import { supabase } from '@/lib/supabaseClient';

const fetcher = (key: string, ...args: any[]) => {
  const [table, queryFn] = args;
  return queryFn(supabase.from(table));
};

export function useNewList() {
  const { data, error } = useSWR(
    ['RankingList', (qb: any) =>
      qb
        .select('id,subject,createdAt')
        .order('createdAt', { ascending: false })
        .limit(50)
    ],
    fetcher
  );
  return { lists: data?.data ?? [], isLoading: !error && !data, isError: error };
}

export function useTrendingSubjects(period: 'WEEKLY' | 'MONTHLY') {
  const { data, error } = useSWR(
    ['TrendingSubject', (qb: any) =>
      qb
        .select('subject,count')
        .eq('period', period)
        .order('calculationDate', { ascending: false })
        .order('count', { ascending: false })
        .limit(100)
    ],
    fetcher
  );
  return { subjects: data?.data ?? [], isLoading: !error && !data, isError: error };
}

export function useTrendingTags(period: 'WEEKLY' | 'MONTHLY') {
  const { data, error } = useSWR(
    ['TrendingTag', (qb: any) =>
      qb
        .select('tagName,count')
        .eq('period', period)
        .order('calculationDate', { ascending: false })
        .order('count', { ascending: false })
        .limit(100)
    ],
    fetcher
  );
  return { tags: data?.data ?? [], isLoading: !error && !data, isError: error };
}

export function useTrendingItems(period: 'WEEKLY' | 'MONTHLY') {
  const { data, error } = useSWR(
    ['TrendingItem', (qb: any) =>
      qb
        .select('itemName,rankScore')
        .eq('period', period)
        .order('calculationDate', { ascending: false })
        .order('rankScore', { ascending: false })
        .limit(100)
    ],
    fetcher
  );
  return { items: data?.data ?? [], isLoading: !error && !data, isError: error };
}
