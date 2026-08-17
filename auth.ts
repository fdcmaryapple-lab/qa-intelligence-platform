import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";
import { loginSchema } from "@/features/auth/schemas/auth-schemas";

/**
 * Root-level Auth.js configuration.
 *
 * Session strategy is "jwt", not "database" — this was originally planned
 * as "database" (see Phase 0's architecture doc) specifically so sessions
 * could be revoked server-side, but Auth.js v5 hard-rejects that
 * combination with a Credentials provider at startup
 * (UnsupportedStrategy — database sessions are created via the adapter as
 * part of an OAuth callback, which credentials logins never go through).
 *
 * Server-side revocation before natural JWT expiry isn't implemented yet.
 * If it's needed later (e.g. an admin "force sign-out", or invalidating
 * other sessions on a password change), the standard pattern is a
 * `tokenVersion` counter on User: bump it to invalidate, and check it
 * against the token's stored value in the jwt callback below.
 *
 * The Prisma adapter stays wired up even under the JWT strategy — it's a
 * supported combination, and it's what would handle User/Account linking
 * if an OAuth provider gets added to `providers` later. It just isn't
 * used for session storage right now.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user?.passwordHash) return null;

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
