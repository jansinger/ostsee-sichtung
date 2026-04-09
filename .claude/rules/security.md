---
paths:
  - 'src/lib/server/auth/**'
  - 'src/lib/server/storage/**'
  - 'src/hooks.server.ts'
  - 'src/routes/api/auth/**'
  - 'src/routes/api/files/**'
---

# Sicherheit & GDPR

Regeln für Authentifizierung, Datenschutz und Sicherheit.

---

## Authentifizierung (Auth0 + JWT)

### Architektur

Auth0 als Identity Provider via PKCE Flow, JWT-Verifizierung mit `jose`, Cookie-basierte Sessions.

```typescript
// src/hooks.server.ts - Middleware-Chain
import { sequence } from '@sveltejs/kit/hooks';

export const handle = sequence(
	databaseCheck, // 1. DB-Verfügbarkeit
	maintenanceMode, // 2. Wartungsmodus
	authHandler, // 3. JWT-Verifizierung + Cookie-Session
	setAdditionalHeaders // 4. Security Headers
);
```

**Schlüsseldateien:**

- `src/lib/server/auth/auth.ts` - JWT-Verifizierung, PKCE, Cookie-Management
- `src/lib/server/auth/crypto.ts` - Verschlüsselung für Sessions
- `src/hooks.server.ts` - Middleware-Chain mit `sequence()`

### Protected Routes

```typescript
// src/routes/admin/+page.server.ts
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	if (!locals.user.roles?.includes('admin')) {
		throw redirect(302, '/unauthorized');
	}

	return { user: locals.user };
};
```

---

## Input Validation (OWASP)

### Server-seitige Validation

```typescript
import * as yup from 'yup';

const sichtungInputSchema = yup.object({
	// Sanitize strings
	notes: yup
		.string()
		.max(2000)
		.transform((val) => val?.trim())
		.nullable(),

	// Validate numbers
	lat: yup.number().min(-90).max(90).required(),

	// Validate email
	email: yup.string().email().lowercase().nullable()
});

export async function POST({ request }) {
	const data = await request.json();

	// Validation wirft bei Fehler
	const validated = await sichtungInputSchema.validate(data, {
		stripUnknown: true // Entferne unbekannte Felder
	});

	return await saveSighting(validated);
}
```

### SQL Injection Prevention

```typescript
// IMMER parametrisierte Queries
// Korrekt:
await db.select().from(sichtungen).where(eq(sichtungen.id, id));

// NIEMALS:
await db.execute(`SELECT * FROM sichtungen WHERE id = ${id}`);
```

### XSS Prevention

```svelte
<!-- Svelte escaped automatisch -->
<p>{userInput}</p>

<!-- NIEMALS @html mit User-Input ohne Sanitization -->
{@html userInput}
<!-- GEFÄHRLICH -->

<!-- Korrekt: DOMPurify verwenden -->
{@html sanitizeHtml(userInput)}
<!-- Erlaubt nur sichere Tags -->
```

### DOMPurify Sanitization

`isomorphic-dompurify` wird für HTML-Sanitization verwendet (SSR + Client):

```typescript
import { sanitizeHtml, sanitizeText } from '$lib/utils/sanitize';

// sanitizeHtml: erlaubt sichere Tags (a, em, strong, br, span, p, i, b)
// und Attribute (href, class, target, rel)
const safe = sanitizeHtml('<a href="https://example.com">link</a><script>xss</script>');
// → '<a href="https://example.com">link</a>'

// sanitizeText: entfernt ALLE HTML-Tags
const plain = sanitizeText('<b>bold</b> text');
// → 'bold text'
```

**Regel:** Jede `{@html}`-Verwendung MUSS `sanitizeHtml()` nutzen, auch bei scheinbar harmlosen Daten (Defense-in-Depth).

---

## File Upload Sicherheit

### Validierung

```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function validateFile(file: File): void {
	if (!ALLOWED_TYPES.includes(file.type)) {
		throw new Error('Ungültiger Dateityp');
	}

	if (file.size > MAX_SIZE) {
		throw new Error('Datei zu groß (max 10 MB)');
	}

	// Prüfe Magic Bytes
	const header = await readFileHeader(file);
	if (!isValidImageHeader(header)) {
		throw new Error('Ungültige Bilddatei');
	}
}
```

### EXIF Metadata

```typescript
import ExifReader from 'exifreader';

async function extractExif(file: File): Promise<ExifData | null> {
	try {
		const buffer = await file.arrayBuffer();
		const tags = ExifReader.load(buffer);

		return {
			make: tags.Make?.description,
			model: tags.Model?.description,
			dateTime: tags.DateTime?.description,
			gps:
				tags.GPSLatitude && tags.GPSLongitude
					? {
							lat: parseGpsCoord(tags.GPSLatitude, tags.GPSLatitudeRef),
							lng: parseGpsCoord(tags.GPSLongitude, tags.GPSLongitudeRef)
						}
					: null
		};
	} catch {
		return null;
	}
}
```

