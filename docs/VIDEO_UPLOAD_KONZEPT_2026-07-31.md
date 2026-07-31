# Video-Upload für Melder — Konzept

**Anlass:** Wunsch B3 aus `MEERESMUSEUM_AENDERUNGSWUENSCHE_2026-07-31.md` — „Foto und Video
hochladen ermöglichen (wenn das geht und GPS Info entnehmen)".
**Stand:** 2026-07-31, geprüft gegen Branch `claude/meeresmuseum-website-changes-d47405`
(Release 2.6.2, `11a4e87`).
**Status:** Konzept freigegeben, noch nicht implementiert.
**Überarbeitet:** 2026-07-31 nach Review — zwei Aussagen der Erstfassung waren falsch (Abschnitt 2.1 und 2.6), drei Befunde kamen hinzu. Plan: `docs/superpowers/plans/2026-07-31-video-upload.md` (nicht versioniert).

---

## 0. Kurzfassung

Videos werden heute **nicht am Server abgewiesen, sondern im Formular**. Die öffentliche
Upload-Konfiguration nennt vier Bildformate, die Serverliste kennt MP4 und QuickTime
bereits. Das Freischalten selbst ist klein.

Der Aufwand steckt woanders: **Die Auslieferung kann große Videos nicht abspielen.**
`/api/media/[...path]` lädt jede Datei komplett in den Speicher und unterstützt keine
Range-Requests. Bei 10-MB-Bildern fällt das nicht auf, bei 100-MB-Videos ist es der
eigentliche Blocker. Zusätzlich fehlt in der CSP die `media-src`-Direktive, weshalb die
bereits vorhandene Video-Vorschau stumm scheitert.

Empfehlung: **100 MB pro Video**, Grenzen typabhängig aus der Laufzeit-Konfiguration,
Auslieferung vor Annahme reparieren. GPS aus Video wird ein eigenes Vorhaben.

---

## 1. Ist-Zustand

### 1.1 Drei Schichten, die auseinanderlaufen

| Schicht                                             | Videos?                  | Fundstelle                                        |
| --------------------------------------------------- | ------------------------ | ------------------------------------------------- |
| Server-Typprüfung (`security.allowedFileTypes`, DB) | ja — MP4, QuickTime      | `configService.ts:26`, `configInitializer.ts:121` |
| Magic-Bytes-Tabelle                                 | ja — 8 Formate           | `magicBytes.ts:51-97`                             |
| **Öffentliche Formular-Konfiguration**              | **nein — 4 Bildformate** | `uploadDefaults.ts:25-30`                         |

Die Dropzone übernimmt die öffentliche Liste als `accept` **und** als Validierung
(`UnifiedDropzone.svelte:93`, `267`). Dort wird das Video abgewiesen.

### 1.2 Größengrenzen — der Konstruktionsfehler ist größer als gedacht

`POST /api/files/upload` prüft die Größe **zweimal**:

1. Ein anonymes Torlimit, `ANONYMOUS_UPLOAD_MAX_SIZE_BYTES` = 10 MB (`+server.ts:63`),
   bzw. `MAX_SIZE_AUTHENTICATED` = 50 MB für Angemeldete (`+server.ts:79`).
2. `validateFile(file, dynamicPreset)` gegen `security.maxFileSize` aus der Datenbank
   (`+server.ts:124-139`) — **das läuft für alle**, anonym wie angemeldet.

Effektiv gilt also:

|            | effektive Grenze                   |
| ---------- | ---------------------------------- |
| anonym     | `min(10 MB, security.maxFileSize)` |
| angemeldet | `min(50 MB, security.maxFileSize)` |

