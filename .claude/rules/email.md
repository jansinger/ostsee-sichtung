---
paths:
  - 'src/lib/server/services/emailService.ts'
  - 'src/lib/server/templates/**'
  - 'src/routes/api/admin/test-email/**'
---

# Email Service

Regeln für den Email-Versand via nodemailer.

---

## Architektur

`EmailService` (statische Klasse) mit Singleton-Transporter und DB-basierter Konfiguration.

```typescript
// Hauptfunktionen
EmailService.sendNewSightingNotification(sightingId: number): Promise<boolean>
EmailService.sendTestEmail(recipient?: string): Promise<boolean>
EmailService.initialize(test = false): Promise<void>
EmailService.resetTransporter(): void
```

### Transporter-Lebenszyklus

Der Transporter wird beim Modulstart einmal gebaut, danach aber **bei Bedarf neu
aufgebaut**: Beide Versandwege gehen über `ensureTransporter()`, das einen
fehlenden Transporter aufbaut, statt die Mail zu verwerfen. `initialize()`
schließt vorher die alte Verbindung; schlägt das Schließen fehl, wird nur
gewarnt — sonst verhinderte die alte Verbindung den Aufbau der neuen.

Zwei Fehler, die das bis 2026-08-04 verursachte:

- **Geänderte SMTP-Einstellungen erreichten den Transporter nie.** Die Test-Mail
  prüfte die alte Verbindung und bescheinigte eine Konfiguration als
  funktionierend, die so gar nicht gespeichert war. `PUT`/`DELETE /api/config`
  ruft deshalb bei `email.smtp.*` jetzt `EmailService.resetTransporter()` —
  **nicht** bei `notification.email.*`: eine geänderte Empfängerliste ist kein
  Grund, eine funktionierende Verbindung wegzuwerfen.
- **Ein beim Start fehlgeschlagenes `verify()` war endgültig.** War der
  SMTP-Server beim Serverstart kurz nicht erreichbar, blieb der Transporter
  `null` und die Sichtungs-Benachrichtigung gab dauerhaft `false` zurück, bis
  jemand den Container neu startete. Eine ausbleibende Benachrichtigung zeigt
  nirgends etwas an — der Ausfall wäre unbemerkt geblieben.

`ensureTransporter()` lässt **nur einen Aufbau gleichzeitig** zu (`initialization`-
Promise). Ohne diese Klammer schloss bei zwei zeitgleich eingehenden Meldungen
der zweite Lauf die Verbindung, die der erste gerade aufgebaut hatte.

**Der Transporter ist statisch und überlebt den einzelnen Test.** In Testdateien,
die ihn aufbauen, gehört `EmailService.resetTransporter()` ins `beforeEach` und
`close: vi.fn()` in den Transporter-Mock — sonst entscheidet die Reihenfolge der
Tests über ihr Ergebnis. Abgesichert durch `emailService.test.ts`
(„Transporter-Lebenszyklus").

---

## Konfiguration

**Priorität:** Datenbank (`ConfigRepository`) > Environment Variables

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=sender@example.com
SMTP_PASSWORD=secret
PUBLIC_SITE_URL=https://ostsee-tiere.de
```

DB-Config wird 5 Minuten gecached. **`PUT`/`DELETE /api/config` muss bei jedem
Schlüssel unter `notification.email.*` oder `email.smtp.*` zusätzlich
`EmailService.clearCaches()` aufrufen** — `ConfigRepository.clearCache()` räumt
nur den Repository-Cache, nicht die eigene Kopie im `EmailService`. Ohne das
lieferte eine direkt nach dem Speichern ausgelöste Test-Mail bis zu fünf Minuten
lang die alte Empfängerliste, ohne Fehlermeldung.

---

## CC/BCC

`notification.email.cc` und `.bcc` sind Arrays (Settings-UI: kommagetrennte
Eingabe, gespeichert als Array — `ConfigRepository.getArray` gibt bei einem
String stillschweigend den Default zurück).

**Beide Versandwege setzen sie:** die Sichtungs-Benachrichtigung _und_
`sendTestEmail()`, letztere auch bei explizit übergebenem Empfänger — der Knopf
in `/admin/settings` schickt den konfigurierten Empfänger immer explizit mit,
ein Override-Sonderfall würde CC/BCC also genau auf dem einzigen Auslöseweg
weglassen. Eine leere Liste wird zu `undefined`, damit „nicht konfiguriert" und
„leer" in Header und Log unterscheidbar bleiben.

Bis 2026-08-04 setzte **kein** Versandweg CC/BCC: `sendTestEmail()` kannte sie
nicht, und die Benachrichtigung schrieb `config.recipient ? undefined :
config.cc` — der Empfänger ist an der Stelle garantiert gesetzt, der Ausdruck
war konstant `undefined`. Abgesichert durch `emailService.test.ts`
(„CC/BCC-Empfänger") und `config.test.ts` („E-Mail-Cache").

---

## Template

**Es gibt genau eine Quelle:** `NOTIFICATION_EMAIL_DEFAULT_TEMPLATE` in
`src/lib/server/templates/notificationEmailDefault.ts`. Sie wird nach `app_config`
geseedet und ist zugleich der Code-Default in
`ConfigRepository.getString('notification.email.template', …)`. Der DB-Wert
gewinnt; wer die Konstante ändert, zieht den Seed mit
`src/tools/refresh-email-template.ts` nach.

**Keine Vorlage aus dem Dateisystem lesen.** Bis 2026-08-04 gab es zwei weitere
Kopien: die Datei `templates/sightingNotificationTemplate.html`, die
`getDefaultTemplate()` per `readFileSync` las, und die Inline-Konstante
`DEFAULT_EMAIL_TEMPLATE` als deren Rückfall. Die `.html` liegt in `src/`, wird
vom Bundler nicht nach `build/` ausgegeben, und das Image kopiert nur `build/` —
in Produktion schlug der Lesevorgang deshalb immer fehl. Weil der Default als
Argument eifrig ausgewertet wird, passierte das bei jedem Config-Cache-Miss und
schrieb alle fünf Minuten eine `level:50`-Zeile ins Log, obwohl der DB-Wert das
Ergebnis ohnehin bestimmte. Abgesichert durch `emailService.test.ts`
(„Vorlagen-Default kommt aus dem Bundle, nicht vom Dateisystem").

---

## Spam-Erkennung

`detectSpamIndicators()` prüft: URLs in Feldern, verdächtige Keywords, Position außerhalb Ostsee, E-Mail-Pattern. Score wird im Template angezeigt.

---

## Best Practices

- Kein Retry-Mechanismus -- Caller muss Fehler behandeln
- Service initialisiert sich NICHT in Test-Umgebung
- Template-Cache basiert auf Hash (nicht Content-Vergleich)
