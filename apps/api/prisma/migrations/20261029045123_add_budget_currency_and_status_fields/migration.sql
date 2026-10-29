-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('UNDER_LIMIT', 'NEAR_LIMIT', 'OVER_LIMIT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BudgetPeriod" ADD VALUE 'QUARTERLY';
ALTER TYPE "BudgetPeriod" ADD VALUE 'YEARLY';

-- DropIndex
DROP INDEX "budget_categories_budget_id_category_id_key";

-- AlterTable
ALTER TABLE "budget_categories" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "currency" VARCHAR(3) NOT NULL DEFAULT 'PEN';

-- CreateIndex
CREATE INDEX "budget_categories_budget_id_deleted_at_idx" ON "budget_categories"("budget_id", "deleted_at");

CREATE UNIQUE INDEX "budget_categories_active_unique"
ON "budget_categories" ("budget_id", "category_id")
WHERE "deleted_at" IS NULL;
