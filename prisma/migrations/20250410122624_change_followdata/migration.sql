-- CreateEnum
CREATE TYPE "FollowRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "FollowRequest" (
    "id" TEXT NOT NULL,
    "status" "FollowRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requestedId" TEXT NOT NULL,

    CONSTRAINT "FollowRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowRequest_requestedId_idx" ON "FollowRequest"("requestedId");

-- CreateIndex
CREATE UNIQUE INDEX "FollowRequest_requesterId_requestedId_key" ON "FollowRequest"("requesterId", "requestedId");

-- AddForeignKey
ALTER TABLE "FollowRequest" ADD CONSTRAINT "FollowRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowRequest" ADD CONSTRAINT "FollowRequest_requestedId_fkey" FOREIGN KEY ("requestedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
