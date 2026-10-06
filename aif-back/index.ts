import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import { bindRequestContext } from "./middleware/context.js";
import { corsMiddleware } from "./middleware/cors.js";
import portalRoutes from "./routes/portal.routes.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

const app = express();

app.use(corsMiddleware());
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(bindRequestContext);

app.get("/", (_req, res) => {
  res.json({ ok: true, message: "server running successfully" });
});
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/portal", portalRoutes);
app.use("/api/admin", adminRoutes);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ message: "The server could not complete that request." });
});

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 4000);
  app.listen(port, () => {
    console.log(`AIF API listening on http://localhost:${port}`);
  });
}

export default app;
