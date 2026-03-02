LAUNCHRAMP — DER BAUPLAN
Dieses Dokument ist die einzige Wahrheit. Jede Zeile Code, jedes Feature, jede Entscheidung orientiert sich an diesem Bauplan. Wenn etwas im Code steht, das diesem Dokument widerspricht — der Bauplan gewinnt.

DIE VISION
LaunchRamp ist kein Projektmanagement-Tool.
LaunchRamp ist das Nervensystem einer Agentur, die mit 6 Leuten 50 Kunden betreut — weil die KI die Arbeit macht, die früher 3 Projektmanager gebraucht hätte.
Der Traum in einem Satz: Du hast ein Meeting mit deinem Kunden. Du legst auf. 90 Sekunden später ist das gesamte Projekt aktualisiert — neue Tasks, verschobene Deadlines, erledigte Aufgaben, neue Phasen. Ohne dass du irgendwas manuell eintippen musstest.
Wie sich das anfühlen soll:
Stell dir vor, du öffnest LaunchRamp morgens um 8. Die Sidebar zeigt dir deine 8 Kunden. Du klickst auf "Kemal Üres" und siehst sofort: Phase 2 ist zu 78% fertig. 3 Tasks sind überfällig. Max hat gestern den VSL-Schnitt erledigt. Heute steht das Jourfix an.
Nach dem Call klickst du auf "Import", ziehst die JSON-Datei rein, die Claude aus dem Meeting-Transkript gebaut hat. Ein Diff zeigt dir: 4 Status-Updates, 2 neue Tasks, 1 Deadline verschoben, 1 Phase umbenannt. Du scrollst durch, klickst "Alle übernehmen" — fertig. Supabase synct. Das Team sieht die Updates sofort.
Das ist LaunchRamp.
Nicht irgendwann. Sondern nach diesem Bauplan.

WER DIESES DOKUMENT LIEST
Dieses Dokument richtet sich an GitHub Copilot (oder jedes andere LLM), das den Code von LaunchRamp weiterentwickelt. Es ist so geschrieben, dass ein AI-Agent:
1. Die Architektur versteht ohne den Code Zeile für Zeile zu lesen
2. Weiß was jede Funktion tun soll (nicht nur was sie aktuell tut)
3. Pro Phase einen klaren Auftrag hat mit Definition of Done
4. Entscheidungen treffen kann, die zum Gesamtbild passen
Für den menschlichen Leser (Mitch & Team): Dieser Bauplan ist auch euer Nachschlagewerk. Wenn ihr euch fragt "Wie soll Feature X funktionieren?" — die Antwort steht hier.

TEIL 1: ARCHITEKTUR — WAS DA IST
Tech-Stack
Runtime:        Browser (Vanilla JS, kein Framework, kein Bundler)
Hosting:        GitHub Pages (mitch-a11y.github.io/launchramp)
Persistence:    localStorage (primär) + Supabase Postgres (Cloud-Sync)
Deployment:     Push to main → auto-deploy
Codebase:       index.html (~5350 LOC) + js/actions.js (~98KB)
Code-Style:     var-only, function declarations, kein ES6+
Version:        LaunchRamp v5.0
Daten-Hierarchie
DB (das Root-Objekt, gespeichert in localStorage als "lr")
├── clients[]                    ← Array von Kunden
│   ├── name: "Kemal Üres"
│   ├── _id: "cl_abc123"
│   └── projects[]               ← Array von Projekten pro Kunde
│       ├── name: "VSL Launch"
│       ├── _id: "pr_xyz789"
│       ├── type: "projekt" | "retainer"
│       ├── phases[]             ← Array von Phasen pro Projekt
│       │   ├── name: "Positionierung"
│       │   ├── _id: "ph_def456"
│       │   ├── color: "#6c5ce7"
│       │   ├── start: "2026-03-01"
│       │   ├── end: "2026-04-15"
│       │   └── packages[]       ← Array von Packages pro Phase
│       │       ├── name: "Zielgruppen-Analyse"
│       │       ├── _id: "pk_ghi012"
│       │       └── tasks[]      ← Array von Tasks pro Package
│       │           ├── t: "Buyer Persona erstellen"
│       │           ├── _id: "ts_jkl345"
│       │           ├── status: 0-4
│       │           ├── owner: "Mitch" | "Max" | "Hussein" | ...
│       │           ├── min: 120          (geschätzter Aufwand in Min)
│       │           ├── due: "2026-03-15" (Deadline)
│       │           ├── notes: "..."
│       │           ├── ki: true/false    (kritisch-Flag)
│       │           ├── vor: "ts_abc..."  (Voraussetzung/Dependency)
│       │           └── auto: true/false  (Automatisierung möglich)
│       ├── states: {}           ← LEGACY: Status per Index "0-0-0" → 0-4
│       ├── docLinks: []         ← Google Drive Links etc.
│       ├── quickLinks: []       ← Schnellzugriffe
│       └── jfNotes: []          ← Jourfix-Notizen / Meeting-History
└── templates[]                  ← Vorlagen für neue Projekte
Status-System (ACHTUNG: Dual-Problem)
Es gibt aktuell ZWEI Wege, den Status eines Tasks zu speichern:
LEGACY (App nutzt das):
project.states["0-0-0"] = 3
                ↑ ↑ ↑
                │ │ └── Task-Index innerhalb des Package
                │ └──── Package-Index innerhalb der Phase
                └────── Phase-Index innerhalb des Projekts

