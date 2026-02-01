import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this",
);

export interface UserPayload {
  id: string;
  role: "user" | "admin";
  address?: string;
  email?: string;
  name?: string;
}

export async function createToken(payload: UserPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as UserPayload;
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<UserPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) return null;

  return verifyToken(token);
}

export async function setSession(user: UserPayload): Promise<string> {
  const token = await createToken(user);
  const cookieStore = await cookies();

  cookieStore.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });

  return token;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("auth-token");
}

// Nonce storage (in production, use Redis or database)
// Use globalThis to persist across hot reloads in development
const globalForNonce = globalThis as unknown as {
  nonceStore: Map<string, { nonce: string; timestamp: number }> | undefined;
};

const nonceStore =
  globalForNonce.nonceStore ??
  new Map<string, { nonce: string; timestamp: number }>();
globalForNonce.nonceStore = nonceStore;

export function generateNonce(address: string): string {
  const nonce = `Sign this message to verify your identity: ${Math.random().toString(36).substring(2, 15)}${Date.now()}`;
  const key = address.toLowerCase();
  nonceStore.set(key, { nonce, timestamp: Date.now() });
  console.log(
    `[AUTH] Generated nonce for ${key}, store size: ${nonceStore.size}`,
  );
  return nonce;
}

export function getNonce(address: string): string | null {
  const key = address.toLowerCase();
  const entry = nonceStore.get(key);
  console.log(
    `[AUTH] Getting nonce for ${key}, found: ${!!entry}, store size: ${nonceStore.size}`,
  );

  if (!entry) {
    console.log(`[AUTH] Available keys:`, Array.from(nonceStore.keys()));
    return null;
  }

  // Nonce expires after 10 minutes (increased from 5 for better UX)
  if (Date.now() - entry.timestamp > 10 * 60 * 1000) {
    nonceStore.delete(key);
    console.log(`[AUTH] Nonce expired for ${key}`);
    return null;
  }

  return entry.nonce;
}

export function clearNonce(address: string): void {
  const key = address.toLowerCase();
  console.log(`[AUTH] Clearing nonce for ${key}`);
  nonceStore.delete(key);
}
