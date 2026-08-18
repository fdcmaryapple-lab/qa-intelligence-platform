import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import * as accessControl from "@/server/auth/access-control";
import { prisma } from "@/server/db/prisma";
import { executeApiRequest } from "@/server/http/execute-request";
import * as apiRequestRepository from "@/server/repositories/api-request-repository";
import { createApiRequest, runApiRequest } from "@/server/services/api-testing-service";

vi.mock("@/server/auth/access-control");
vi.mock("@/server/http/execute-request");
vi.mock("@/server/repositories/api-request-repository");
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

describe("createApiRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires at least EDITOR access on the project", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockRejectedValue(new ForbiddenError());

    await expect(
      createApiRequest("user_1", {
        projectId: "proj_1",
        name: "Get user",
        method: "GET",
        url: "https://api.example.com/users/1",
        headers: [],
        queryParams: [],
        bodyType: "NONE",
        assertions: [],
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("creates the request with its assertions in one transaction", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "EDITOR" } as never);

    const tx = {
      apiRequest: {
        create: vi.fn().mockResolvedValue({ id: "req_1", name: "Get user" }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    await createApiRequest("user_1", {
      projectId: "proj_1",
      name: "Get user",
      method: "GET",
      url: "https://api.example.com/users/1",
      headers: [],
      queryParams: [],
      bodyType: "NONE",
      assertions: [{ type: "STATUS_EQUALS", expected: "200" }],
    });

    expect(tx.apiRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Get user",
          assertions: { create: [{ type: "STATUS_EQUALS", jsonPath: undefined, expected: "200" }] },
        }),
      }),
    );
  });
});

describe("runApiRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NotFoundError when the request doesn't exist", async () => {
    vi.mocked(apiRequestRepository.findApiRequestById).mockResolvedValue(null);

    await expect(runApiRequest("user_1", "missing_id")).rejects.toThrow(NotFoundError);
  });

  it("only requires VIEWER access to run a request", async () => {
    vi.mocked(apiRequestRepository.findApiRequestById).mockResolvedValue({
      id: "req_1",
      projectId: "proj_1",
      method: "GET",
      url: "https://api.example.com/health",
      headers: [],
      queryParams: [],
      bodyType: "NONE",
      body: null,
      assertions: [],
    } as never);
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "VIEWER" } as never);
    vi.mocked(executeApiRequest).mockResolvedValue({
      requestSnapshot: {} as never,
      responseStatus: 200,
      responseHeaders: [],
      responseBody: "{}",
      responseTruncated: false,
      durationMs: 42,
      error: null,
      assertionResults: [],
      result: "PASS",
    });

    const tx = {
      apiRequestExecution: { create: vi.fn().mockResolvedValue({ id: "exec_1", result: "PASS" }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    await runApiRequest("user_1", "req_1");

    expect(accessControl.requireProjectAccess).toHaveBeenCalledWith("user_1", "proj_1", "VIEWER");
  });

  it("persists a FAIL result when an assertion doesn't pass", async () => {
    vi.mocked(apiRequestRepository.findApiRequestById).mockResolvedValue({
      id: "req_1",
      projectId: "proj_1",
      method: "GET",
      url: "https://api.example.com/health",
      headers: [],
      queryParams: [],
      bodyType: "NONE",
      body: null,
      assertions: [{ id: "assert_1", type: "STATUS_EQUALS", jsonPath: null, expected: "200" }],
    } as never);
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "VIEWER" } as never);
    vi.mocked(executeApiRequest).mockResolvedValue({
      requestSnapshot: {} as never,
      responseStatus: 500,
      responseHeaders: [],
      responseBody: "error",
      responseTruncated: false,
      durationMs: 10,
      error: null,
      assertionResults: [
        { assertionId: "assert_1", type: "STATUS_EQUALS", passed: false, actual: "500", expected: "200" },
      ],
      result: "FAIL",
    });

    const tx = {
      apiRequestExecution: { create: vi.fn().mockImplementation(({ data }) => ({ id: "exec_1", ...data })) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    const execution = await runApiRequest("user_1", "req_1");

    expect(tx.apiRequestExecution.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ result: "FAIL" }) }),
    );
    expect((execution as { result: string }).result).toBe("FAIL");
  });
});
