/*
  Warnings:

  - Added the required column `account_id` to the `obligations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `obligations` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ObligationPaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- AlterTable
ALTER TABLE "obligation_payments" ADD COLUMN     "paid_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "ObligationPaymentStatus" NOT NULL DEFAULT 'CONFIRMED';

-- AlterTable
ALTER TABLE "obligations" ADD COLUMN     "account_id" TEXT NOT NULL,
ADD COLUMN     "cancelled_at" TIMESTAMPTZ(6),
ADD COLUMN     "category_id" TEXT,
ADD COLUMN     "currency" VARCHAR(3) NOT NULL DEFAULT 'PEN',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "paid_at" TIMESTAMPTZ(6),
ADD COLUMN     "type" "TransactionType" NOT NULL;

-- AddForeignKey
ALTER TABLE "obligations" ADD CONSTRAINT "obligations_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obligations" ADD CONSTRAINT "obligations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
