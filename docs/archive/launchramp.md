# LaunchRamp

**Codename:** LaunchRamp (LR)
**Status:** Aktiv — Phase 1 (Import Workflow)
**Typ:** Projekt-Management-Tool für Digital Sun Kunden

## Was es ist
Vanilla-JS Web-App auf GitHub Pages. Verwaltet Clients → Projects → Phases → Packages → Tasks. Kernfeature ist der Import/Export-Workflow mit Diff-Review.

## Tech Stack
- Vanilla JavaScript (kein Framework, kein Bundler)
- GitHub Pages Hosting
- localStorage (Key: "lr") + Supabase (JSONB blob)

## Repos
| Repo | Zweck |
|------|-------|
| `mitch-a11y/launchramp` | Produktion, GitHub Pages |
| `mitch-a11y/launchramp-copilot` | Copilot Agents Workspace |

## Bauplan-Status (01.03.2026)
### Phase 1: Import Workflow reparieren ← AKTUELL
- ✅ 1.1 Status-Migration (Dual-Write entfernt)
- ✅ 1.2 save()/renderAll() nach applySelectedChanges
- 🔲 1.3 Fehlende Handler ← NÄCHSTER SCHRITT
- ✅ 1.4 Auto-Snapshot vor Import (PR #3 pending merge)
- 🔲 1.5 Pilottest mit echten Daten

### Offene Fragen
- Feld `vor` vs `notes` — CLAUDE.md sagt `notes`, PR-Code nutzt `vor`. Noch ungeklärt.
- PR #3 Severity-Diskrepanzen: new_task/new_package als red statt yellow im Code

## Dateien
| Datei | Zweck | ~Zeilen |
|-------|-------|---------|
| index.html | HTML-Struktur, Modals | 220 |
| js/actions.js | Business Logic, Import/Export, Diff | 1800 |
| js/render.js | UI-Rendering | 700 |
| js/config.js | Konfiguration, Migration, Supabase | 800 |
| js/data.js | Persistenz, Load/Save | 370 |
