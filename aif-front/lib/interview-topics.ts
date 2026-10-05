export type InterviewTopic = {
  id: string;
  label: string;
  summary: string;
  here: string[];
  canDo: string[];
};

export const interviewTopics: InterviewTopic[] = [
  {
    id: "express",
    label: "Express",
    summary: "Express is the HTTP server. It receives the browser request and sends JSON back.",
    here: [
      "The API listens on port 4000, or on PORT from the environment.",
      "GET /health answers that the process is up.",
      "Auth, portal, and admin routers are mounted under /api.",
      "A failed request returns a 500 JSON message instead of a stack trace.",
    ],
    canDo: [
      "Serve REST APIs, file downloads, and webhooks.",
      "Group routes with Router and share one app across many files.",
      "Set body size limits, trust a proxy, and shut down cleanly.",
    ],
  },
  {
    id: "middleware",
    label: "Middleware",
    summary: "Middleware runs before the route. Each layer can read the request, change it, or stop it.",
    here: [
      "CORS checks the browser origin from server/.env.",
      "cookie-parser reads the session cookie.",
      "express.json accepts a JSON body up to 10mb, which covers CSV imports.",
      "Request context stores that cookie so login and portal calls share one session.",
    ],
    canDo: [
      "Log every call, require a login, limit repeated requests, and compress responses.",
      "Stop a request early with 401 or 403 before the controller runs.",
      "Chain as many layers as a route needs, in order.",
    ],
  },
  {
    id: "mvc",
    label: "MVC",
    summary: "Each API call passes through a route, a controller, and a function.",
    here: [
      "Routes only name the URL and the method, such as POST /api/admin/nav.",
      "Controllers read the request and send the status and JSON.",
      "Functions hold the work: login, clients, imports, reports, and NAV.",
    ],
    canDo: [
      "Add a new screen by adding one route, one controller method, and one function.",
      "Keep MongoDB and password rules out of the URL file.",
      "Test the function without starting the HTTP server.",
    ],
  },
  {
    id: "mongodb",
    label: "MongoDB",
    summary: "MongoDB Atlas stores the fund records. The connection lives in server/mongo.js.",
    here: [
      "The connection string is MONGODB_URI in aif/.env.local.",
      "The database name is aif_wealthdiscovery.",
      "Collections hold investors, staff, securities, and platform state, including NAV history.",
      "If local DNS cannot resolve Atlas, the driver retries through public DNS.",
    ],
    canDo: [
      "Save documents, update one record, and read a page of history.",
      "Keep the same data after the API process restarts.",
      "Index a field such as client code or NAV date when the lists grow.",
    ],
  },
  {
    id: "sessions",
    label: "Sessions",
    summary: "A signed HTTP-only cookie is the login. The browser sends it back with every API call.",
    here: [
      "Investor login opens the portal session. Staff login opens the admin session.",
      "The cookie is not readable by page scripts.",
      "An investor can load only their own client code.",
      "Password reset uses a second short-lived cookie after the code is checked.",
    ],
    canDo: [
      "Expire a session, log everyone out, and reject a cookie after a password change.",
      "Keep investor and staff sessions separate.",
      "Mark the cookie Secure when the site is served over HTTPS.",
    ],
  },
  {
    id: "cors",
    label: "CORS",
    summary: "The frontend and the API are different origins. CORS says which site may call the API with cookies.",
    here: [
      "CORS_ORIGIN is in server/.env, separate from the database file.",
      "The usual local value is http://localhost:3000.",
      "Several origins can be listed, separated by commas.",
      "Cookies are allowed only for an origin on that list.",
    ],
    canDo: [
      "Point the same API at a staging site and a production site.",
      "Refuse a browser on an unknown domain.",
      "Allow tools with no Origin header, such as a health check.",
    ],
  },
  {
    id: "auth",
    label: "Auth",
    summary: "Auth checks who is calling before a record is read or changed.",
    here: [
      "Investors sign in with mobile or email. Staff sign in with an admin email.",
      "Passwords are stored as a scrypt hash, not as plain text.",
      "Admin routes also check the role and the module, such as clients or NAV.",
      "A suspended staff account cannot sign in.",
    ],
    canDo: [
      "Add another role and turn modules on or off for that role.",
      "Lock a route to super admin only.",
      "Connect email later so the reset code is sent instead of shown on screen.",
    ],
  },
  {
    id: "cron",
    label: "Cron jobs",
    summary: "A cron job runs work on a clock, without someone clicking a button.",
    here: [
      "Statement schedules already store frequency, target, and retries: daily, weekly, or monthly.",
      "A manual report run still happens when staff queue it.",
      "A clock process is the next step so those saved schedules fire on their own.",
    ],
    canDo: [
      "Send statements, refresh NAV, and write an audit line at a fixed time.",
      "Retry a failed run and skip a duplicate send.",
      "Run the job inside the API process or in a separate worker.",
    ],
  },
  {
    id: "files",
    label: "Files",
    summary: "The API can take a file in, check it, and give a file back.",
    here: [
      "Imports accept a ledger or holdings CSV, preview the rows, then commit the valid ones.",
      "Statement download returns a PDF for the signed-in investor.",
      "The JSON limit is 10mb so a normal import fits in one request.",
    ],
    canDo: [
      "Reject a bad row and return an error report.",
      "Stream a larger file instead of holding it all in memory.",
      "Store an uploaded document against a client record.",
    ],
  },
  {
    id: "errors",
    label: "Errors",
    summary: "A bad request should say what to fix. An unexpected failure should stay private.",
    here: [
      "Functions return a message and a status, such as 400 or 404.",
      "Controllers send that JSON to the screen.",
      "Anything thrown later is logged on the server and answered as a generic 500.",
    ],
    canDo: [
      "Validate a date, a NAV, and a required field before writing to MongoDB.",
      "Keep passwords and connection strings out of the response.",
      "Add a request id so one failure can be found in the log.",
    ],
  },
  {
    id: "env",
    label: "Environment",
    summary: "Secrets and machine settings stay in env files. The code reads them at startup.",
    here: [
      "aif/.env.local holds MONGODB_URI and MONGODB_DB.",
      "server/.env holds CORS_ORIGIN.",
      "Both files load before the routes, so the first request already sees them.",
      "Example files list the keys without real secrets.",
    ],
    canDo: [
      "Use a different database and origin on each machine.",
      "Change PORT without editing source.",
      "Keep the live connection string out of git.",
    ],
  },
];

export function interviewTopic(id: string) {
  return interviewTopics.find((topic) => topic.id === id) ?? null;
}
