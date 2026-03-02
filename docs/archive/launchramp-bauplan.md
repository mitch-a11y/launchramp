# LaunchRamp — Bauplan (alle Phasen)

## Phase 1: Import Workflow reparieren ← AKTUELL
| # | Aufgabe | Status |
|---|---------|--------|
| 1.1 | Status-Migration (Dual-Write entfernt) | ✅ |
| 1.2 | save()/renderAll() nach applySelectedChanges | ✅ |
| 1.3 | Fehlende Handler: new_phase, new_package, rename_phase, delete_task, delete_phase, delete_package | 🔜 NÄCHST |
| 1.4 | Auto-Snapshot vor Import | ✅ PR pending merge |
| 1.5 | Pilot-Test mit echtem Kunden (Export → Claude → Import → Verify) | 🔜 |

## Phase 2: Stabilisierung
| # | Aufgabe |
|---|---------|
| 2.1 | Supabase Conflict Detection (kein silent overwrite mehr) |
| 2.2 | Error Handling (try/catch, Toast, Auto-Rollback) |
| 2.3 | Basis-Tests (manuelle Checkliste + Unit Tests) |

## Phase 3: AI-Workflow
| # | Aufgabe |
|---|---------|
| 3.1 | V4 Import-Prompt (präzisere Diffs) |
| 3.2 | One-Click Workflow (Transkript → Auto-Import via Claude API) |

## Phase 4: Produkt-Features
- Kunden-Portal (Read-Only)
- Notifications
- Retainer-Tracking
- Multi-User Auth

## Phase 5: Scale
- Code-Modularisierung
- PWA
- Performance (selektives Rendering)

---

## Import/Export Workflow (Herzstück)

```
1. User exportiert JSON aus LaunchRamp
2. JSON + Meeting-Transkript → Claude verarbeitet
3. Claude gibt modifiziertes JSON zurück (gleiche Struktur)
4. User importiert JSON in LaunchRamp
5. computeDiff() vergleicht Alt vs. Neu → Checkbox-Liste
6. User wählt Änderungen aus
7. applySelectedChanges() wendet an
8. Post-Apply: saveNow() + saveToSupabase() + renderAll()
```

## Change-Types & Severity
| Type | Severity | Beschreibung |
|------|----------|-------------|
| `status_change` | 🟢 green | Task-Status geändert |
| `rename_task` | 🟢 green | Task umbenannt |
| `notes_change` | 🟢 green | Notizen geändert |
| `effort_change` | 🟢 green | Aufwand geändert |
| `deadline_change` | 🟡 yellow | Deadline geändert |
| `owner_change` | 🟡 yellow | Besitzer geändert |
| `new_task` | 🟡 yellow | Neuer Task |
| `delete_task` | 🔴 red | Task gelöscht |
| `rename_phase` | 🟡 yellow | Phase umbenannt |
| `new_phase` | 🔴 red | Neue Phase |
| `delete_phase` | 🔴 red | Phase gelöscht |
| `new_package` | 🟡 yellow | Neues Paket |
| `delete_package` | 🔴 red | Paket gelöscht |
| `new_client` | 🔴 red | Neuer Client |
| `new_project` | 🔴 red | Neues Projekt |

**Ampel**: Grün = auto-checked, Gelb = prüfen, Rot = Strukturänderung → bewusst bestätigen.

## Bekannte Bugs & Legacy
| Bug | Status | Details |
|-----|--------|---------|
| Dual-Status (project.states vs task.status) | ✅ BEHOBEN | Legacy-Feld ignoriert, Reads via getTaskStatus(), Writes via setTaskStatus() |
| Supabase Silent Overwrite | ⚠️ OFFEN | Remote überschreibt blind lokalen Stand. Fix geplant in Phase 2.1 |

## Offene Fragen
- Feld `vor` vs `notes` — CLAUDE.md sagt `notes`, PR-Code nutzt `vor`. Noch ungeklärt.
- PR #3 Severity-Diskrepanzen: new_task/new_package als red statt yellow im Code
