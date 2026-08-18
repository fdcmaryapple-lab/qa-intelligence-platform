-- CreateTable
CREATE TABLE "automation_scripts" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "testCaseId" TEXT,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "isValid" BOOLEAN,
    "validationErrors" TEXT,
    "aiGenerationId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_scripts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automation_scripts_projectId_idx" ON "automation_scripts"("projectId");

-- CreateIndex
CREATE INDEX "automation_scripts_testCaseId_idx" ON "automation_scripts"("testCaseId");

-- AddForeignKey
ALTER TABLE "automation_scripts" ADD CONSTRAINT "automation_scripts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_scripts" ADD CONSTRAINT "automation_scripts_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "test_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_scripts" ADD CONSTRAINT "automation_scripts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_scripts" ADD CONSTRAINT "automation_scripts_aiGenerationId_fkey" FOREIGN KEY ("aiGenerationId") REFERENCES "ai_generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
