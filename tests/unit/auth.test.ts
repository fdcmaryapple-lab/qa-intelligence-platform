import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import { registerSchema, loginSchema } from "@/features/auth/schemas/auth-schemas";

describe("password hashing", () => {
  it("hashes a password and verifies it round-trips correctly", async () => {
    const hash = await bcrypt.hash("correct-horse-battery-staple", 12);
    expect(hash).not.toBe("correct-horse-battery-staple");
    await expect(bcrypt.compare("correct-horse-battery-staple", hash)).resolves.toBe(true);
    await expect(bcrypt.compare("wrong-password", hash)).resolves.toBe(false);
  });
});

describe("registerSchema", () => {
  it("rejects mismatched password confirmation", () => {
    const result = registerSchema.safeParse({
      name: "Alex Rivera",
      email: "alex@example.com",
      password: "Passw0rd123",
      confirmPassword: "Different123",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid registration payload", () => {
    const result = registerSchema.safeParse({
      name: "Alex Rivera",
      email: "alex@example.com",
      password: "Passw0rd123",
      confirmPassword: "Passw0rd123",
    });
    expect(result.success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("requires a valid email format", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(result.success).toBe(false);
  });
});
