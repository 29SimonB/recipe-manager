export interface Recipe {
  id: number;
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
  createdAt: string;
  updatedAt: string;
}

export type RecipeDraft = Omit<Recipe, "id" | "createdAt" | "updatedAt">;

export interface User {
  id: number;
  email: string;
  name: string;
}
