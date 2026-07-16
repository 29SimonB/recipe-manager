import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listRecipes } from "../api/recipes";
import type { Recipe } from "../types";

export function RecipesListPage() {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRecipes()
      .then(({ recipes }) => setRecipes(recipes))
      .catch(() => setError("Rezepte konnten nicht geladen werden."));
  }, []);

  if (error) return <p className="page-status error">{error}</p>;
  if (!recipes) return <p className="page-status">Lädt…</p>;

  if (recipes.length === 0) {
    return (
      <div className="empty-state">
        <p>Noch keine Rezepte vorhanden.</p>
        <div className="empty-actions">
          <Link to="/recipes/import" className="button">
            Rezept importieren
          </Link>
          <Link to="/recipes/new" className="button secondary">
            Manuell anlegen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="recipe-grid">
      {recipes.map((recipe) => (
        <Link to={`/recipes/${recipe.id}`} key={recipe.id} className="recipe-card">
          {recipe.imageUrl && <img src={recipe.imageUrl} alt="" loading="lazy" />}
          <div className="recipe-card-body">
            <h3>{recipe.title}</h3>
            {recipe.totalTimeMinutes != null && (
              <span className="recipe-time">{recipe.totalTimeMinutes} Min.</span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
