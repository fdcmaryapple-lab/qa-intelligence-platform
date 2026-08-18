-- CreateEnum
CREATE TYPE "TestRunStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TestRunResultStatus" AS ENUM ('NOT_RUN', 'PASS', 'FAIL', 'BLOCKED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ScreenshotComparisonResult" AS ENUM ('PASS', 'FAIL', 'ERROR');

-- CreateTable
CREATE TABLE "test_runs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TestRunStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "test_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_run_results" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "result" "TestRunResultStatus" NOT NULL DEFAULT 'NOT_RUN',
    "notes" TEXT,
    "executedById" TEXT,
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "test_run_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screenshot_baselines" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" BYTEA NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screenshot_baselines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screenshot_comparisons" (
    "id" TEXT NOT NULL,
    "baselineId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "candidateImage" BYTEA NOT NULL,
    "diffImage" BYTEA,
    "diffPixelCount" INTEGER,
    "diffPercentage" DOUBLE PRECISION,
    "threshold" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "result" "ScreenshotComparisonResult" NOT NULL,
    "error" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screenshot_comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_runs_projectId_createdAt_idx" ON "test_runs"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "test_run_results_testRunId_idx" ON "test_run_results"("testRunId");

-- CreateIndex
CREATE UNIQUE INDEX "test_run_results_testRunId_testCaseId_key" ON "test_run_results"("testRunId", "testCaseId");

-- CreateIndex
CREATE INDEX "screenshot_baselines_projectId_idx" ON "screenshot_baselines"("projectId");

-- CreateIndex
CREATE INDEX "screenshot_comparisons_baselineId_createdAt_idx" ON "screenshot_comparisons"("baselineId", "createdAt");

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_run_results" ADD CONSTRAINT "test_run_results_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "test_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_run_results" ADD CONSTRAINT "test_run_results_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "test_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_run_results" ADD CONSTRAINT "test_run_results_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screenshot_baselines" ADD CONSTRAINT "screenshot_baselines_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screenshot_baselines" ADD CONSTRAINT "screenshot_baselines_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screenshot_comparisons" ADD CONSTRAINT "screenshot_comparisons_baselineId_fkey" FOREIGN KEY ("baselineId") REFERENCES "screenshot_baselines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screenshot_comparisons" ADD CONSTRAINT "screenshot_comparisons_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screenshot_comparisons" ADD CONSTRAINT "screenshot_comparisons_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