PROBLEM: Wenn eine Phase, ein Package oder ein Task gelöscht/verschoben wird,
         verschieben sich ALLE Indizes → Status zeigt auf falschen Task.

NEU (Import nutzt das):
task.status = 3

PROBLEM: Die App liest Status aus project.states, nicht aus task.status.
         Der Import schreibt task.status, aber die App ignoriert es.
DIE LÖSUNG (Phase 1 dieses Bauplans): Alles auf task.status migrieren. project.states komplett abschaffen. Jeder Task trägt seinen eigenen Status.
Core-Funktionen und ihre Aufgaben
save()          → Speichert DB in localStorage + triggert Supabase-Sync (debounced 300ms)
saveNow()       → Speichert sofort, ohne Debounce
load()          → Lädt DB aus localStorage
renderAll()     → Zeichnet die komplette UI neu (Sidebar, Tasks, Topbar, alles)
renderTasks()   → Zeichnet nur die Task-Liste
renderSidebar() → Zeichnet die Kunden-/Projekt-Navigation
Supabase-Integration
Tabelle:    app_state
Row:        id = 'main'
Column:     data (JSONB) → enthält die komplette DB als ein Blob

saveToSupabase()        → Debounced (500ms), schreibt DB nach Supabase
loadFromSupabase()      → Lädt DB von Supabase, ÜBERSCHREIBT lokale Daten (!)
mergeClients()          → 3-Way-Merge für gleichzeitige Änderungen
setupRealtimeSubscription() → Subscribed auf Änderungen in Echtzeit
ID-System
Ältere Entities:  UUID-Format     → "f3153d96-15ce-4a2b-..."
Neuere Entities:  Prefix-Format   → "ph_sk8r0tlc", "ts_abc123", "pk_xyz789"

Manche Entities haben:  id UND _id
Manche nur:             _id

REGEL FÜR NEUEN CODE: Immer _id verwenden. Prefix-Format: cl_, pr_, ph_, pk_, ts_
Bestehende UUIDs NICHT ändern — nur neue Entities bekommen Prefix-Format.

TEIL 2: DER IMPORT-WORKFLOW — DAS HERZSTÜCK
So soll es funktionieren (End-to-End)
SCHRITT 1: EXPORT
User klickt "Export" → wählt JSON → bekommt eine .json-Datei
mit allen Daten des aktuellen Kunden/Projekts.

SCHRITT 2: CLAUDE-VERARBEITUNG (außerhalb von LaunchRamp)
User gibt Claude:
  a) Die exportierte JSON
  b) Das Meeting-Transkript
  c) Den V3/V4-Import-Prompt
Claude analysiert das Transkript, erkennt Änderungen, und gibt
eine modifizierte JSON zurück — mit allen Updates eingebaut.

SCHRITT 3: IMPORT
User klickt "Import" → zieht die Claude-JSON rein
LaunchRamp vergleicht: ALT (was in der DB steht) vs. NEU (was Claude liefert)
→ Zeigt einen DIFF mit allen Änderungen als Checkbox-Liste

SCHRITT 4: REVIEW & MERGE
User sieht farbcodierte Änderungen:
  🔴 Strukturell (neue Phase, Phase löschen)
  🟡 Wichtig (neuer Task, Owner-Change, Deadline)
  🟢 Normal (Status-Update, Notizen, Aufwand)
User kann einzelne Änderungen an/abwählen.
Klickt "Übernehmen" → Änderungen werden in die DB geschrieben,
gespeichert (localStorage + Supabase), UI wird aktualisiert.

SCHRITT 5: DONE
Alles ist persistiert. Team sieht Updates sofort.
Snapshot wurde vor dem Import automatisch erstellt (Rollback möglich).
Change-Types die der Import verstehen MUSS
STRUKTURELLE ÄNDERUNGEN (🔴 — User muss bestätigen):
  new_phase        → Neue Phase zum Projekt hinzufügen
  delete_phase     → Gesamte Phase entfernen (inkl. aller Packages/Tasks)
  rename_phase     → Phase umbenennen
  new_package      → Neues Package in einer Phase

WICHTIGE ÄNDERUNGEN (🟡 — Standard: an):
  new_task         → Neuer Task in einem Package
  delete_task      → Task entfernen
  owner_change     → Verantwortlichen ändern
  deadline_change  → Fälligkeitsdatum ändern

STANDARD-ÄNDERUNGEN (🟢 — Standard: an):
  status_change    → Status aktualisieren (0=Offen, 1=Wartend, 2=InArbeit, 3=Review, 4=Erledigt)
  rename_task      → Task umbenennen
  notes_change     → Notizen aktualisieren
  effort_change    → Aufwandsschätzung ändern
Was aktuell KAPUTT ist (und in Phase 1 gefixt werden muss)
BUG 1: applySelectedChanges() ruft am Ende NICHT save() und renderAll() auf
       → Änderungen gehen beim Reload verloren (nur in-memory)

BUG 2: Fehlende Handler in applySelectedChanges():
       → new_phase:    wird im Diff angezeigt, aber nicht angewendet
       → new_package:  wird im Diff angezeigt, aber nicht angewendet
       → rename_phase: wird im Diff angezeigt, aber nicht angewendet
       → delete_task:  wird im Diff angezeigt, aber nicht angewendet