Wer im Admin unter „Einstellungen" `security.maxFileSize` auf 200 setzt, hebt damit **für
niemanden** etwas an: anonyme Melder bleiben bei 10 MB, Angemeldete bei 50 MB. Die
Einstellung ist in beide Richtungen irreführend. Nach unten wirkt sie dagegen sofort und
unbemerkt: ein Wert unter 10 lässt die Dropzone weiter 10 MB versprechen, die der Server
dann mit 400 ablehnt — genau die Drift, die `uploadLimitConsistency.test.ts` verhindern
soll. Der Test sieht den Datenbankwert nicht.

### 1.3 Vier Befunde, die im Analysedokument fehlten

**a) `BODY_SIZE_LIMIT` deckelt bei 50 MB.**
Fest gesetzt in `Dockerfile:127` und `docker-compose.production.yml:76`
(`52428800`); die Deployment-Doku empfiehlt zusätzlich `client_max_body_size 50M`
(`PRODUCTION_DEPLOYMENT.md:299`, `DOCKER_DEPLOYMENT.md:621`, `:1087`). Oberhalb dieser
Grenze bricht der Upload ab, **bevor** die Route läuft — die App erzeugt ihre eigene
Meldung nie, der Melder sieht nur „Fehler beim Hochladen der Datei"
(`DropzoneEnhanced.svelte:357`).

**b) `/api/media/[...path]` kann große Videos nicht ausliefern.**
Die Route liest die Datei über `storage.getFileContent()` vollständig in einen Buffer
(`+server.ts:137`, `local.ts:249`, `vercel-blob.ts:396`) und setzt weder `Accept-Ranges`
noch verarbeitet sie einen `Range`-Header. Folgen bei 100 MB:

- Safari/iOS verweigert bei fehlendem Range-Support in der Regel die Wiedergabe.
- Springen im Video ist unmöglich.
- Jeder Abruf kostet die volle Dateigröße als Arbeitsspeicher im Container
  (Limit laut `docker-compose.production.yml:161`: 2 GB).
- `MediaThumbnail.svelte:90` lädt mit `preload="metadata"` in der Kachelansicht
  ungewollt die ganze Datei.

**c) Die CSP blockiert vermutlich die Video-Vorschau.**
`createVideoThumbnail()` (`fileAnalysis.ts:179`) erzeugt einen Einzelbild-Frame über eine
`blob:`-URL. `svelte.config.js:45-108` definiert **kein `media-src`**; es greift also
`default-src ['self']`, und `blob:` steht dort nicht — es ist nur unter `img-src`
eingetragen. Der Ladefehler landet in einem leeren `catch` (`fileAnalysis.ts:129`): kein
Thumbnail, keine Meldung. _Aus der Konfiguration abgeleitet, im Browser noch zu
bestätigen._

**d) Typ-Drift bei GIF — bereits heute wirksam.**
`PUBLIC_UPLOAD_ALLOWED_TYPES` bietet `image/gif` an, die geseedete
`security.allowedFileTypes` enthält es nicht (`configInitializer.ts:121`). Ein GIF
passiert die Dropzone und bekommt vom Server ein 400.

### 1.4 Bestand (lokale PG = Produktion, Stand 2026-07-31)

|                       |                                                           |
| --------------------- | --------------------------------------------------------- |
| Dateien gesamt        | 877, **1,59 GB**                                          |
| davon Videos          | **51** (34 × `video/quicktime`, 17 × `video/mp4`), 139 MB |
| größte Einzeldatei    | 7,6 MB                                                    |
| Sichtungen mit Medien | 866 von 19.880 (**4,4 %**), ≈ 67/Jahr                     |

Es liegen bereits Videos im Bestand — klein und aus dem Altsystem. Speicherplatz ist
**nicht** die bindende Grenze.

---

## 2. Empfehlungen

### 2.1 Größengrenze — typabhängig, aus einer Quelle

Neue bzw. bestehende Schlüssel in der Laufzeit-Konfiguration:

