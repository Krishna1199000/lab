/*
  Warnings:

  - You are about to drop the column `content` on the `Lab` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Lab" DROP COLUMN "content",
ADD COLUMN     "audience" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "objectives" TEXT[],
ADD COLUMN     "prerequisites" TEXT NOT NULL DEFAULT '';