BUG 3: Status-Mismatch zwischen Import und App:
       → Claude schreibt task.status = 3
       → Die App liest project.states["0-0-0"]
       → Import-Update wird ignoriert

BUG 4: loadFromSupabase() überschreibt lokale Daten:
       → Kein Conflict Detection
       → Kein User-Prompt
       → Wenn du lokal änderst und refreshst → lokale Daten weg

TEIL 3: ALLE FEATURES — SOLL-ZUSTAND
1. Core Engine
Was es tun soll:
* save() speichert die DB in localStorage und triggert Supabase-Sync
* renderAll() zeichnet die gesamte UI basierend auf dem aktuellen DB-Stand
* Jede Datenänderung geht durch save() → kein Zustand geht verloren
Soll-Verhalten:
* Save ist debounced (300ms) für Performance
* saveNow() existiert für kritische Operationen (Import, Delete)
* Nach jedem save() wird Supabase-Sync getriggert (async, nicht blockierend)
* renderAll() darf langsam sein — Optimierung kommt später
Aktueller Zustand: Funktioniert grundsätzlich. Performance-Problem bei vielen Clients (full re-render), aber akzeptabel für 8 Kunden.

2. Client & Project Management
Was es tun soll:
* Kunden anlegen, bearbeiten, löschen, zwischen Kunden wechseln
* Projekte pro Kunde anlegen (Typ: "projekt" oder "retainer")
* Sidebar zeigt alle Kunden mit ihren Projekten
* Aktueller Kunde/Projekt ist highlighted
Soll-Verhalten:
* addClient(name) → erstellt Client mit _id: "cl_" + randomId()
* addProject(clientId, name, type) → erstellt Projekt unter dem Kunden
* switchClient(clientId) → wechselt aktiven Kunden, rendert Projekt
* deleteClient(clientId) → fragt Bestätigung, löscht alles darunter
* Sidebar ist immer aktuell nach jeder Änderung
Aktueller Zustand: Funktioniert.

3. Task Management
Was es tun soll:
* Tasks erstellen, bearbeiten, löschen innerhalb von Packages
* Status setzen (5 Stufen: 0=Offen, 1=Wartend, 2=In Arbeit, 3=Review, 4=Erledigt)
* Owner zuweisen (Mitch, Max, Hussein, Tobie, Team, Kunde)
* Aufwand schätzen (Minuten), Deadline setzen, Notizen, Dependencies
* Kritisch-Flag, Automatisierungs-Flag
* Kontextmenü: Duplizieren, Ausblenden, Zeit eintragen, Termin blocken
KRITISCH — Status-Speicherung:
SOLL (nach Migration):
  task.status = 0|1|2|3|4
  → Direkt am Task-Objekt
  → Bricht NICHT bei Reorder/Löschung
  → Import kann direkt task.status setzen

AKTUELL (Legacy — muss weg):
  project.states["phaseIdx-packageIdx-taskIdx"] = 0|1|2|3|4
  → Bricht bei jeder Strukturänderung
Soll-Verhalten:
* setSt(taskId, newStatus) → setzt task.status = newStatus, ruft save() auf
* setOwner(taskId, owner) → setzt task.owner = owner, ruft save() auf
* Jede Task-Änderung → save() → Supabase-Sync → UI-Update
* Status-Farben: 0=Grau, 1=Gelb, 2=Blau, 3=Orange, 4=Grün
Aktueller Zustand: Grundfunktion läuft, aber duales Status-System ist der größte Bug.

4. Phasen & Packages
Was es tun soll:
* Phasen sind die großen Meilensteine eines Projekts
* Packages gruppieren Tasks innerhalb einer Phase
* Phasen haben: Name, Farbe, Startdatum, Enddatum
* Phasen können per Drag & Drop umsortiert werden
* Packages können umbenannt und gelöscht werden
Soll-Verhalten:
* savePhase(phaseData) → erstellt/aktualisiert Phase mit _id: "ph_" + randomId()
* deletePhase(phaseId) → Bestätigung → löscht Phase inkl. aller Packages/Tasks
* Phase-Reihenfolge bestimmt die visuelle Sortierung
* Phasen-Farbe wird im Header und in der Timeline angezeigt
Aktueller Zustand: Funktioniert.

5. Multi-View System
Was es tun soll: 5 verschiedene Ansichten auf die gleichen Daten:
TASKS (Standard):
  → Board-Ansicht mit Phasen > Packages > Tasks
  → Jeder Task zeigt: Status-Dot, Name, Owner, Deadline
  → Klick öffnet Task-Detail-Modal

DOCS:
  → Liste aller Dokument-Links und Quick-Links des Projekts
  → Google Drive, Figma, Loom, etc.
  → Schneller Zugriff ohne Task-Kontext

INSIGHTS:
  → Dashboard mit Projekt-Metriken
  → Fortschritt pro Phase (Balken)
  → Task-Counts: Gesamt, Erledigt, In Arbeit, Überfällig
  → Owner-Stats: Wer hat wie viel auf dem Tisch
  → Phase Health: Welche Phase ist "gesund" vs. "hängt"

TEAM:
  → Tasks gruppiert nach Owner statt nach Phase
  → Zeigt pro Person: Offene Tasks, Deadlines, Workload

