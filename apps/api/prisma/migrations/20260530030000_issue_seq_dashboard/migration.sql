-- Add a global sequential number to Issue, rendered as "PL-0142" in the
-- dashboard. SERIAL backfills existing rows from the sequence (safe: 0 rows).
ALTER TABLE "Issue" ADD COLUMN "seq" SERIAL NOT NULL;
CREATE UNIQUE INDEX "Issue_seq_key" ON "Issue"("seq");
