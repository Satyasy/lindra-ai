import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

// JWT session tanpa @auth/prisma-adapter — adapter butuh 4 tabel ekstra
// yang melanggar budget 9 tabel, dan credentials provider tidak memerlukannya.
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true, // self-hosted/Vercel — host dari header request
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/bk/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const staff = await prisma.staffAccount.findUnique({ where: { email } });
        if (!staff || !verifyPassword(password, staff.passwordHash)) return null;

        return { id: staff.id, name: staff.name, email: staff.email };
      },
    }),
  ],
  callbacks: {
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl;
      if (pathname === "/bk/login") return true;
      if (pathname.startsWith("/bk")) return !!auth;
      return true;
    },
  },
});