TEMPLATES:
  → Vorlagen-Manager für wiederkehrende Projekt-Strukturen
  → Template erstellen aus bestehendem Projekt
  → Template auf neues Projekt anwenden
Aktueller Zustand: Tasks, Team, Insights funktionieren. Docs und Templates sind unklar/teilweise.

6. Export / Import / Diff-Merge ⚠️ KRITISCHES FEATURE
Dies ist das wichtigste Feature von LaunchRamp.
EXPORT
Was es tun soll:
* Exportiert den aktuellen Kunden/Projekt-Stand als JSON oder Markdown
* JSON-Export enthält die komplette Datenstruktur (Phasen, Packages, Tasks mit allen Feldern)
* Markdown-Export ist menschenlesbar für Meeting-Vorbereitung
Soll-Verhalten:
* doExport("json") → generiert JSON-Datei zum Download
* doExport("md") → generiert Markdown-Datei zum Download
* Export enthält IMMER: alle Phasen, alle Packages, alle Tasks mit allen Feldern
* Export enthält: task.status (nicht project.states)
* Export enthält: Jourfix-Notizen für Kontext
Aktueller Zustand: Funktioniert.
IMPORT
Was es tun soll:
* Nimmt eine von Claude modifizierte JSON-Datei entgegen
* Vergleicht OLD (aktuelle DB) mit NEW (Claude-Output)
* Zeigt alle Unterschiede als farbcodierte Diff-Liste
* User kann pro Änderung an/abwählen
* "Übernehmen" wendet ausgewählte Änderungen an, speichert, rendert
Soll-Verhalten des gesamten Import-Flows:
1. User klickt "Import" → Modal öffnet sich
2. User zieht JSON-Datei rein oder wählt Datei aus
3. handleImportFile() liest die Datei
4. computeDiff(oldData, newData) berechnet alle Änderungen
5. renderDiffReview(changes) zeigt die Diff-Liste an:
   - Jede Änderung hat eine Checkbox (Standard: an)
   - Farbcodiert nach Severity (🔴🟡🟢)
   - Zeigt: Was ändert sich, von was zu was
6. User reviewed, wählt ab was nicht passt
7. User klickt "Übernehmen"
8. VOR dem Apply: automatischer Snapshot (Rollback-Sicherung)
9. applySelectedChanges(selectedChanges) wendet an:
   - Iteriert durch alle ausgewählten Änderungen
   - Wendet jeden Change-Type korrekt an (ALLE Handler müssen existieren)
   - Am Ende: saveNow() + renderAll()
10. UI zeigt aktualisierten Zustand
11. Supabase synct automatisch im Hintergrund
Spezifikation: computeDiff(oldData, newData)
INPUT:
  oldData = aktuelle Projekt-Daten aus der DB
  newData = Claude-modifizierte JSON

OUTPUT:
  Array von Change-Objekten:
  {
    type: "status_change" | "new_task" | "delete_task" | "new_phase" | etc.,
    severity: "high" | "medium" | "low",
    path: {
      phaseId: "ph_...",
      phaseName: "Positionierung",
      packageId: "pk_...",
      packageName: "Zielgruppen-Analyse",
      taskId: "ts_..." (wenn relevant)
    },
    description: "Task 'Buyer Persona' → Status: Offen → Erledigt",
    oldValue: 0,
    newValue: 4,
    apply: function(db) { ... }  // Funktion die die Änderung anwendet
  }

MATCHING-LOGIK:
  - Phasen werden per _id gematcht (NICHT per Name oder Index)
  - Packages werden per _id gematcht
  - Tasks werden per _id gematcht
  - Wenn _id in NEW existiert aber nicht in OLD → neues Element
  - Wenn _id in OLD existiert aber nicht in NEW → gelöschtes Element
  - Wenn _id in beiden existiert → Felder vergleichen für Änderungen
Spezifikation: applySelectedChanges(changes)
INPUT: Array von Change-Objekten (nur die ausgewählten)

VERHALTEN:
  Für jeden Change, basierend auf type:

  "status_change":
    → Finde Task per _id in der DB
    → Setze task.status = newValue
    → (NICHT project.states — das Legacy-System wird ignoriert)

  "new_task":
    → Finde Package per packageId in der DB
    → Füge neuen Task hinzu: { _id: generiert, t: name, status: 0, owner: ..., ... }

  "delete_task":
    → Finde Task per _id
    → Entferne aus dem Package
    → Bestätigung wurde bereits im Diff-Review gegeben

  "rename_task":
    → Finde Task per _id
    → Setze task.t = newValue

  "owner_change":
    → Finde Task per _id
    → Setze task.owner = newValue

  "deadline_change":
    → Finde Task per _id
    → Setze task.due = newValue

  "notes_change":
    → Finde Task per _id
    → Setze task.notes = newValue

  "effort_change":
    → Finde Task per _id
    → Setze task.min = newValue

  "new_phase":
    → Füge neue Phase zum Projekt hinzu
    → Inklusive aller Packages und Tasks die Claude definiert hat

  "delete_phase":
    → Entferne Phase per _id inkl. aller Packages/Tasks

  "rename_phase":
    → Finde Phase per _id
    → Setze phase.name = newValue

  "new_package":
    → Finde Phase per phaseId
    → Füge neues Package hinzu mit _id, name, tasks[]

  NACH ALLEN ÄNDERUNGEN:
    → saveNow()          ← KRITISCH: persistiert in localStorage
    → saveToSupabase()   ← KRITISCH: synct in die Cloud
    → renderAll()        ← KRITISCH: zeigt aktualisierten Zustand
    → Erfolgsmeldung anzeigen: "X Änderungen übernommen"