| Schlüssel                           | Bedeutung                              | Standard |
| ----------------------------------- | -------------------------------------- | -------- |
| `security.maxFileSize` (bestehend)  | Bilder und alles Übrige, MB            | 10       |
| `security.maxVideoFileSize` (neu)   | `video/*`, MB                          | 100      |
| `security.maxTotalUploadSize` (neu) | Summe je Meldung, MB, **serverseitig** | 250      |

Eine Funktion `maxUploadSizeFor(mimeType, uploadConfig)` bedient beide Seiten:
`POST /api/files/upload` als Torwächter und `GET /api/config/upload` als Auskunft — künftig
auch für anonyme Melder, die heute statische Konstanten erhalten.
`ANONYMOUS_UPLOAD_MAX_SIZE_BYTES` und `MAX_SIZE_AUTHENTICATED` entfallen als eigenständige
Zahlen; die Konfiguration ist die einzige Autorität, die technische Obergrenze ist
`BODY_SIZE_LIMIT`.

**Die Zusicherung aus `uploadLimitConsistency.test.ts` bleibt und wird stärker.** Statt
„zwei Konstanten sind gleich" prüft der Test künftig als Eigenschaft über die Typliste:

1. Für jeden öffentlich angebotenen Typ nennt `/api/config/upload` denselben Wert, den
   `/api/files/upload` durchlässt.
2. Die Offline-Fallbacks in `uploadDefaults.ts` versprechen nie mehr, als die
   Standardkonfiguration hergibt.

Die heutige Kopplung wird damit nicht aufgelöst, sondern auf die Typebene ausgeweitet.

**Verworfene Alternativen.** Eine gemeinsame Grenze für Bild und Video (Variante a) schließt
entweder Videos aus oder erlaubt 100-MB-Bilder. Eine eigene anonyme Grenze (Variante b)
wäre eine vierte Zahl gegen eine Gefahr — 20 Uploads/h × 100 MB = 2 GB/h je IP —, die das
Gesamtlimit je Meldung zusammen mit dem bestehenden Rate Limit gezielter abdeckt. Falls das
Museum den Hebel dennoch will, ist es ein zusätzlicher Schlüssel, kein Umbau.

**Wegfall einer Kontrolle — und die Korrektur dazu.** Die Unterscheidung anonym/angemeldet
bei der Dateigröße entfällt; sie existiert heute nur, weil die öffentliche Auskunft statisch
ist. Die Erstfassung dieses Konzepts hat behauptet, das Gesamtlimit je Meldung kompensiere
das. **Das ist falsch:** `referenceId` kommt aus dem `FormData` und wird nur gegen `isCuid()`
geprüft (`+server.ts:49`) — eine neue CUID je Datei umgeht das Limit vollständig.

Übrig bliebe allein `FILE_UPLOAD_ANONYMOUS` mit 20 Uploads pro Stunde:

| | vorher | ohne zusätzliche Bremse |
| --- | --- | --- |
| Je IP und Stunde | 20 × 10 MB = 200 MB | 20 × 100 MB = **2 GB** |
| Bis zur 24-h-Bereinigung | 4,8 GB | **48 GB** |

Der gesamte Medienbestand aus 13 Jahren beträgt 1,59 GB — eine einzelne IP füllt das in
unter einer Stunde.

**Deshalb zusätzlich: ein Byte-Budget je Kennung und Stunde** (300 MB anonym, 2 GB
angemeldet), an derselben Kennung wie das Rate Limit. Ohne dieses Budget darf die anonyme
Sondergrenze nicht fallen und keine Videogröße freigeschaltet werden.

### 2.2 Formate — MP4 und QuickTime, drei Listen mit klaren Rollen

Öffentlich angeboten werden `video/mp4` und `video/quicktime`. Das deckt praktisch jedes
Mobiltelefon ab und stimmt mit der bereits geseedeten Serverliste überein. `video/webm`
wäre kostenlos ergänzbar (Signatur vorhanden, überall abspielbar), ist für Feldmeldungen
aber ohne Bedeutung.

