import { load } from "cheerio";
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

export class ImportError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 422
  ) {
    super(message);
  }
}

export interface ScrapedRecipe {
  title: string;
  description: string;
  imageUrl: string;
  sourceUrl: string;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  totalTimeMinutes: number | null;
  servings: string;
  ingredients: string[];
  instructions: string[];
  tags: string[];
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    normalized === "::"
  );
}

/**
 * Blocks SSRF against loopback/private/link-local targets before the server
 * fetches a user-supplied URL (this backend may run on a home network / Pi).
 */
async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ImportError("Ungültige URL.", 400);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ImportError("Nur http/https-URLs werden unterstützt.", 400);
  }

  const hostname = url.hostname;
  if (hostname === "localhost" || hostname.endsWith(".local")) {
    throw new ImportError("Diese URL ist nicht erlaubt.", 400);
  }

  const ipVersion = isIP(hostname);
  if (ipVersion === 4 && isPrivateIPv4(hostname)) {
    throw new ImportError("Diese URL ist nicht erlaubt.", 400);
  }
  if (ipVersion === 6 && isPrivateIPv6(hostname)) {
    throw new ImportError("Diese URL ist nicht erlaubt.", 400);
  }

  if (ipVersion === 0) {
    const resolved = await lookup(hostname).catch(() => null);
    if (!resolved) {
      throw new ImportError("Die Domain konnte nicht aufgelöst werden.", 400);
    }
    const isPrivate =
      resolved.family === 4 ? isPrivateIPv4(resolved.address) : isPrivateIPv6(resolved.address);
    if (isPrivate) {
      throw new ImportError("Diese URL ist nicht erlaubt.", 400);
    }
  }

  return url;
}

function parseIsoDurationToMinutes(duration: unknown): number | null {
  if (typeof duration !== "string") return null;
  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  return hours * 60 + minutes;
}

function firstString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return firstString(value[0]);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return firstString(obj.name ?? obj.url ?? obj["@id"]);
  }
  return "";
}

function extractIngredients(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => firstString(item)).filter(Boolean);
}

function extractInstructionText(item: unknown): string[] {
  if (typeof item === "string") return [item.trim()].filter(Boolean);
  if (Array.isArray(item)) return item.flatMap(extractInstructionText);
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    const type = obj["@type"];
    if (type === "HowToSection" && Array.isArray(obj.itemListElement)) {
      return extractInstructionText(obj.itemListElement);
    }
    if (typeof obj.text === "string") return [obj.text.trim()].filter(Boolean);
    if (typeof obj.name === "string") return [obj.name.trim()].filter(Boolean);
  }
  return [];
}

function extractInstructions(value: unknown): string[] {
  return extractInstructionText(value);
}

function extractServings(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return extractServings(value[0]);
  return "";
}

function extractTags(node: Record<string, unknown>): string[] {
  const values = [node.keywords, node.recipeCategory, node.recipeCuisine].flatMap((value) => {
    if (typeof value === "string") return value.split(",");
    if (Array.isArray(value)) return value.map((v) => firstString(v));
    return [];
  });
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function findRecipeNode(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const type = obj["@type"];
    const types = Array.isArray(type) ? type : [type];
    if (types.includes("Recipe")) return obj;
    if (Array.isArray(obj["@graph"])) return findRecipeNode(obj["@graph"]);
  }
  return null;
}

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

async function fetchHtml(url: URL): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RecipeManagerBot/1.0)",
        Accept: "text/html",
      },
    });
    if (!response.ok) {
      throw new ImportError(`Seite konnte nicht geladen werden (Status ${response.status}).`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      throw new ImportError("Die URL liefert kein HTML-Dokument.");
    }
    const reader = response.body?.getReader();
    if (!reader) return await response.text();

    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        throw new ImportError("Die Seite ist zu groß.");
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf-8");
  } catch (error) {
    if (error instanceof ImportError) throw error;
    throw new ImportError("Seite konnte nicht abgerufen werden.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function scrapeRecipe(rawUrl: string): Promise<ScrapedRecipe> {
  const url = await assertPublicHttpUrl(rawUrl);
  const html = await fetchHtml(url);
  const $ = load(html);

  let recipeNode: Record<string, unknown> | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (recipeNode) return;
    try {
      const json = JSON.parse($(el).text());
      recipeNode = findRecipeNode(json);
    } catch {
      // ignore malformed JSON-LD blocks
    }
  });

  if (!recipeNode) {
    throw new ImportError(
      "Auf dieser Seite wurden keine strukturierten Rezeptdaten gefunden. Bitte lege das Rezept manuell an."
    );
  }

  const node = recipeNode as Record<string, unknown>;

  return {
    title: firstString(node.name) || "Importiertes Rezept",
    description: firstString(node.description),
    imageUrl: firstString(node.image),
    sourceUrl: url.toString(),
    prepTimeMinutes: parseIsoDurationToMinutes(node.prepTime),
    cookTimeMinutes: parseIsoDurationToMinutes(node.cookTime),
    totalTimeMinutes: parseIsoDurationToMinutes(node.totalTime),
    servings: extractServings(node.recipeYield),
    ingredients: extractIngredients(node.recipeIngredient),
    instructions: extractInstructions(node.recipeInstructions),
    tags: extractTags(node),
  };
}
