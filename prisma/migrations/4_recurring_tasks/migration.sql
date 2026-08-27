-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "occurrenceDate" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "recurrenceId" INTEGER;

-- CreateTable
CREATE TABLE "Recurrence" (
    "id" SERIAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "title" TEXT NOT NULL,
    "clientId" INTEGER,
    "assigneeId" INTEGER,
    "channel" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "notes" TEXT NOT NULL DEFAULT '',
    "visibleToClient" BOOLEAN NOT NULL DEFAULT true,
    "frequency" TEXT NOT NULL DEFAULT 'Weekly',
    "weekdays" TEXT NOT NULL DEFAULT '',
    "monthDay" INTEGER,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "leadDays" INTEGER NOT NULL DEFAULT 7,
    "skipIfOpen" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TEXT NOT NULL DEFAULT '',
    "endDate" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Recurrence_active_idx" ON "Recurrence"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Task_recurrenceId_occurrenceDate_key" ON "Task"("recurrenceId", "occurrenceDate");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_recurrenceId_fkey" FOREIGN KEY ("recurrenceId") REFERENCES "Recurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recurrence" ADD CONSTRAINT "Recurrence_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recurrence" ADD CONSTRAINT "Recurrence_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

