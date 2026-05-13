// src/lib/auth.ts
import NextAuth, { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getUserRole } from "@/lib/rbac";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },

  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return { id: user.id, email: user.email, name: user.fullName };
      },
    }),

    // ROeID (OIDC) — activated via env vars when available
    ...(process.env.ROEID_CLIENT_ID && process.env.ROEID_CLIENT_SECRET
      ? [{
          id: "roeId",
          name: "ROeID",
          type: "oidc" as const,
          issuer: process.env.ROEID_ISSUER,
          clientId: process.env.ROEID_CLIENT_ID,
          clientSecret: process.env.ROEID_CLIENT_SECRET,
          profile(profile: Record<string, unknown>) {
            return {
              id: String(profile.sub),
              email: String(profile.email),
              name: String(profile.name ?? profile.given_name),
            };
          },
        }]
      : []),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        const roleInfo = await getUserRole(user.id);
        token.userId = user.id;
        token.role = roleInfo.role;
        token.uatId = roleInfo.uatId;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { civicType: true, mustChangePassword: true },
        });
        token.civicType = dbUser?.civicType ?? "NEIDENTIFICAT";
        token.mustChangePassword = dbUser?.mustChangePassword ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.uatId = token.uatId as string | undefined;
        session.user.civicType = token.civicType as string | undefined;
        session.user.mustChangePassword = token.mustChangePassword as boolean | undefined;
      }
      return session;
    },
  },

  events: {
    async signIn({ user }) {
      if (user?.id) {
        const roleInfo = await getUserRole(user.id);
        if (roleInfo.role) {
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              role: roleInfo.role,
              action: "LOGIN",
              resource: "Session",
            },
          }).catch(() => {});
        }
      }
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
