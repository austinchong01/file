/*
  Warnings:

  - You are about to drop the column `path` on the `files` table. All the data in the column will be lost.
  - Added the required column `cloudinaryPublicId` to the `files` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cloudinaryUrl` to the `files` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "files" DROP COLUMN "path",
ADD COLUMN     "cloudinaryPublicId" TEXT NOT NULL,
ADD COLUMN     "cloudinaryUrl" TEXT NOT NULL;
