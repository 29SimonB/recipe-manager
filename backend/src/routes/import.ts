import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth.js";
import { ImportError, scrapeRecipe } from "../scraper.js";

export const importRouter = Router();
importRouter.use(requireAuth);

const importSchema = z.object({
  url: z.string().trim().url("Bitte gib eine gültige URL ein."),
});

importRouter.post("/", async (req, res) => {
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." });
    return;
  }

  try {
    const recipe = await scrapeRecipe(parsed.data.url);
    res.json({ recipe });
  } catch (error) {
    if (error instanceof ImportError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Import ist fehlgeschlagen." });
  }
});
