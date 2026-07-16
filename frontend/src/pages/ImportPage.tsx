import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { importRecipe } from "../api/recipes";
import { ApiError } from "../api/client";

export function ImportPage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { recipe } = await importRecipe(url);
      navigate("/recipes/new", { state: { draft: recipe } });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Import fehlgeschlagen. Bitte versuche es erneut oder lege das Rezept manuell an."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-form-wrapper">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Rezept importieren</h1>
        <p className="hint">
          Füge den Link zu einem Rezept ein. Wir lesen die strukturierten Rezeptdaten der Seite
          aus und du kannst sie danach bearbeiten, bevor du speicherst.
        </p>
        {error && <p className="form-error">{error}</p>}
        <label>
          Rezept-URL
          <input
            type="url"
            required
            placeholder="https://beispiel-rezepte.de/rezept/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Importiert…" : "Importieren"}
        </button>
      </form>
    </div>
  );
}
