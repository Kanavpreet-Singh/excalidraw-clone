/*
  Warnings:

  - You are about to drop the `Chat` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `shapes` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_roomId_fkey";

-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_userId_fkey";

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "shapes" JSONB NOT NULL;

-- DropTable
DROP TABLE "Chat";