Aktueller Zustand: Export funktioniert. Import + Diff-Anzeige funktioniert. Apply ist KAPUTT (kein save, kein render, fehlende Handler).

7. Supabase Cloud-Sync
Was es tun soll:
* Die gesamte DB (alle Clients, alle Projekte) in der Cloud speichern
* Echtzeit-Sync: Wenn jemand anderes ändert, sehe ich es sofort
* Conflict Resolution wenn zwei Leute gleichzeitig ändern
Soll-Verhalten:
SPEICHERN:
  → Jedes save() triggert saveToSupabase() (debounced 500ms)
  → Schreibt die komplette DB als JSON in Supabase
  → Tabelle: app_state, Row: id='main', Column: data

LADEN:
  → Beim App-Start: loadFromSupabase()
  → SOLL: Vergleicht Remote vs. Lokal
  → SOLL: Bei Konflikt → User fragen: "Remote oder Lokal behalten?"
  → AKTUELL: Überschreibt einfach lokal (BUG)

ECHTZEIT:
  → setupRealtimeSubscription() hört auf Änderungen
  → Bei Remote-Update → mergeClients() versucht 3-Way-Merge
Aktueller Zustand: Save & Load funktionieren grundsätzlich. Kein Conflict Resolution. Silent Overwrite beim Laden.

8. Snapshots
Was es tun soll:
* Manuelles "Save Game" der gesamten DB
* Vor kritischen Operationen (Import) automatisch erstellen
* Jederzeit zurückrollbar
Soll-Verhalten:
* createSnapshot(label) → speichert DB mit Timestamp in localStorage
* restoreSnapshot(snapshotId) → überschreibt aktuelle DB mit Snapshot
* Vor jedem Import: automatisch createSnapshot("Pre-Import")
* Max. 10 Snapshots gespeichert (älteste werden gelöscht)
Aktueller Zustand: Funktioniert. Automatischer Pre-Import Snapshot fehlt noch.

9. Jourfix-Management
Was es tun soll:
* Wiederkehrende Meeting-Termine pro Projekt konfigurieren
* Google Calendar URL generieren
* Jourfix-Notizen als Meeting-History speichern
* Notizen werden beim Export mit ausgegeben (Kontext für Claude)
Aktueller Zustand: Grundfunktion und Calendar-Integration basic.

10. Timer & Zeiterfassung
Was es tun soll:
* Zeit pro Task tracken
* Manuelles Zeitlogging möglich
* Timer-Reports generieren
* CSV-Export der Zeitdaten
* Für Retainer-Projekte: Monatsbudget vs. verbrauchte Zeit
Aktueller Zustand: Funktioniert.

11. Notifications
Was es tun soll:
* Automatisch Benachrichtigungen generieren basierend auf Änderungen
* Modal mit allen Notifications zum Durchgehen
* Copy-Button pro Notification oder "Alle kopieren"
* Grundlage für spätere automatische Email/Slack-Sends
Aktueller Zustand: Funktioniert (manuell Copy-Paste).

12. Templates
Was es tun soll:
* Vorlagen für wiederkehrende Projekt-Strukturen
* Standard-Templates: "VSL Launch", "Webinar Funnel", "LinkedIn Outbound", "Retainer Setup"
* Template erstellen aus bestehendem Projekt
* Template auf neues Projekt anwenden → gesamte Phasen/Packages/Tasks werden kopiert
Aktueller Zustand: Feature existiert, Nutzung unklar.

13. Insights & Analytics
Was es tun soll:
* Dashboard pro Projekt mit Live-Metriken
* Fortschritt pro Phase (Prozentbalken basierend auf erledigten Tasks)
* Phase Health: Grün (im Plan), Gelb (leicht hinter), Rot (kritisch hinter)
* Owner-Auslastung: Wer hat wie viele offene Tasks
* Überfällige Tasks (Deadline < heute, Status != erledigt)
Aktueller Zustand: Funktioniert.

14. Filter-System
Was es tun soll:
* Tasks filtern nach: Status, Owner, Phase, Kritisch-Flag
* Filter kombinierbar (z.B. "alle Tasks von Max die überfällig sind")
* Filter zurücksetzbar (einzeln oder komplett)
Aktueller Zustand: Funktioniert.

15. Activity Log
Was es tun soll:
* Protokolliert wer was wann geändert hat
* Side-Panel zum Aufklappen
* Persistiert in Supabase für History über Sessions hinweg
Aktueller Zustand: Funktioniert.

16. Docs & Quick-Links
Was es tun soll:
* Zentrale Link-Ablage pro Projekt
* Google Drive, Figma, Loom, etc.
* Eigene "Docs" View in der App
* Schnellzugriff ohne durch Tasks navigieren zu müssen
Aktueller Zustand: Funktioniert.

