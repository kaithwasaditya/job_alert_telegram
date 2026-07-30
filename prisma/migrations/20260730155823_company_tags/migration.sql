-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