| Liste                                                | Rolle                                                          |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| `uploadDefaults.ts` → `PUBLIC_UPLOAD_ALLOWED_TYPES`  | Was Melder sehen und die Dropzone annimmt                      |
| `configInitializer.ts` → `security.allowedFileTypes` | Was der Server erlaubt — **Obermenge**, `image/gif` nachtragen |
| `magicBytes.ts`                                      | Was inhaltlich prüfbar ist                                     |

Ein neuer Test bindet sie aneinander: Jeder öffentlich angebotene Typ muss in der
Serverliste stehen **und** eine Signatur besitzen. Der Test ist heute rot (GIF) — das ist
der RED-Schritt für Befund 1.3 d.

Aus `constants/upload.ts` entfallen die Phantasie-MIME-Typen `video/mov`, `video/avi`,
`video/mkv`, `video/wmv`, `video/flv`; kein Browser meldet sie so.

**Härtung der Signaturprüfung:** MP4, QuickTime und M4V sind alle ISO-BMFF. Die Prüfung
sollte für alle drei „`ftyp` bei Offset 4" akzeptieren, statt für QuickTime auf `ftypqt`
zu bestehen (`magicBytes.ts:71-73`) — sonst wird ein iPhone-Video mit abweichender Brand
grundlos mit 400 abgewiesen.

### 2.3 Obergrenze — 100 MB

| bei 100 MB                                    |                  |
| --------------------------------------------- | ---------------- |
| Videolänge 1080p/30 (≈ 8 Mbit/s)              | ≈ 100 s          |
| Videolänge 4K/30 (≈ 50 Mbit/s)                | ≈ 16 s           |
| **Upload über Mobilfunk (1–5 Mbit/s Uplink)** | **3–13 Minuten** |
| Speicher bei 500 Videos/Jahr                  | 50 GB/Jahr       |

Die **Upload-Dauer an Deck** ist das Argument, nicht der Speicherplatz. Bei 200 MB wären es
5–27 Minuten; das bricht auf einem schaukelnden Boot regelmäßig ab. 200 MB sind technisch
möglich, praktisch aber kaum durchführbar.

**Zwingend mitzuziehen — Betriebsaufgabe, nicht nur Code:** `BODY_SIZE_LIMIT` muss _über_
der App-Grenze liegen (bei 100 MB App-Limit z. B. `125829120`), analog
`client_max_body_size 120M` in der Deployment-Doku. Grundsatz: **Die Plattformgrenze darf
nie die bindende sein**, sonst gewinnt die unerklärliche Fehlermeldung. Beim Start wird
eine Warnung geloggt, wenn `BODY_SIZE_LIMIT ≤` das konfigurierte Maximum ist.

### 2.4 Rückmeldung an den Melder

Heute nicht stumm, aber unbrauchbar: ein Toast „video.mp4: Datei zu groß. Maximum: 10MB"
(`upload.ts:82`), bei falschem Typ eine rohe MIME-Liste (`upload.ts:85`), und der
Server-413 sagt _„Für größere Dateien bitte anmelden"_ (`+server.ts:76`) — an Melder
gerichtet, die sich gar nicht anmelden können.

- Größenfehler mit Ist-Wert und Ausweg: „Ihr Video ist mit 137 MB zu groß (erlaubt sind
  100 MB). Nehmen Sie es in geringerer Auflösung auf, kürzen Sie es — oder schicken Sie es
  uns nach dem Absenden per E-Mail."
- Typfehler über das vorhandene `getFileTypeDescription()` statt MIME-Strings.
- 413-Text angleichen.
- **Fehler nicht in den Toast, sondern als bleibender Bereich unter der Dropzone.** Toasts
  verschwinden; ein Validierungsfehler ohne Verknüpfung zum Bedienelement verletzt
  außerdem WCAG 2.1 SC 3.3.1.
