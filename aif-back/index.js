import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(root, "../aif/.env.local") });
dotenv.config({ path: path.join(root, ".env") });

const { corsMiddleware } = await import("./middleware/cors.js");
const { bindRequestContext } = await import("./middleware/context.js");
const authRoutes = (await import("./routes/auth.routes.js")).default;
const portalRoutes = (await import("./routes/portal.routes.js")).default;
const adminRoutes = (await import("./routes/admin.routes.js")).default;

const port = Number(process.env.PORT || 4000);
const app = express();

app.use(corsMiddleware());
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(bindRequestContext);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/portal", portalRoutes);
app.use("/api/admin", adminRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "The server could not complete that request." });
});

app.listen(port, () => {
  console.log(`AIF API listening on http://localhost:${port}`);
});

module.exports=app;