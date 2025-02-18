/*
  Warnings:

  - You are about to drop the column `audience` on the `Lab` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Lab` table. All the data in the column will be lost.
  - You are about to drop the column `objectives` on the `Lab` table. All the data in the column will be lost.
  - You are about to drop the column `prerequisites` on the `Lab` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Lab" DROP COLUMN "audience",
DROP COLUMN "description",
DROP COLUMN "objectives",
DROP COLUMN "prerequisites",
ADD COLUMN     "content" TEXT NOT NULL DEFAULT '';
