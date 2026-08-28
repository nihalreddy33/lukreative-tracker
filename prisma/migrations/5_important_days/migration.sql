-- CreateTable
CREATE TABLE "ImportantDay" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "annual" BOOLEAN NOT NULL DEFAULT false,
    "kind" TEXT NOT NULL DEFAULT 'Festival',
    "note" TEXT NOT NULL DEFAULT '',
    "seeded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportantDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportantDay_date_idx" ON "ImportantDay"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ImportantDay_name_date_key" ON "ImportantDay"("name", "date");