TEIL 4: DIE PHASEN — WAS WANN GEBAUT WIRD
PHASE 1: DAS FUNDAMENT FIXEN (HÖCHSTE PRIORITÄT)
Ziel: Der Import-Workflow funktioniert end-to-end. Vom Export über Claude bis zurück in die App — ohne Datenverlust, ohne Bugs.
Warum zuerst: Ohne funktionierenden Import ist LaunchRamp ein manuelles Tool. Mit funktionierendem Import ist es ein AI-gestützter Operations Hub. Das ist der Unterschied zwischen "nettes Projektmanagement" und "die Zukunft der Agentur".
Aufgabe 1.1: Status-Migration
WAS:
  Alle Status von project.states["index-key"] nach task.status migrieren.

WIE:
  1. Migration-Funktion schreiben: migrateStatusToTasks()
     → Iteriert durch alle Clients > Projekte > Phasen > Packages > Tasks
     → Für jeden Task: Berechne den Index-Key (phaseIdx-packageIdx-taskIdx)
     → Lese project.states[key]
     → Schreibe task.status = states[key] (oder 0 wenn nicht vorhanden)
  2. Alle Stellen finden die project.states lesen → auf task.status umstellen
     → setSt() muss task.status setzen
     → renderTasks() muss task.status lesen
     → Alle Filter/Insights die Status nutzen
  3. project.states komplett entfernen (nach erfolgreicher Migration)
  4. Migration automatisch beim App-Start ausführen (einmalig, idempotent)

TEST:
  → App starten mit bestehenden Daten (8 Kunden)
  → Alle Tasks müssen ihren korrekten Status zeigen
  → Status ändern → Refresh → Status noch da
  → project.states ist leer oder nicht mehr vorhanden

DEFINITION OF DONE:
  ✅ task.status ist die einzige Quelle für Status
  ✅ project.states wird nirgends mehr gelesen
  ✅ Bestehende Daten wurden korrekt migriert
  ✅ Status-Änderungen persistieren nach Reload
Aufgabe 1.2: applySelectedChanges() fixen
WAS:
  Die Funktion muss nach dem Anwenden aller Änderungen speichern und rendern.

WIE:
  1. Am Ende von applySelectedChanges() hinzufügen:
     → saveNow()      // Sofort speichern, nicht debounced
     → renderAll()    // UI aktualisieren
  2. Optional: Erfolgsmeldung anzeigen

TEST:
  → Import durchführen mit Test-JSON (status_change für einen Task)
  → "Übernehmen" klicken
  → Refresh
  → Status-Änderung ist noch da

DEFINITION OF DONE:
  ✅ Änderungen überleben Reload
  ✅ UI zeigt aktuellen Stand nach Apply
  ✅ Supabase hat die Updates
Aufgabe 1.3: Fehlende Change-Type-Handler
WAS:
  Handler für new_phase, new_package, rename_phase, delete_task in applySelectedChanges().

WIE:
  In der switch/if-Kette von applySelectedChanges() hinzufügen:

  "new_phase":
    → Erstelle neues Phase-Objekt: { _id: generieren, name: change.newValue, color: "#6c5ce7", packages: [] }
    → Wenn Claude Packages/Tasks mitliefert → ebenfalls erstellen
    → Pushe in project.phases[]

  "new_package":
    → Finde Phase per change.path.phaseId
    → Erstelle Package: { _id: generieren, name: change.newValue, tasks: [] }
    → Wenn Claude Tasks mitliefert → ebenfalls erstellen
    → Pushe in phase.packages[]

  "rename_phase":
    → Finde Phase per change.path.phaseId
    → phase.name = change.newValue

  "delete_task":
    → Finde Package per change.path.packageId
    → Filtere Task mit change.path.taskId aus package.tasks[]

  "delete_phase":
    → Finde Phase per change.path.phaseId
    → Filtere aus project.phases[]

TEST:
  → Import-JSON mit jedem Change-Type einzeln testen
  → Nach Apply + Refresh: Änderung muss persistiert sein
  → Neue Phase muss in der Sidebar/im Board erscheinen
  → Gelöschter Task darf nicht mehr auftauchen

DEFINITION OF DONE:
  ✅ Alle 10+ Change-Types haben funktionierende Handler
  ✅ Jeder Handler speichert korrekt (über saveNow() am Ende)
  ✅ Keine "stille" Ignorierung von Changes mehr
Aufgabe 1.4: Automatischer Pre-Import Snapshot
WAS:
  Vor jedem Import wird automatisch ein Snapshot erstellt.

WIE:
  In handleImportFile(), BEVOR computeDiff() aufgerufen wird:
  → createSnapshot("Auto: Pre-Import " + new Date().toISOString())

TEST:
  → Import durchführen
  → Snapshot-Modal öffnen
  → "Auto: Pre-Import" Snapshot muss existieren
  → Restore → Daten sind wie vor dem Import

DEFINITION OF DONE:
  ✅ Jeder Import hat einen automatischen Rollback-Punkt
  ✅ User kann jederzeit zurück
Aufgabe 1.5: Pilot-Test mit echtem Kunden
WAS:
  Den kompletten Import-Workflow mit einem echten Kunden durchspielen.

WIE:
  1. Export von einem Kunden (z.B. Tom Eiberger oder Kemal Üres)
  2. Simuliertes Meeting-Transkript erstellen
  3. Claude mit V3-Prompt + Export + Transkript füttern
  4. Claude-Output als JSON importieren
  5. Diff reviewen, Übernehmen klicken
  6. Prüfen: Alles korrekt? Alles persistiert? Supabase synct?

