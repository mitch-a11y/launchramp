# LaunchRamp — Vision & Roadmap

## Der Traum

LaunchRamp ist das Nervensystem einer Agentur, die mit 6 Leuten 50 Kunden betreut — weil die KI die Arbeit macht, die früher 3 Projektmanager gebraucht hätte.

**In einem Satz:** Du legst nach dem Kundencall auf. 90 Sekunden später ist das gesamte Projekt aktualisiert.

**Wie sich das anfühlt:**

Du öffnest LaunchRamp morgens um 8. Die Sidebar zeigt deine 8 Kunden. Du klickst auf "Kemal Üres" und siehst sofort: Phase 2 ist zu 78% fertig. 3 Tasks sind überfällig. Max hat gestern den VSL-Schnitt erledigt. Heute steht das Jourfix an.

Nach dem Call klickst du auf "Import", ziehst die JSON rein die Claude aus dem Meeting-Transkript gebaut hat. Ein Diff zeigt dir: 4 Status-Updates, 2 neue Tasks, 1 Deadline verschoben, 1 Phase umbenannt. Du scrollst durch, klickst "Alle übernehmen" — fertig. Das Team sieht die Updates sofort.

---

## Der Import-Workflow (das Herzstück)

```
Export → Claude + Transkript → Modifizierte JSON → Import → Diff-Review → Apply → Fertig
```

1. User exportiert JSON aus LaunchRamp (aktueller Kunden-/Projektstand)
2. User gibt Claude die JSON + Meeting-Transkript
3. Claude gibt modifizierte JSON zurück (gleiche Struktur, mit Änderungen)
4. User importiert JSON in LaunchRamp
5. `computeDiff()` vergleicht Alt vs. Neu → farbcodierte Checkbox-Liste
6. User wählt Änderungen an/ab
7. Apply → save() → renderAll() → Supabase-Sync
8. Snapshot existiert für Rollback

---

## Roadmap

### Phase 1: Import Workflow reparieren ← AKTUELL

**Ziel:** Ein User kann eine Claude-JSON importieren und ALLE Change-Types werden korrekt erkannt, angezeigt und angewendet.

| # | Ziel | Akzeptanzkriterium | Status |
|---|------|-------------------|--------|
| 1.1 | Status lebt am Task | `task.status` ist einzige Quelle. `project.states` wird ignoriert. App liest/schreibt korrekt. | ✅ |
| 1.2 | Apply persistiert | Nach Apply + Browser-Refresh sind alle Änderungen noch da. | ✅ |
| 1.3 | Alle Handler existieren | Jeder Change-Type aus ARCHITECTURE.md wird erkannt UND angewendet. Kein "Diff zeigt es an, Apply ignoriert es." | ✅ |
| 1.4 | Auto-Snapshot | Vor jedem Import wird automatisch ein Snapshot erstellt. User kann jederzeit zurückrollen. | ⚠️ PR #3, 5 Bugs |
| 1.5 | Pilot-Test | Echter Kunden-Export → Claude → Import → alle Änderungen korrekt → Refresh → alles da. | 🔜 |

**Bekannte Bugs in PR #3:**
1. `vor`-Feld wird als Notes behandelt — ist aber Dependency-ID
2. Status-Fallback ist String `"Offen"` statt Integer `0`
3. `new_task` / `new_package` Severity ist `red` statt `yellow`
4. `delete_package` + `delete_phase` Handler fehlen
5. `clientIdx` kann `-1` sein → Snapshot mit ungültigem Index

### Phase 2: Stabilisierung

**Ziel:** LaunchRamp stürzt nicht ab, verliert keine Daten und gibt klares Feedback bei Fehlern.

| # | Ziel | Akzeptanzkriterium |
|---|------|--------------------|
| 2.1 | Supabase Conflict Detection | Kein stilles Überschreiben. Bei Konflikt: User sieht beide Versionen und entscheidet. |
| 2.2 | Error Handling | Jeder kritische Pfad hat try/catch. User sieht Toast bei Fehler. Import-Fehler → automatischer Rollback. |
| 2.3 | Test-Checkliste | Manuelle Checkliste für alle Kernflows. Idealerweise Unit Tests für `computeDiff()` und `migrateStatesToTasks()`. |

### Phase 3: AI-Workflow perfektionieren

**Ziel:** Weniger manuelle Schritte, smartere Diffs, perspektivisch One-Click.

| # | Ziel | Akzeptanzkriterium |
|---|------|--------------------|
| 3.1 | V4 Import-Prompt | Claude liefert präzisere JSON: bestehende IDs bleiben, Status als Integer, nur echte Änderungen. |
| 3.2 | One-Click Workflow | Transkript einfügen → LaunchRamp schickt intern an Claude API → Diff erscheint. Kein manueller Export/Import. |

### Phase 4: Produkt-Features

**Ziel:** Von internem Tool zu echtem Produkt.

| # | Feature | Was es löst |
|---|---------|-------------|
| 4.1 | Kunden-Portal (Read-Only) | Shareable Link. Kunde sieht Fortschritt. Ersetzt Update-Emails. |
| 4.2 | Notifications | Nach Import: automatische Zusammenfassung an Team (Email/Slack). |
| 4.3 | Retainer-Tracking | Monatliches Stundenbudget, Burn-Rate, Alerts bei 80%/100%. |
| 4.4 | Multi-User Auth | Supabase Auth, Rollen (Admin/Editor/Viewer), Audit Trail. |

### Phase 5: Scale

**Ziel:** Codebase und Performance bereit für 50+ Kunden.

| # | Feature | Was es löst |
|---|---------|-------------|
| 5.1 | Code-Modularisierung | Monolith aufbrechen. ES Modules oder Vite. |
| 5.2 | PWA | Offline-Support, Push-Notifications, Install-Prompt. |
| 5.3 | Selektives Rendering | Nur rendern was sich geändert hat, statt immer `renderAll()`. |

---

## Glossar

| Begriff | Bedeutung |
|---------|-----------|
| Client | Kunde (z.B. "Kemal Üres") |
| Project | Projekt unter einem Kunden (z.B. "VSL Launch") |
| Phase | Großer Meilenstein (z.B. "Positionierung") |
| Package | Gruppe von Tasks innerhalb einer Phase |
| Task | Einzelne Aufgabe mit Status, Owner, Deadline |
| Jourfix | Wiederkehrendes Meeting mit dem Kunden |
| Diff | Vergleich zwischen altem und neuem Datenstand |
| Snapshot | Backup des aktuellen Datenstands vor Import |
| Retainer | Laufendes Betreuungsprojekt (monatlich) |
| Launch | Einmaliges Projekt mit definiertem Ende |
