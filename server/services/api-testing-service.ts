import * as apiRequestRepository from "@/server/repositories/api-request-repository";
import { requireProjectAccess } from "@/server/auth/access-control";
import { prisma } from "@/server/db/prisma";
import { executeApiRequest } from "@/server/http/execute-request";
import { NotFoundError } from "@/lib/errors";
import type { CreateApiRequestInput } from "@/features/api-testing/schemas/api-request-schemas";
import type { Prisma } from "@prisma/client";

export async function listApiRequests(userId: string, projectId: string) {
  await requireProjectAccess(userId, projectId, "VIEWER");
  return apiRequestRepository.findApiRequestsForProject(projectId);
}

export async function countApiRequestsForUser(userId: string) {
  return apiRequestRepository.countApiRequestsForUser(userId);
}

export async function createApiRequest(userId: string, input: CreateApiRequestInput) {
  await requireProjectAccess(userId, input.projectId, "EDITOR");

  return prisma.$transaction(async (tx) => {
    const apiRequest = await tx.apiRequest.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        method: input.method,
        url: input.url,
        headers: input.headers as unknown as Prisma.InputJsonValue,
        queryParams: input.queryParams as unknown as Prisma.InputJsonValue,
        bodyType: input.bodyType,
        body: input.body,
        createdById: userId,
        assertions: {
          create: input.assertions.map((a) => ({
            type: a.type,
            jsonPath: a.jsonPath,
            expected: a.expected,
          })),
        },
      },
      include: { assertions: true },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "api_request.created",
        targetType: "ApiRequest",
        targetId: apiRequest.id,
        projectId: input.projectId,
        metadata: { name: apiRequest.name, method: apiRequest.method },
      },
    });

    return apiRequest;
  });
}

export async function deleteApiRequest(userId: string, apiRequestId: string) {
  const apiRequest = await apiRequestRepository.findApiRequestById(apiRequestId);
  if (!apiRequest) {
    throw new NotFoundError("ApiRequest", apiRequestId);
  }

  await requireProjectAccess(userId, apiRequest.projectId, "EDITOR");

  return prisma.$transaction(async (tx) => {
    await tx.apiRequest.delete({ where: { id: apiRequestId } });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "api_request.deleted",
        targetType: "ApiRequest",
        targetId: apiRequestId,
        projectId: apiRequest.projectId,
        metadata: { name: apiRequest.name },
      },
    });
  });
}

export async function runApiRequest(userId: string, apiRequestId: string) {
  const apiRequest = await apiRequestRepository.findApiRequestById(apiRequestId);
  if (!apiRequest) {
    throw new NotFoundError("ApiRequest", apiRequestId);
  }

  await requireProjectAccess(userId, apiRequest.projectId, "VIEWER");

  const executionResult = await executeApiRequest(
    {
      method: apiRequest.method,
      url: apiRequest.url,
      headers: apiRequest.headers as unknown as { key: string; value: string }[],
      queryParams: apiRequest.queryParams as unknown as { key: string; value: string }[],
      bodyType: apiRequest.bodyType,
      body: apiRequest.body,
    },
    apiRequest.assertions.map((a) => ({
      id: a.id,
      type: a.type,
      jsonPath: a.jsonPath,
      expected: a.expected,
    })),
  );

  return prisma.$transaction(async (tx) => {
    const execution = await tx.apiRequestExecution.create({
      data: {
        apiRequestId: apiRequest.id,
        projectId: apiRequest.projectId,
        executedById: userId,
        requestSnapshot: executionResult.requestSnapshot as unknown as Prisma.InputJsonValue,
        responseStatus: executionResult.responseStatus,
        responseHeaders:
          executionResult.responseHeaders as unknown as Prisma.InputJsonValue | undefined,
        responseBody: executionResult.responseBody,
        responseTruncated: executionResult.responseTruncated,
        durationMs: executionResult.durationMs,
        error: executionResult.error,
        assertionResults: executionResult.assertionResults as unknown as Prisma.InputJsonValue,
        result: executionResult.result,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "api_request.executed",
        targetType: "ApiRequest",
        targetId: apiRequest.id,
        projectId: apiRequest.projectId,
        metadata: { result: executionResult.result, status: executionResult.responseStatus },
      },
    });

    return execution;
  });
}
