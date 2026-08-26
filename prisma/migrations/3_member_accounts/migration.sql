-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "email" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordHash" TEXT NOT NULL DEFAULT '';

