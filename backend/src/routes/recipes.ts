import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth.js";
import { db } from "../db.js";

export const recipesRouter = Router();
recipesRouter.use(requireAuth);

const recipeSchema = z.object({
  title: z.string().trim().min(1, "Titel ist erforderlich.").max(200),
  description: z.string().max(2000).optional().default(""),
  imageUrl: z.string().url().optional().or(z.literal("")).default(""),
  sourceUrl: z.string().url().optional().or(z.literal("")).default(""),
  prepTimeMinutes: z.number().int().nonnegative().nullable().optional(),
  cookTimeMinutes: z.number().int().nonnegative().nullable().optional(),
  totalTimeMinutes: z.number().int().nonnegative().nullable().optional(),
  servings: z.string().max(50).optional().default(""),
  ingredients: z.array(z.string().trim().min(1)).default([]),
  instructions: z.array(z.string().trim().min(1)).default([]),
  tags: z.array(z.string().trim().min(1)).default([]),
});

interface RecipeRow {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  source_url: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  servings: string | null;
  ingredients: string;
  instructions: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

function serialize(row: RecipeRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    imageUrl: row.image_url ?? "",
    sourceUrl: row.source_url ?? "",
    prepTimeMinutes: row.prep_time_minutes,
    cookTimeMinutes: row.cook_time_minutes,
    totalTimeMinutes: row.total_time_minutes,
    servings: row.servings ?? "",
    ingredients: JSON.parse(row.ingredients),
    instructions: JSON.parse(row.instructions),
    tags: JSON.parse(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

recipesRouter.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM recipes WHERE user_id = ? ORDER BY updated_at DESC")
    .all(req.user!.userId) as RecipeRow[];
  res.json({ recipes: rows.map(serialize) });
});

recipesRouter.get("/:id", (req, res) => {
  const row = db
    .prepare("SELECT * FROM recipes WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user!.userId) as RecipeRow | undefined;
  if (!row) {
    res.status(404).json({ error: "Rezept nicht gefunden." });
    return;
  }
  res.json({ recipe: serialize(row) });
});

recipesRouter.post("/", (req, res) => {
  const parsed = recipeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." });
    return;
  }
  const r = parsed.data;
  const result = db
    .prepare(
      `INSERT INTO recipes
        (user_id, title, description, image_url, source_url, prep_time_minutes, cook_time_minutes, total_time_minutes, servings, ingredients, instructions, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user!.userId,
      r.title,
      r.description,
      r.imageUrl,
      r.sourceUrl,
      r.prepTimeMinutes ?? null,
      r.cookTimeMinutes ?? null,
      r.totalTimeMinutes ?? null,
      r.servings,
      JSON.stringify(r.ingredients),
      JSON.stringify(r.instructions),
      JSON.stringify(r.tags)
    );

  const row = db
    .prepare("SELECT * FROM recipes WHERE id = ?")
    .get(result.lastInsertRowid) as RecipeRow;
  res.status(201).json({ recipe: serialize(row) });
});

recipesRouter.put("/:id", (req, res) => {
  const existing = db
    .prepare("SELECT * FROM recipes WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user!.userId) as RecipeRow | undefined;
  if (!existing) {
    res.status(404).json({ error: "Rezept nicht gefunden." });
    return;
  }

  const parsed = recipeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." });
    return;
  }
  const r = parsed.data;

  db.prepare(
    `UPDATE recipes SET
       title = ?, description = ?, image_url = ?, source_url = ?,
       prep_time_minutes = ?, cook_time_minutes = ?, total_time_minutes = ?, servings = ?,
       ingredients = ?, instructions = ?, tags = ?, updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`
  ).run(
    r.title,
    r.description,
    r.imageUrl,
    r.sourceUrl,
    r.prepTimeMinutes ?? null,
    r.cookTimeMinutes ?? null,
    r.totalTimeMinutes ?? null,
    r.servings,
    JSON.stringify(r.ingredients),
    JSON.stringify(r.instructions),
    JSON.stringify(r.tags),
    req.params.id,
    req.user!.userId
  );

  const row = db.prepare("SELECT * FROM recipes WHERE id = ?").get(req.params.id) as RecipeRow;
  res.json({ recipe: serialize(row) });
});

recipesRouter.delete("/:id", (req, res) => {
  const result = db
    .prepare("DELETE FROM recipes WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.user!.userId);
  if (result.changes === 0) {
    res.status(404).json({ error: "Rezept nicht gefunden." });
    return;
  }
  res.status(204).end();
});
