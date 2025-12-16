# MA Video Tree (React + Fastify + TypeScript)

Lokales Tool zum Verwalten eines Video-Workflows als Graph (Clip → Params → Clip).

Frontend: React (Vite)
Backend: Fastify (Node/TypeScript)
Shared Types: packages/shared (Zod + TS Types)

---

## Voraussetzungen

- Node.js (empfohlen: LTS)
- pnpm (Workspace Package Manager)

Versionen prüfen:
node -v
pnpm -v

Wenn pnpm fehlt:
npm i -g pnpm

---

## Projektstruktur

apps/web        – React UI (Port 5173)
apps/api        – Backend API (Port 3001)
packages/shared – gemeinsame Typen & Schemas
storage/        – lokale Projektdateien

---

## Setup (einmalig)

1) Dependencies installieren (Repo-Root):
pnpm install

2) Storage Ordner anlegen:
mkdir storage
mkdir storage/projects

---

## Development Start (Schritt für Schritt)

WICHTIG: Backend und Frontend laufen in getrennten Terminals.

---

### Terminal 1 – Backend starten

Im Repo-Root:
pnpm -C apps/api dev

Erwartete Ausgabe:
Server listening at http://0.0.0.0:3001

Test im Browser:
http://localhost:3001/health
→ { "ok": true }

---

### Terminal 2 – Frontend starten

Im Repo-Root (neues Terminal):
pnpm -C apps/web dev

Erwartete Ausgabe:
Local: http://localhost:5173/

Im Browser öffnen:
http://localhost:5173/

---

## Nutzung

- Button: "+ Clip → Params → Clip" erzeugt einen Generierungsschritt
- Button: "Save" speichert Projekt nach:
  storage/projects/<projectId>.json

---

## Häufige Probleme & Lösungen

### Frontend zeigt "Loading..."

Ursache: Backend läuft nicht.

Lösung:
- Prüfen: http://localhost:3001/health
- Falls nicht erreichbar:
  pnpm -C apps/api dev

---

### Browser: Verbindung fehlgeschlagen auf localhost:5173

Ursache: Frontend läuft nicht.

Lösung:
pnpm -C apps/web dev

Alternativ Port ändern:
pnpm -C apps/web dev -- --port 5174
→ http://localhost:5174/

---

### Browser: 404 Not Found auf localhost:5173

Ursache: index.html fehlt oder liegt falsch.

Pfad muss existieren:
apps/web/index.html

Minimaler Inhalt:

<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MA Video Tree</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

---

### Fehler: "tsc" nicht gefunden

Ursache: TypeScript fehlt.

Lösung (Repo-Root):
pnpm add -D typescript
pnpm install

---

## Optional: Shared Types Watcher

Nur nötig, wenn aktiv an packages/shared gearbeitet wird:

pnpm -C packages/shared dev

---

## Ports

Frontend: http://localhost:5173
Backend:  http://localhost:3001

---

## Hinweise

- Tool ist vollständig lokal
- Keine Cloud-Abhängigkeiten
- Backend & Frontend können später zu einer Desktop-App gebündelt werden
- Architektur vorbereitet für Python/ComfyUI Worker

---

## Nächste Schritte (Roadmap)

- Timeline View (Clip-Pfad)
- Media Upload & Preview
- Job-System für AI-Generierung
- Edit-Nodes (DaVinci / Blender)
