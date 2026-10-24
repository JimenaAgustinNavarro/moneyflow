-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "direction" VARCHAR(10);

-- AddConstraint
ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_direction_check"
CHECK ("direction" IN ('IN', 'OUT') OR "direction" IS NULL);
