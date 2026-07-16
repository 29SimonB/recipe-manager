import cors from "cors";
import express from "express";
import "./db.js";
import { env } from "./env.js";
import { authRouter } from "./routes/auth.js";
import { importRouter } from "./routes/import.js";
import { recipesRouter } from "./routes/recipes.js";

const app = express();

app.use(
  cors({
    origin: env.corsOrigins,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/import", importRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Nicht gefunden." });
});

app.listen(env.port, () => {
  console.log(`Recipe Manager API läuft auf Port ${env.port}`);
});
