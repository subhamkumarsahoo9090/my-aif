import { createHash, createHmac, randomInt, timingSafeEqual } from "crypto";
import { requestContext, type CookieJar } from "@/lib/request-context";
import { getPasswordVersion } from "@/lib/portal-store";

const SESSION_COOKIE = "aif_session";
const RESET_COOKIE = "aif_reset";
const SESSION_SECONDS = 60 * 60 * 8;
const RESET_SECONDS = 60 * 10;

type TokenPayload = {
  exp: number;
  clientCode?: unknown;
  passwordVersion?: unknown;
  otpHash?: unknown;
  verified?: unknown;
  role?: unknown;
  staffId?: unknown;
};

function secret() {
  return process.env.AUTH_SECRET || "aif-local-dev-secret";
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

async function readCookies(): Promise<CookieJar> {
  const current = requestContext.getStore();
  if (!current) throw new Error("Request context is missing.");
  return current;
}

function signToken(payload: TokenPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function readToken(token: string | undefined): TokenPayload | null {
  if (!token || token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const actualBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (
    actualBuf.length !== expectedBuf.length ||
    !timingSafeEqual(actualBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    );
    if (!parsed || typeof parsed !== "object") return null;
    const payload = parsed as TokenPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function openSession(clientCode: string) {
  const passwordVersion = await getPasswordVersion(clientCode);
  if (passwordVersion === null) return;
  const cookieStore = await readCookies();
  cookieStore.set(
    SESSION_COOKIE,
    signToken({
      clientCode,
      passwordVersion,
      exp: Date.now() + SESSION_SECONDS * 1000,
    }),
    cookieOptions(SESSION_SECONDS),
  );
}

export async function clearSession() {
  const cookieStore = await readCookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function openAdminSession(
  staffId: string,
  role: "admin" | "superadmin",
  passwordVersion: number,
) {
  const cookieStore = await readCookies();
  cookieStore.set(
    SESSION_COOKIE,
    signToken({
      staffId,
      role,
      passwordVersion,
      exp: Date.now() + SESSION_SECONDS * 1000,
    }),
    cookieOptions(SESSION_SECONDS),
  );
}

export async function readAdminSession() {
  const cookieStore = await readCookies();
  const payload = readToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!payload || typeof payload.staffId !== "string") return null;
  if (payload.role !== "admin" && payload.role !== "superadmin") return null;
  if (typeof payload.passwordVersion !== "number") return null;
  return {
    staffId: payload.staffId,
    role: payload.role,
    passwordVersion: payload.passwordVersion,
  };
}

export async function readSession() {
  const cookieStore = await readCookies();
  const payload = readToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!payload || typeof payload.clientCode !== "string") return null;
  if (typeof payload.passwordVersion !== "number") return null;
  const version = await getPasswordVersion(payload.clientCode);
  if (version === null || version !== payload.passwordVersion) return null;
  return { clientCode: payload.clientCode };
}

function hashOtp(code: string) {
  return createHash("sha256").update(code).digest("base64url");
}

export function createDemoCode() {
  return String(randomInt(0, 1000000)).padStart(6, "0");
}

export async function startReset(clientCode: string, code: string) {
  const cookieStore = await readCookies();
  cookieStore.set(
    RESET_COOKIE,
    signToken({
      clientCode,
      otpHash: hashOtp(code),
      verified: false,
      exp: Date.now() + RESET_SECONDS * 1000,
    }),
    cookieOptions(RESET_SECONDS),
  );
}

export async function verifyResetCode(code: string) {
  const cookieStore = await readCookies();
  const payload = readToken(cookieStore.get(RESET_COOKIE)?.value);
  if (!payload || payload.verified !== false) return null;
  if (typeof payload.clientCode !== "string" || typeof payload.otpHash !== "string") {
    return null;
  }

  const actual = Buffer.from(hashOtp(code.trim()));
  const expected = Buffer.from(payload.otpHash);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }

  const maxAge = Math.max(1, Math.floor((payload.exp - Date.now()) / 1000));
  cookieStore.set(
    RESET_COOKIE,
    signToken({
      clientCode: payload.clientCode,
      otpHash: payload.otpHash,
      verified: true,
      exp: payload.exp,
    }),
    cookieOptions(maxAge),
  );
  return payload.clientCode;
}

export async function readVerifiedReset() {
  const cookieStore = await readCookies();
  const payload = readToken(cookieStore.get(RESET_COOKIE)?.value);
  if (!payload || payload.verified !== true) return null;
  if (typeof payload.clientCode !== "string") return null;
  return payload.clientCode;
}

export async function clearReset() {
  const cookieStore = await readCookies();
  cookieStore.delete(RESET_COOKIE);
}
