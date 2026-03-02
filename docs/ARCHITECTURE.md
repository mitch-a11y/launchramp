# LaunchRamp — Architecture Reference

> Dieses Dokument ist die einzige technische Wahrheit.
> Wenn Code diesem Dokument widerspricht — dieses Dokument gewinnt.

## Tech Stack

| Was | Womit |
|-----|-------|
| Runtime | Browser, Vanilla JS, kein Framework, kein Bundler |
| Hosting | GitHub Pages (`mitch-a11y.github.io/launchramp`) |
| Persistence | localStorage (Key: `"lr"`) = Wahrheit |
| Cloud-Sync | Supabase Postgres (JSONB blob, Tabelle `app_state`, Row `id='main'`) |
| Deployment | Push to `main` → auto-deploy |
| Code-Style | `var`/`function` in bestehendem Code. `let`/`const` OK in neuem Code, konsistent innerhalb einer Funktion. |

## Datenmodell

```
DB (localStorage "lr")
└── clients[]
    ├── _id: "cl_xxx"
    ├── name: string
    └── projects[]
        ├── _id: "pr_xxx"
        ├── name: string
        ├── type: "projekt" | "retainer"
        ├── states: {}              ← LEGACY — IGNORIEREN
        ├── docLinks: []
        ├── quickLinks: []
        ├── jfNotes: []
        └── phases[]
            ├── _id: "ph_xxx"
            ├── name: string
            ├── color: string
            ├── start: string (ISO)
            ├── end: string (ISO)
            └── packages[]
                ├── _id: "pk_xxx"
                ├── name: string
                └── tasks[]
                    ├── _id: "ts_xxx"
                    ├── t: string           (Taskname)
                    ├── status: integer 0-4  (EINZIGE Wahrheit)
                    ├── owner: string
                    ├── due: string (ISO)
                    ├── min: number          (Aufwand in Minuten)
                    ├── notes: string
                    ├── ki: boolean          (kritisch-Flag)
                    ├── vor: string          (Dependency: _id eines anderen Tasks)
                    └── auto: boolean        (Automatisierung möglich)
```

## Status-System

| Wert | Label | Farbe |
|------|-------|-------|
| 0 | Offen | Grau |
| 1 | Wartend | Gelb |
| 2 | In Arbeit | Blau |
| 3 | Review | Orange |
| 4 | Erledigt | Grün |

**Status ist IMMER `task.status` (Integer). `project.states` ist Legacy und wird ignoriert.**

## ID-System

| Entity | Prefix | Beispiel |
|--------|--------|----------|
| Client | `cl_` | `cl_a7b3x` |
| Project | `pr_` | `pr_k9m2n` |
| Phase | `ph_` | `ph_f4d8w` |
| Package | `pk_` | `pk_e2r5t` |
| Task | `ts_` | `ts_q1w3e` |

- `genId(prefix)` = prefix + `_` + 5 random alphanumerische Zeichen
- Ältere Entities haben UUID-Format — beide koexistieren
- Bestehende IDs **NIEMALS** ändern
- Matching **IMMER** per `_id`, nie per Name oder Index

## Goldene Regeln

1. **Datenänderung → `save()` → `renderAll()`** — Keine Ausnahme.
2. **IDs sind heilig** — Bestehende nie ändern, neue mit `genId(prefix)`.
3. **Status lebt am Task** — `task.status` (Integer 0-4). `project.states` ignorieren.
4. **Import ist destruktiv** — Auto-Snapshot vorher. Immer.
5. **localStorage = Wahrheit** — Supabase ist Backup. Bei Konflikt entscheidet User.
6. **Matching per `_id`** — Nie per Name, nie per Index.
7. **Vanilla JS** — Keine Dependencies außer Supabase SDK.
8. **Error Handling** — `try/catch` um `JSON.parse`, Null-Checks vor Array-Zugriffen.

## Dateien & Verantwortlichkeiten

| Datei | Zweck | ~Größe |
|-------|-------|--------|
| `index.html` | HTML-Struktur, Modals | 220 LOC / 5350 LOC gesamt |
| `js/actions.js` | Business Logic, Import/Export, Diff | ~98KB |
| `js/render.js` | UI-Rendering | 700 LOC |
| `js/config.js` | Konfiguration, Migration, Supabase | 800 LOC |
| `js/data.js` | Persistenz, Load/Save | 370 LOC |

## Kern-Funktionen

### Persistenz
| Funktion | Datei | Was sie tut |
|----------|-------|-------------|
| `save()` | data.js | Speichert DB → localStorage + triggert Supabase-Sync (debounced 300ms) |
| `saveNow()` | data.js | Speichert sofort, ohne Debounce |
| `load()` | data.js | Lädt DB aus localStorage |
| `saveToSupabase()` | data.js | Debounced (500ms), schreibt DB nach Supabase |
| `loadFromSupabase()` | data.js | Lädt von Supabase, ÜBERSCHREIBT lokale Daten |

### Rendering
| Funktion | Datei | Was sie tut |
|----------|-------|-------------|
| `renderAll()` | render.js | Komplette UI neu zeichnen |
| `renderTasks()` | render.js | Nur Task-Liste rendern |
| `renderSidebar()` | render.js | Kunden-/Projekt-Navigation rendern |

### Import/Export
| Funktion | Datei | Was sie tut |
|----------|-------|-------------|
| `computeDiff(importData)` | actions.js | Vergleicht Import-JSON vs. DB-Stand |
| `applySelectedChanges()` | actions.js | Wendet vom User gewählte Änderungen an |
| `handleImportFile(input)` | actions.js | JSON-Import Einstiegspunkt |
| `doExport()` | actions.js | JSON/MD Export |
| `renderDiffReview(changes)` | render.js | Diff-Checkboxen anzeigen |

### Utilities
| Funktion | Datei | Was sie tut |
|----------|-------|-------------|
| `genId(prefix)` | actions.js | Neue ID generieren |
| `getTaskStatus(project, pi, pai, ti)` | config.js | Status lesen (mit Fallback) |
| `setTaskStatus(project, pi, pai, ti, val)` | config.js | Status setzen |
| `migrateStatesToTasks(project)` | config.js | Legacy-Status → task.status |
| `createSnapshot(clientIdx, label)` | actions.js | Backup erstellen |
| `pushUndo(label)` | actions.js | Undo-Punkt setzen |
| `Bus.emit(event, data)` | config.js | Event-Bus |
| `showToast(msg)` | actions.js | Toast-Notification |

## Change-Types & Severity (Import-Diff)

| Type | Severity | Checkbox-Default |
|------|----------|-----------------|
| `status_change` | 🟢 green | ✅ an |
| `rename_task` | 🟢 green | ✅ an |
| `notes_change` | 🟢 green | ✅ an |
| `effort_change` | 🟢 green | ✅ an |
| `deadline_change` | 🟡 yellow | ✅ an |
| `owner_change` | 🟡 yellow | ✅ an |
| `new_task` | 🟡 yellow | ✅ an |
| `new_package` | 🟡 yellow | ✅ an |
| `rename_phase` | 🟡 yellow | ✅ an |
| `delete_task` | 🔴 red | ⬜ aus |
| `delete_package` | 🔴 red | ⬜ aus |
| `new_phase` | 🔴 red | ⬜ aus |
| `delete_phase` | 🔴 red | ⬜ aus |
| `new_client` | 🔴 red | ⬜ aus |
| `new_project` | 🔴 red | ⬜ aus |

**Ampel-Logik:** Grün = sicher, auto-checked. Gelb = prüfenswert, default an. Rot = Strukturänderung, User muss bewusst aktivieren.
