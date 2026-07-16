import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, signToken } from "../auth.js";
import { db } from "../db.js";

export const authRouter = Router();

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein."),
});

const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(1, "Name ist erforderlich.").max(100),
});

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  name: string;
}

authRouter.post("/register", (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." });
    return;
  }
  const { email, password, name } = parsed.data;

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    res.status(409).json({ error: "E-Mail-Adresse ist bereits registriert." });
    return;
  }

  const passwordHash = bcrypt.hashSync(password, 12);
  const result = db
    .prepare("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)")
    .run(email, passwordHash, name);

  const token = signToken({ userId: Number(result.lastInsertRowid), email });
  res.status(201).json({ token, user: { id: result.lastInsertRowid, email, name } });
});

authRouter.post("/login", (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungültige E-Mail oder Passwort." });
    return;
  }
  const { email, password } = parsed.data;

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as
    | UserRow
    | undefined;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: "E-Mail oder Passwort ist falsch." });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

authRouter.get("/me", requireAuth, (req, res) => {
  const user = db
    .prepare("SELECT id, email, name FROM users WHERE id = ?")
    .get(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: "Benutzer nicht gefunden." });
    return;
  }
  res.json({ user });
});
