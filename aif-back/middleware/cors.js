import cors from "cors";

function allowedOrigins() {
  const raw = process.env.CORS_ORIGIN;
  if (!raw) throw new Error("CORS_ORIGIN is missing. Add it to server/.env.");
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}

export function corsMiddleware() {
  const origins = allowedOrigins();
  return cors({
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed"));
    },
    credentials: true,
  });
}
