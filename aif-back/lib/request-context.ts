import { AsyncLocalStorage } from "node:async_hooks";

export type CookieOptions = {
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
  path?: string;
  maxAge?: number;
};

export type CookieJar = {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options?: CookieOptions): void;
  delete(name: string): void;
};

export const requestContext = new AsyncLocalStorage<CookieJar>();
