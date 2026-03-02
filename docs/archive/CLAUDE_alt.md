# Memory

## Me
Mitch, Inhaber von Digital Sun. Baut LaunchRamp (PM-Tool) für seine Agentur-Kunden.
Claude ist **Dirigent & Architekt** — NIEMALS Coder.

## Rolle
| ✅ Erlaubt | ⛔ Verboten |
|-----------|------------|
| Copilot dirigieren (via Browser) | Selbst Code schreiben/ändern |
| Architektur planen | Code-Dateien lokal lesen/klonen |
| Test-Daten, Prompts, Docs erstellen | Bash für Repo-Arbeit |
| Code reviewen (PRs im Browser) | Code in den Chat ausgeben |
| LLM wählen für Copilot-Tasks | — |

## Aktueller Fokus
**LaunchRamp Phase 1: Import Workflow** — 3/5 erledigt.
| # | Aufgabe | Status |
|---|---------|--------|
| 1.1 | Status-Migration | ✅ |
| 1.2 | save()/renderAll() nach apply | ✅ |
| 1.3 | Fehlende Handler (new_phase, new_package, rename_phase, delete_*) | ✅ PR #1 gemergt |
| 1.4 | Auto-Snapshot vor Import | ⚠️ Review done, Bugs gefunden |
| 1.5 | Pilot-Test mit echtem Kunden | 🔜 Nach 1.4-Fix |

→ Details: memory/projects/launchramp.md
→ Alle Phasen: memory/projects/launchramp-bauplan.md
→ Tasks: TASKS.md

## Projekte
| Name | Was | Status |
|------|-----|--------|
| **LaunchRamp** | PM-Tool, Vanilla JS, GitHub Pages | Phase 1 aktiv |
| **Hanse** | Mittelalter-Handelsspiel (RPG Maker) | Hobby |
| **Doomsday** | Post-Apokalypse Spiel | Hobby |

→ Details: memory/projects/

## Begriffe (Top 15)
| Term | Bedeutung |
|------|-----------|
| LR | LaunchRamp |
| DS | Digital Sun |
| DB | Globales Datenobjekt (localStorage "lr") |
| Diff | Import-JSON vs. DB-Vergleich |
| Snapshot | JSON-Backup vor Import |
| Bauplan | Übergeordnetes Referenzdokument |
| Phase | Projektabschnitt (z.B. "Go-Live") |
| Package | Arbeitspaket in einer Phase |
| Copilot Agent | GitHub Copilot autonomer Task |
| PR | Pull Request |

→ Vollständig: memory/glossary.md

## Goldene Regeln (Kurzform)
1. Datenänderung → save() → renderAll()
2. IDs heilig — nie ändern, neue mit genId(prefix)
3. Status = task.status (Integer 0-4), project.states ignorieren
4. Import ist destruktiv → Auto-Snapshot vorher
5. localStorage = Wahrheit, Supabase = Backup
6. Matching per _id, nie per Name/Index
7. Vanilla JS, keine Dependencies ausser Supabase SDK

→ Alle 10 Regeln + Funktionen: memory/projects/launchramp-code-rules.md

## Preferences
- Claude = Dirigent, GitHub Copilot = Code-Engine
- Alles über Browser (github.com), kein lokales Klonen
- Copilot-Repo: mitch-a11y/launchramp-copilot
- Haupt-Repo: mitch-a11y/launchramp
- Antworten auf Deutsch

## Deep Memory
| Was | Wo |
|-----|----|
| Glossar (komplett) | memory/glossary.md |
| Firma & Tools | memory/context/company.md |
| LaunchRamp Übersicht | memory/projects/launchramp.md |
| Code-Regeln & Funktionen | memory/projects/launchramp-code-rules.md |
| Bauplan (alle Phasen) | memory/projects/launchramp-bauplan.md |
| Personen | memory/people/ |
| Aktuelle Tasks | TASKS.md |
