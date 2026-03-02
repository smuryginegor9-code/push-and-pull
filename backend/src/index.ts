import cors from "cors";
import express from "express";
import morgan from "morgan";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { apiRouter } from "./routes/index.js";

const app = express();

const corsOrigin = env.FRONTEND_ORIGIN === "*" ? true : env.FRONTEND_ORIGIN.split(",").map((value) => value.trim());

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use("/api", apiRouter);

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      issues: error.issues
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Unknown server error";
  console.error(error);
  res.status(500).json({ error: message });
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(env.PORT, () => {
  console.log(`Backend listening on http://localhost:${env.PORT}`);
});
