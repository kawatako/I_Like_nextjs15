/*
  Warnings:

  - The values [DAILY,ALL_TIME] on the enum `TrendPeriod` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TrendPeriod_new" AS ENUM ('WEEKLY', 'MONTHLY');
ALTER TABLE "TrendingSubject" ALTER COLUMN "period" TYPE "TrendPeriod_new" USING ("period"::text::"TrendPeriod_new");
ALTER TABLE "TrendingTag" ALTER COLUMN "period" TYPE "TrendPeriod_new" USING ("period"::text::"TrendPeriod_new");
ALTER TABLE "TrendingItem" ALTER COLUMN "period" TYPE "TrendPeriod_new" USING ("period"::text::"TrendPeriod_new");
ALTER TYPE "TrendPeriod" RENAME TO "TrendPeriod_old";
ALTER TYPE "TrendPeriod_new" RENAME TO "TrendPeriod";
DROP TYPE "TrendPeriod_old";
COMMIT;
