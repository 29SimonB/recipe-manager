# Recipe Manager

Rezepte importieren (per URL), verwalten und bearbeiten. Frontend ist eine installierbare PWA (React + Vite), Backend ist eine eigene Node/Express-API mit SQLite-Datenbank und Account-Login (JWT). Alles läuft als ein Prozess auf dem eigenen Raspberry Pi.

## Architektur

```
frontend/   React + Vite + TypeScript PWA (Auth-UI, Rezeptliste, Editor, Import-Formular)
backend/    Node + Express + TypeScript API (Auth, Rezept-CRUD, URL-Import/Scraper, SQLite)
deploy/     systemd-Unit + Deploy-Skript für den Pi
```

Im Produktivbetrieb (auf dem Pi) baut man das Frontend zu statischen Dateien und lässt den Express-Server im Backend sie zusätzlich zur API ausliefern (`FRONTEND_DIST_PATH` in `backend/.env`) – ein einziger Node-Prozess auf einem Port, kein CORS, kein separates Hosting nötig.

## Lokale Entwicklung

**Backend:**
```bash
cd backend
cp .env.example .env   # JWT_SECRET ggf. anpassen, FRONTEND_DIST_PATH leer lassen
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

## Produktivbetrieb auf dem Raspberry Pi

Aktueller Stand: Frontend + Backend laufen beide auf `mypi4` (Debian 13, ARM64) unter dem systemd-Service `recipe-manager`, erreichbar unter **http://mypi4:3001**. Zugriff von unterwegs läuft über das bereits vorhandene VPN zur Fritzbox.

**Erneutes Deployen nach Code-Änderungen:**
```bash
./deploy/deploy.sh
```
Das Skript synct den Code per `rsync` auf den Pi, installiert Abhängigkeiten, baut Backend und Frontend neu und startet den systemd-Service (`recipe-manager`) neu.

**Nützliche Befehle auf dem Pi:**
```bash
sudo systemctl status recipe-manager    # Status
sudo systemctl restart recipe-manager   # Neustart
journalctl -u recipe-manager -f         # Live-Logs
```

**Einmalige Ersteinrichtung** (bereits erledigt, hier zur Referenz):
1. Node.js 22 über das NodeSource-Repo installiert (`better-sqlite3` hat fertige ARM64-Binaries, kein Kompilieren nötig).
2. Code nach `~/recipe-manager` auf den Pi kopiert, `backend/.env` mit eigenem `JWT_SECRET` und `FRONTEND_DIST_PATH=/home/simonb29/recipe-manager/frontend/dist` angelegt.
3. `deploy/recipe-manager.service` nach `/etc/systemd/system/` kopiert, `systemctl enable --now recipe-manager`.

## Sicherheitshinweise zum URL-Import

Der Import-Endpunkt lädt serverseitig beliebige, vom Nutzer eingegebene URLs. Es gibt einfache Schutzmaßnahmen gegen SSRF (Ablehnen von localhost/privaten IP-Bereichen, Größen- und Zeitlimits) in [`backend/src/scraper.ts`](backend/src/scraper.ts) – das ist ein solider Basisschutz für den privaten Gebrauch, aber keine vollständige Härtung gegen DNS-Rebinding. Für reinen Privatgebrauch (eigener Account, kein öffentlicher Multi-User-Betrieb) ist das ausreichend.
