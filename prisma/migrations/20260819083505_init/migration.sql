-- CreateEnum
CREATE TYPE "AutomationRunStatus" AS ENUM ('PASS', 'FAIL', 'ERROR');

-- CreateTable
CREATE TABLE "automation_runs" (
    "id" TEXT NOT NULL,
    "automationScriptId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "AutomationRunStatus" NOT NULL,
    "exitCode" INTEGER,
    "stdout" TEXT,
    "stderr" TEXT,
    "durationMs" INTEGER,
    "executedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automation_runs_automationScriptId_createdAt_idx" ON "automation_runs"("automationScriptId", "createdAt");

-- AddForeignKey
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_automationScriptId_fkey" FOREIGN KEY ("automationScriptId") REFERENCES "automation_scripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
