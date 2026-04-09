---
paths:
  - 'src/lib/server/middleware/**'
  - 'src/hooks.server.ts'
---

# Server Middleware

Regeln für die Middleware-Chain in `hooks.server.ts`.

---

## Execution Order (KRITISCH)

```typescript
// src/hooks.server.ts
export const handle = sequence(
	databaseCheck, // 1. DB-Verfügbarkeit
	maintenanceMode, // 2. Wartungsmodus
	authentication, // 3. JWT + Cookie-Session
	setAdditionalHeaders // 4. Security Headers
);
```

**Reihenfolge ist wichtig** -- databaseCheck muss vor Auth kommen (Auth braucht DB).

---

## databaseCheck.ts

Verhindert 503-Fehler bei DB-Ausfall. 30-Sekunden-Cache für DB-Status.

- **Skip:** `SKIP_DB_CHECK=true` Env-Variable
- **Optional:** `/health`, `/_app`, `/favicon`
- **Required:** `/admin`, `/api/sightings`, `/api/upload`

---

## maintenanceMode.ts

Leitet auf `/maintenance` um wenn in DB aktiviert. **Bypass:** Admin-Routes + API-Routes funktionieren immer.

---

## rateLimit.ts

In-Memory Rate Limiting mit automatischem Cleanup (10min).

| Limit        | Anonym | Authentifiziert |
| ------------ | ------ | --------------- |
| File Upload  | 20/h   | 50/h            |
| Media Access | 30/min | 100/min         |

**Identifier:** `user:{sub}` oder `ip:{clientIp}`
**Headers:** `X-RateLimit-{Limit,Remaining,Reset,Window}`

---

## securityHeaders.ts

```typescript
createSecurityHeadersHandler(nodeEnv: string): Handle
```

Setzt: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `COOP`, `CORP`, `HSTS`.
Dev-CORS nur wenn `nodeEnv === 'development'`.

**Hinweis:** CSP wird in `svelte.config.js` konfiguriert, nicht hier.

---

## Best Practices

- Neue Middleware immer in `sequence()` an korrekter Position einfügen
- Auth-Fehler loggen + Cookie clearen (nicht werfen)
- Rate Limit Identifier können bei gleicher IP kollidieren
- HSTS nur für HTTPS-Requests gesetzt
