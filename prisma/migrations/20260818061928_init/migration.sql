-- CreateEnum
CREATE TYPE "HttpMethod" AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS');

-- CreateEnum
CREATE TYPE "ApiBodyType" AS ENUM ('NONE', 'JSON', 'TEXT', 'FORM');

-- CreateEnum
CREATE TYPE "AssertionType" AS ENUM ('STATUS_EQUALS', 'BODY_CONTAINS', 'JSON_PATH_EQUALS');

-- CreateEnum
CREATE TYPE "ExecutionResult" AS ENUM ('PASS', 'FAIL', 'ERROR');

-- CreateTable
CREATE TABLE "api_requests" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "method" "HttpMethod" NOT NULL DEFAULT 'GET',
    "url" TEXT NOT NULL,
    "headers" JSONB NOT NULL DEFAULT '[]',
    "queryParams" JSONB NOT NULL DEFAULT '[]',
    "bodyType" "ApiBodyType" NOT NULL DEFAULT 'NONE',
    "body" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_assertions" (
    "id" TEXT NOT NULL,
    "apiRequestId" TEXT NOT NULL,
    "type" "AssertionType" NOT NULL,
    "jsonPath" TEXT,
    "expected" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_assertions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_request_executions" (
    "id" TEXT NOT NULL,
    "apiRequestId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "executedById" TEXT NOT NULL,
    "requestSnapshot" JSONB NOT NULL,
    "responseStatus" INTEGER,
    "responseHeaders" JSONB,
    "responseBody" TEXT,
    "responseTruncated" BOOLEAN NOT NULL DEFAULT false,
    "durationMs" INTEGER,
    "error" TEXT,
    "assertionResults" JSONB,
    "result" "ExecutionResult" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_request_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_requests_projectId_idx" ON "api_requests"("projectId");

-- CreateIndex
CREATE INDEX "api_assertions_apiRequestId_idx" ON "api_assertions"("apiRequestId");

-- CreateIndex
CREATE INDEX "api_request_executions_apiRequestId_createdAt_idx" ON "api_request_executions"("apiRequestId", "createdAt");

-- AddForeignKey
ALTER TABLE "api_requests" ADD CONSTRAINT "api_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_requests" ADD CONSTRAINT "api_requests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_assertions" ADD CONSTRAINT "api_assertions_apiRequestId_fkey" FOREIGN KEY ("apiRequestId") REFERENCES "api_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_request_executions" ADD CONSTRAINT "api_request_executions_apiRequestId_fkey" FOREIGN KEY ("apiRequestId") REFERENCES "api_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_request_executions" ADD CONSTRAINT "api_request_executions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_request_executions" ADD CONSTRAINT "api_request_executions_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
