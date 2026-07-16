import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteRecipe, getRecipe } from "../api/recipes";
import type { Recipe } from "../types";

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getRecipe(id)
      .then(({ recipe }) => setRecipe(recipe))
      .catch(() => setError("Rezept konnte nicht geladen werden."));
  }, [id]);

  async function handleDelete() {
    if (!id || !window.confirm("Dieses Rezept wirklich löschen?")) return;
    await deleteRecipe(id);
    navigate("/recipes");
  }

  if (error) return <p className="page-status error">{error}</p>;
  if (!recipe) return <p className="page-status">Lädt…</p>;

  return (
    <article className="recipe-detail">
      <div className="recipe-detail-header">
        <h1>{recipe.title}</h1>
        <div className="recipe-detail-actions">
          <Link to={`/recipes/${recipe.id}/edit`} className="button secondary">
            Bearbeiten
          </Link>
          <button type="button" onClick={handleDelete} className="button danger">
            Löschen
          </button>
        </div>
      </div>

      {recipe.imageUrl && <img src={recipe.imageUrl} alt="" className="recipe-detail-image" />}
      {recipe.description && <p className="recipe-description">{recipe.description}</p>}

      <div className="recipe-meta">
        {recipe.prepTimeMinutes != null && <span>Vorbereitung: {recipe.prepTimeMinutes} Min.</span>}
        {recipe.cookTimeMinutes != null && <span>Kochzeit: {recipe.cookTimeMinutes} Min.</span>}
        {recipe.totalTimeMinutes != null && <span>Gesamt: {recipe.totalTimeMinutes} Min.</span>}
        {recipe.servings && <span>Portionen: {recipe.servings}</span>}
      </div>

      <div className="recipe-columns">
        <section>
          <h2>Zutaten</h2>
          <ul>
            {recipe.ingredients.map((ingredient, i) => (
              <li key={i}>{ingredient}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Zubereitung</h2>
          <ol>
            {recipe.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>
      </div>

      {recipe.sourceUrl && (
        <p className="recipe-source">
          Quelle:{" "}
          <a href={recipe.sourceUrl} target="_blank" rel="noreferrer noopener">
            {recipe.sourceUrl}
          </a>
        </p>
      )}
    </article>
  );
}
