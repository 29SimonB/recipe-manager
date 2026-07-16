import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { createRecipe, getRecipe, updateRecipe } from "../api/recipes";
import type { RecipeDraft } from "../types";
import { ApiError } from "../api/client";

const emptyDraft: RecipeDraft = {
  title: "",
  description: "",
  imageUrl: "",
  sourceUrl: "",
  prepTimeMinutes: null,
  cookTimeMinutes: null,
  totalTimeMinutes: null,
  servings: "",
  ingredients: [],
  instructions: [],
  tags: [],
};

function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function RecipeEditPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const importedDraft = (location.state as { draft?: RecipeDraft } | null)?.draft;
  const [draft, setDraft] = useState<RecipeDraft>(
    importedDraft
      ? {
          ...emptyDraft,
          ...importedDraft,
          ingredients: importedDraft.ingredients ?? [],
          instructions: importedDraft.instructions ?? [],
          tags: importedDraft.tags ?? [],
        }
      : emptyDraft
  );
  const [ingredientsText, setIngredientsText] = useState(draft.ingredients.join("\n"));
  const [instructionsText, setInstructionsText] = useState(draft.instructions.join("\n"));
  const [tagsText, setTagsText] = useState(draft.tags.join(", "));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditing);

  useEffect(() => {
    if (!id) return;
    getRecipe(id)
      .then(({ recipe }) => {
        setDraft(recipe);
        setIngredientsText(recipe.ingredients.join("\n"));
        setInstructionsText(recipe.instructions.join("\n"));
        setTagsText(recipe.tags.join(", "));
      })
      .catch(() => setError("Rezept konnte nicht geladen werden."))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const payload: RecipeDraft = {
      ...draft,
      ingredients: linesToList(ingredientsText),
      instructions: linesToList(instructionsText),
      tags: tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    try {
      const result = isEditing ? await updateRecipe(id!, payload) : await createRecipe(payload);
      navigate(`/recipes/${result.recipe.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateField<K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  if (isLoading) return <p className="page-status">Lädt…</p>;

  return (
    <form className="recipe-form" onSubmit={handleSubmit}>
      <h1>{isEditing ? "Rezept bearbeiten" : "Neues Rezept"}</h1>
      {error && <p className="form-error">{error}</p>}

      <label>
        Titel
        <input
          type="text"
          required
          value={draft.title}
          onChange={(e) => updateField("title", e.target.value)}
        />
      </label>

      <label>
        Beschreibung
        <textarea
          rows={3}
          value={draft.description}
          onChange={(e) => updateField("description", e.target.value)}
        />
      </label>

      <div className="form-row">
        <label>
          Bild-URL
          <input
            type="url"
            value={draft.imageUrl}
            onChange={(e) => updateField("imageUrl", e.target.value)}
          />
        </label>
        <label>
          Portionen
          <input
            type="text"
            value={draft.servings}
            onChange={(e) => updateField("servings", e.target.value)}
          />
        </label>
      </div>

      <div className="form-row">
        <label>
          Vorbereitung (Min.)
          <input
            type="number"
            min={0}
            value={draft.prepTimeMinutes ?? ""}
            onChange={(e) =>
              updateField("prepTimeMinutes", e.target.value ? Number(e.target.value) : null)
            }
          />
        </label>
        <label>
          Kochzeit (Min.)
          <input
            type="number"
            min={0}
            value={draft.cookTimeMinutes ?? ""}
            onChange={(e) =>
              updateField("cookTimeMinutes", e.target.value ? Number(e.target.value) : null)
            }
          />
        </label>
        <label>
          Gesamtzeit (Min.)
          <input
            type="number"
            min={0}
            value={draft.totalTimeMinutes ?? ""}
            onChange={(e) =>
              updateField("totalTimeMinutes", e.target.value ? Number(e.target.value) : null)
            }
          />
        </label>
      </div>

      <label>
        Zutaten <span className="hint">(eine pro Zeile)</span>
        <textarea
          rows={8}
          required
          value={ingredientsText}
          onChange={(e) => setIngredientsText(e.target.value)}
        />
      </label>

      <label>
        Zubereitung <span className="hint">(ein Schritt pro Zeile)</span>
        <textarea
          rows={8}
          required
          value={instructionsText}
          onChange={(e) => setInstructionsText(e.target.value)}
        />
      </label>

      <label>
        Tags <span className="hint">(kommagetrennt)</span>
        <input type="text" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
      </label>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Speichert…" : "Speichern"}
      </button>
    </form>
  );
}
