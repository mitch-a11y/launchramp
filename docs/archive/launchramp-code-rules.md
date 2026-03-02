# LaunchRamp — Code-Regeln & Referenz

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
        ├── states: {} ← LEGACY, ignorieren
        ├── docLinks: [], quickLinks: [], jfNotes: [], templates: []
        └── phases[]
            ├── _id: "ph_xxx"
            ├── name: string, color: string
            ├── start: string (ISO), end: string (ISO)
            └── packages[]
                ├── _id: "pk_xxx"
                ├── name: string
                └── tasks[]
                    ├── _id: "ts_xxx"
                    ├── t: string (Taskname)
                    ├── status: integer (0-4)
                    ├── owner: string
                    ├── due: string (ISO date)
                    ├── min: number (Aufwand Minuten)
                    ├── notes: string
                    ├── ki: boolean (kritisch)
                    ├── vor: string (Dependency _id)
                    └── auto: boolean (Automatisierung)
```

## Status-System
| Wert | Label | Farbe |
|------|-------|-------|
| 0 | Offen | Grau |
| 1 | Wartend | Gelb |
| 2 | In Arbeit | Blau |
| 3 | Review | Orange |
| 4 | Erledigt | Grün |

**Status = Integer (0-4), KEIN String. `project.states` ist Legacy → ignorieren.**

## ID-System
| Entity | Prefix | Beispiel |
|--------|--------|----------|
| Client | `cl_` | `cl_a7b3x` |
| Project | `pr_` | `pr_k9m2n` |
| Phase | `ph_` | `ph_f4d8w` |
| Package | `pk_` | `pk_e2r5t` |
| Task | `ts_` | `ts_q1w3e` |

`genId(prefix)` = prefix + "_" + 5 random alphanumerische Zeichen.
Ältere Entities können UUID-Format haben — beide koexistieren. Neue IDs IMMER Prefix-Format. Bestehende IDs NIEMALS ändern.

## 10 Goldene Regeln

1. **Jede Datenänderung geht durch save()** — kein direktes localStorage-Schreiben
2. **IDs sind heilig** — bestehende `_id` NIEMALS ändern, neue immer mit genId(prefix)
3. **Status lebt am Task** — `task.status` (Integer 0-4), `project.states` ignorieren
4. **Import ist destruktiv** — automatischer Snapshot vorher
5. **Supabase ist Backup, localStorage ist Wahrheit** — bei Konflikt entscheidet User
6. **UI-Updates nach Datenänderungen** — save() → renderAll()
7. **Vanilla JS** — `var`/`function(){}` in altem Code; `let/const` OK in neuerem (konsistent innerhalb Funktion)
8. **Keine Dependencies** ausser Supabase SDK
9. **Matching per `_id`** — nie per Name oder Index
10. **Error Handling** — try/catch um JSON.parse, Null-Checks vor Array-Zugriffen

## Naming Conventions
| Was | Format | Beispiel |
|-----|--------|----------|
| Funktionen | camelCase | `saveTask()`, `computeDiff()` |
| Variablen | camelCase | `currentClient`, `taskList` |
| IDs | prefix + random | `ts_abc12`, `ph_xyz78` |
| CSS-Klassen | kebab-case | `.task-card`, `.phase-header` |
| Konstanten | UPPER_SNAKE | `MAX_SNAPSHOTS`, `STATUS_DONE` |

## Wichtige Funktionen
| Funktion | Datei | Zweck |
|----------|-------|-------|
| `genId(prefix)` | actions.js | ID generieren |
| `getTaskStatus(project, pi, pai, ti)` | config.js | Status lesen (mit Fallback) |
| `setTaskStatus(project, pi, pai, ti, val)` | config.js | Status setzen |
| `migrateStatesToTasks(project)` | config.js | Legacy-Migration |
| `computeDiff(importData)` | actions.js | Import vs. DB vergleichen |
| `applySelectedChanges()` | actions.js | Diff-Änderungen anwenden |
| `handleImportFile(input)` | actions.js | JSON-Import verarbeiten |
| `doExport()` | actions.js | JSON/MD exportieren |
| `renderDiffReview(changes)` | render.js | Diff-Checkboxen anzeigen |
| `createSnapshot(clientIdx, label)` | actions.js | Backup erstellen |
| `pushUndo(label)` | actions.js | Undo-Punkt setzen |
| `saveNow()` | data.js | localStorage + Supabase speichern |
| `renderAll()` | render.js | UI komplett neu rendern |
| `Bus.emit(event, data)` | config.js | Event-Bus |
| `showToast(msg)` | actions.js | Toast-Notification |

## Dateien
| Datei | Zweck | ~Zeilen |
|-------|-------|---------|
| index.html | HTML-Struktur, Modals | 220 |
| js/actions.js | Business Logic, Import/Export, Diff | 1800 |
| js/render.js | UI-Rendering | 700 |
| js/config.js | Konfiguration, Migration, Supabase | 800 |
| js/data.js | Persistenz, Load/Save | 370 |

## Copilot-Task Checkliste
- [ ] Dateiname(n) angegeben?
- [ ] Kontext mitgeliefert?
- [ ] Ergebnis klar beschrieben?
- [ ] Nur EINE Aufgabe?
- [ ] Vanilla JS Regeln beachtet?
- [ ] Edge Cases erwähnt?
- [ ] IDs mit genId()?
- [ ] Save/Render-Chain bedacht?
- [ ] Passendes LLM gewählt?
