// Screens call the Node.js API in /server. The base URL is NEXT_PUBLIC_API_ORIGIN in .env.local.

const configuredOrigin = process.env.NEXT_PUBLIC_API_ORIGIN?.trim().replace(/\/$/, "");

export const apiOrigin = configuredOrigin ;

function route(path) {
  return `${apiOrigin}${path}`;
}

export function apiFetch(url, init = {}) {
  return fetch(url, { credentials: "include", ...init });
}

export const api = {
  auth: {
    login: route("/api/auth/login"),
    accounts: route("/api/auth/accounts"),
    logout: route("/api/auth/logout"),
    session: route("/api/auth/session"),
    forgot: route("/api/auth/forgot"),
    verifyOtp: route("/api/auth/verify-otp"),
    reset: route("/api/auth/reset"),
  },
  portal: {
    summary: route("/api/portal/summary"),
    profile: route("/api/portal/profile"),
    holdings: route("/api/portal/holdings"),
    ledger: route("/api/portal/ledger"),
    statements: route("/api/portal/statements"),
    statement(id) {
      return route(`/api/portal/statements/${id}`);
    },
  },
  admin: {
    login: route("/api/admin/login"),
    session: route("/api/admin/session"),
    access: route("/api/admin/access"),
    overview: route("/api/admin/overview"),
    command: route("/api/admin/command"),
    clients: route("/api/admin/clients"),
    client(code) {
      return route(`/api/admin/clients/${code}`);
    },
    staff: route("/api/admin/staff"),
    staffMember(id) {
      return route(`/api/admin/staff/${id}`);
    },
    roles: route("/api/admin/roles"),
    imports: route("/api/admin/imports"),
    reports: route("/api/admin/reports"),
    nav: route("/api/admin/nav"),
    audit: route("/api/admin/audit"),
    platform: route("/api/admin/platform"),
    ifsc(code) {
      return route(`/api/admin/ifsc/${encodeURIComponent(code)}`);
    },
  },
};
