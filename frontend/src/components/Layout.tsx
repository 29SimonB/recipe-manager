import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/recipes" className="brand">
          🍲 Recipe Manager
        </Link>
        {user && (
          <nav className="nav-actions">
            <Link to="/recipes/import">Importieren</Link>
            <Link to="/recipes/new">Neues Rezept</Link>
            <span className="user-name">{user.name}</span>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Abmelden
            </button>
          </nav>
        )}
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
