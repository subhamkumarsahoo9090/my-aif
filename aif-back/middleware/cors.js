import cors from "cors";

function allowedOrigins() {
  const raw = process.env.CORS_ORIGIN || "";
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}

export function corsMiddleware() {
  const origins = allowedOrigins();
  if (origins.length === 0) {
    console.error("CORS_ORIGIN is missing. Set it to the frontend origin.");
  }
  return cors({
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed"));
    },
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  });
}
