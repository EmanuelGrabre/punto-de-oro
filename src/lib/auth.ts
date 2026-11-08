import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { prisma } from "./db";

const COOKIE = "pdo_session";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("Falta la variable AUTH_SECRET (mínimo 16 caracteres).");
  return new TextEncoder().encode(s);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.uid !== "string") return null;
    return await prisma.user.findUnique({
      where: { id: payload.uid },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });
  } catch {
    return null;
  }
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export function isOrganizer(user: { role: string } | null | undefined) {
  return user?.role === "ADMIN" || user?.role === "ORGANIZER";
}

export async function requireUser(next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

export async function requireOrganizer() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!isOrganizer(user)) redirect("/");
  return user;
}

export async function requireAdmin() {
  const user = await requireOrganizer();
  if (user.role !== "ADMIN") redirect("/admin");
  return user;
}
