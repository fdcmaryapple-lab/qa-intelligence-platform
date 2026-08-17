"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";
import { parseOrThrow } from "@/lib/validation";
import { withActionErrorHandling } from "@/lib/action-response";
import { ConflictError } from "@/lib/errors";
import { registerSchema } from "@/features/auth/schemas/auth-schemas";

/**
 * Creates a new user account. Auth.js's Credentials provider only handles
 * verifying a login — account creation for a credentials-based flow is
 * always custom.
 *
 * Sign-in itself happens client-side afterward via next-auth/react's
 * signIn(), not in this action — actions can't set the session cookie
 * Auth.js needs.
 */
export async function registerAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(registerSchema, input);

    const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
    if (existing) {
      throw new ConflictError("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);

    const user = await prisma.user.create({
      data: {
        email: parsed.email,
        name: parsed.name,
        passwordHash,
      },
    });

    return { id: user.id, email: user.email };
  });
}
