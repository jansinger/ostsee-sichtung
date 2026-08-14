---
name: posteingang-status
description: Prüft den Zustand des Legacy-Posteingangs auf hawking — offene Meldungen, ob App-Meldungen angenommen wurden, Zeitpläne, Rechte, Endpunkte. Nutze dies bei Fragen wie "läuft der Posteingang noch", "kommen die App-Meldungen an", "gibt es Fehler im Log" oder vor Änderungen an der Legacy-API.
---

# Zustand des Legacy-Posteingangs prüfen

Der Bericht kommt aus einem Skript auf dem Server, weil die Antwort an fünf
Stellen steckt: Posteingang, Zugriffsprotokoll, Zeitpläne, Dateirechte,
Endpunkte.

```bash
ssh hawking "sudo -n /usr/local/sbin/legacy-inbox-status"        # 7 Tage
ssh hawking "sudo -n /usr/local/sbin/legacy-inbox-status 30"     # 30 Tage
```

Nur lesend. Verändert nichts, verschickt nichts.

Exit 0 heißt „keine Auffälligkeiten", Exit 1 heißt: Es steht ein `BEFUND:` im
Text. Berichte dem Nutzer **das Urteil und die Befunde**, nicht den ganzen
Ausdruck.

## Wie die Befunde zu lesen sind

| Befund                                         | Bedeutung                                                                                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dateien liegen länger als 3 Stunden            | Der Sync läuft nicht oder kommt nicht hinterher. Zeitplan 3090 prüfen.                                                                                        |
| abgewiesene Meldung(en)                        | Der Posteingang hat sie angenommen, die Zielinstanz sie inhaltlich verworfen. Braucht einen Menschen.                                                         |
| Meldungen haben den Posteingang nicht erreicht | Der schlimmste Fall. `301` = erzwungene HTTPS-Umleitung; der Client wandelt sein POST beim Folgen in ein GET um und verliert die Meldung. `429` = Rate-Limit. |
| Datei gehört nicht root                        | Nach einem Deploy `sudo …/deploy/install.sh` laufen lassen.                                                                                                   |
| Endpunkt liefert nicht den erwarteten Code     | `/deploy/*` muss 403 sein, alles andere 200.                                                                                                                  |

**Offene Dateien allein sind kein Befund.** Die Zielinstanz nimmt 20 Meldungen
pro Stunde und IP an; ein Rückstand verteilt sich planmäßig über Stunden.

## Warum es dieses Skript gibt

Zwei Ausfälle sind hier unbemerkt geblieben, beide vom Typ „meldet Erfolg und
tut nichts":

- Der Android-Client (`okhttp/3.10.0`) verlor zwischen dem 31.07. und dem
  09.08.2026 **187 Meldungen** an einer HTTPS-Umleitung — elf Tage lang jede
  einzelne. Der Posteingang konnte davon nichts wissen: Die Anfragen haben ihn
  nie erreicht. Deshalb sieht der Bericht ins **Zugriffsprotokoll**, nicht in
  den Posteingang.
- Zwei Überwachungen meldeten nichts, weil Plesks Benachrichtigung still
  versagte. Deshalb verschicken die Skripte heute selbst — und deshalb lohnt
  der Blick von Hand trotzdem ab und zu.

Hintergrund und Aufbau: `legacy-inbox/README.md`.

## Wenn das Skript fehlt

Dann ist es noch nicht installiert:

```bash
ssh hawking "sudo -n /var/www/vhosts/schweinswalsichtung.de/repo/legacy-inbox/deploy/install.sh"
```
