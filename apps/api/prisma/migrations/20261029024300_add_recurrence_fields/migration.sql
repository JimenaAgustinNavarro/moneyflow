/*
  Warnings:

  - Made the column `account_id` on table `recurrences` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RecurrenceFrequency" ADD VALUE 'BIWEEKLY';
ALTER TYPE "RecurrenceFrequency" ADD VALUE 'QUARTERLY';

-- DropForeignKey
ALTER TABLE "recurrences" DROP CONSTRAINT "recurrences_account_id_fkey";

-- AlterTable
ALTER TABLE "recurrences" ADD COLUMN     "currency" VARCHAR(3) NOT NULL DEFAULT 'PEN',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "last_generated_at" TIMESTAMPTZ(6),
ALTER COLUMN "account_id" SET NOT NULL,
ALTER COLUMN "day_of_period" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "recurrences" ADD CONSTRAINT "recurrences_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