### Sichere Speicherung

```typescript
// Generiere zufälligen Dateinamen
import { randomUUID } from 'crypto';

function generateSecureFilename(originalName: string): string {
	const ext = path.extname(originalName).toLowerCase();
	return `${randomUUID()}${ext}`;
}
```

---

## GDPR / DSGVO

### Datenminimierung

```typescript
// Nur notwendige Daten speichern
const publicSightingData = {
	id: sighting.id,
	lat: sighting.lat,
	lng: sighting.lng,
	species: sighting.species,
	date: sighting.date
	// KEINE Kontaktdaten in öffentlichen Responses
};
```

### Löschrecht

```typescript
export async function deleteUserData(userId: string) {
	await db.transaction(async (tx) => {
		// Lösche Dateien
		await tx.delete(sichtungenDateien).where(eq(sichtungenDateien.userId, userId));

		// Anonymisiere Sichtungen
		await tx
			.update(sichtungen)
			.set({
				name: null,
				email: null,
				phone: null,
				notes: null
			})
			.where(eq(sichtungen.userId, userId));
	});
}
```

### Consent

```svelte
<label class="flex items-start gap-2">
	<input type="checkbox" name="consent" required class="checkbox" />
	<span class="text-sm">
		Ich stimme der <a href="/datenschutz" class="link">Datenschutzerklärung</a> zu und willige in die
		Verarbeitung meiner Daten ein.
	</span>
</label>
```

---

## Security Headers

Security Headers werden in `src/lib/server/middleware/securityHeaders.ts` zentral verwaltet:

| Header                              | Wert                                      | Zweck                                                |
| ----------------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| `X-Content-Type-Options`            | `nosniff`                                 | MIME-Sniffing verhindern                             |
| `Referrer-Policy`                   | `strict-origin-when-cross-origin`         | Referrer einschränken                                |
| `Permissions-Policy`                | `camera=(), microphone=(), geolocation=*` | Browser-Features einschränken                        |
| `X-Permitted-Cross-Domain-Policies` | `none`                                    | Cross-Domain-Zugriff verhindern                      |
| `Cross-Origin-Opener-Policy`        | `same-origin-allow-popups`                | Window-Isolation (Popups erlaubt für iframe-Kontext) |
| `Cross-Origin-Resource-Policy`      | `cross-origin`                            | Ressourcen-Zugriff für meeresmuseum.de iframe        |
| `Strict-Transport-Security`         | `max-age=31536000; includeSubDomains`     | HSTS (nur HTTPS)                                     |

**Nicht gesetzt:** `Cross-Origin-Embedder-Policy` — würde OSM Tiles, Vercel Blob und Gravatar blockieren.

CSP wird separat in `svelte.config.js` konfiguriert.

---

## SAST Scanning

**CodeQL** läuft automatisch via `.github/workflows/codeql.yml`:

- Push/PR auf `main` + wöchentlich (Sonntag 03:00 UTC)
- Query Suite: `security-extended`
- Ergebnisse unter GitHub Security → Code scanning alerts

---

## Rate Limiting

```typescript
import { rateLimit } from '$lib/server/rateLimit';

export async function POST({ request, getClientAddress }) {
	const ip = getClientAddress();

	// 10 Anfragen pro Minute
	const allowed = await rateLimit(ip, {
		limit: 10,
		window: 60
	});

	if (!allowed) {
		return new Response('Zu viele Anfragen', { status: 429 });
	}

	// ...
}
```

---

## Environment Variables

```bash
# .env - NIEMALS committen
AUTH0_CLIENT_ID=xxx
AUTH0_CLIENT_SECRET=xxx
DATABASE_POSTGRES_URL=xxx
BLOB_READ_WRITE_TOKEN=xxx
```

### Zugriff

```typescript
import { env } from '$env/dynamic/private';

// Server-only
const secret = env.AUTH0_CLIENT_SECRET;
```

---

## Best Practices Checkliste

### Do's

- [ ] Alle Inputs serverseitig validieren
- [ ] Parametrisierte Queries verwenden
- [ ] HTTPS für alle Verbindungen
- [ ] Secrets in Environment Variables
- [ ] Rate Limiting für APIs
- [ ] GDPR-Consent einholen
- [ ] `sanitizeHtml()` bei jeder `{@html}`-Verwendung
- [ ] Security Headers in Middleware zentral verwalten

### Don'ts

- [ ] Keine Secrets in Code/Logs
- [ ] Keine User-Inputs in SQL/HTML ohne Sanitization
- [ ] Keine sensiblen Daten in Fehlermeldungen
- [ ] Keine unverschlüsselten Passwörter
- [ ] Kein `{@html}` ohne `sanitizeHtml()`