DEFINITION OF DONE:
  ✅ Ein echter Kunde wurde erfolgreich per Import aktualisiert
  ✅ Keine Datenverluste
  ✅ Workflow dauert unter 3 Minuten (Export → Claude → Import → Done)

PHASE 2: STABILISIERUNG
Ziel: LaunchRamp ist zuverlässig genug für den täglichen Einsatz mit allen 8 Kunden.
Aufgabe 2.1: Supabase Load mit Conflict Detection
WAS:
  loadFromSupabase() darf nicht mehr blind überschreiben.

WIE:
  1. Beim Laden: Vergleiche Remote-Timestamp mit Lokal-Timestamp
  2. Wenn Remote neuer UND Lokal hat ungesyncte Änderungen:
     → User-Prompt: "Es gibt neuere Daten in der Cloud. Übernehmen oder lokale behalten?"
  3. Wenn Remote neuer und Lokal keine Änderungen:
     → Silent Update (wie bisher, aber sicher)
  4. Wenn Lokal neuer:
     → Nichts tun, Lokal ist Wahrheit

DEFINITION OF DONE:
  ✅ Kein silent overwrite mehr
  ✅ User wird bei Konflikten gefragt
  ✅ Kein Datenverlust bei gleichzeitiger Nutzung
Aufgabe 2.2: Error Handling
WAS:
  Graceful Error Handling für alle kritischen Operationen.

WIE:
  → try/catch um: save(), loadFromSupabase(), applySelectedChanges()
  → Bei Fehler: Toast-Notification mit Fehlermeldung
  → Bei save()-Fehler: Retry nach 2 Sekunden
  → Bei Import-Fehler: Automatisch Snapshot restoren

DEFINITION OF DONE:
  ✅ App crasht nie still
  ✅ User sieht immer was schiefgegangen ist
  ✅ Bei Import-Fehler: automatischer Rollback
Aufgabe 2.3: Basis-Tests
WAS:
  Mindestens manuelle Test-Checkliste, idealerweise automatisierte Tests.

MANUELLE CHECKLISTE (Minimum):
  □ Neuen Client anlegen → erscheint in Sidebar
  □ Neues Projekt anlegen → wechselt korrekt
  □ Task erstellen → Status ändern → Refresh → Status noch da
  □ Export JSON → Datei ist valide JSON
  □ Import JSON mit status_change → Apply → Refresh → persistiert
  □ Import JSON mit new_task → Task erscheint → Refresh → noch da
  □ Import JSON mit new_phase → Phase erscheint → Refresh → noch da
  □ Import JSON mit delete_task → Task weg → Refresh → immer noch weg
  □ Snapshot erstellen → Snapshot restoren → Daten korrekt
  □ Supabase: Änderung machen → anderes Tab öffnen → Daten synced

AUTOMATISIERT (wenn möglich):
  → Unit Tests für: computeDiff(), migrateStatusToTasks()
  → Integration Test: Import → Apply → Save → Reload → Verify

PHASE 3: AI-WORKFLOW PERFEKTIONIEREN
Ziel: Der Workflow wird schneller, smarter, mit weniger manuellen Schritten.
Aufgabe 3.1: V4 Import-Prompt
WAS:
  Verbesserter Claude-Prompt der präzisere Diffs generiert.

ANFORDERUNGEN AN DEN PROMPT:
  → Claude MUSS bestehende _ids beibehalten (niemals neue IDs für existierende Entities)
  → Claude MUSS task.status als Integer verwenden (0-4), nicht project.states
  → Claude DARF nur Felder ändern die sich aus dem Transkript ergeben
  → Claude MUSS neue Entities mit dem richtigen Prefix-Format erstellen (ts_, ph_, pk_)
  → Claude SOLL eine Zusammenfassung der Änderungen als Kommentar mitliefern

FORMAT DER CLAUDE-OUTPUT-JSON:
  Identisch mit dem Export-Format, aber mit Änderungen eingebaut.
  Keine separaten "changes"-Array — einfach die modifizierte Gesamtstruktur.
  computeDiff() vergleicht dann Alt vs. Neu.
Aufgabe 3.2: One-Click Workflow (Zukunft)
WAS:
  Transkript in LaunchRamp einfügen → alles automatisch.

FLOW:
  1. User fügt Transkript in ein Textfeld ein
  2. LaunchRamp exportiert aktuellen Stand (intern, kein Download)
  3. LaunchRamp schickt Export + Transkript + Prompt an Claude API
  4. Claude antwortet mit modifizierter JSON
  5. Diff wird angezeigt
  6. User reviewed und übernimmt

VORAUSSETZUNG:
  → Claude API Key muss konfiguriert sein
  → Import-Workflow muss 100% stabil sein (Phase 1 + 2)

PHASE 4: PRODUKT-FEATURES
Ziel: Von internem Tool zu einem echten Produkt.
4.1 KUNDEN-PORTAL (Read-Only View)
    → Shareable Link pro Projekt
    → Kunde sieht: Fortschritt, aktuelle Phase, nächste Meilensteine
    → Kein Edit, nur View
    → Ersetzt manuelle Update-Emails

