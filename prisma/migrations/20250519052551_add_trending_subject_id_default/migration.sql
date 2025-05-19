/*
  Warnings:

  - The primary key for the `TrendingSubject` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `TrendingSubject` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `TrendingItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TrendingTag` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TrendingTag" DROP CONSTRAINT "TrendingTag_tagId_fkey";

-- AlterTable
ALTER TABLE "TrendingSubject" DROP CONSTRAINT "TrendingSubject_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "TrendingSubject_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "TrendingItem";

-- DropTable
DROP TABLE "TrendingTag";