- Der Hinweis „Medien auf anderem Weg zukommen lassen" in `sections/Media.svelte` ist
  heute immer sichtbar und verweist auf Instruktionen _nach_ dem Absenden. **Diese
  Instruktionen existieren nicht:** `SubmissionSuccess.svelte:77-82` nennt weder Adresse
  noch Weg. Die Adresse ist inzwischen bestätigt — `sichtungen@meeresmuseum.de` — und
  gehört als Konstante an eine Stelle, aus der Fehlertext, Formularhinweis und
  Bestätigungsseite sie lesen.

**Und der schwerste Punkt, in der Erstfassung übersehen: Es gibt keinen
Upload-Fortschritt.** `uploadFileDirect` nutzt `fetch()` (`uploadUtils.ts:25`), und `fetch`
meldet keinen Fortschritt des Request-Bodys. Die Oberfläche zeigt einen unbestimmten
Spinner und ein Abzeichen „Upload…" (`DropzoneEnhanced.svelte:577`).

Bei einem Foto von 3 MB ist das in Ordnung. Bei **3 bis 13 Minuten** für ein 100-MB-Video
sieht der Melder auf dem Boot einen Kringel, hält die Übertragung für hängengeblieben und
bricht ab — nach zehn Minuten Funk. Ohne Prozentanzeige und Abbrechen-Knopf ist das Feature
praktisch unbenutzbar, und eine kleinere Grenze hilft nicht: 25 MB bei 1 Mbit/s Uplink sind
immer noch 3,3 Minuten. Nötig ist `XMLHttpRequest` mit `upload.onprogress`; `fetch` mit
`ReadableStream`-Body scheidet aus, weil Safari es nicht unterstützt — also genau die
iPhone-Melder trifft, um die es geht.

### 2.5 GPS aus Video — eigenes Vorhaben, später

Zwei Gründe, es hier nicht mitzunehmen:

- **Fachlich:** Wunsch B6 will die Foto-Position aus Schritt 1 entfernen, B2 verschiebt
  Medien nach Schritt 2 (dort steht heute `enableGPSExtraction={false}`,
  `Media.svelte`). Video-GPS jetzt zu bauen hieße, es in eine Stelle einzubauen, die
  gerade abgerissen wird.
- **Technisch:** Die Position steckt im `moov/udta/©xyz`-Atom (Apple, ISO 6709). `exifr`
  liest das nicht — es braucht einen kleinen ISO-BMFF-Parser, und zwar zweimal:
  serverseitig auf dem Buffer (`exifUtils.ts`) und clientseitig in `analyzeClientFile()`.

Das ist kein Grund, Videos so lange nicht anzunehmen. Nach C1/B2 einmal sauber gegen den
dann gültigen Positionsschritt bauen.

### 2.6 Vorschau und Admin-Ansicht

`MediaGallery`, `MediaModal` und `MediaThumbnail` verzweigen bereits auf `video/` — die
Struktur steht. Zu tun:

- **Range-Support und Streaming in `/api/media/[...path]`** (`Accept-Ranges: bytes`,
  Status 206). Lokal über `createReadStream` mit Start/Ende; bei Vercel Blob den
  Range-Header an die Blob-URL durchreichen. Ein Redirect scheidet aus — die Route muss
  die Freigabeprüfung behalten (`+server.ts:105-134`).
- **`'media-src': ["'self'", 'blob:', 'data:']`** in `svelte.config.js`, sonst bleibt die
  Video-Vorschau tot.
- **`preload="none"`** in `MediaThumbnail.svelte` statt `metadata`, dazu das leere
  `poster=""` entfernen. Das Play-Overlay ist bereits vorhanden.
