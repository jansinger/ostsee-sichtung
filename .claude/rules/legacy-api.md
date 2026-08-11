---
paths:
  - 'src/routes/rest_sichtungen/**'
  - 'src/routes/sichtungen/**'
  - 'src/lib/legacy-api/**'
---

# Legacy REST API — 100 % Kompatibilität

Diese Endpunkte implementieren die Spezifikation der Vorgänger-API für Mobile
Clients.

> **Stand 2026-08-11: drei Clients sind angebunden.** Belegt am
> Zugriffsprotokoll von `schweinswalsichtung.de`, nicht vermutet:
>
> | Client          | Plattform           | erfolgreiche Meldungen |
> | --------------- | ------------------- | ---------------------- |
> | `OstSeeTiere/8` | iOS                 | 39                     |
> | `okhttp/3.10.0` | Android (ca. 2018)  | 5                      |
> | `OstSeeTiere/6` | iOS, ältere Fassung | 3                      |
>
> Die frühere Fassung dieses Absatzes nannte einen einzigen Client. Das war
> nicht falsch erhoben, sondern falsch geschlossen: Gezählt wurde, was
> **ankam**. Der Android-Client scheiterte zwischen dem 31.07. und dem 09.08.
> mit **187** Meldungen an einer erzwungenen HTTPS-Umleitung — jede einzelne,
> elf Tage lang — und tauchte deshalb nirgends auf, wo man ihn gesucht hätte.
> Wer die Zahl der Clients bestimmen will, muss ins Zugriffsprotokoll sehen,
> nicht in den Posteingang: Dort steht auch das, was nie angekommen ist.
> Seit dem 2026-08-10 meldet er erfolgreich; die 187 sind verloren.
>
> Damit wiegt jede Abweichung schwerer als zuvor: Zwei der drei Clients sind
> nicht testbar, und ihre Nutzer erfahren von einem Fehlschlag nichts.
> Änderungen an Feldnamen, Pfaden und Datentypen bleiben begründungspflichtig;
> offensichtliche Fehler dürfen behoben werden, aber nur als Ergänzung, nie
> als Ersatz eines bestehenden Codepfads.
>
> Diese Einordnung ist ein Datumsstand, keine Dauerzusage — vor größeren
> Änderungen prüfen, ob weitere Clients angebunden sind. Die Zahlen stammen
> aus einer laufenden Beobachtung bis etwa Oktober 2026 (siehe unten).

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

**Jeder dieser Pfade ist zusätzlich mit vorangestelltem `/de/` oder `/en/`
erreichbar** — das Sprachpräfix der CakePHP-Vorgänger-App galt vor jeder Route,
nicht nur vor `antworten.json`. Es ist keine Übersetzung, sondern Routenkosmetik:
die Response ist in jeder Variante identisch. Umgesetzt einmalig im
`reroute`-Hook (`src/hooks.ts` → `src/lib/legacy-api/languagePrefix.ts`), nicht
als Alias-Route je Endpunkt. Keine weiteren Pfade eintragen — vor Seitenrouten
und `/admin` bleibt das Präfix bewusst 404. Begründung und Grenzen:
`docs/LEGACY_API_SPECIFICATION.md`, Abschnitt „Sprachpräfix `/de/` und `/en/`".

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

   **Das gilt seit 2026-07-31 auch für den `search`-Parameter** — und das ist
   die einzige bewusste Abweichung von der Spezifikation in diesem Endpunkt.
   Anonyme Aufrufer durchsuchen Vorname/Name nur bei `namensnennung = 1`, den
   Schiffsnamen nur bei `schiffnamensnennung = 1`, die E-Mail-Adresse gar nicht;
   eingeloggte Admins bekommen die volle Vier-Feld-Suche der Spezifikation.
   Grund: Die Ausgabe war immer gegated, die **Trefferzahl** nicht — damit war
   die Suche ein Membership-Orakel über personenbezogene Daten. Die Einschränkung
   ist eine Datenschutzmaßnahme, **kein zu behebender Spec-Verstoß**; sie darf
   nicht mit Verweis auf Regel 1 oder auf `docs/LEGACY_API_SPECIFICATION.md`
   zurückgebaut werden. Festgeschrieben in `showreports.test.ts`, begründet unter
   „Deviation: consent-gated search" in der Spezifikation.

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

---

## Laufende Beobachtung (bis etwa Oktober 2026)

Nach dem Android-Ausfall läuft eine Kontrolle, weil sich zwei der drei Clients
nicht testen lassen und ihre Nutzer von einem Fehlschlag nichts erfahren. Beide
Zeitpläne liegen auf `hawking` (Plesk, serverweit) und melden sich **nur bei
Auffälligkeiten**:

| Aufgabe                                  | Takt          | prüft                                               |
| ---------------------------------------- | ------------- | --------------------------------------------------- |
| `legacy-sync/sync.sh` (ID 3090)          | alle 15 min   | überträgt den Posteingang nach Produktion           |
| `legacy-sync/client-report.sh` (ID 3097) | täglich 07:20 | ob jede gestrige Meldung mit `201` angenommen wurde |

Der Bericht liest das **Zugriffsprotokoll**, nicht den Posteingang. Das ist der
Kern der Lehre aus dem Ausfall: Der Posteingang kann nur zeigen, was ankam. Was
nie ankam, steht ausschließlich im Protokoll — und zwar in
`logs/access_ssl_log.processed`, die Wochen zurückreicht, nicht in
`proxy_access_ssl_log`, die nur den laufenden Tag hält.

Nachsehen lässt sich jeder vergangene Tag von Hand:

```bash
ssh hawking "sudo -n /var/www/vhosts/schweinswalsichtung.de/legacy-sync/client-report.sh 31/Jul/2026"
```

**Vor Ablauf der Beobachtung** den Stand oben mit frischen Zahlen erneuern oder
die Frist verlängern. Ein Datumsstand, den niemand nachzieht, wird zur
Behauptung — genau so entstand die Angabe „ein Client".
