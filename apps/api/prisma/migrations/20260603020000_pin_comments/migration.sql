-- Threaded discussion attached to a single pin. Workspace scoping is
-- inherited transitively (pin → session → workspace).

-- CreateTable
CREATE TABLE "PinComment" (
    "id" TEXT NOT NULL,
    "pinId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PinComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (list-per-pin queries)
CREATE INDEX "PinComment_pinId_idx" ON "PinComment"("pinId");

-- AddForeignKey (cascade — deleting a pin drops its discussion)
ALTER TABLE "PinComment" ADD CONSTRAINT "PinComment_pinId_fkey"
    FOREIGN KEY ("pinId") REFERENCES "Pin"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (restrict — preserve discussion history; switch to SetNull
-- on a nullable column later if needed for GDPR-style deletes)
ALTER TABLE "PinComment" ADD CONSTRAINT "PinComment_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
