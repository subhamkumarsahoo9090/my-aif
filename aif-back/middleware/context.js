import { requestContext } from "../lib/request-context.js";

function cookieJar(req, res) {
  return {
    get(name) {
      const value = req.cookies?.[name];
      if (typeof value === "string" && value) return { value };
      if (name === "aif_session") {
        const header = req.headers.authorization;
        if (typeof header === "string" && header.startsWith("Bearer ")) {
          const token = header.slice("Bearer ".length).trim();
          if (token) return { value: token };
        }
      }
      return undefined;
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
