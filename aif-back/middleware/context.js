import { requestContext } from "../lib/request-context.ts";

function cookieJar(req, res) {
  return {
    get(name) {
      const value = req.cookies?.[name];
      return typeof value === "string" ? { value } : undefined;
    },
    set(name, value, options = {}) {
      res.cookie(name, value, {
        httpOnly: options.httpOnly,
        sameSite: options.sameSite,
        secure: options.secure,
        path: options.path || "/",
        maxAge: typeof options.maxAge === "number" ? options.maxAge * 1000 : undefined,
      });
    },
    delete(name) {
      res.clearCookie(name, { path: "/" });
    },
  };
}

export function bindRequestContext(req, res, next) {
  requestContext.run(cookieJar(req, res), () => next());
}
