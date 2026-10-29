/*
  Warnings:

  - The values [CREDIT] on the enum `AccountType` will be removed. If these variants are still used in the database, this will fail.
  - The values [TRANSFER] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `balance` on the `accounts` table. All the data in the column will be lost.
  - You are about to alter the column `currency` on the `accounts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to drop the column `paid_at` on the `obligations` table. All the data in the column will be lost.
  - You are about to drop the column `current_amount` on the `savings_goals` table. All the data in the column will be lost.
  - You are about to drop the column `counterpart_account_id` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `direction` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `obligation_id` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `transfer_id` on the `transactions` table. All the data in the column will be lost.
  - You are about to alter the column `currency` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - A unique constraint covering the columns `[recurrence_id,period_start]` on the table `obligations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[token_hash]` on the table `refresh_tokens` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,name]` on the table `tags` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- AlterEnum
BEGIN;
CREATE TYPE "AccountType_new" AS ENUM ('CASH', 'BANK', 'SAVINGS', 'WALLET');
ALTER TABLE "accounts" ALTER COLUMN "type" TYPE "AccountType_new" USING ("type"::text::"AccountType_new");
ALTER TYPE "AccountType" RENAME TO "AccountType_old";
ALTER TYPE "AccountType_new" RENAME TO "AccountType";
DROP TYPE "public"."AccountType_old";
COMMIT;

-- AlterEnum
ALTER TYPE "ObligationStatus" ADD VALUE 'PARTIALLY_PAID';

-- AlterEnum
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('INCOME', 'EXPENSE');
ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "TransactionType_new" USING ("type"::text::"TransactionType_new");
ALTER TABLE "recurrences" ALTER COLUMN "type" TYPE "TransactionType_new" USING ("type"::text::"TransactionType_new");
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "public"."TransactionType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "goal_contributions" DROP CONSTRAINT "goal_contributions_goal_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_counterpart_account_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_obligation_id_fkey";

-- DropIndex
DROP INDEX "accounts_deleted_at_idx";

-- DropIndex
DROP INDEX "accounts_user_id_idx";

-- DropIndex
DROP INDEX "budget_categories_budget_id_idx";

-- DropIndex
DROP INDEX "budgets_active_idx";

-- DropIndex
DROP INDEX "budgets_user_id_idx";

-- DropIndex
DROP INDEX "categories_user_id_idx";

-- DropIndex
DROP INDEX "goal_contributions_goal_id_idx";

-- DropIndex
DROP INDEX "notifications_user_id_read_at_idx";

-- DropIndex
DROP INDEX "obligations_recurrence_id_period_start_idx";

-- DropIndex
DROP INDEX "obligations_status_idx";

-- DropIndex
DROP INDEX "recurrences_active_idx";

-- DropIndex
DROP INDEX "recurrences_user_id_idx";

-- DropIndex
DROP INDEX "refresh_tokens_token_hash_idx";

-- DropIndex
DROP INDEX "refresh_tokens_user_id_idx";

-- DropIndex
DROP INDEX "savings_goals_status_idx";

-- DropIndex
DROP INDEX "savings_goals_user_id_idx";

-- DropIndex
DROP INDEX "tags_user_id_idx";

-- DropIndex
DROP INDEX "tags_user_id_name_idx";

-- DropIndex
DROP INDEX "transactions_obligation_id_idx";

-- DropIndex
DROP INDEX "transactions_transfer_id_idx";

-- DropIndex
DROP INDEX "users_email_idx";

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "balance",
ADD COLUMN     "initial_balance_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3),
ALTER COLUMN "initial_balance" SET DATA TYPE DECIMAL(19,2);

-- AlterTable
ALTER TABLE "budgets" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(19,2),
ALTER COLUMN "start_date" SET DATA TYPE DATE,
ALTER COLUMN "end_date" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "goal_contributions" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(19,2);

-- AlterTable
ALTER TABLE "obligations" DROP COLUMN "paid_at",
ADD COLUMN     "period_end" DATE,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(19,2),
ALTER COLUMN "period_start" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "recurrences" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(19,2);

-- AlterTable
ALTER TABLE "savings_goals" DROP COLUMN "current_amount",
ALTER COLUMN "target_amount" SET DATA TYPE DECIMAL(19,2),
ALTER COLUMN "target_date" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "counterpart_account_id",
DROP COLUMN "direction",
DROP COLUMN "obligation_id",
DROP COLUMN "transfer_id",
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(19,2),
ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);

-- CreateTable
CREATE TABLE "transfers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "origin_account_id" TEXT NOT NULL,
    "destination_account_id" TEXT NOT NULL,
    "amount" DECIMAL(19,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'PEN',
    "description" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'CONFIRMED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "cancelled_at" TIMESTAMPTZ(6),

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obligation_payments" (
    "id" TEXT NOT NULL,
    "obligation_id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "amount" DECIMAL(19,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "obligation_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transfers_user_id_occurred_at_idx" ON "transfers"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "transfers_origin_account_id_occurred_at_idx" ON "transfers"("origin_account_id", "occurred_at");

-- CreateIndex
CREATE INDEX "transfers_destination_account_id_occurred_at_idx" ON "transfers"("destination_account_id", "occurred_at");

-- CreateIndex
CREATE INDEX "transfers_status_occurred_at_idx" ON "transfers"("status", "occurred_at");

-- CreateIndex
CREATE INDEX "obligation_payments_obligation_id_idx" ON "obligation_payments"("obligation_id");

-- CreateIndex
CREATE UNIQUE INDEX "obligation_payments_transaction_id_key" ON "obligation_payments"("transaction_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "accounts_user_id_deleted_at_idx" ON "accounts"("user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "budgets_user_id_active_idx" ON "budgets"("user_id", "active");

-- CreateIndex
CREATE INDEX "goal_contributions_goal_id_date_idx" ON "goal_contributions"("goal_id", "date");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");

-- CreateIndex
CREATE INDEX "obligations_user_id_status_due_date_idx" ON "obligations"("user_id", "status", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "obligations_recurrence_id_period_start_key" ON "obligations"("recurrence_id", "period_start");

-- CreateIndex
CREATE INDEX "recurrences_user_id_active_idx" ON "recurrences"("user_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_expires_at_idx" ON "refresh_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "savings_goals_user_id_status_idx" ON "savings_goals"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tags_user_id_name_key" ON "tags"("user_id", "name");

-- CreateIndex
CREATE INDEX "transactions_status_date_idx" ON "transactions"("status", "date");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_origin_account_id_fkey" FOREIGN KEY ("origin_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_destination_account_id_fkey" FOREIGN KEY ("destination_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obligation_payments" ADD CONSTRAINT "obligation_payments_obligation_id_fkey" FOREIGN KEY ("obligation_id") REFERENCES "obligations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obligation_payments" ADD CONSTRAINT "obligation_payments_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "savings_goals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
