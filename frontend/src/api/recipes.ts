import type { Recipe, RecipeDraft } from "../types";
import { apiFetch } from "./client";

export function listRecipes() {
  return apiFetch<{ recipes: Recipe[] }>("/recipes");
}

export function getRecipe(id: number | string) {
  return apiFetch<{ recipe: Recipe }>(`/recipes/${id}`);
}

export function createRecipe(draft: RecipeDraft) {
  return apiFetch<{ recipe: Recipe }>("/recipes", {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

export function updateRecipe(id: number | string, draft: RecipeDraft) {
  return apiFetch<{ recipe: Recipe }>(`/recipes/${id}`, {
    method: "PUT",
    body: JSON.stringify(draft),
  });
}

export function deleteRecipe(id: number | string) {
  return apiFetch<void>(`/recipes/${id}`, { method: "DELETE" });
}

export function importRecipe(url: string) {
  return apiFetch<{ recipe: RecipeDraft }>("/import", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}
