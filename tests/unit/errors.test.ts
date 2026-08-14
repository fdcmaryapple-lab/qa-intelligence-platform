import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  isAppError,
} from "@/lib/errors";
import { handleApiError } from "@/lib/api-response";
import { parseOrThrow } from "@/lib/validation";

describe("AppError hierarchy", () => {
  it("assigns the correct code and status per error type", () => {
    expect(new ValidationError("bad input").code).toBe("VALIDATION_ERROR");
    expect(new ValidationError("bad input").statusCode).toBe(400);

    expect(new NotFoundError("Project", "abc123").message).toBe(
      "Project not found: abc123",
    );
    expect(new NotFoundError("Project").statusCode).toBe(404);

    expect(new ForbiddenError().statusCode).toBe(403);
  });

  it("isAppError narrows AppError instances but not plain errors", () => {
    expect(isAppError(new ValidationError("x"))).toBe(true);
    expect(isAppError(new Error("plain"))).toBe(false);
    expect(isAppError("not an error")).toBe(false);
  });
});

describe("parseOrThrow", () => {
  const schema = z.object({ name: z.string().min(1) });

  it("returns parsed data on valid input", () => {
    const result = parseOrThrow(schema, { name: "Demo Project" });
    expect(result).toEqual({ name: "Demo Project" });
  });

  it("throws a ValidationError on invalid input", () => {
    expect(() => parseOrThrow(schema, { name: "" })).toThrow(ValidationError);
  });
});

describe("handleApiError", () => {
  it("maps a ZodError to a 400 VALIDATION_ERROR response", async () => {
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);

    if (!result.success) {
      const response = handleApiError(result.error);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("maps a NotFoundError to a 404 response with its code preserved", async () => {
    const response = handleApiError(new NotFoundError("Requirement", "req_1"));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toContain("req_1");
  });

  it("maps an unexpected error to a generic 500 without leaking internals", async () => {
    const response = handleApiError(new Error("db connection string leaked"));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});
