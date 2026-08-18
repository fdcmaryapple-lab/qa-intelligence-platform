import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import * as accessControl from "@/server/auth/access-control";
import { prisma } from "@/server/db/prisma";
import { diffImages, getPngDimensions } from "@/server/screenshot/diff-images";
import * as screenshotRepository from "@/server/repositories/screenshot-repository";
import { createBaseline, compareScreenshot } from "@/server/services/screenshot-service";

vi.mock("@/server/auth/access-control");
vi.mock("@/server/screenshot/diff-images");
vi.mock("@/server/repositories/screenshot-repository");
vi.mock("@/server/db/prisma", () => ({
  prisma: { $transaction: vi.fn() },
}));

describe("createBaseline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires at least EDITOR access on the project", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockRejectedValue(new ForbiddenError());

    await expect(
      createBaseline("user_1", { projectId: "proj_1", name: "Home page", imageBase64: "aGVsbG8=" }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws ValidationError when the uploaded data isn't a valid PNG", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "EDITOR" } as never);
    vi.mocked(getPngDimensions).mockReturnValue(null);

    await expect(
      createBaseline("user_1", { projectId: "proj_1", name: "Home page", imageBase64: "bm90YXBuZw==" }),
    ).rejects.toThrow(ValidationError);
  });

  it("saves the baseline with its detected dimensions", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "EDITOR" } as never);
    vi.mocked(getPngDimensions).mockReturnValue({ width: 100, height: 50 });

    const tx = {
      screenshotBaseline: {
        create: vi.fn().mockImplementation(({ data }) => ({ id: "baseline_1", ...data })),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    const result = await createBaseline("user_1", {
      projectId: "proj_1",
      name: "Home page",
      imageBase64: "aGVsbG8=",
    });

    expect(tx.screenshotBaseline.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ width: 100, height: 50, name: "Home page" }),
      }),
    );
    expect((result as { width: number }).width).toBe(100);
  });
});

describe("compareScreenshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NotFoundError when the baseline doesn't exist", async () => {
    vi.mocked(screenshotRepository.findBaselineById).mockResolvedValue(null);

    await expect(
      compareScreenshot("user_1", { baselineId: "missing_id", imageBase64: "aGVsbG8=", threshold: 1 }),
    ).rejects.toThrow(NotFoundError);
  });

  it("records result=ERROR when the diff fails (e.g. dimension mismatch), without throwing", async () => {
    vi.mocked(screenshotRepository.findBaselineById).mockResolvedValue({
      id: "baseline_1",
      projectId: "proj_1",
      image: Buffer.from("fake"),
    } as never);
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "EDITOR" } as never);
    vi.mocked(diffImages).mockReturnValue({
      ok: false,
      error: "Image dimensions don't match: baseline is 100×50, uploaded image is 200×100.",
    });

    const tx = {
      screenshotComparison: {
        create: vi.fn().mockImplementation(({ data }) => ({ id: "cmp_1", ...data })),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    const result = await compareScreenshot("user_1", {
      baselineId: "baseline_1",
      imageBase64: "aGVsbG8=",
      threshold: 1,
    });

    expect(tx.screenshotComparison.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ result: "ERROR" }) }),
    );
    expect((result as { result: string }).result).toBe("ERROR");
  });

  it("records PASS when the diff percentage is under the threshold", async () => {
    vi.mocked(screenshotRepository.findBaselineById).mockResolvedValue({
      id: "baseline_1",
      projectId: "proj_1",
      image: Buffer.from("fake"),
    } as never);
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "EDITOR" } as never);
    vi.mocked(diffImages).mockReturnValue({
      ok: true,
      diffPixelCount: 2,
      diffPercentage: 0.05,
      diffImage: Buffer.from("diff"),
      width: 100,
      height: 50,
    });

    const tx = {
      screenshotComparison: {
        create: vi.fn().mockImplementation(({ data }) => ({ id: "cmp_1", ...data })),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    const result = await compareScreenshot("user_1", {
      baselineId: "baseline_1",
      imageBase64: "aGVsbG8=",
      threshold: 1,
    });

    expect(tx.screenshotComparison.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ result: "PASS" }) }),
    );
    expect((result as { result: string }).result).toBe("PASS");
  });

  it("records FAIL when the diff percentage exceeds the threshold", async () => {
    vi.mocked(screenshotRepository.findBaselineById).mockResolvedValue({
      id: "baseline_1",
      projectId: "proj_1",
      image: Buffer.from("fake"),
    } as never);
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "EDITOR" } as never);
    vi.mocked(diffImages).mockReturnValue({
      ok: true,
      diffPixelCount: 500,
      diffPercentage: 10,
      diffImage: Buffer.from("diff"),
      width: 100,
      height: 50,
    });

    const tx = {
      screenshotComparison: {
        create: vi.fn().mockImplementation(({ data }) => ({ id: "cmp_1", ...data })),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    const result = await compareScreenshot("user_1", {
      baselineId: "baseline_1",
      imageBase64: "aGVsbG8=",
      threshold: 1,
    });

    expect(tx.screenshotComparison.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ result: "FAIL" }) }),
    );
    expect((result as { result: string }).result).toBe("FAIL");
  });
});
