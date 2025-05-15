-- 既存の AverageItemRank.id に gen_random_uuid() をデフォルトとして追加
ALTER TABLE public."AverageItemRank"
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
