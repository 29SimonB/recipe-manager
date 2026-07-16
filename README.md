# Recipe Manager

Rezepte importieren (per URL), verwalten und bearbeiten. Frontend ist eine installierbare PWA (React + Vite), Backend ist eine eigene Node/Express-API mit SQLite-Datenbank und Account-Login (JWT).

## Architektur

```
frontend/   React + Vite + TypeScript PWA (Auth-UI, Rezeptliste, Editor, Import-Formular)
backend/    Node + Express + TypeScript API (Auth, Rezept-CRUD, URL-Import/Scraper, SQLite)
```

**Wichtig:** GitHub Pages hostet nur statische Dateien. Das Frontend kann dort liegen, aber das Backend braucht einen eigenen, erreichbaren Host – aktuell z. B. dein eigener Rechner, später der Raspberry Pi. Das Frontend spricht das Backend über die Umgebungsvariable `VITE_API_URL` an (Build-Zeit-Konfiguration), du musst also nur diese eine URL anpassen, wenn sich der Backend-Standort ändert.

## Lokale Entwicklung

**Backend:**
```bash
cd backend
cp .env.example .env   # JWT_SECRET ggf. anpassen
npm install
npm run dev             # läuft auf http://localhost:3001
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev              # läuft auf http://localhost:5173, spricht standardmäßig localhost:3001
```

Konto registrieren, Rezept per URL importieren (die Ziel-Seite muss schema.org/Recipe-Daten (JSON-LD) einbetten – das ist bei den meisten großen Rezeptseiten der Fall), Vorschau bearbeiten, speichern.

## Deployment

### Frontend auf GitHub Pages

Der Workflow [`(.github/workflows/deploy.yml)`](.github/workflows/deploy.yml) baut `frontend/` und deployt automatisch nach jedem Push auf `main`.

Einmalig einrichten:
1. Im Repo unter **Settings → Pages** als Quelle **GitHub Actions** auswählen.
2. Unter **Settings → Secrets and variables → Actions → Variables** eine Variable `VITE_API_URL` anlegen, die auf dein laufendes Backend zeigt (z. B. `https://dein-tunnel.example.com/api`). Ohne erreichbares Backend funktionieren Login/Import auf der gehosteten Seite nicht – die Seite selbst lädt aber trotzdem.

### Backend

Aktuell für lokalen Betrieb gedacht (`npm run build && npm run start` im `backend`-Ordner, `DB_PATH`/`JWT_SECRET`/`CORS_ORIGINS` per `.env` konfigurieren). Für einen öffentlich erreichbaren Zugriff (z. B. damit die GitHub-Pages-Version wirklich funktioniert) brauchst du entweder:
- einen kostenlosen Cloud-Host (Render, Fly.io, …), oder
- einen Tunnel zu deinem eigenen Rechner/Pi (z. B. Cloudflare Tunnel, Tailscale Funnel).

### Später: Raspberry Pi

Backend + SQLite laufen mit `better-sqlite3` nativ auf ARM (Raspberry Pi OS 64-bit). Einfach das `backend/`-Verzeichnis auf den Pi kopieren (oder per `git pull`), `npm install && npm run build && npm run start` (idealerweise mit `pm2` oder einem systemd-Service dauerhaft laufen lassen), und `VITE_API_URL` im Frontend-Deployment auf die Pi-Adresse zeigen lassen.

## Sicherheitshinweise zum URL-Import

Der Import-Endpunkt lädt serverseitig beliebige, vom Nutzer eingegebene URLs. Es gibt einfache Schutzmaßnahmen gegen SSRF (Ablehnen von localhost/privaten IP-Bereichen, Größen- und Zeitlimits) in [`backend/src/scraper.ts`](backend/src/scraper.ts) – das ist ein solider Basisschutz für den privaten Gebrauch, aber keine vollständige Härtung gegen DNS-Rebinding. Für reinen Privatgebrauch (eigener Account, kein öffentlicher Multi-User-Betrieb) ist das ausreichend.
