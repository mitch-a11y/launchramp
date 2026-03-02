# Tasks

## LaunchRamp — Phase 1: Import Workflow

| # | Aufgabe | Status | Details |
|---|---------|--------|---------|
| 1.1 | Status-Migration (Dual-Write entfernt) | ✅ Erledigt | Copilot Agent #1 |
| 1.2 | save()/renderAll() nach applySelectedChanges | ✅ Erledigt | Copilot Agent #2 |
| 1.3 | Fehlende Handler | ✅ Erledigt | PR #1 im Haupt-Repo gemergt (2026-03-02) |
| 1.4 | Auto-Snapshot vor Import | ⚠️ Bugfix-Prompt erstellt | PR #3 Copilot-Repo, Draft. 6 Bugs (2 Dateien) → `copilot-prompt-pr3-bugfixes.md` |
| 1.5 | Pilot-Test mit echtem Kunden | 🔜 Nach 1.4-Fix | Export → Claude → Import → Verify |

## Task 1.3 — Erstellte Dateien

| Datei | Inhalt |
|-------|--------|
| `copilot-prompt-gruppe1-struktur-handler.md` | Copilot-Prompt für new_phase, new_package, rename_phase |
| `copilot-prompt-gruppe2-delete-handler.md` | Copilot-Prompt für delete_task, delete_phase, delete_package |
| `test-json-handler-1.3.md` | 8 Test-JSONs + Kombi-Test + Edge Cases |

**Nächster Schritt:** Copilot-Prompts als Issues/Tasks im Repo `mitch-a11y/launchramp-copilot` starten → erst Gruppe 1, dann Gruppe 2. Danach mit Test-JSONs verifizieren.

## PR #3 Review-Findings (2026-03-02)

**✅ Korrekt:**
- Auto-Snapshot VOR computeDiff() — Timing stimmt
- save() → renderAll() Chain in applySelectedChanges()
- Matching per _id überall
- Vanilla JS mit var/function konsistent
- try/catch um JSON.parse
- Task 1.3 Handler (new_phase, new_package, rename_phase, delete_task) sind enthalten

**🐛 Bugs / Fixes nötig:**

1. **`vor` vs `notes` Verwechslung** — Change-Type heißt `notes_change` aber ändert Feld `vor` (= Dependency-ID laut Schema). Entweder Feld-Name oder Type-Name ist falsch. → **Mitch muss klären: Wird `vor` tatsächlich für Notizen genutzt, oder ist das ein Bug?**

2. **Status als String statt Integer** — `(it.status || "Offen")` Fallback ist String. Laut Regel 3 muss Status Integer 0-4 sein. Fallback sollte `0` sein, nicht `"Offen"`.

3. **Severity zu hoch** — `new_task` und `new_package` sind als `red` markiert. Empfehlung: `yellow` (neuer Task/Package in existierender Struktur ist kein Strukturbruch). Nur `new_phase`, `new_client`, `new_project` verdienen `red`.

4. **delete_package + delete_phase fehlen** — Diff-Erkennung und Apply-Handler für gelöschte Packages/Phases nicht implementiert. (War Teil von Task 1.3 Gruppe 2.)

5. **clientIdx kann -1 sein** — Wenn kein Client matched, bekommt `createSnapshot(-1, ...)` einen ungültigen Index. Absicherung nötig.

**→ Nächster Schritt:** Bugfix-Prompt (`copilot-prompt-pr3-bugfixes.md`) als Copilot Agent Task im Repo `mitch-a11y/launchramp-copilot` starten → PR #3 wird aktualisiert → Re-Review → Merge ins Haupt-Repo.

## Entschiedene Fragen (2026-03-02)

- [x] **Feld `vor`**: `vor` = Dependency-ID (Vorgänger-Task). Schema ist korrekt. PR hatte Bug → wird gefixt (notes_change → dependency_change + separater notes_change).
- [x] **Severity**: new_task und new_package → `yellow`. Nur new_phase/new_client/new_project bleiben `red`.

## Task 1.4 — Erstellte Dateien

| Datei | Inhalt |
|-------|--------|
| `copilot-prompt-pr3-bugfixes.md` | Copilot-Prompt für alle 6 Bugfixes in actions.js + render.js |

## Erledigt (Archiv)

_Erledigte Tasks werden hier gesammelt, um den oberen Bereich clean zu halten._