- **Das Media-Rate-Limit für Teilanfragen anheben — in der Erstfassung übersehen.**
  `MEDIA_ACCESS_ANONYMOUS` erlaubt 30 Abrufe pro Minute. Ohne Range-Support war das ein
  Abruf je Datei; mit Range macht ein Player beim Springen im Video leicht 30 Anfragen in
  Sekunden, und die Wiedergabe endet mit 429 — der Fix verschlechterte damit genau das
  Symptom, das er beheben soll. Lösung ohne die Bremse aufzugeben: ein eigenes, zehnfach
  höheres Limit für 206-Anfragen, während das Volumen weiterhin am Byte-Budget hängt.
- **Kein serverseitiges Poster-Rendering.** Dafür bräuchte das Image ffmpeg (~100 MB plus
  native Abhängigkeit) — das steht in keinem Verhältnis.

---

## 3. Reihenfolge und Aufwand

| PR    | Inhalt                                                                                                                                        | Größe |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| **1** | Grenzen und Listen auf eine Quelle, neue Konfigurationsschlüssel, Konsistenztests ausgeweitet, GIF-Drift behoben, **Byte-Budget je IP und Stunde**. Noch kein sichtbares Video. | M     |
| **2** | **Auslieferung videofähig:** Range/Streaming in `/api/media`, Rate-Limit für Teilanfragen, `media-src`, `preload="none"`.                     | **L** |
| **3** | Videos freischalten: MP4 + QuickTime öffentlich, ISO-BMFF-Prüfung entschärft, Gesamtlimit je Meldung, Formatnamen und Dauerhinweis.           | S     |
| **4** | Rückmeldung: Fehlertexte mit Adresse, 413-Text, bleibender Fehlerbereich, **Upload-Fortschritt mit Abbruch**, `BODY_SIZE_LIMIT` inkl. Doku und Startwarnung. | **M** |
| —     | _Separat:_ GPS aus Video, nach B2/B6.                                                                                                         | M     |

**Zwei harte Reihenfolgebedingungen:**

1. **Das Byte-Budget aus PR 1 muss vor PR 3 stehen.** PR 1 schafft die anonyme
   Sondergrenze ab; ohne die Volumen-Bremse wären 2 GB pro IP und Stunde möglich.
2. **PR 2 muss vor PR 3 kommen** — sonst nehmen wir Videos an, die niemand abspielen kann.

Muss der Umfang schrumpfen, ist **keiner** dieser drei Teile streichbar. Eine kleinere
Grenze (25 MB) spart sie nicht ein: Der Upload dauert dann immer noch 3,3 Minuten bei
1 Mbit/s, die Fortschrittsanzeige bleibt also nötig, und das Budget ist ohnehin nur eine
Rate-Limit-Variante. Streichbar wäre allenfalls der Dauerhinweis im Formular.

**Betriebsaufgabe außerhalb der PRs:** `BODY_SIZE_LIMIT` und die Reverse-Proxy-Grenze auf
dem Staging- und Produktions-Host anheben. Ohne das wirkt keine Konfigurationsänderung.

---

## 4. Offene Entscheidungen fürs Museum

Präzisiert Rückfrage 6 aus `MEERESMUSEUM_AENDERUNGSWUENSCHE_2026-07-31.md`:

1. **100 MB pro Video?** (≈ 100 s in 1080p, 3–13 Minuten Upload über Mobilfunk). 200 MB
   wären technisch möglich, praktisch aber kaum durchführbar.
2. **Videos annehmen, obwohl wir daraus zunächst keine Position lesen?** Empfehlung: ja.
3. **Genügen MP4 und MOV?** Das deckt iPhone und Android ab.
4. ~~**Wie soll der Weg für zu große Videos aussehen?**~~ **Beantwortet am 2026-07-31:**
   `sichtungen@meeresmuseum.de`, direkt im Fehlertext **und** auf der Bestätigungsseite.
   Nebenbefund dabei: Die Bestätigungsseite verspricht heute Instruktionen, die es nie
   gab — das wird mit erledigt.

Die Antworten betreffen nur PR 3 und PR 4. PR 1 und PR 2 sind unabhängig davon und können
sofort beginnen.
