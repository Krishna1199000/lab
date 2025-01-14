import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import db from "@repo/db/client";
import type { Adapter } from "next-auth/adapters";
import { SessionStrategy } from "next-auth";

// List of admin email addresses
const ADMIN_EMAILS = [
    "krishnag17503@gmail.com",
    "geetagohil2004@gmail.com",
    "krishna.17503@sakec.ac.in",
    "gohilkrishna9004@gmail.com"
];

export const authOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || "secr3t",
  session: { 
    strategy: "jwt" as SessionStrategy,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user }: any) {
      const existingUser = await db.user.findUnique({
        where: { email: user.email }
      });

      if (!existingUser) {
        const role = ADMIN_EMAILS.includes(user.email) ? "ADMIN" : "USER";
        await db.user.create({
          data: {
            email: user.email,
            name: user.name,
            image: user.image,
            role: role
          }
        });
      }
      return true;
    },
    async jwt({ token, user }: any) {
      if (user) {
        const dbUser = await db.user.findUnique({
          where: { email: user.email }
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth',
    error: '/auth/error',
  }
};