4.2 AUTOMATISCHE NOTIFICATIONS
    → Nach Import: automatisch Email/Slack an Team mit Zusammenfassung
    → Konfigurierbar pro Projekt (an/aus, Kanal)

4.3 RETAINER-TRACKING
    → Monatliches Stundenbudget pro Retainer-Projekt
    → Burn-Rate: Wie viel Budget ist verbraucht
    → Alerts bei 80% und 100%

4.4 MULTI-USER AUTH
    → Supabase Auth
    → Rollen: Admin, Editor, Viewer
    → Audit Trail: Wer hat was geändert

PHASE 5: SCALE
5.1 CODE-MODULARISIERUNG
    → Monolith aufbrechen in Module
    → core/, views/, features/, data/
    → ES Modules oder Vite

5.2 PWA
    → Offline-Support
    → Push-Notifications für Deadlines
    → Install-Prompt

5.3 PERFORMANCE
    → Selektives Rendering statt renderAll()
    → Nur das rendern was sich geändert hat

TEIL 5: REGELN FÜR DEN CODE
Naming Conventions
Funktionen:     camelCase          → saveTask(), computeDiff()
Variablen:      camelCase          → currentClient, taskList
IDs:            Prefix + random    → ts_abc123, ph_xyz789
CSS-Klassen:    kebab-case         → .task-card, .phase-header
Konstanten:     UPPER_SNAKE        → MAX_SNAPSHOTS, STATUS_DONE
Code-Style (bestehend beibehalten)
→ var statt let/const (Legacy-Kompatibilität)
→ function declarations statt arrows
→ Kein ES6+ (kein import/export, keine Template Literals in altem Code)
→ NEUER Code darf let/const nutzen, aber konsistent innerhalb einer Funktion
→ Kommentare auf Deutsch oder Englisch, Hauptsache klar
Goldene Regeln
1. JEDE Datenänderung geht durch save()
   → Kein direktes Schreiben in localStorage
   → Kein Vergessen von save() nach Mutation

2. IDs sind heilig
   → Bestehende _ids NIEMALS ändern
   → Neue Entities bekommen neue IDs im Prefix-Format
   → Matching immer per _id, NIE per Name oder Index

3. Status lebt am Task
   → task.status ist die einzige Wahrheit
   → project.states ist Legacy und wird ignoriert

4. Import ist destruktiv → Snapshot vorher
   → Vor jedem Import: automatischer Snapshot
   → User kann immer zurückrollen

5. Supabase ist Backup, localStorage ist Wahrheit
   → App arbeitet immer mit localStorage
   → Supabase synct im Hintergrund
   → Bei Konflikt: User entscheidet

6. UI-Updates nach Datenänderungen
   → Nach save() → renderAll() (oder selektives Render wenn möglich)
   → Kein "ich ändere Daten aber zeige den alten Stand"

TEIL 6: GLOSSAR
Client          = Kunde (z.B. "Kemal Üres")
Project         = Projekt unter einem Kunden (z.B. "VSL Launch")
Phase           = Großer Meilenstein (z.B. "Positionierung")
Package         = Gruppe von Tasks innerhalb einer Phase
Task            = Einzelne Aufgabe mit Status, Owner, Deadline etc.
Jourfix         = Wiederkehrendes Meeting mit dem Kunden
Diff            = Vergleich zwischen altem und neuem Datenstand
Merge           = Zusammenführen von Änderungen in die DB
Snapshot        = Backup des aktuellen Datenstands
LaunchRamp      = Dieses Tool
Digital Sun     = Die Agentur die das Tool nutzt und baut
V3/V4 Prompt    = Der Claude-Prompt der Meeting-Transkripte analysiert
Retainer        = Laufendes Betreuungsprojekt (monatlich)
Launch          = Einmaliges Projekt mit definiertem Ende

TEIL 7: QUICK-REFERENCE FÜR COPILOT
"Ich soll den Import fixen"
1. Lies TEIL 2 (Import-Workflow) und TEIL 4 Phase 1
2. Starte mit Aufgabe 1.1 (Status-Migration)
3. Dann 1.2 (applySelectedChanges + save/render)
4. Dann 1.3 (fehlende Handler)
5. Dann 1.4 (Auto-Snapshot)
6. Teste mit 1.5 (Pilot)
"Ich soll ein neues Feature bauen"
1. Lies TEIL 3 — gibt es das Feature schon? Was ist der Soll-Zustand?
2. Lies TEIL 5 — halte dich an die Code-Regeln
3. Jede Datenänderung → save()
4. Neue IDs → Prefix-Format
5. Status → task.status, NICHT project.states
"Ich soll einen Bug fixen"
1. Prüfe: Hängt der Bug mit dem dualen Status-System zusammen?
   → Wenn ja: Aufgabe 1.1 zuerst
2. Prüfe: Wird nach der Datenänderung save() aufgerufen?
   → Wenn nein: save() + renderAll() hinzufügen
3. Prüfe: Werden IDs korrekt gematcht?
   → Per _id, nicht per Index oder Name

Dieser Bauplan ist ein lebendes Dokument. Wenn sich etwas ändert — Features, Architektur, Prioritäten — wird dieser Bauplan aktualisiert. Er ist die Single Source of Truth für alles was LaunchRamp ist, sein soll und werden wird.
Stand: März 2026 | Version 1.0 | Digital Sun AG
