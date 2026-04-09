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
```

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

DB-Config wird 5 Minuten gecached.

---

## Template

Handlebars-Template in `src/lib/server/templates/sightingNotificationTemplate.html`.
Fallback auf inline `DEFAULT_EMAIL_TEMPLATE` wenn Datei nicht lesbar.

---

## Spam-Erkennung

`detectSpamIndicators()` prüft: URLs in Feldern, verdächtige Keywords, Position außerhalb Ostsee, E-Mail-Pattern. Score wird im Template angezeigt.

---

## Best Practices

- Kein Retry-Mechanismus -- Caller muss Fehler behandeln
- Service initialisiert sich NICHT in Test-Umgebung
- Template-Cache basiert auf Hash (nicht Content-Vergleich)
