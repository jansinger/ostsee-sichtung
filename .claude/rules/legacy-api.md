---
paths:
  - 'src/routes/rest_sichtungen/**'
  - 'src/routes/sichtungen/**'
  - 'src/lib/legacy-api/**'
---

# Legacy REST API — 100 % Kompatibilität

Diese Endpunkte implementieren die Spezifikation der Vorgänger-API für Mobile
Clients.

> **Stand 2026-07-30: ein Client ist angebunden.** Ein neu gebauter iOS-Client
> (`OstSeeTiere/8`) sendet Sichtungen über `POST /rest_sichtungen`. Die alte
> Einordnung „bricht nichts Laufendes" gilt damit nicht mehr — eine Abweichung
> kostet jetzt echte Daten und kann nicht von dieser Seite repariert werden,
> weil der alte Client nicht mehr testbar ist. Änderungen an Feldnamen, Pfaden
> und Datentypen bleiben begründungspflichtig; offensichtliche Fehler dürfen
> behoben werden, aber nur als Ergänzung, nie als Ersatz eines bestehenden
> Codepfads.
>
> Diese Einordnung ist ein Datumsstand, keine Dauerzusage — vor größeren
> Änderungen prüfen, ob weitere Clients angebunden sind.

> **PFLICHT:** Lies `docs/LEGACY_API_SPECIFICATION.md` **vollständig**, bevor du
> einen dieser Endpunkte änderst. Die Datei ist die verbindliche Referenz für
> Feldnamen, Datentypen und Response-Strukturen.

---

## Endpunkte

| URL                               | Methode | Zweck                    |
| --------------------------------- | ------- | ------------------------ |
| `/rest_sichtungen`                | POST    | Sichtung anlegen         |
| `/rest_sichtungen/antworten.json` | GET     | Antwort-Optionen (Enums) |
| `/rest_sichtungen/inBaltic.json`  | GET     | Positionsprüfung         |
| `/sichtungen/showreports.json`    | GET     | Sichtungsdaten abrufen   |

Zusätzlich existiert `/en/rest_sichtungen/antworten.json` (englische Variante).

---

## Unverhandelbare Regeln

1. **Feldnamen exakt beibehalten** — deutsche Namen wie `sichtungsdatum`,
   `anzahl_gesamt`, `gps_breite`, `sonstige_auffaelligkeiten`. Kein Renaming,
   kein camelCase, keine Ergänzungen in bestehenden Responses.

2. **URL-Pfade exakt beibehalten** — **kein** `/api/legacy/`-Präfix oder sonstige
   Zusätze.

3. **Datentypen sind Teil des Vertrags:**
   - In `showreports.json` sind `lat` und `lon` **Strings**, keine Zahlen
   - Booleans sind `0`/`1` als Integer, **nicht** `true`/`false`
   - Datumsformate: `DD.MM.YY` in `showreports.json`, `YYYY-MM-DD HH:MI` im Input

4. **Windrichtungen** — gespeichert und ausgeliefert wird ausschließlich die
   deutsche Liste `'N','NW','W','SW','S','SO','O','NO'` (beachte `SO` für
   Südost, nicht `SE`).

   **Auf der Eingabeseite werden zusätzlich die englischen Abkürzungen
   `NE`, `E` und `SE` angenommen** und auf `NO`, `O` bzw. `SO` normalisiert
   (`normalizeWindDirection` in `src/lib/legacy-api/field-mapping.ts`). Der
   angebundene iOS-Client sendet sie; ohne die Normalisierung wurde daraus
   `''` und die Windrichtung ging verloren. `N`, `S`, `W`, `NW` und `SW` sind
   in beiden Sprachen gleich. Die Normalisierung ist eine Ergänzung, kein
   Ersatz — deutsche Eingaben laufen unverändert durch, und die Annahme der
   englischen Formen darf nicht als „Verstoß gegen Regel 4" entfernt werden.

5. **Response-Strukturen** exakt wie spezifiziert, inklusive Feldbenennung.

6. **Datenschutz:** `showreports.json` liefert nur freigegebene Daten. Name,
   Vorname und Schiffsname nur, wenn der Melder das freigegeben hat. Die Felder
   `bm` und `va` nur für eingeloggte Admins.

---

## Statuscodes

| Situation            | Status             | Body                                                 |
| -------------------- | ------------------ | ---------------------------------------------------- |
| Erfolgreich angelegt | `201` + `Location` | `{"message": "Saved"}`                               |
| Validierungsfehler   | `400`              | `{"message": "Validation failed.", "errors": {...}}` |
| Serverfehler         | `500`              | —                                                    |

---

## Vor jeder Änderung

- [ ] `docs/LEGACY_API_SPECIFICATION.md` gelesen
- [ ] Feldnamen und URL-Pfade unverändert
- [ ] Datentypen geprüft (Strings vs. Zahlen, `0`/`1` vs. Booleans)
- [ ] Test schreibt die erwartete Response-Struktur fest (siehe `.claude/rules/testing.md`)
