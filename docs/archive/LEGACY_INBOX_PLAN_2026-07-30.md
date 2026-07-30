# Legacy-Posteingang — Implementierungsplan

> **Für agentische Bearbeiter:** ERFORDERLICHE SUB-SKILL: `superpowers:subagent-driven-development` (empfohlen) oder `superpowers:executing-plans`, um diesen Plan Aufgabe für Aufgabe umzusetzen. Die Schritte nutzen Checkbox-Syntax (`- [ ]`) zur Nachverfolgung.

**Ziel:** Ein eigenständiger Node-Dienst auf dem Hetzner/Plesk-Server, der drei Endpunkte der Legacy-API vertragstreu bedient und jede eingehende Sichtung als JSON-Datei ablegt, ohne je etwas zu verwerfen.

**Architektur:** Schlichtes ESM-JavaScript auf `node:http`, kein Build-Schritt, kein Framework, keine Datenbank. Der Dienst liest den Request, parst und validiert nach Kräften und **schreibt anschließend immer** — das Validierungsergebnis bestimmt nur die HTTP-Antwort und das Zielverzeichnis, nie die Existenz der Daten.

**Tech-Stack:** Node.js ≥ 20 (ESM), `yup` (Validierung), `rbush` + `@turf/boolean-point-in-polygon` + `@turf/helpers` (Geometrie). Tests mit dem vorhandenen Vitest des Hauptrepos.

**Grundlage:** `docs/archive/LEGACY_INBOX_ENTWURF_2026-07-30.md` — bei Widersprüchen gilt der Entwurf. Verbindlicher Vertrag: `docs/LEGACY_API_SPECIFICATION.md`, in Zweifelsfällen `docs/archive/Sichtungsdb-Web-Schnittstelle.pdf`.

## Global Constraints

- **Der Leitsatz:** Was den Dienst erreicht hat, wird geschrieben — ausnahmslos, auch wenn es ungültig, unparsbar oder Unsinn ist. Einzige Ausnahme: die globale Reißleine (Aufgabe 6).
- **Nie antworten, bevor die Daten auf der Platte sind.** Schreibfehler ergibt `500`, niemals `201`.
- **Feldnamen, URL-Pfade und Datentypen exakt nach Vertrag.** Kein `/api/legacy/`-Präfix, keine zusätzlichen Felder in Antworten.
- **Fehlerantwort flach:** `{"message": "Validation failed.", "errors": {...}}` — nicht die geschachtelte Form aus `src/lib/legacy-api/error-messages.ts`.
- **Booleans im Vertrag sind `0`/`1` als Integer**, nicht `true`/`false`.
- **Kein `any`, keine Nutzereingabe in Dateipfaden, keine Shell-Aufrufe.**
- **Sprache:** Bezeichner **deutsch** — abweichend von der Repo-Konvention in `.claude/rules/architecture.md`. Grund: Das Vokabular dieses Dienstes ist deutsch (`posteingang`, `abgewiesen`, `umschlag`, `lfd_nr` sind Verzeichnis- und Feldnamen ohne englische Entsprechung); ein `createStore` daneben wäre eine halbe Übersetzung. Der Dienst ist ein eigenes Paket mit eigenem Deployment, die Abweichung endet an seiner Grenze. Skripte im Hauptrepo (`src/tools/`) folgen weiter der Repo-Konvention.
- **Commits:** `<type>(<scope>): <beschreibung>`, englisch, Subject kleingeschrieben. Scopes hier: `api`, `test`, `build`, `docs`.
- **Test zuerst** (`.claude/rules/testing.md`) — jeder Schritt schreibt erst den fehlschlagenden Test.

## Parallele Arbeit — bitte beachten

Eine separate Aufgabe korrigiert derzeit die in Abschnitt 2 des Entwurfs belegten Abweichungen der **Hauptanwendung** (geschachtelte Fehlerform, Feldname mit Umlaut, `LegacyErrorResponse` in `static/openapi.yml`). Aufgabe 9 dieses Plans vergleicht beide Implementierungen und ist davon betroffen: Ist die Korrektur eingeflossen, entfällt die dort dokumentierte Ausnahme für den Fehlerpfad. **Vor Aufgabe 9 den Stand von `src/lib/legacy-api/error-messages.ts` prüfen.**

---

## Dateistruktur

| Datei                                       | Verantwortung                                                 |
| ------------------------------------------- | ------------------------------------------------------------- |
| `legacy-inbox/package.json`                 | Abhängigkeiten, `type: module`, Node-Untergrenze              |
| `legacy-inbox/app.js`                       | Passenger-Einstiegspunkt: Konfiguration lesen, Server starten |
| `legacy-inbox/src/server.js`                | Routing auf die vier Pfade, `404`/`405` sonst                 |
| `legacy-inbox/src/config.js`                | Umgebungsvariablen einlesen und prüfen                        |
| `legacy-inbox/src/respond.js`               | Einziger Weg, eine JSON-Antwort zu schreiben                  |
| `legacy-inbox/src/store.js`                 | Atomares Schreiben, laufende Nummer, Verzeichnisse            |
| `legacy-inbox/src/readBody.js`              | Body-Stream mit Obergrenze, Parsen JSON + Formular            |
| `legacy-inbox/src/validate.js`              | Yup-Port mit den deutschen Meldungen des Vertrags             |
| `legacy-inbox/src/rateLimit.js`             | Zähler pro IP und global                                      |
| `legacy-inbox/src/routes/createSighting.js` | `POST /rest_sichtungen`                                       |
| `legacy-inbox/src/routes/antworten.js`      | `GET /rest_sichtungen/antworten.json` (+ `/en/…`)             |
| `legacy-inbox/src/routes/inBaltic.js`       | `GET /rest_sichtungen/inBaltic.json`                          |
| `legacy-inbox/src/routes/health.js`         | `GET /health` für die externe Überwachung                     |
| `legacy-inbox/src/geo/checkBalticSea.js`    | Port der dateibasierten Geometrieprüfung                      |
| `legacy-inbox/src/geo/rbush-index.json`     | Kopie des vorkompilierten Index (33 MB)                       |
| `legacy-inbox/data/antworten.de.json`       | Eingefrorene Enum-Tabelle, generiert                          |
| `legacy-inbox/data/antworten.en.json`       | dito, englisch                                                |
| `src/tools/generate-antworten-json.js`      | Erzeugt die eingefrorenen Dateien (Hauptrepo)                 |
| `src/tools/import-legacy-inbox.js`          | Import in die Hauptanwendung (Hauptrepo)                      |

Jede Datei hat genau eine Aufgabe: `store.js` kennt kein HTTP, `validate.js` kennt keine Platte, `geo/` kennt weder das eine noch das andere. Das macht sie einzeln testbar, ohne einen Server zu starten.

---

## Aufgabe 1: Projektgerüst, Konfiguration und Health-Endpunkt

**Dateien:**

- Erstellen: `legacy-inbox/package.json`
- Erstellen: `legacy-inbox/src/config.js`
- Erstellen: `legacy-inbox/src/respond.js`
- Erstellen: `legacy-inbox/src/routes/health.js`
- Erstellen: `legacy-inbox/src/server.js`
- Erstellen: `legacy-inbox/app.js`
- Erstellen: `legacy-inbox/.gitignore`
- Ändern: `vitest.config.ts:79`
- Test: `legacy-inbox/src/config.test.js`, `legacy-inbox/src/server.test.js`

**Schnittstellen:**

- Erzeugt: `leseKonfiguration(env)` → `{ datenVerzeichnis, port, rateLimitProIp, rateLimitGlobal, maxBodyBytes }`; wirft `Error` bei fehlendem `LEGACY_INBOX_DATA_DIR`
- Erzeugt: `erstelleServer({ konfiguration, store, rateLimit })` → `http.Server`

- [ ] **Schritt 1: Test für die Konfiguration schreiben**

`legacy-inbox/src/config.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { leseKonfiguration } from './config.js';

describe('leseKonfiguration', () => {
	it('wirft ohne LEGACY_INBOX_DATA_DIR', () => {
		expect(() => leseKonfiguration({})).toThrow(/LEGACY_INBOX_DATA_DIR/);
	});

	it('übernimmt den Datenpfad und setzt die Vorgabewerte', () => {
		const k = leseKonfiguration({ LEGACY_INBOX_DATA_DIR: '/daten' });
		expect(k.datenVerzeichnis).toBe('/daten');
		expect(k.rateLimitProIp).toBe(100);
		expect(k.rateLimitGlobal).toBe(1000);
		expect(k.maxBodyBytes).toBe(262144);
	});

	it('lässt die Grenzwerte per Umgebungsvariable überschreiben', () => {
		const k = leseKonfiguration({
			LEGACY_INBOX_DATA_DIR: '/daten',
			LEGACY_INBOX_RATE_LIMIT_GLOBAL: '5000'
		});
		expect(k.rateLimitGlobal).toBe(5000);
	});
});
```

- [ ] **Schritt 2: Test ausführen, Fehlschlag prüfen**

Ausführen: `npx vitest run --project server legacy-inbox/src/config.test.js`
Erwartet: FAIL — `Failed to load url ./config.js`

- [ ] **Schritt 3: Vitest-Konfiguration erweitern**

In `vitest.config.ts` das `include` des Projekts `server` (Zeile 79) ergänzen:

```ts
				include: ['src/**/*.{test,spec}.{js,ts}', 'legacy-inbox/**/*.test.js'],
```

Grund: `npm run test:quick` bleibt das einzige Tor. Der Dienst selbst liefert dadurch keine Entwicklungsabhängigkeiten mit — Vitest liegt im Wurzel-`package.json`.

Zusätzlich das `exclude` des Projekts `server` (Zeile 80) um `**/node_modules/**` ergänzen:

```ts
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', '**/node_modules/**'],
```

Grund: `exclude` ersetzt Vitests Vorgabe, deshalb muss `**/node_modules/**` ausdrücklich stehen.

- [ ] **Schritt 4: `package.json` und `.gitignore` anlegen**

`legacy-inbox/package.json`:

```json
{
	"name": "legacy-inbox",
	"version": "1.0.0",
	"private": true,
	"type": "module",
	"engines": { "node": ">=20" },
	"main": "app.js",
	"dependencies": {
		"@turf/boolean-point-in-polygon": "^7.3.5",
		"@turf/helpers": "^7.3.4",
		"rbush": "^4.0.1",
		"yup": "^1.7.1"
	}
}
```

**Die Versionen müssen mit dem Wurzel-`package.json` übereinstimmen.** Die Tests
lösen aus dem `node_modules` des Hauptrepos auf — weichen die Bereiche hier ab,
wird gegen andere Versionen getestet als auf dem Server laufen. Vor dem Eintragen
prüfen:

Ausführen: `node -e "const p=require('./package.json');const d={...p.dependencies,...p.devDependencies};for(const k of ['yup','rbush','@turf/helpers','@turf/boolean-point-in-polygon'])console.log(k,d[k])"`

- [ ] **Schritt 4b: Lockfile erzeugen**

`npm ci` in der Betriebsanleitung bricht ohne `package-lock.json` ab. Einmalig
erzeugen und mitversionieren:

```bash
npm install --package-lock-only --prefix legacy-inbox
```

Prüfen: `test -f legacy-inbox/package-lock.json && echo vorhanden`
Erwartet: `vorhanden`

Die Zeile `node_modules/` in `.gitignore` bleibt — das Lockfile wird versioniert,
die Pakete nicht.

`legacy-inbox/.gitignore`:

```
node_modules/
data/eingang/
```

- [ ] **Schritt 5: Konfiguration implementieren**

`legacy-inbox/src/config.js`:

```js
/**
 * Liest die Konfiguration aus der Umgebung und prüft sie.
 * Wirft beim Start statt beim ersten Request — ein Konfigurationsfehler
 * soll beim Deploy auffallen, nicht bei der ersten echten Sichtung.
 */
export function leseKonfiguration(env) {
	const datenVerzeichnis = env.LEGACY_INBOX_DATA_DIR;
	if (!datenVerzeichnis) {
		throw new Error(
			'LEGACY_INBOX_DATA_DIR ist nicht gesetzt. Der Dienst startet ohne Datenverzeichnis nicht.'
		);
	}

	return {
		datenVerzeichnis,
		port: Number(env.PORT) || 3000,
		rateLimitProIp: Number(env.LEGACY_INBOX_RATE_LIMIT_IP) || 100,
		rateLimitGlobal: Number(env.LEGACY_INBOX_RATE_LIMIT_GLOBAL) || 1000,
		maxBodyBytes: Number(env.LEGACY_INBOX_MAX_BODY_BYTES) || 262144
	};
}
```

- [ ] **Schritt 6: Test ausführen, Erfolg prüfen**

Ausführen: `npx vitest run --project server legacy-inbox/src/config.test.js`
Erwartet: PASS, 3 Tests

- [ ] **Schritt 7: Test für Router und Health-Endpunkt schreiben**

`legacy-inbox/src/server.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { erstelleServer } from './server.js';

let server;
let basis;

const storeAttrappe = { istBeschreibbar: async () => true };
const rateLimitAttrappe = { pruefeIp: () => true, pruefeGlobal: () => true };

beforeAll(async () => {
	server = erstelleServer({
		konfiguration: { maxBodyBytes: 262144 },
		store: storeAttrappe,
		rateLimit: rateLimitAttrappe
	});
	await new Promise((fertig) => server.listen(0, fertig));
	basis = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise((fertig) => server.close(fertig)));

describe('Router', () => {
	it('meldet über /health, dass das Datenverzeichnis beschreibbar ist', async () => {
		const antwort = await fetch(`${basis}/health`);
		expect(antwort.status).toBe(200);
		expect(await antwort.json()).toEqual({ status: 'ok', datenverzeichnis: 'beschreibbar' });
	});

	it('antwortet 404 auf unbekannte Pfade', async () => {
		const antwort = await fetch(`${basis}/gibtesnicht`);
		expect(antwort.status).toBe(404);
	});

	it('antwortet 405, wenn die Methode nicht zum Pfad passt', async () => {
		const antwort = await fetch(`${basis}/rest_sichtungen`, { method: 'GET' });
		expect(antwort.status).toBe(405);
	});

	it('meldet 503, wenn das Datenverzeichnis nicht beschreibbar ist', async () => {
		const kaputt = erstelleServer({
			konfiguration: { maxBodyBytes: 262144 },
			store: { istBeschreibbar: async () => false },
			rateLimit: rateLimitAttrappe
		});
		await new Promise((fertig) => kaputt.listen(0, fertig));
		const antwort = await fetch(`http://127.0.0.1:${kaputt.address().port}/health`);
		expect(antwort.status).toBe(503);
		await new Promise((fertig) => kaputt.close(fertig));
	});
});
```

- [ ] **Schritt 8: Test ausführen, Fehlschlag prüfen**

Ausführen: `npx vitest run --project server legacy-inbox/src/server.test.js`
Erwartet: FAIL — `Failed to load url ./server.js`

- [ ] **Schritt 9: Health-Route implementieren**

`legacy-inbox/src/routes/health.js`:

```js
/**
 * Health-Endpunkt für die externe Überwachung.
 *
 * Prüft ausdrücklich die Beschreibbarkeit des Datenverzeichnisses und nicht
 * nur, ob der Prozess antwortet: Ein Dienst, der läuft aber nicht schreiben
 * kann, ist für diesen Zweck genauso kaputt wie einer, der tot ist.
 */
import { antworteJson } from '../respond.js';

export async function health(req, res, { store }) {
	const beschreibbar = await store.istBeschreibbar();

	if (!beschreibbar) {
		antworteJson(res, 503, { status: 'fehler', datenverzeichnis: 'nicht beschreibbar' });
		return;
	}

	antworteJson(res, 200, { status: 'ok', datenverzeichnis: 'beschreibbar' });
}
```

`legacy-inbox/src/respond.js`:

```js
/**
 * Einziger Weg, eine Antwort zu schreiben — damit die Kopfzeilen des Vertrags
 * (JSON, UTF-8, nosniff) an keiner Route vergessen werden können.
 */
export function antworteJson(res, status, koerper, kopfzeilen = {}) {
	const text = JSON.stringify(koerper);
	res.writeHead(status, {
		'Content-Type': 'application/json; charset=utf-8',
		'Content-Length': Buffer.byteLength(text),
		'X-Content-Type-Options': 'nosniff',
		...kopfzeilen
	});
	res.end(text);
}
```

- [ ] **Schritt 10: Router implementieren**

`legacy-inbox/src/server.js`:

```js
import http from 'node:http';
import { health } from './routes/health.js';
import { antworteJson } from './respond.js';

/**
 * Die vier bedienten Pfade. Alles andere ist 404 — insbesondere
 * /sichtungen/showreports.json, das ohne Datenbank nur ein falsches
 * leeres Array liefern könnte (siehe Entwurf, Abschnitt 1).
 */
const ROUTEN = [
	{ pfad: '/health', methode: 'GET', behandeln: health },
	{ pfad: '/rest_sichtungen', methode: 'POST', behandeln: null },
	{ pfad: '/rest_sichtungen/antworten.json', methode: 'GET', behandeln: null },
	{ pfad: '/en/rest_sichtungen/antworten.json', methode: 'GET', behandeln: null },
	{ pfad: '/rest_sichtungen/inBaltic.json', methode: 'GET', behandeln: null }
];

export function erstelleServer(abhaengigkeiten) {
	return http.createServer(async (req, res) => {
		const pfad = new URL(req.url, 'http://localhost').pathname;
		const treffer = ROUTEN.filter((r) => r.pfad === pfad);

		if (treffer.length === 0) {
			antworteJson(res, 404, { error: 'NotFound', message: 'Unknown endpoint' });
			return;
		}

		const route = treffer.find((r) => r.methode === req.method);
		if (!route) {
			antworteJson(res, 405, {
				error: 'MethodNotAllowed',
				message: `Only ${treffer.map((r) => r.methode).join(', ')} is supported for this endpoint`
			});
			return;
		}

		if (!route.behandeln) {
			antworteJson(res, 501, { error: 'NotImplemented', message: 'Not implemented yet' });
			return;
		}

		try {
			await route.behandeln(req, res, abhaengigkeiten);
		} catch (fehler) {
			console.error('Unbehandelter Fehler', fehler);
			if (!res.headersSent) {
				antworteJson(res, 500, { error: 'InternalError', message: 'Internal server error' });
			}
		}
	});
}
```

- [ ] **Schritt 11: Test ausführen, Erfolg prüfen**

Ausführen: `npx vitest run --project server legacy-inbox/src/server.test.js`
Erwartet: PASS, 4 Tests

- [ ] **Schritt 12: Einstiegspunkt anlegen**

`legacy-inbox/app.js`:

```js
import { leseKonfiguration } from './src/config.js';
import { erstelleServer } from './src/server.js';
import { erstelleStore } from './src/store.js';
import { erstelleRateLimit } from './src/rateLimit.js';

const konfiguration = leseKonfiguration(process.env);
const store = await erstelleStore({ datenVerzeichnis: konfiguration.datenVerzeichnis });
await store.initialisiere();

const rateLimit = erstelleRateLimit({
	proIpProStunde: konfiguration.rateLimitProIp,
	globalProStunde: konfiguration.rateLimitGlobal
});

const server = erstelleServer({ konfiguration, store, rateLimit });
server.listen(konfiguration.port, () => {
	console.log(`legacy-inbox lauscht auf Port ${konfiguration.port}`);
	console.log(`Datenverzeichnis: ${konfiguration.datenVerzeichnis}`);
});
```

Hinweis: `app.js` lässt sich erst nach Aufgabe 2 und 6 starten. Das ist beabsichtigt — der Einstiegspunkt wird einmal geschrieben und nicht mehrfach umgebaut. Der Rauchtest dafür steht in Aufgabe 6, Schritt 8.

- [ ] **Schritt 13: Committen**

```bash
git add legacy-inbox/ vitest.config.ts && git commit -m "feat(api): scaffold the legacy inbox service with a writability health check"
```

---

## Aufgabe 2: `store.js` — atomares Schreiben mit `fsync`

Die Kernkomponente. Alles andere in diesem Dienst existiert, um genau diese Datei aufzurufen.

**Dateien:**

- Erstellen: `legacy-inbox/src/store.js`
- Test: `legacy-inbox/src/store.test.js`

**Schnittstellen:**

- Verbraucht: `leseKonfiguration()` aus Aufgabe 1
- Erzeugt: `erstelleStore({ datenVerzeichnis })` → `{ initialisiere(), istBeschreibbar(), schreibe(umschlag, ziel) }`
  - `schreibe(umschlag, ziel)` → `Promise<{ lfdNr: number, pfad: string }>`; `ziel` ist `'posteingang'` oder `'abgewiesen'`; wirft bei Schreibfehlern

- [ ] **Schritt 1: Test schreiben**

`legacy-inbox/src/store.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir, readFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { erstelleStore } from './store.js';

let verzeichnis;
let store;

const umschlag = (zusatz = {}) => ({
	empfangen_am: '2026-07-30T09:12:33.123Z',
	quelle: { ip: '1.2.3.4', user_agent: 'test', content_type: 'application/json' },
	roh: '{"anzahl_gesamt":1}',
	abgeschnitten: false,
	payload: { anzahl_gesamt: 1 },
	validierung: { gueltig: true, fehler: {} },
	...zusatz
});

beforeEach(async () => {
	verzeichnis = await mkdtemp(path.join(tmpdir(), 'inbox-'));
	store = await erstelleStore({ datenVerzeichnis: verzeichnis });
	await store.initialisiere();
});

afterEach(async () => {
	await chmod(verzeichnis, 0o700).catch(() => {});
	await rm(verzeichnis, { recursive: true, force: true });
});

describe('erstelleStore', () => {
	it('legt die drei Verzeichnisse an', async () => {
		const inhalt = (await readdir(verzeichnis)).sort();
		expect(inhalt).toEqual(['abgewiesen', 'importiert', 'posteingang']);
	});

	it('schreibt den Umschlag vollständig und lesbar', async () => {
		const { lfdNr, pfad } = await store.schreibe(umschlag(), 'posteingang');

		expect(lfdNr).toBe(1);
		const gelesen = JSON.parse(await readFile(pfad, 'utf8'));
		expect(gelesen.payload).toEqual({ anzahl_gesamt: 1 });
		expect(gelesen.lfd_nr).toBe(1);
		expect(gelesen.roh).toBe('{"anzahl_gesamt":1}');
	});

	it('legt Ungültiges in abgewiesen/ ab', async () => {
		const { pfad } = await store.schreibe(
			umschlag({ validierung: { gueltig: false, fehler: { name: ['fehlt'] } } }),
			'abgewiesen'
		);
		expect(pfad).toContain(`${path.sep}abgewiesen${path.sep}`);
		expect(await readdir(path.join(verzeichnis, 'posteingang'))).toEqual([]);
	});

	it('hinterlässt keine .tmp-Dateien', async () => {
		await store.schreibe(umschlag(), 'posteingang');
		const dateien = await readdir(path.join(verzeichnis, 'posteingang'));
		expect(dateien.filter((d) => d.endsWith('.tmp'))).toEqual([]);
		expect(dateien).toHaveLength(1);
	});

	it('vergibt bei gleichzeitigen Schreibvorgängen eindeutige Nummern und Dateinamen', async () => {
		const ergebnisse = await Promise.all(
			Array.from({ length: 25 }, () => store.schreibe(umschlag(), 'posteingang'))
		);

		const nummern = ergebnisse.map((e) => e.lfdNr).sort((a, b) => a - b);
		expect(nummern).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));

		const dateien = await readdir(path.join(verzeichnis, 'posteingang'));
		expect(new Set(dateien).size).toBe(25);
	});

	it('setzt die Nummerierung nach einem Neustart fort', async () => {
		await store.schreibe(umschlag(), 'posteingang');
		await store.schreibe(umschlag(), 'abgewiesen');

		const neu = await erstelleStore({ datenVerzeichnis: verzeichnis });
		await neu.initialisiere();
		const { lfdNr } = await neu.schreibe(umschlag(), 'posteingang');

		expect(lfdNr).toBe(3);
	});

	it('wirft, wenn nicht geschrieben werden kann', async () => {
		await chmod(path.join(verzeichnis, 'posteingang'), 0o500);
		await expect(store.schreibe(umschlag(), 'posteingang')).rejects.toThrow();
	});

	it('meldet über istBeschreibbar, wenn das Verzeichnis gesperrt ist', async () => {
		expect(await store.istBeschreibbar()).toBe(true);
		await chmod(path.join(verzeichnis, 'posteingang'), 0o500);
		expect(await store.istBeschreibbar()).toBe(false);
	});
});
```

**Hinweis zu den beiden `chmod`-Tests:** Als `root` ausgeführt greifen Dateirechte
nicht — beide Tests würden dann fälschlich durchlaufen. Läuft der Testlauf in
einem Container als `root`, sind sie mit `it.skipIf(process.getuid?.() === 0)`
zu überspringen statt stillschweigend grün zu melden.

- [ ] **Schritt 2: Test ausführen, Fehlschlag prüfen**

Ausführen: `npx vitest run --project server legacy-inbox/src/store.test.js`
Erwartet: FAIL — `Failed to load url ./store.js`

- [ ] **Schritt 3: Implementieren**

`legacy-inbox/src/store.js`:

```js
import { open, mkdir, readdir, rename, access, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const VERZEICHNISSE = ['posteingang', 'abgewiesen', 'importiert'];

/**
 * Schreibt Umschläge atomar und dauerhaft auf die Platte.
 *
 * Kennt bewusst kein HTTP: Diese Datei ist einzeln testbar und hat genau
 * eine Aufgabe — dafür zu sorgen, dass nichts verloren geht.
 */
export async function erstelleStore({ datenVerzeichnis }) {
	let naechsteNummer = 1;
	// Serialisiert die Nummernvergabe: zwei gleichzeitige Requests dürfen
	// nie dieselbe Nummer bekommen.
	let warteschlange = Promise.resolve();

	async function initialisiere() {
		for (const unter of VERZEICHNISSE) {
			await mkdir(path.join(datenVerzeichnis, unter), { recursive: true, mode: 0o700 });
		}
		naechsteNummer = (await hoechsteVorhandeneNummer()) + 1;
	}

	/**
	 * Ermittelt die höchste vergebene Nummer aus den Dateinamen statt aus einer
	 * eigenen Zählerdatei. Eine solche Datei könnte von den Sichtungsdateien
	 * abweichen und wäre dann eine zweite Wahrheit.
	 */
	async function hoechsteVorhandeneNummer() {
		let hoechste = 0;
		for (const unter of VERZEICHNISSE) {
			const dateien = await readdir(path.join(datenVerzeichnis, unter)).catch(() => []);
			for (const datei of dateien) {
				const treffer = /^(\d+)__/.exec(datei);
				if (treffer) {
					hoechste = Math.max(hoechste, Number(treffer[1]));
				}
			}
		}
		return hoechste;
	}

	async function istBeschreibbar() {
		try {
			for (const unter of VERZEICHNISSE) {
				await access(path.join(datenVerzeichnis, unter), constants.W_OK);
			}
			return true;
		} catch {
			return false;
		}
	}

	async function schreibe(umschlag, ziel) {
		const lfdNr = await naechsteNummerHolen();
		const vollstaendig = { ...umschlag, lfd_nr: lfdNr };

		const zeitstempel = umschlag.empfangen_am.replace(/[:.]/g, '-');
		const name = `${String(lfdNr).padStart(6, '0')}__${zeitstempel}.json`;
		const pfad = path.join(datenVerzeichnis, ziel, name);
		const tmpPfad = `${pfad}.tmp`;

		const inhalt = JSON.stringify(vollstaendig, null, '\t');

		let griff;
		try {
			griff = await open(tmpPfad, 'wx', 0o600);
			await griff.writeFile(inhalt, 'utf8');
			// Erst der Dateiinhalt …
			await griff.sync();
			await griff.close();
			griff = null;

			await rename(tmpPfad, pfad);

			// … dann der Verzeichniseintrag. Ohne diesen zweiten sync kann der
			// rename einen Stromausfall nicht überleben, obwohl die Datei
			// geschrieben war — die Datei wäre nach dem Neustart verschwunden.
			const verzeichnisGriff = await open(path.join(datenVerzeichnis, ziel), 'r');
			await verzeichnisGriff.sync();
			await verzeichnisGriff.close();
		} catch (fehler) {
			if (griff) await griff.close().catch(() => {});
			await unlink(tmpPfad).catch(() => {});
			throw fehler;
		}

		return { lfdNr, pfad };
	}

	function naechsteNummerHolen() {
		const ergebnis = warteschlange.then(() => naechsteNummer++);
		warteschlange = ergebnis.then(
			() => undefined,
			() => undefined
		);
		return ergebnis;
	}

	return { initialisiere, istBeschreibbar, schreibe };
}
```

- [ ] **Schritt 4: Test ausführen, Erfolg prüfen**

Ausführen: `npx vitest run --project server legacy-inbox/src/store.test.js`
Erwartet: PASS, 8 Tests

- [ ] **Schritt 5: Committen**

```bash
git add legacy-inbox/src/store.js legacy-inbox/src/store.test.js && git commit -m "feat(api): write inbox envelopes atomically and durably"
```

---

## Aufgabe 3: `readBody.js` — Body lesen und parsen, ohne je zu verwerfen

**Dateien:**

- Erstellen: `legacy-inbox/src/readBody.js`
- Test: `legacy-inbox/src/readBody.test.js`

**Schnittstellen:**

- Erzeugt: `leseBody(req, { maxBytes })` → `Promise<{ roh: string, abgeschnitten: boolean }>`
- Erzeugt: `parseBody(roh, contentType)` → `{ payload: object|null, parseFehler: string|null }`

- [ ] **Schritt 1: Test schreiben**

`legacy-inbox/src/readBody.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import { leseBody, parseBody } from './readBody.js';

const anfrage = (text) => Readable.from([Buffer.from(text, 'utf8')]);

describe('leseBody', () => {
	it('liest den vollständigen Body', async () => {
		const { roh, abgeschnitten } = await leseBody(anfrage('{"a":1}'), { maxBytes: 1000 });
		expect(roh).toBe('{"a":1}');
		expect(abgeschnitten).toBe(false);
	});

	it('behält das Gelesene bei Überschreitung, statt es zu verwerfen', async () => {
		const lang = 'x'.repeat(500);
		const { roh, abgeschnitten } = await leseBody(anfrage(lang), { maxBytes: 100 });
		expect(abgeschnitten).toBe(true);
		expect(roh).toHaveLength(100);
	});

	it('liefert bei leerem Body einen leeren Text', async () => {
		const { roh } = await leseBody(anfrage(''), { maxBytes: 1000 });
		expect(roh).toBe('');
	});
});

describe('parseBody', () => {
	it('parst JSON', () => {
		expect(parseBody('{"anzahl_gesamt":3}', 'application/json')).toEqual({
			payload: { anzahl_gesamt: 3 },
			parseFehler: null
		});
	});

	it('parst Formulardaten', () => {
		const ergebnis = parseBody('name=Meier&anzahl_gesamt=2', 'application/x-www-form-urlencoded');
		expect(ergebnis.payload).toEqual({ name: 'Meier', anzahl_gesamt: '2' });
	});

	it('parst Formulardaten auch ohne Content-Type', () => {
		const ergebnis = parseBody('name=Meier', '');
		expect(ergebnis.payload).toEqual({ name: 'Meier' });
	});

	it('erhält Umlaute in Formulardaten', () => {
		const ergebnis = parseBody('name=J%C3%B6rg+Schn%C3%B6r', 'application/x-www-form-urlencoded');
		expect(ergebnis.payload.name).toBe('Jörg Schnör');
	});

	it('meldet einen Parse-Fehler, ohne zu werfen', () => {
		const ergebnis = parseBody('{kaputt', 'application/json');
		expect(ergebnis.payload).toBeNull();
		expect(ergebnis.parseFehler).toMatch(/JSON/i);
	});

	it('meldet einen Parse-Fehler bei leerem Body', () => {
		const ergebnis = parseBody('', 'application/json');
		expect(ergebnis.payload).toBeNull();
		expect(ergebnis.parseFehler).toBeTruthy();
	});
});
```

- [ ] **Schritt 2: Test ausführen, Fehlschlag prüfen**

Ausführen: `npx vitest run --project server legacy-inbox/src/readBody.test.js`
Erwartet: FAIL — `Failed to load url ./readBody.js`

- [ ] **Schritt 3: Implementieren**

`legacy-inbox/src/readBody.js`:

```js
/**
 * Liest den Request-Body mit harter Obergrenze.
 *
 * Die Grenze wird am Stream durchgesetzt, nicht anhand von Content-Length —
 * der Header ist eine Behauptung des Clients. Wird sie erreicht, behalten wir
 * das bereits Gelesene und markieren es als abgeschnitten; verworfen wird nie
 * etwas (siehe Entwurf, Leitsatz in Abschnitt 4).
 */
export async function leseBody(req, { maxBytes }) {
	const stuecke = [];
	let gelesen = 0;
	let abgeschnitten = false;

	for await (const stueck of req) {
		if (gelesen >= maxBytes) {
			abgeschnitten = true;
			break;
		}
		const rest = maxBytes - gelesen;
		if (stueck.length > rest) {
			stuecke.push(stueck.subarray(0, rest));
			gelesen = maxBytes;
			abgeschnitten = true;
			break;
		}
		stuecke.push(stueck);
		gelesen += stueck.length;
	}

	return { roh: Buffer.concat(stuecke).toString('utf8'), abgeschnitten };
}

/**
 * Parst nach Kräften: JSON, sonst Formulardaten.
 *
 * Wirft nie — ein Parse-Fehler ist ein Vermerk im Umschlag, keine
 * Abbruchbedingung. Die Hauptanwendung akzeptiert beide Formate ausdrücklich
 * für Mobile-Clients ohne Content-Type
 * (src/routes/rest_sichtungen/+server.ts:54).
 */
export function parseBody(roh, contentType) {
	if (roh.trim() === '') {
		return { payload: null, parseFehler: 'Leerer Request-Body.' };
	}

	const typ = (contentType || '').toLowerCase();

	if (typ.includes('application/x-www-form-urlencoded')) {
		return { payload: formularZuObjekt(roh), parseFehler: null };
	}

	try {
		const geparst = JSON.parse(roh);
		if (geparst === null || typeof geparst !== 'object' || Array.isArray(geparst)) {
			return { payload: null, parseFehler: 'JSON ist kein Objekt.' };
		}
		return { payload: geparst, parseFehler: null };
	} catch (fehler) {
		// Kein gültiges JSON — als Formulardaten versuchen, bevor aufgegeben wird.
		if (roh.includes('=')) {
			return { payload: formularZuObjekt(roh), parseFehler: null };
		}
		return { payload: null, parseFehler: `JSON konnte nicht gelesen werden: ${fehler.message}` };
	}
}

function formularZuObjekt(roh) {
	return Object.fromEntries(new URLSearchParams(roh).entries());
}
```

- [ ] **Schritt 4: Test ausführen, Erfolg prüfen**

Ausführen: `npx vitest run --project server legacy-inbox/src/readBody.test.js`
Erwartet: PASS, 9 Tests

- [ ] **Schritt 5: Committen**

```bash
git add legacy-inbox/src/readBody.js legacy-inbox/src/readBody.test.js && git commit -m "feat(api): read and parse request bodies without ever discarding them"
```

---

## Aufgabe 4: `validate.js` — Yup-Port mit den Meldungen des Vertrags

**Dateien:**

- Erstellen: `legacy-inbox/src/validate.js`
- Test: `legacy-inbox/src/validate.test.js`

**Schnittstellen:**

- Erzeugt: `validiere(payload)` → `Promise<{ gueltig: boolean, fehler: Record<string, string[]> }>`
- Erzeugt: `fehlerAntwort(fehler)` → `{ message: 'Validation failed.', errors: {...} }` — die **flache** Form

**Vorlage:** `src/lib/legacy-api/yup-validation.ts`. Die **deutschen Meldungen** werden wortgleich übernommen — sie sind Teil des Vertrags. Bei den **Regeln** gibt es zwei bewusste Abweichungen:

1. `sonstige_auffaelligkeiten` wird in **beiden** Schreibweisen akzeptiert (Entwurf, Abschnitt 2.2).
2. Der `isNaN → undefined`-Transform liegt auf **allen** Zahlenfeldern, nicht nur auf `anzahl_gesamt`, `gps_breite` und `gps_laenge` wie in der Hauptanwendung. Grund: Dieser Dienst nimmt `application/x-www-form-urlencoded` an, und dort kommt ein nicht ausgefülltes Wahlfeld als leerer String an, nicht als fehlender Schlüssel — `new URLSearchParams('vonwo=&name=Meier')` ergibt `vonwo: ""`. Mit dem engeren Transform der Hauptanwendung bekäme ein Melder ein `400`, weil er ein optionales Auswahlfeld nicht angefasst hat.

- [ ] **Schritt 1: Test schreiben**

`legacy-inbox/src/validate.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { validiere, fehlerAntwort } from './validate.js';

const gueltig = {
	sichtungsdatum: '2026-07-30 14:50',
	vorname: 'Jörg',
	name: 'Schneider',
	email: 'joerg@example.de',
	anzahl_gesamt: 1
};

describe('validiere', () => {
	it('nimmt eine vollständige Sichtung an', async () => {
		expect(await validiere(gueltig)).toEqual({ gueltig: true, fehler: {} });
	});

	it('lässt anzahl_gesamt = 0 zu (Totfund)', async () => {
		const ergebnis = await validiere({ ...gueltig, anzahl_gesamt: 0 });
		expect(ergebnis.gueltig).toBe(true);
	});

	it('meldet fehlende Pflichtfelder mit den deutschen Meldungen des Vertrags', async () => {
		const ergebnis = await validiere({});
		expect(ergebnis.gueltig).toBe(false);
		expect(ergebnis.fehler.anzahl_gesamt).toEqual(['Dieses Feld kann nicht leer gelassen werden.']);
		expect(ergebnis.fehler.email).toEqual(['Bitte geben Sie eine gültige E-Mail-Adresse ein.']);
		expect(ergebnis.fehler.sichtungsdatum).toEqual(['Bitte geben Sie ein gültiges Datum an.']);
	});

	it('weist ein Datum im falschen Format ab', async () => {
		const ergebnis = await validiere({ ...gueltig, sichtungsdatum: '30.07.2026 14:50' });
		expect(ergebnis.fehler.sichtungsdatum).toEqual(['Bitte geben Sie ein gültiges Datum an.']);
	});

	it('prüft die Koordinatengrenzen', async () => {
		const ergebnis = await validiere({ ...gueltig, gps_breite: 95 });
		expect(ergebnis.fehler.gps_breite).toEqual([
			'Der Breitengrad muss zwischen -90 und 90 liegen.'
		]);
	});

	it('nimmt sonstige_auffaelligkeiten in der Schreibweise des Vertrags an', async () => {
		const ergebnis = await validiere({ ...gueltig, sonstige_auffaelligkeiten: 'Sehr ruhig' });
		expect(ergebnis.gueltig).toBe(true);
	});

	it('nimmt auch die Umlaut-Schreibweise der Hauptanwendung an', async () => {
		const ergebnis = await validiere({ ...gueltig, sonstige_auffälligkeiten: 'Sehr ruhig' });
		expect(ergebnis.gueltig).toBe(true);
	});

	it('lässt unbekannte Felder durchgehen, ohne sie zu bemängeln', async () => {
		const ergebnis = await validiere({ ...gueltig, voellig_neues_feld: 'wert' });
		expect(ergebnis.gueltig).toBe(true);
	});
});

describe('fehlerAntwort', () => {
	it('erzeugt die flache Form aus dem PDF', () => {
		expect(
			fehlerAntwort({ anzahl_gesamt: ['Dieses Feld kann nicht leer gelassen werden.'] })
		).toEqual({
			message: 'Validation failed.',
			errors: { anzahl_gesamt: ['Dieses Feld kann nicht leer gelassen werden.'] }
		});
	});
});
```

- [ ] **Schritt 2: Test ausführen, Fehlschlag prüfen**

Ausführen: `npx vitest run --project server legacy-inbox/src/validate.test.js`
Erwartet: FAIL — `Failed to load url ./validate.js`

- [ ] **Schritt 3: Implementieren**

`legacy-inbox/src/validate.js`:

```js
import * as yup from 'yup';

const zahl = () => yup.number().transform((wert) => (isNaN(wert) ? undefined : wert));
const text = () => yup.string().nullable().optional();

/**
 * Portiert aus src/lib/legacy-api/yup-validation.ts. Die deutschen Meldungen
 * sind Teil des Vertrags und wortgleich übernommen.
 */
export const legacySchema = yup.object().shape({
	sichtungsdatum: yup
		.string()
		.required('Bitte geben Sie ein gültiges Datum an.')
		.matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, 'Bitte geben Sie ein gültiges Datum an.'),
	vorname: yup
		.string()
		.required('Der Vorname darf nicht länger als 64 Zeichen sein.')
		.max(64, 'Der Vorname darf nicht länger als 64 Zeichen sein.'),
	name: yup
		.string()
		.required('Der Name darf nicht länger als 64 Zeichen sein.')
		.max(64, 'Der Name darf nicht länger als 64 Zeichen sein.'),
	email: yup
		.string()
		.required('Bitte geben Sie eine gültige E-Mail-Adresse ein.')
		.email('Bitte geben Sie eine gültige E-Mail-Adresse ein.')
		.max(64, 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'),
	anzahl_gesamt: zahl()
		.required('Dieses Feld kann nicht leer gelassen werden.')
		.min(0, 'Dieses Feld kann nicht leer gelassen werden.')
		.integer('Dieses Feld kann nicht leer gelassen werden.'),

	gps_breite: zahl()
		.min(-90, 'Der Breitengrad muss zwischen -90 und 90 liegen.')
		.max(90, 'Der Breitengrad muss zwischen -90 und 90 liegen.')
		.nullable()
		.optional(),
	gps_laenge: zahl()
		.min(-180, 'Der Längengrad muss zwischen -180 und 180 liegen.')
		.max(180, 'Der Längengrad muss zwischen -180 und 180 liegen.')
		.nullable()
		.optional(),

	anzahl_jung: zahl().nullable().optional(),
	fahrwasser: text(),
	seezeichen: text(),
	vonwo: zahl().nullable().optional(),
	vonwo_text: text(),
	entfernung: zahl().nullable().optional(),
	anzahl_schiffe: zahl().nullable().optional(),
	verteilung: zahl().nullable().optional(),
	verteilung_text: text(),
	aufnahme: text(),
	aufnahmeHochladen: zahl().nullable().optional(),
	verhalten: zahl().nullable().optional(),
	verhalten_text: text(),
	reaktion: text(),

	// Beide Schreibweisen: Der Vertrag schreibt "ae", die Hauptanwendung
	// benutzt den Umlaut (Entwurf, Abschnitt 2.2). Wer sich an eine von beiden
	// hält, soll nicht abgewiesen werden.
	sonstige_auffaelligkeiten: text(),
	sonstige_auffälligkeiten: text(),

	seegang: zahl().nullable().optional(),
	windrichtung: text(),
	windstaerke: text(),
	sichtweite: zahl().nullable().optional(),
	schiffsname: text(),
	heimathafen: text(),
	bootstyp: text(),
	bootsantrieb: zahl().nullable().optional(),
	bootsantrieb_text: text(),
	strasse: text(),
	plz: text(),
	ort: text(),
	telefon: text(),
	fax: text(),
	namensnennung: zahl().nullable().optional(),
	schiffnamensnennung: zahl().nullable().optional(),
	bemerkungen: text(),
	eingangskanal: zahl().nullable().optional(),
	tierart: zahl().nullable().optional(),
	totfund: zahl().nullable().optional(),
	totfund_zustand: zahl().nullable().optional(),
	totfund_geschlecht: zahl().nullable().optional(),
	totfund_groesse: zahl().nullable().optional(),
	totfund_telefon: zahl().nullable().optional()
});

export async function validiere(payload) {
	try {
		// stripUnknown bleibt aus: Unbekannte Felder werden weder bemängelt
		// noch entfernt — gespeichert wird ohnehin der rohe Payload.
		await legacySchema.validate(payload ?? {}, { abortEarly: false });
		return { gueltig: true, fehler: {} };
	} catch (fehler) {
		if (fehler instanceof yup.ValidationError) {
			const gesammelt = {};
			for (const einzeln of fehler.inner) {
				if (!einzeln.path) continue;
				gesammelt[einzeln.path] ??= [];
				gesammelt[einzeln.path].push(einzeln.message);
			}
			return { gueltig: false, fehler: gesammelt };
		}
		return {
			gueltig: false,
			fehler: { _general: ['Ein unbekannter Validierungsfehler ist aufgetreten.'] }
		};
	}
}

/**
 * Die flache Fehlerform aus dem Original-PDF. NICHT die geschachtelte Form
 * aus src/lib/legacy-api/error-messages.ts — siehe Entwurf, Abschnitt 2.1.
 */
export function fehlerAntwort(fehler) {
	return { message: 'Validation failed.', errors: fehler };
}
```

- [ ] **Schritt 4: Test ausführen, Erfolg prüfen**

Ausführen: `npx vitest run --project server legacy-inbox/src/validate.test.js`
Erwartet: PASS, 9 Tests

- [ ] **Schritt 5: Committen**

```bash
git add legacy-inbox/src/validate.js legacy-inbox/src/validate.test.js && git commit -m "feat(api): port legacy validation with the contract's flat error shape"
```

---

## Aufgabe 5: `POST /rest_sichtungen` — der Leitsatz in Code

Die wichtigste Aufgabe des Plans. Hier entscheidet sich, ob der Dienst hält, was er verspricht.

**Dateien:**

- Erstellen: `legacy-inbox/src/routes/createSighting.js`
- Ändern: `legacy-inbox/src/server.js` (Route eintragen)
- Test: `legacy-inbox/src/routes/createSighting.test.js`

**Schnittstellen:**

- Verbraucht: `leseBody`, `parseBody` (Aufgabe 3), `validiere`, `fehlerAntwort` (Aufgabe 4), `store.schreibe` (Aufgabe 2), `antworteJson` (Aufgabe 1)
- Erzeugt: `createSighting(req, res, { konfiguration, store, rateLimit })`

- [ ] **Schritt 1: Test schreiben — beginnend mit dem wichtigsten Fall**

`legacy-inbox/src/routes/createSighting.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { erstelleStore } from '../store.js';
import { erstelleServer } from '../server.js';
import { erstelleRateLimit } from '../rateLimit.js';

let verzeichnis;
let server;
let basis;

const gueltig = {
	sichtungsdatum: '2026-07-30 14:50',
	vorname: 'Jörg',
	name: 'Schneider',
	email: 'joerg@example.de',
	anzahl_gesamt: 1
};

const dateienIn = async (unter) => readdir(path.join(verzeichnis, unter)).catch(() => []);

const einzigeDateiIn = async (unter) => {
	const dateien = await dateienIn(unter);
	expect(dateien).toHaveLength(1);
	return JSON.parse(await readFile(path.join(verzeichnis, unter, dateien[0]), 'utf8'));
};

beforeEach(async () => {
	verzeichnis = await mkdtemp(path.join(tmpdir(), 'inbox-'));
	const store = await erstelleStore({ datenVerzeichnis: verzeichnis });
	await store.initialisiere();

	server = erstelleServer({
		konfiguration: { maxBodyBytes: 262144 },
		store,
		rateLimit: erstelleRateLimit({ proIpProStunde: 100, globalProStunde: 1000 })
	});
	await new Promise((fertig) => server.listen(0, fertig));
	basis = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
	await new Promise((fertig) => server.close(fertig));
	await rm(verzeichnis, { recursive: true, force: true });
});

const sende = (koerper, kopfzeilen = { 'Content-Type': 'application/json' }) =>
	fetch(`${basis}/rest_sichtungen`, { method: 'POST', headers: kopfzeilen, body: koerper });

describe('POST /rest_sichtungen — der Leitsatz', () => {
	it('hinterlässt auch bei vollständigem Unsinn eine Datei', async () => {
		const antwort = await sende('das ist überhaupt kein gültiger Request');

		expect(antwort.status).toBe(400);
		const umschlag = await einzigeDateiIn('abgewiesen');
		expect(umschlag.roh).toBe('das ist überhaupt kein gültiger Request');
		expect(umschlag.validierung.gueltig).toBe(false);
	});

	it('hinterlässt bei kaputtem JSON eine Datei mit dem Rohtext', async () => {
		await sende('{"anzahl_gesamt": 1, kaputt');
		const umschlag = await einzigeDateiIn('abgewiesen');
		expect(umschlag.roh).toBe('{"anzahl_gesamt": 1, kaputt');
		expect(umschlag.payload).toBeNull();
	});

	it('hinterlässt bei leerem Body eine Datei', async () => {
		const antwort = await sende('');
		expect(antwort.status).toBe(400);
		expect(await dateienIn('abgewiesen')).toHaveLength(1);
	});
});

describe('POST /rest_sichtungen — Vertrag', () => {
	it('antwortet 201 mit Location und Saved', async () => {
		const antwort = await sende(JSON.stringify(gueltig));

		expect(antwort.status).toBe(201);
		expect(antwort.headers.get('location')).toBe('/rest_sichtungen/view/1.json');
		expect(await antwort.json()).toEqual({ message: 'Saved' });
	});

	it('legt Gültiges in posteingang/ und den Payload unverändert ab', async () => {
		await sende(JSON.stringify({ ...gueltig, voellig_neues_feld: 'bleibt erhalten' }));

		const umschlag = await einzigeDateiIn('posteingang');
		expect(umschlag.payload.voellig_neues_feld).toBe('bleibt erhalten');
		expect(umschlag.payload.vorname).toBe('Jörg');
		expect(umschlag.validierung.gueltig).toBe(true);
		expect(umschlag.quelle.content_type).toBe('application/json');
		expect(umschlag.empfangen_am).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it('antwortet bei ungültigen Daten mit der flachen Fehlerform', async () => {
		const antwort = await sende(JSON.stringify({ vorname: 'Jörg' }));

		expect(antwort.status).toBe(400);
		const koerper = await antwort.json();
		expect(koerper.message).toBe('Validation failed.');
		expect(koerper.errors.anzahl_gesamt).toEqual(['Dieses Feld kann nicht leer gelassen werden.']);
	});

	it('nimmt Formulardaten ohne Content-Type an', async () => {
		const formular = new URLSearchParams({ ...gueltig, anzahl_gesamt: '1' }).toString();
		const antwort = await sende(formular, {});

		expect(antwort.status).toBe(201);
		const umschlag = await einzigeDateiIn('posteingang');
		expect(umschlag.payload.name).toBe('Schneider');
	});

	it('erhält Umlaute über Formularkodierung', async () => {
		const formular = new URLSearchParams({ ...gueltig, vorname: 'Jörg' }).toString();
		await sende(formular, { 'Content-Type': 'application/x-www-form-urlencoded' });

		const umschlag = await einzigeDateiIn('posteingang');
		expect(umschlag.payload.vorname).toBe('Jörg');
	});

	it('markiert überlange Bodys als abgeschnitten, statt sie zu verwerfen', async () => {
		await new Promise((fertig) => server.close(fertig));
		const store = await erstelleStore({ datenVerzeichnis: verzeichnis });
		await store.initialisiere();
		server = erstelleServer({
			konfiguration: { maxBodyBytes: 100 },
			store,
			rateLimit: erstelleRateLimit({ proIpProStunde: 100, globalProStunde: 1000 })
		});
		await new Promise((fertig) => server.listen(0, fertig));
		basis = `http://127.0.0.1:${server.address().port}`;

		await sende(JSON.stringify({ ...gueltig, bemerkungen: 'x'.repeat(500) }));

		const umschlag = await einzigeDateiIn('abgewiesen');
		expect(umschlag.abgeschnitten).toBe(true);
		expect(umschlag.roh).toHaveLength(100);
	});

	it('antwortet 500 statt 201, wenn nicht geschrieben werden kann', async () => {
		await new Promise((fertig) => server.close(fertig));
		server = erstelleServer({
			konfiguration: { maxBodyBytes: 262144 },
			store: {
				istBeschreibbar: async () => false,
				schreibe: async () => {
					throw new Error('ENOSPC: no space left on device');
				}
			},
			rateLimit: erstelleRateLimit({ proIpProStunde: 100, globalProStunde: 1000 })
		});
		await new Promise((fertig) => server.listen(0, fertig));
		basis = `http://127.0.0.1:${server.address().port}`;

		const antwort = await sende(JSON.stringify(gueltig));
		expect(antwort.status).toBe(500);
	});
});
```

- [ ] **Schritt 2: Test ausführen, Fehlschlag prüfen**

Ausführen: `npx vitest run --project server legacy-inbox/src/routes/createSighting.test.js`
Erwartet: FAIL — `Failed to load url ../rateLimit.js` (Aufgabe 6 fehlt noch)

- [ ] **Schritt 3: Vorläufiges `rateLimit.js` anlegen, damit die Route testbar ist**

`legacy-inbox/src/rateLimit.js`:

```js
/**
 * Vorläufig durchlässig — die Zähler folgen in Aufgabe 6.
 */
export function erstelleRateLimit() {
	return { pruefeIp: () => true, pruefeGlobal: () => true };
}
```

- [ ] **Schritt 4: Route implementieren**

`legacy-inbox/src/routes/createSighting.js`:

```js
import { leseBody, parseBody } from '../readBody.js';
import { validiere, fehlerAntwort } from '../validate.js';
import { antworteJson } from '../respond.js';

/**
 * POST /rest_sichtungen
 *
 * Reihenfolge ist die Zusage dieses Dienstes: lesen, parsen, validieren,
 * SCHREIBEN, antworten. Die Validierung bestimmt nur Antwort und
 * Zielverzeichnis — nie, ob geschrieben wird (Entwurf, Abschnitt 4).
 */
export async function createSighting(req, res, { konfiguration, store, rateLimit }) {
	const ip = ermittleIp(req);

	// Die einzige Regel, die ohne Schreiben abweist: Sie schützt nicht vor
	// Missbrauch, sondern davor, dass eine Flut die Platte füllt und damit
	// alle nachfolgenden Sichtungen unschreibbar macht.
	if (!rateLimit.pruefeGlobal()) {
		antworteJson(res, 429, { error: 'TooManyRequests', message: 'Too many requests' });
		return;
	}

	const { roh, abgeschnitten } = await leseBody(req, { maxBytes: konfiguration.maxBodyBytes });
	const contentType = req.headers['content-type'] || '';
	const { payload, parseFehler } = parseBody(roh, contentType);

	const validierung = payload
		? await validiere(payload)
		: {
				gueltig: false,
				fehler: { _general: [parseFehler ?? 'Body konnte nicht gelesen werden.'] }
			};

	const umschlag = {
		empfangen_am: new Date().toISOString(),
		quelle: {
			ip,
			user_agent: req.headers['user-agent'] || '',
			content_type: contentType
		},
		roh,
		abgeschnitten,
		payload,
		validierung
	};

	// Ab hier gibt es keinen Weg mehr, der die Daten fallen lässt.
	let geschrieben;
	try {
		geschrieben = await store.schreibe(
			umschlag,
			validierung.gueltig && !abgeschnitten ? 'posteingang' : 'abgewiesen'
		);
	} catch (fehler) {
		console.error('Schreiben fehlgeschlagen', fehler);
		antworteJson(res, 500, {
			error: 'Failed to save sighting',
			message: 'Internal server error occurred'
		});
		return;
	}

	// Das Rate-Limit pro IP weist erst hier ab — der Request ist bereits
	// sicher abgelegt. Mobilfunkanbieter setzen CGNAT ein; ein 429 an eine
	// echte Meldewelle wäre derselbe stille Verlust wie ein falsches 400.
	if (!rateLimit.pruefeIp(ip)) {
		antworteJson(res, 429, { error: 'TooManyRequests', message: 'Too many requests' });
		return;
	}

	if (!validierung.gueltig) {
		antworteJson(res, 400, fehlerAntwort(validierung.fehler));
		return;
	}

	antworteJson(
		res,
		201,
		{ message: 'Saved' },
		{ Location: `/rest_sichtungen/view/${geschrieben.lfdNr}.json` }
	);
}

/**
 * Ermittelt die Absender-IP.
 *
 * X-Forwarded-For wird NICHT verwendet: Die Kopfzeile kommt vom Client. Hängt
 * der Proxy den echten Wert nur an, statt zu ersetzen, genügt ein zufälliges
 * X-Forwarded-For je Request, um das Rate-Limit pro IP auszuhebeln — jeder
 * Request zählte dann als neue IP.
 *
 * Stattdessen X-Real-IP, das nginx setzt und das ein Client nicht durchreichen
 * kann (Plesk-Direktive siehe README), sonst die Adresse der Verbindung selbst.
 */
function ermittleIp(req) {
	const vomProxy = req.headers['x-real-ip'];
	if (typeof vomProxy === 'string' && vomProxy.length > 0) {
		return vomProxy.trim();
	}
	return req.socket.remoteAddress || '';
}
```

- [ ] **Schritt 5: Route im Router eintragen**

In `legacy-inbox/src/server.js` den Import ergänzen und den Eintrag füllen:

```js
import { createSighting } from './routes/createSighting.js';
```

```js
	{ pfad: '/rest_sichtungen', methode: 'POST', behandeln: createSighting },
```

- [ ] **Schritt 6: Test ausführen, Erfolg prüfen**

Ausführen: `npx vitest run --project server legacy-inbox/src/routes/createSighting.test.js`
Erwartet: PASS, 10 Tests

- [ ] **Schritt 7: Committen**

```bash
git add legacy-inbox/src/routes/createSighting.js legacy-inbox/src/routes/createSighting.test.js legacy-inbox/src/rateLimit.js legacy-inbox/src/server.js && git commit -m "feat(api): accept sightings and persist every request before answering"
```

---

## Aufgabe 6: Rate-Limit, Betriebsbereitschaft und Rauchtest

Diese Aufgabe schließt den Dienst ab: die zwei Rate-Limits mit ihren unterschiedlichen Rollen (Schritte 1–6), danach Plattenplatz-Prüfung, Protokollierung und ein Rauchtest, der `app.js` wirklich startet (Schritte 7–8). Die Schritte 7 und 8 gehören hierher, weil `app.js` erst mit dem fertigen Rate-Limit lauffähig ist.

**Dateien:**

- Ändern: `legacy-inbox/src/rateLimit.js`
- Test: `legacy-inbox/src/rateLimit.test.js`

**Schnittstellen:**

- Erzeugt: `erstelleRateLimit({ proIpProStunde, globalProStunde, jetzt? })` → `{ pruefeIp(ip), pruefeGlobal() }`, beide `boolean` (`true` = erlaubt)
- `jetzt` ist eine Funktion, die Millisekunden liefert — nur für Tests, Vorgabe `Date.now`

- [ ] **Schritt 1: Test schreiben**

`legacy-inbox/src/rateLimit.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { erstelleRateLimit } from './rateLimit.js';

describe('erstelleRateLimit', () => {
	it('erlaubt bis zur Grenze und weist danach ab', () => {
		const limit = erstelleRateLimit({ proIpProStunde: 3, globalProStunde: 100 });

		expect(limit.pruefeIp('1.2.3.4')).toBe(true);
		expect(limit.pruefeIp('1.2.3.4')).toBe(true);
		expect(limit.pruefeIp('1.2.3.4')).toBe(true);
		expect(limit.pruefeIp('1.2.3.4')).toBe(false);
	});

	it('zählt je IP getrennt', () => {
		const limit = erstelleRateLimit({ proIpProStunde: 1, globalProStunde: 100 });

		expect(limit.pruefeIp('1.1.1.1')).toBe(true);
		expect(limit.pruefeIp('2.2.2.2')).toBe(true);
		expect(limit.pruefeIp('1.1.1.1')).toBe(false);
	});

	it('lässt nach Ablauf der Stunde wieder zu', () => {
		let zeit = 0;
		const limit = erstelleRateLimit({
			proIpProStunde: 1,
			globalProStunde: 100,
			jetzt: () => zeit
		});

		expect(limit.pruefeIp('1.1.1.1')).toBe(true);
		expect(limit.pruefeIp('1.1.1.1')).toBe(false);

		zeit = 3_600_001;
		expect(limit.pruefeIp('1.1.1.1')).toBe(true);
	});

	it('zählt global über alle IPs', () => {
		const limit = erstelleRateLimit({ proIpProStunde: 100, globalProStunde: 2 });

		expect(limit.pruefeGlobal()).toBe(true);
		expect(limit.pruefeGlobal()).toBe(true);
		expect(limit.pruefeGlobal()).toBe(false);
	});

	it('lässt den Speicher nicht unbegrenzt wachsen', () => {
		let zeit = 0;
		const limit = erstelleRateLimit({
			proIpProStunde: 5,
			globalProStunde: 100000,
			jetzt: () => zeit
		});

		for (let i = 0; i < 5000; i++) {
			limit.pruefeIp(`10.0.${Math.floor(i / 256)}.${i % 256}`);
		}
		zeit = 3_600_001;
		limit.pruefeIp('1.1.1.1');

		expect(limit.anzahlBeobachteterIps()).toBeLessThan(10);
	});
});
```

- [ ] **Schritt 2: Test ausführen, Fehlschlag prüfen**

Ausführen: `npx vitest run --project server legacy-inbox/src/rateLimit.test.js`
Erwartet: FAIL — `limit.pruefeIp is not a function` bzw. `anzahlBeobachteterIps is not a function`

- [ ] **Schritt 3: Implementieren**

`legacy-inbox/src/rateLimit.js` ersetzen:

```js
const STUNDE_MS = 3_600_000;

/**
 * Gleitende Stundenfenster, im Speicher gehalten.
 *
 * Die beiden Prüfungen haben unterschiedliche Rollen (Entwurf, Abschnitt 6):
 * pruefeIp() begrenzt die Antwort, nachdem geschrieben wurde; pruefeGlobal()
 * ist die einzige Regel, die vor dem Schreiben abweisen darf.
 */
export function erstelleRateLimit({ proIpProStunde, globalProStunde, jetzt = Date.now }) {
	const proIp = new Map();
	let globalZeitstempel = [];

	function beschneide(zeitstempel, grenze) {
		return zeitstempel.filter((t) => t > grenze);
	}

	function pruefeIp(ip) {
		const grenze = jetzt() - STUNDE_MS;

		// Aufräumen bei jedem Aufruf: Ohne das wächst die Map mit jeder je
		// gesehenen IP weiter — bei CGNAT und Streuverkehr sind das viele.
		for (const [bekannteIp, zeitstempel] of proIp) {
			const uebrig = beschneide(zeitstempel, grenze);
			if (uebrig.length === 0) proIp.delete(bekannteIp);
			else proIp.set(bekannteIp, uebrig);
		}

		const eigene = proIp.get(ip) ?? [];
		if (eigene.length >= proIpProStunde) return false;

		eigene.push(jetzt());
		proIp.set(ip, eigene);
		return true;
	}

	function pruefeGlobal() {
		const grenze = jetzt() - STUNDE_MS;
		globalZeitstempel = beschneide(globalZeitstempel, grenze);

		if (globalZeitstempel.length >= globalProStunde) return false;

		globalZeitstempel.push(jetzt());
		return true;
	}

	return { pruefeIp, pruefeGlobal, anzahlBeobachteterIps: () => proIp.size };
}
```

- [ ] **Schritt 4: Test ausführen, Erfolg prüfen**

Ausführen: `npx vitest run --project server legacy-inbox/src/rateLimit.test.js`
Erwartet: PASS, 5 Tests

- [ ] **Schritt 5: Test ergänzen, der beide Rollen im Zusammenspiel prüft**

An `legacy-inbox/src/routes/createSighting.test.js` anhängen:

```js
describe('POST /rest_sichtungen — Rate-Limit', () => {
	it('schreibt trotz 429 pro IP', async () => {
		await new Promise((fertig) => server.close(fertig));
		const store = await erstelleStore({ datenVerzeichnis: verzeichnis });
		await store.initialisiere();
		server = erstelleServer({
			konfiguration: { maxBodyBytes: 262144 },
			store,
			rateLimit: erstelleRateLimit({ proIpProStunde: 1, globalProStunde: 1000 })
		});
		await new Promise((fertig) => server.listen(0, fertig));
		basis = `http://127.0.0.1:${server.address().port}`;

		expect((await sende(JSON.stringify(gueltig))).status).toBe(201);
		expect((await sende(JSON.stringify(gueltig))).status).toBe(429);

		expect(await dateienIn('posteingang')).toHaveLength(2);
	});

	it('schreibt bei der globalen Reißleine bewusst NICHT', async () => {
		await new Promise((fertig) => server.close(fertig));
		const store = await erstelleStore({ datenVerzeichnis: verzeichnis });
		await store.initialisiere();
		server = erstelleServer({
			konfiguration: { maxBodyBytes: 262144 },
			store,
			rateLimit: erstelleRateLimit({ proIpProStunde: 100, globalProStunde: 1 })
		});
		await new Promise((fertig) => server.listen(0, fertig));
		basis = `http://127.0.0.1:${server.address().port}`;

		expect((await sende(JSON.stringify(gueltig))).status).toBe(201);
		expect((await sende(JSON.stringify(gueltig))).status).toBe(429);

		expect(await dateienIn('posteingang')).toHaveLength(1);
	});
});
```

- [ ] **Schritt 6: Test ausführen, Erfolg prüfen**

Ausführen: `npx vitest run --project server legacy-inbox/src/routes/createSighting.test.js`
Erwartet: PASS, 12 Tests

- [ ] **Schritt 7: Plattenplatz-Prüfung und Protokollierung ergänzen**

Der Entwurf (Abschnitt 11) verlangt eine Prüfung des freien Platzes beim Start. Ohne sie fällt eine volle Platte erst beim ersten fehlgeschlagenen Schreibvorgang auf — also an einer echten Sichtung.

`legacy-inbox/src/logger.js`:

```js
/**
 * Zeilenweises JSON auf stdout. Passenger schreibt das in die Logdatei der
 * Domain; damit ist es ohne weitere Infrastruktur auswertbar.
 *
 * Nie den Payload protokollieren — er enthält Namen, E-Mail-Adressen und
 * Anschriften. Ins Protokoll gehören Kennzahlen, nicht Inhalte.
 */
export function protokolliere(stufe, ereignis, felder = {}) {
	process.stdout.write(
		JSON.stringify({ zeit: new Date().toISOString(), stufe, ereignis, ...felder }) + '\n'
	);
}
```

In `legacy-inbox/src/store.js` die Platzprüfung ergänzen — Import und Funktion:

```js
import { statfs } from 'node:fs/promises';
```

```js
/**
 * Freier Platz in Bytes. Wird beim Start geprüft und von /health
 * mitgeliefert, damit die Überwachung Vorlauf hat statt erst zu merken,
 * dass nichts mehr geht.
 */
async function freierPlatzBytes() {
	const werte = await statfs(datenVerzeichnis);
	return werte.bavail * werte.bsize;
}
```

`freierPlatzBytes` in das zurückgegebene Objekt aufnehmen:

```js
return { initialisiere, istBeschreibbar, schreibe, freierPlatzBytes };
```

In `legacy-inbox/src/routes/health.js` mitliefern:

```js
const freiMB = Math.round((await store.freierPlatzBytes()) / (1024 * 1024));

antworteJson(res, 200, {
	status: 'ok',
	datenverzeichnis: 'beschreibbar',
	frei_mb: freiMB
});
```

Der bestehende Test in `server.test.js` muss dafür `freierPlatzBytes: async () => 5_000_000_000` in beiden Store-Attrappen ergänzen und die Erwartung auf `{ status: 'ok', datenverzeichnis: 'beschreibbar', frei_mb: 4768 }` anpassen.

In `legacy-inbox/app.js` nach `store.initialisiere()` einfügen:

```js
const freiMB = Math.round((await store.freierPlatzBytes()) / (1024 * 1024));
if (freiMB < 500) {
	console.error(`Nur noch ${freiMB} MB frei — der Posteingang startet nicht.`);
	process.exit(1);
}
```

In `legacy-inbox/src/routes/createSighting.js` die beiden `console.error` und den Erfolgsfall auf den Protokollierer umstellen:

```js
import { protokolliere } from '../logger.js';
```

```js
protokolliere('fehler', 'schreiben_fehlgeschlagen', { meldung: fehler.message });
```

```js
protokolliere('info', 'sichtung_abgelegt', {
	lfd_nr: geschrieben.lfdNr,
	gueltig: validierung.gueltig,
	abgeschnitten,
	felder_mit_fehler: Object.keys(validierung.fehler)
});
```

`felder_mit_fehler` ist der Schlüssel für die Überwachung aus Abschnitt 11: Häufen sich dort immer dieselben Feldnamen, liegen Validierer und reale App auseinander — genau das Frühwarnsignal für stillen Datenverlust.

- [ ] **Schritt 8: Rauchtest für den Einstiegspunkt**

`app.js` wird von keinem anderen Test ausgeführt. Ein Tippfehler dort fiele sonst erst auf dem Server auf.

`legacy-inbox/app.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const WURZEL = path.dirname(fileURLToPath(import.meta.url));

function starte(umgebung) {
	return new Promise((fertig) => {
		const prozess = spawn(process.execPath, [path.join(WURZEL, 'app.js')], {
			env: { ...process.env, ...umgebung }
		});
		let ausgabe = '';
		prozess.stdout.on('data', (d) => {
			ausgabe += d;
			if (ausgabe.includes('lauscht auf Port')) {
				prozess.kill();
				fertig({ ausgabe, code: 0 });
			}
		});
		prozess.stderr.on('data', (d) => (ausgabe += d));
		prozess.on('exit', (code) => fertig({ ausgabe, code }));
	});
}

describe('app.js', () => {
	it('startet und meldet Port und Datenverzeichnis', async () => {
		const verzeichnis = await mkdtemp(path.join(tmpdir(), 'inbox-app-'));
		const { ausgabe } = await starte({ LEGACY_INBOX_DATA_DIR: verzeichnis, PORT: '0' });

		expect(ausgabe).toContain('lauscht auf Port');
		expect(ausgabe).toContain(verzeichnis);

		await rm(verzeichnis, { recursive: true, force: true });
	});

	it('bricht ohne LEGACY_INBOX_DATA_DIR mit klarer Meldung ab', async () => {
		const { ausgabe, code } = await starte({ LEGACY_INBOX_DATA_DIR: '' });

		expect(code).not.toBe(0);
		expect(ausgabe).toContain('LEGACY_INBOX_DATA_DIR');
	});
});
```

- [ ] **Schritt 9: Alle Tests des Dienstes ausführen**

Ausführen: `npx vitest run --project server legacy-inbox/`
Erwartet: PASS — alle bisherigen Tests plus die zwei Rauchtests

- [ ] **Schritt 10: Committen**

```bash
git add legacy-inbox/ && git commit -m "feat(api): add disk-space guard, structured logging and a boot smoke test"
```

---

## Aufgabe 7: `antworten.json` einfrieren und gegen Abdriften sichern

**Dateien:**

- Erstellen: `src/tools/generate-antworten-json.js` (Hauptrepo)
- Erstellen: `legacy-inbox/data/antworten.de.json`, `legacy-inbox/data/antworten.en.json`
- Erstellen: `legacy-inbox/src/routes/antworten.js`
- Ändern: `legacy-inbox/src/server.js`
- Test: `src/routes/rest_sichtungen/antworten.json/frozen.test.ts` (Hauptrepo), `legacy-inbox/src/routes/antworten.test.js`

**Schnittstellen:**

- Erzeugt: `antworten(req, res)` — liest die eingefrorene Datei passend zum Pfad
- Erzeugt: `npm run generate:antworten` im Wurzel-`package.json`

- [ ] **Schritt 1: Erzeuger-Skript schreiben**

`src/tools/generate-antworten-json.js`:

```js
/**
 * Erzeugt die eingefrorenen antworten.json-Dateien für den Legacy-Posteingang.
 *
 * Der Posteingang schreibt die vierzehn formOptions-Enums nicht ab, sondern
 * bekommt das Ergebnis einmal erzeugt. Der Drift-Test in
 * src/routes/rest_sichtungen/antworten.json/frozen.test.ts hält beide
 * Fassungen zusammen.
 *
 * Aufruf: npm run generate:antworten
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GET } from '../routes/rest_sichtungen/antworten.json/+server.js';

const ZIEL = path.resolve('legacy-inbox/data');

async function hole(pfad) {
	const antwort = await GET({
		url: new URL(`https://localhost${pfad}`),
		getClientAddress: () => '127.0.0.1',
		request: new Request(`https://localhost${pfad}`)
	});
	return antwort.json();
}

const de = await hole('/rest_sichtungen/antworten.json');
const en = await hole('/en/rest_sichtungen/antworten.json');

await writeFile(path.join(ZIEL, 'antworten.de.json'), JSON.stringify(de, null, '\t') + '\n');
await writeFile(path.join(ZIEL, 'antworten.en.json'), JSON.stringify(en, null, '\t') + '\n');

console.log('antworten.de.json und antworten.en.json neu erzeugt.');
```

Skript im Wurzel-`package.json` unter `scripts` eintragen:

```json
		"generate:antworten": "vite-node src/tools/generate-antworten-json.js",
```

- [ ] **Schritt 2: Erzeuger ausführen**

Ausführen: `npm run generate:antworten`
Erwartet: `antworten.de.json und antworten.en.json neu erzeugt.` — danach liegen beide Dateien in `legacy-inbox/data/`.

Prüfen, dass die Enum-Erweiterungen enthalten sind:

Ausführen: `node -e "const a=require('./legacy-inbox/data/antworten.de.json'); console.log(a.bootsantrieb['5'], '|', a.vonwo['5'], '|', a.verteilung['4'])"`
Erwartet: `Kein Boot | Keine Angabe | Keine Angabe`

- [ ] **Schritt 3: Drift-Test im Hauptrepo schreiben**

`src/routes/rest_sichtungen/antworten.json/frozen.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { GET } from './+server';

/**
 * Hält die eingefrorenen Dateien des Legacy-Posteingangs mit dieser Route
 * zusammen. Wird hier ein Label geändert, muss `npm run generate:antworten`
 * laufen — sonst liefern App und Posteingang unterschiedliche Enum-Tabellen.
 */
async function routeAntwort(pfad: string) {
	const antwort = await GET({
		url: new URL(`https://localhost${pfad}`),
		getClientAddress: () => '127.0.0.1',
		request: new Request(`https://localhost${pfad}`)
	} as never);
	return antwort.json();
}

async function eingefroren(datei: string) {
	const inhalt = await readFile(path.resolve('legacy-inbox/data', datei), 'utf8');
	return JSON.parse(inhalt);
}

describe('eingefrorene antworten.json', () => {
	it('stimmt mit der deutschen Route überein', async () => {
		expect(await eingefroren('antworten.de.json')).toEqual(
			await routeAntwort('/rest_sichtungen/antworten.json')
		);
	});

	it('stimmt mit der englischen Route überein', async () => {
		expect(await eingefroren('antworten.en.json')).toEqual(
			await routeAntwort('/en/rest_sichtungen/antworten.json')
		);
	});
});
```

- [ ] **Schritt 4: Drift-Test ausführen, Erfolg prüfen**

Ausführen: `npx vitest run --project server src/routes/rest_sichtungen/antworten.json/frozen.test.ts`
Erwartet: PASS, 2 Tests

Gegenprobe, dass der Test wirklich greift: In `legacy-inbox/data/antworten.de.json` ein Label ändern, Test erneut ausführen — er muss fehlschlagen. Danach zurückändern.

- [ ] **Schritt 5: Test für die Route im Posteingang schreiben**

`legacy-inbox/src/routes/antworten.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { erstelleServer } from '../server.js';

let server;
let basis;

beforeAll(async () => {
	server = erstelleServer({
		konfiguration: { maxBodyBytes: 262144 },
		store: { istBeschreibbar: async () => true },
		rateLimit: { pruefeIp: () => true, pruefeGlobal: () => true }
	});
	await new Promise((fertig) => server.listen(0, fertig));
	basis = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise((fertig) => server.close(fertig)));

describe('GET /rest_sichtungen/antworten.json', () => {
	it('liefert die deutsche Enum-Tabelle', async () => {
		const antwort = await fetch(`${basis}/rest_sichtungen/antworten.json`);
		expect(antwort.status).toBe(200);

		const koerper = await antwort.json();
		expect(koerper.tierart['0']).toBe('Schweinswal');
		expect(koerper.bootsantrieb['5']).toBe('Kein Boot');
		expect(koerper.vonwo['4']).toBe('Fähre');
	});

	it('liefert unter /en/ die englische Fassung', async () => {
		const antwort = await fetch(`${basis}/en/rest_sichtungen/antworten.json`);
		expect(antwort.status).toBe(200);
		expect(await antwort.json()).toHaveProperty('tierart');
	});
});
```

- [ ] **Schritt 6: Test ausführen, Fehlschlag prüfen**

Ausführen: `npx vitest run --project server legacy-inbox/src/routes/antworten.test.js`
Erwartet: FAIL — Status 501 statt 200

- [ ] **Schritt 7: Route implementieren**

`legacy-inbox/src/routes/antworten.js`:

```js
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { antworteJson } from '../respond.js';

const DATEN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data');

// Einmal gelesen und im Speicher gehalten: Die Tabelle ist eingefroren und
// ändert sich zur Laufzeit nicht.
const zwischenspeicher = new Map();

async function ladeTabelle(datei) {
	if (!zwischenspeicher.has(datei)) {
		zwischenspeicher.set(datei, JSON.parse(await readFile(path.join(DATEN, datei), 'utf8')));
	}
	return zwischenspeicher.get(datei);
}

export async function antworten(req, res) {
	const pfad = new URL(req.url, 'http://localhost').pathname;
	const datei = pfad.startsWith('/en/') ? 'antworten.en.json' : 'antworten.de.json';

	antworteJson(res, 200, await ladeTabelle(datei), {
		'Cache-Control': 'public, max-age=300'
	});
}
```

- [ ] **Schritt 8: Routen eintragen**

In `legacy-inbox/src/server.js`:

```js
import { antworten } from './routes/antworten.js';
```

```js
	{ pfad: '/rest_sichtungen/antworten.json', methode: 'GET', behandeln: antworten },
	{ pfad: '/en/rest_sichtungen/antworten.json', methode: 'GET', behandeln: antworten },
```

- [ ] **Schritt 9: Test ausführen, Erfolg prüfen**

Ausführen: `npx vitest run --project server legacy-inbox/src/routes/antworten.test.js`
Erwartet: PASS, 2 Tests

- [ ] **Schritt 10: Committen**

```bash
git add legacy-inbox/data legacy-inbox/src/routes/antworten.js legacy-inbox/src/routes/antworten.test.js legacy-inbox/src/server.js src/tools/generate-antworten-json.js src/routes/rest_sichtungen/antworten.json/frozen.test.ts package.json && git commit -m "feat(api): serve frozen answer options and guard them against drift"
```

---

## Aufgabe 8: `inBaltic.json` — Geometrieprüfung portieren

**Dateien:**

- Erstellen: `legacy-inbox/src/geo/checkBalticSea.js`
- Kopieren: `legacy-inbox/src/geo/rbush-index.json`
- Erstellen: `legacy-inbox/src/routes/inBaltic.js`
- Ändern: `legacy-inbox/src/server.js`
- Test: `legacy-inbox/src/geo/checkBalticSea.test.js`, `legacy-inbox/src/routes/inBaltic.test.js`

**Schnittstellen:**

- Erzeugt: `checkBalticSea(longitude, latitude)` → `{ inBaltic: boolean, inChartArea: boolean }`

**Vorlage:** `src/lib/server/geo/checkBalticSeaFile.ts` (Funktion ab Zeile 681) und `src/lib/utils/geo/checkBalticSea.ts`. Die Portierung lässt das ausführliche Logging weg — es hing an `logger.server` und trägt zur Geometrie nichts bei.

- [ ] **Schritt 1: Index kopieren**

```bash
cp src/lib/server/geo/rbush-index.json legacy-inbox/src/geo/rbush-index.json
```

Prüfen: `ls -lh legacy-inbox/src/geo/rbush-index.json` — erwartet rund 32 MB.

- [ ] **Schritt 2: Test schreiben**

`legacy-inbox/src/geo/checkBalticSea.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { checkBalticSea } from './checkBalticSea.js';

describe('checkBalticSea', () => {
	it('erkennt eine Position in der Ostsee', () => {
		// Kieler Bucht — offenes Wasser
		expect(checkBalticSea(10.5, 54.5)).toEqual({ inBaltic: true, inChartArea: true });
	});

	it('erkennt eine Position an Land im Kartenbereich', () => {
		// Beispiel aus dem PDF: location=53,10 → Raum Hamburg
		expect(checkBalticSea(10, 53)).toEqual({ inBaltic: false, inChartArea: true });
	});

	it('erkennt eine Position weit außerhalb', () => {
		expect(checkBalticSea(-70, 40)).toEqual({ inBaltic: false, inChartArea: false });
	});

	it('liefert bei NaN alles false, statt zu werfen', () => {
		expect(checkBalticSea(NaN, 54)).toEqual({ inBaltic: false, inChartArea: false });
	});

	it('liefert bei unmöglichen Koordinaten alles false', () => {
		expect(checkBalticSea(500, 500)).toEqual({ inBaltic: false, inChartArea: false });
	});
});
```

- [ ] **Schritt 3: Test ausführen, Fehlschlag prüfen**

Ausführen: `npx vitest run --project server legacy-inbox/src/geo/checkBalticSea.test.js`
Erwartet: FAIL — `Failed to load url ./checkBalticSea.js`

- [ ] **Schritt 4: Implementieren**

`legacy-inbox/src/geo/checkBalticSea.js`:

```js
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { multiPolygon, point, polygon } from '@turf/helpers';
import RBush from 'rbush';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Portiert aus src/lib/server/geo/checkBalticSeaFile.ts.
 *
 * Zwei Stufen wie im Original: eine schnelle Bounding-Box-Prüfung für den
 * Kartenbereich, danach ein Punkt-in-Polygon-Test über den vorkompilierten
 * RBush-Index für die eigentliche Ostsee-Geometrie.
 */

// Identisch mit CHART_AREA_ENVELOPE in PostGIS.
const BBOX = { minLon: 9.4, maxLon: 30.2, minLat: 53.0, maxLat: 66.0 };
const GRENZEN = { minLon: -180, maxLon: 180, minLat: -90, maxLat: 90 };

const HIER = path.dirname(fileURLToPath(import.meta.url));

let index = null;

function ladeIndex() {
	if (index === null) {
		const roh = JSON.parse(readFileSync(path.join(HIER, 'rbush-index.json'), 'utf8'));
		index = new RBush();
		index.fromJSON(roh.tree);
	}
	return index;
}

function imKartenbereich(longitude, latitude) {
	return (
		longitude >= BBOX.minLon &&
		longitude <= BBOX.maxLon &&
		latitude >= BBOX.minLat &&
		latitude <= BBOX.maxLat
	);
}

function inOstseeGeometrie(longitude, latitude) {
	const baum = ladeIndex();
	const kandidaten = baum.search({
		minX: longitude,
		minY: latitude,
		maxX: longitude,
		maxY: latitude
	});

	if (!kandidaten || kandidaten.length === 0) return false;

	const punkt = point([longitude, latitude]);

	for (const kandidat of kandidaten) {
		const geometrie = kandidat.geometry;
		if (!geometrie || !Array.isArray(geometrie.coordinates)) continue;

		try {
			if (geometrie.type === 'Polygon') {
				if (booleanPointInPolygon(punkt, polygon(geometrie.coordinates))) return true;
			} else if (geometrie.type === 'MultiPolygon') {
				if (booleanPointInPolygon(punkt, multiPolygon(geometrie.coordinates))) return true;
			}
		} catch {
			// Beschädigte Einzelgeometrie überspringen, nicht die ganze Prüfung
			// aufgeben — das Original verhält sich ebenso.
			continue;
		}
	}

	return false;
}

export function checkBalticSea(longitude, latitude) {
	if (typeof longitude !== 'number' || typeof latitude !== 'number') {
		return { inBaltic: false, inChartArea: false };
	}
	if (Number.isNaN(longitude) || Number.isNaN(latitude)) {
		return { inBaltic: false, inChartArea: false };
	}
	if (
		longitude < GRENZEN.minLon ||
		longitude > GRENZEN.maxLon ||
		latitude < GRENZEN.minLat ||
		latitude > GRENZEN.maxLat
	) {
		return { inBaltic: false, inChartArea: false };
	}

	return {
		inChartArea: imKartenbereich(longitude, latitude),
		inBaltic: inOstseeGeometrie(longitude, latitude)
	};
}
```

- [ ] **Schritt 5: Test ausführen, Erfolg prüfen**

Ausführen: `npx vitest run --project server legacy-inbox/src/geo/checkBalticSea.test.js`
Erwartet: PASS, 5 Tests

- [ ] **Schritt 6: Test für die Route schreiben**

`legacy-inbox/src/routes/inBaltic.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { erstelleServer } from '../server.js';

let server;
let basis;

beforeAll(async () => {
	server = erstelleServer({
		konfiguration: { maxBodyBytes: 262144 },
		store: { istBeschreibbar: async () => true },
		rateLimit: { pruefeIp: () => true, pruefeGlobal: () => true }
	});
	await new Promise((fertig) => server.listen(0, fertig));
	basis = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise((fertig) => server.close(fertig)));

const frage = (abfrage) => fetch(`${basis}/rest_sichtungen/inBaltic.json?${abfrage}`);

describe('GET /rest_sichtungen/inBaltic.json', () => {
	it('liefert das Beispiel aus dem PDF', async () => {
		const antwort = await frage('location=53,10');
		expect(antwort.status).toBe(200);
		expect(await antwort.json()).toEqual({ inbaltic: false, inchartarea: true });
	});

	it('nutzt die Reihenfolge Breite,Länge', async () => {
		const antwort = await frage('location=54.5,10.5');
		expect(await antwort.json()).toEqual({ inbaltic: true, inchartarea: true });
	});

	it('antwortet 400 ohne location', async () => {
		expect((await frage('')).status).toBe(400);
	});

	it('antwortet 400 bei falschem Format', async () => {
		expect((await frage('location=53')).status).toBe(400);
	});

	it('antwortet 400 bei nicht-numerischen Koordinaten', async () => {
		expect((await frage('location=abc,def')).status).toBe(400);
	});

	it('antwortet 400 bei unmöglicher Breite', async () => {
		expect((await frage('location=95,10')).status).toBe(400);
	});
});
```

- [ ] **Schritt 7: Test ausführen, Fehlschlag prüfen**

Ausführen: `npx vitest run --project server legacy-inbox/src/routes/inBaltic.test.js`
Erwartet: FAIL — Status 501 statt 200

- [ ] **Schritt 8: Route implementieren**

`legacy-inbox/src/routes/inBaltic.js`:

```js
import { checkBalticSea } from '../geo/checkBalticSea.js';
import { antworteJson } from '../respond.js';

/**
 * GET /rest_sichtungen/inBaltic.json?location=<breite>,<laenge>
 *
 * Die Antwortfelder sind vertraglich kleingeschrieben: inbaltic, inchartarea.
 * Fehlerstruktur und -texte folgen der Hauptanwendung
 * (src/routes/rest_sichtungen/inBaltic.json/+server.ts).
 */
export async function inBaltic(req, res) {
	const url = new URL(req.url, 'http://localhost');
	const location = url.searchParams.get('location');

	if (!location) {
		antworteJson(res, 400, {
			error: 'MissingParameter',
			message: 'Parameter "location" is required in format "latitude,longitude"'
		});
		return;
	}

	const teile = location.split(',');
	if (teile.length !== 2) {
		antworteJson(res, 400, {
			error: 'InvalidFormat',
			message: 'Parameter "location" must be in format "latitude,longitude"'
		});
		return;
	}

	const breite = parseFloat(teile[0].trim());
	const laenge = parseFloat(teile[1].trim());

	if (Number.isNaN(breite) || Number.isNaN(laenge)) {
		antworteJson(res, 400, {
			error: 'InvalidCoordinates',
			message: 'Coordinates must be valid numbers'
		});
		return;
	}

	if (breite < -90 || breite > 90) {
		antworteJson(res, 400, {
			error: 'InvalidLatitude',
			message: 'Latitude must be between -90 and 90'
		});
		return;
	}

	if (laenge < -180 || laenge > 180) {
		antworteJson(res, 400, {
			error: 'InvalidLongitude',
			message: 'Longitude must be between -180 and 180'
		});
		return;
	}

	// Auf sechs Nachkommastellen normalisieren, wie die Hauptanwendung.
	const runde = (wert) => Math.round(wert * 1000000) / 1000000;
	const ergebnis = checkBalticSea(runde(laenge), runde(breite));

	antworteJson(
		res,
		200,
		{ inbaltic: ergebnis.inBaltic, inchartarea: ergebnis.inChartArea },
		{ 'Cache-Control': 'public, max-age=300' }
	);
}
```

- [ ] **Schritt 9: Route eintragen**

In `legacy-inbox/src/server.js`:

```js
import { inBaltic } from './routes/inBaltic.js';
```

```js
	{ pfad: '/rest_sichtungen/inBaltic.json', methode: 'GET', behandeln: inBaltic },
```

- [ ] **Schritt 10: Test ausführen, Erfolg prüfen**

Ausführen: `npx vitest run --project server legacy-inbox/src/routes/inBaltic.test.js`
Erwartet: PASS, 6 Tests

- [ ] **Schritt 11: Committen**

```bash
git add legacy-inbox/src/geo legacy-inbox/src/routes/inBaltic.js legacy-inbox/src/routes/inBaltic.test.js legacy-inbox/src/server.js && git commit -m "feat(api): port the file-based baltic sea check to the inbox service"
```

---

## Aufgabe 9: Vertragstest gegen die SvelteKit-Implementierung

Der Nachweis für „100 % kompatibel". Alles davor ist Vorbereitung darauf.

**Vor Beginn prüfen:** Die parallel laufende Aufgabe zu den Legacy-Abweichungen ändert möglicherweise `src/lib/legacy-api/error-messages.ts`. Ist sie eingeflossen (die Datei erzeugt dann die flache Form), entfällt die unten dokumentierte Ausnahme für den Fehlerpfad und beide Implementierungen müssen dort übereinstimmen.

Ausführen: `grep -n "message:" src/lib/legacy-api/error-messages.ts`

**Dateien:**

- Erstellen: `src/tests/contract/legacy-inbox.contract.test.ts`

**Schnittstellen:**

- Verbraucht: alle Routen des Posteingangs

- [ ] **Schritt 1: Vertragstest schreiben**

`src/tests/contract/legacy-inbox.contract.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
// @ts-expect-error — reines JavaScript ohne Typdeklarationen
import { erstelleServer } from '../../../legacy-inbox/src/server.js';
// @ts-expect-error — reines JavaScript ohne Typdeklarationen
import { erstelleStore } from '../../../legacy-inbox/src/store.js';
// @ts-expect-error — reines JavaScript ohne Typdeklarationen
import { erstelleRateLimit } from '../../../legacy-inbox/src/rateLimit.js';
import { GET as antwortenRoute } from '../../routes/rest_sichtungen/antworten.json/+server';
import { GET as inBalticRoute } from '../../routes/rest_sichtungen/inBaltic.json/+server';

let server: Server;
let basis: string;
let verzeichnis: string;

beforeAll(async () => {
	verzeichnis = await mkdtemp(path.join(tmpdir(), 'inbox-contract-'));
	const store = await erstelleStore({ datenVerzeichnis: verzeichnis });
	await store.initialisiere();

	server = erstelleServer({
		konfiguration: { maxBodyBytes: 262144 },
		store,
		rateLimit: erstelleRateLimit({ proIpProStunde: 10000, globalProStunde: 10000 })
	});
	await new Promise<void>((fertig) => server.listen(0, () => fertig()));
	const adresse = server.address();
	basis = `http://127.0.0.1:${typeof adresse === 'object' && adresse ? adresse.port : 0}`;
});

afterAll(async () => {
	await new Promise<void>((fertig) => server.close(() => fertig()));
	await rm(verzeichnis, { recursive: true, force: true });
});

function hauptanwendung(pfad: string) {
	return {
		url: new URL(`https://localhost${pfad}`),
		getClientAddress: () => '127.0.0.1',
		request: new Request(`https://localhost${pfad}`)
	} as never;
}

describe('Posteingang gegen Hauptanwendung — antworten.json', () => {
	it('liefert dieselbe Enum-Tabelle', async () => {
		const ausApp = await (
			await antwortenRoute(hauptanwendung('/rest_sichtungen/antworten.json'))
		).json();
		const ausPosteingang = await (await fetch(`${basis}/rest_sichtungen/antworten.json`)).json();

		expect(ausPosteingang).toEqual(ausApp);
	});
});

describe('Posteingang gegen Hauptanwendung — inBaltic.json', () => {
	const punkte = [
		'53,10',
		'54.5,10.5',
		'54.646667,11.333333',
		'56.093587,10.512543',
		'66.5,20',
		'40,-70'
	];

	for (const location of punkte) {
		it(`stimmt für location=${location} überein`, async () => {
			const pfad = `/rest_sichtungen/inBaltic.json?location=${location}`;
			const ausApp = await (await inBalticRoute(hauptanwendung(pfad))).json();
			const ausPosteingang = await (await fetch(`${basis}${pfad}`)).json();

			expect(ausPosteingang).toEqual(ausApp);
		});
	}

	it('stimmt auch bei Fehleingaben überein', async () => {
		for (const abfrage of ['', 'location=53', 'location=abc,def', 'location=95,10']) {
			const pfad = `/rest_sichtungen/inBaltic.json?${abfrage}`;
			const appAntwort = await inBalticRoute(hauptanwendung(pfad));
			const posteingangAntwort = await fetch(`${basis}${pfad}`);

			expect(posteingangAntwort.status).toBe(appAntwort.status);
			expect(await posteingangAntwort.json()).toEqual(await appAntwort.json());
		}
	});
});

describe('Posteingang gegen den Vertrag — POST /rest_sichtungen', () => {
	// Der Erfolgsfall ist in beiden Implementierungen identisch und wird
	// direkt gegen das PDF geprüft.
	it('antwortet bei Erfolg exakt wie im PDF', async () => {
		const antwort = await fetch(`${basis}/rest_sichtungen`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				sichtungsdatum: '2026-07-30 14:50',
				vorname: 'Jörg',
				name: 'Schneider',
				email: 'joerg@example.de',
				anzahl_gesamt: 1
			})
		});

		expect(antwort.status).toBe(201);
		expect(antwort.headers.get('location')).toMatch(/^\/rest_sichtungen\/view\/\d+\.json$/);
		expect(await antwort.json()).toEqual({ message: 'Saved' });
	});

	/**
	 * Bewusste, dokumentierte Abweichung von der Hauptanwendung:
	 * Der Posteingang antwortet flach, wie das Original-PDF
	 * (docs/archive/Sichtungsdb-Web-Schnittstelle.pdf). Die Hauptanwendung
	 * erzeugt in src/lib/legacy-api/error-messages.ts eine geschachtelte
	 * Struktur — siehe Entwurf, Abschnitt 2.1.
	 *
	 * Ist die parallele Korrektur der Hauptanwendung eingeflossen, ist dieser
	 * Test um einen Vergleich mit ihrer Antwort zu erweitern.
	 */
	it('antwortet bei Validierungsfehlern flach, wie das PDF', async () => {
		const antwort = await fetch(`${basis}/rest_sichtungen`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ vorname: 'Jörg' })
		});

		expect(antwort.status).toBe(400);
		const koerper = await antwort.json();

		expect(typeof koerper.message).toBe('string');
		expect(koerper.message).toBe('Validation failed.');
		expect(koerper.errors.anzahl_gesamt).toEqual(['Dieses Feld kann nicht leer gelassen werden.']);
	});
});
```

- [ ] **Schritt 2: Test ausführen, Erfolg prüfen**

Ausführen: `npx vitest run --project server src/tests/contract/legacy-inbox.contract.test.ts`
Erwartet: PASS, 10 Tests

Schlägt einer der `inBaltic`-Vergleiche fehl, ist die Portierung aus Aufgabe 8 abgewichen — dort korrigieren, nicht im Test.

- [ ] **Schritt 3: Gesamten Testlauf ausführen**

Ausführen: `npm run test:quick`
Erwartet: lint, type-check, svelte-check und alle Unit-Tests grün

- [ ] **Schritt 4: Committen**

```bash
git add src/tests/contract/legacy-inbox.contract.test.ts && git commit -m "test(api): prove the inbox matches the main app and the original pdf"
```

---

## Aufgabe 10: Import-Skript

**Warum nicht über HTTP:** Der naheliegende Weg — den Payload an `POST /rest_sichtungen` der Hauptanwendung schicken — trägt nicht. Dieser Endpunkt begrenzt auf 20 Sichtungen pro Stunde und IP (`src/lib/server/middleware/rateLimit.ts:78`, `SIGHTING_SUBMISSION`), und der Import kommt von einer einzigen IP. Ab Datensatz 21 käme `429`; ein paar hundert wartende Sichtungen bräuchten Tage.

Das Skript ruft deshalb dieselben Bausteine direkt auf, die auch die Route benutzt: `mapLegacyToCurrentSchema` und `saveSighting`. Damit gibt es weiterhin **kein zweites Mapping** — es ist wörtlich dasselbe —, aber kein Rate-Limit und keine neue Umgehung an einer öffentlichen Fläche.

**Dateien:**

- Erstellen: `src/tools/import-legacy-inbox.js`
- Test: `src/tools/import-legacy-inbox.test.ts`

**Schnittstellen:**

- Verbraucht: `mapLegacyToCurrentSchema(legacyData)` aus `src/lib/legacy-api/field-mapping.js`, `saveSighting(daten)` aus `src/lib/server/db/sightingRepository.js` → `{ id: number }`
- Erzeugt: `importiere({ datenVerzeichnis, mappe?, speichere? })` → `Promise<{ uebernommen: number, fehlgeschlagen: number }>` — `mappe` und `speichere` sind nur für Tests austauschbar

- [ ] **Schritt 1: Test schreiben**

`src/tools/import-legacy-inbox.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
// @ts-expect-error — reines JavaScript ohne Typdeklarationen
import { importiere } from './import-legacy-inbox.js';

let verzeichnis: string;

async function legeUmschlagAn(name: string, payload: Record<string, unknown> | null) {
	await writeFile(
		path.join(verzeichnis, 'posteingang', name),
		JSON.stringify({
			empfangen_am: '2026-07-30T09:12:33.123Z',
			lfd_nr: 1,
			quelle: { ip: '1.2.3.4', user_agent: 'test', content_type: 'application/json' },
			roh: JSON.stringify(payload),
			abgeschnitten: false,
			payload,
			validierung: { gueltig: payload !== null, fehler: {} }
		})
	);
}

beforeEach(async () => {
	verzeichnis = await mkdtemp(path.join(tmpdir(), 'import-'));
	await mkdir(path.join(verzeichnis, 'posteingang'), { recursive: true });
	await mkdir(path.join(verzeichnis, 'importiert'), { recursive: true });
});

afterEach(async () => {
	await rm(verzeichnis, { recursive: true, force: true });
});

describe('importiere', () => {
	it('reicht den Payload unverändert an das Mapping der Hauptanwendung', async () => {
		await legeUmschlagAn('000001__a.json', { anzahl_gesamt: 3, vorname: 'Jörg' });
		const gemappt: unknown[] = [];

		await importiere({
			datenVerzeichnis: verzeichnis,
			mappe: (daten: unknown) => {
				gemappt.push(daten);
				return { totalCount: 3 };
			},
			speichere: async () => ({ id: 4711 })
		});

		expect(gemappt).toEqual([{ anzahl_gesamt: 3, vorname: 'Jörg' }]);
	});

	it('verschiebt Übernommenes nach importiert/', async () => {
		await legeUmschlagAn('000001__a.json', { anzahl_gesamt: 1 });

		const ergebnis = await importiere({
			datenVerzeichnis: verzeichnis,
			mappe: () => ({ totalCount: 1 }),
			speichere: async () => ({ id: 1 })
		});

		expect(ergebnis).toEqual({ uebernommen: 1, fehlgeschlagen: 0 });
		expect(await readdir(path.join(verzeichnis, 'posteingang'))).toEqual([]);
		expect(await readdir(path.join(verzeichnis, 'importiert'))).toEqual(['000001__a.json']);
	});

	it('lässt Fehlgeschlagenes liegen, damit ein zweiter Lauf es erneut versucht', async () => {
		await legeUmschlagAn('000001__a.json', { anzahl_gesamt: 1 });

		const ergebnis = await importiere({
			datenVerzeichnis: verzeichnis,
			mappe: () => ({ totalCount: 1 }),
			speichere: async () => {
				throw new Error('Datenbank nicht erreichbar');
			}
		});

		expect(ergebnis).toEqual({ uebernommen: 0, fehlgeschlagen: 1 });
		expect(await readdir(path.join(verzeichnis, 'posteingang'))).toEqual(['000001__a.json']);
	});

	it('bricht bei einem Fehler nicht ab, sondern nimmt den Rest mit', async () => {
		await legeUmschlagAn('000001__a.json', { anzahl_gesamt: 1 });
		await legeUmschlagAn('000002__b.json', { anzahl_gesamt: 2 });

		let aufruf = 0;
		const ergebnis = await importiere({
			datenVerzeichnis: verzeichnis,
			mappe: () => ({ totalCount: 1 }),
			speichere: async () => {
				aufruf++;
				if (aufruf === 1) throw new Error('einmaliger Fehler');
				return { id: 2 };
			}
		});

		expect(ergebnis).toEqual({ uebernommen: 1, fehlgeschlagen: 1 });
	});

	it('legt bei einem zweiten Lauf nichts doppelt an', async () => {
		await legeUmschlagAn('000001__a.json', { anzahl_gesamt: 1 });
		let aufrufe = 0;
		const optionen = {
			datenVerzeichnis: verzeichnis,
			mappe: () => ({ totalCount: 1 }),
			speichere: async () => {
				aufrufe++;
				return { id: 1 };
			}
		};

		await importiere(optionen);
		await importiere(optionen);

		expect(aufrufe).toBe(1);
	});

	it('übersetzt sonstige_auffaelligkeiten in die Schreibweise der Hauptanwendung', async () => {
		await legeUmschlagAn('000001__a.json', {
			anzahl_gesamt: 1,
			sonstige_auffaelligkeiten: 'Sehr ruhig'
		});
		let gemappt: Record<string, unknown> = {};

		await importiere({
			datenVerzeichnis: verzeichnis,
			mappe: (daten: Record<string, unknown>) => {
				gemappt = daten;
				return { totalCount: 1 };
			},
			speichere: async () => ({ id: 1 })
		});

		expect(gemappt['sonstige_auffälligkeiten']).toBe('Sehr ruhig');
		expect(gemappt).not.toHaveProperty('sonstige_auffaelligkeiten');
	});

	it('rührt Umschläge ohne Payload nicht an', async () => {
		await legeUmschlagAn('000001__a.json', null);

		const ergebnis = await importiere({
			datenVerzeichnis: verzeichnis,
			mappe: () => ({ totalCount: 1 }),
			speichere: async () => ({ id: 1 })
		});

		expect(ergebnis).toEqual({ uebernommen: 0, fehlgeschlagen: 1 });
		expect(await readdir(path.join(verzeichnis, 'posteingang'))).toEqual(['000001__a.json']);
	});
});
```

- [ ] **Schritt 2: Test ausführen, Fehlschlag prüfen**

Ausführen: `npx vitest run --project server src/tools/import-legacy-inbox.test.ts`
Erwartet: FAIL — `Failed to load url ./import-legacy-inbox.js`

- [ ] **Schritt 3: Implementieren**

`src/tools/import-legacy-inbox.js`:

```js
/**
 * Übernimmt die Dateien des Legacy-Posteingangs in die Hauptanwendung.
 *
 * Ruft dieselben Bausteine auf wie POST /rest_sichtungen — mapLegacyToCurrentSchema
 * und saveSighting —, statt über HTTP zu gehen. Grund: Der Endpunkt begrenzt auf
 * 20 Sichtungen pro Stunde und IP (rateLimit.ts:78), was einen Sammelimport
 * unbrauchbar machen würde. Ein zweites Mapping entsteht dadurch nicht; es ist
 * wörtlich dieselbe Funktion.
 *
 * Übernommene Dateien wandern nach importiert/. Die Datei selbst ist damit das
 * Protokoll: Ein zweiter Lauf kann nichts doppelt anlegen, und was liegen
 * bleibt, ist genau das, was noch offen ist.
 *
 * Aufruf: node src/tools/import-legacy-inbox.js <datenverzeichnis>
 */
import { readdir, readFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { mapLegacyToCurrentSchema } from '../lib/legacy-api/field-mapping.js';
import { saveSighting } from '../lib/server/db/sightingRepository.js';

export async function importiere({
	datenVerzeichnis,
	mappe = mapLegacyToCurrentSchema,
	speichere = saveSighting
}) {
	const eingang = path.join(datenVerzeichnis, 'posteingang');
	const erledigt = path.join(datenVerzeichnis, 'importiert');

	const dateien = (await readdir(eingang)).filter((d) => d.endsWith('.json')).sort();

	let uebernommen = 0;
	let fehlgeschlagen = 0;

	for (const datei of dateien) {
		try {
			const umschlag = JSON.parse(await readFile(path.join(eingang, datei), 'utf8'));

			if (!umschlag.payload) {
				// Ohne geparsten Payload ist nichts zu übernehmen. Der Rohtext
				// bleibt liegen und braucht einen Menschen.
				console.error(`${datei}: kein Payload — bleibt liegen`);
				fehlgeschlagen++;
				continue;
			}

			const gespeichert = await speichere(mappe(vereinheitliche(umschlag.payload)));

			await rename(path.join(eingang, datei), path.join(erledigt, datei));
			uebernommen++;
			console.log(`${datei} → Sichtung ${gespeichert.id}`);
		} catch (fehler) {
			// Ein Fehler in einer Datei darf den Rest nicht aufhalten.
			console.error(`${datei}: ${fehler.message}`);
			fehlgeschlagen++;
		}
	}

	return { uebernommen, fehlgeschlagen };
}

/**
 * Der Vertrag schreibt sonstige_auffaelligkeiten mit "ae", die Hauptanwendung
 * erwartet den Umlaut (Entwurf, Abschnitt 2.2). Ohne diese Übersetzung verlöre
 * der Import den Freitext still.
 *
 * Läuft die parallele Korrektur der Hauptanwendung durch, akzeptiert
 * mapLegacyToCurrentSchema beide Schreibweisen und diese Funktion wird
 * überflüssig — sie schadet dann aber auch nicht.
 */
function vereinheitliche(payload) {
	if (!('sonstige_auffaelligkeiten' in payload)) return payload;

	const { sonstige_auffaelligkeiten, ...rest } = payload;
	return { ...rest, sonstige_auffälligkeiten: sonstige_auffaelligkeiten };
}

// Direkter Aufruf über die Kommandozeile
if (import.meta.url === `file://${process.argv[1]}`) {
	const [datenVerzeichnis] = process.argv.slice(2);
	if (!datenVerzeichnis) {
		console.error('Aufruf: node src/tools/import-legacy-inbox.js <datenverzeichnis>');
		process.exit(1);
	}
	const ergebnis = await importiere({ datenVerzeichnis });
	console.log(`${ergebnis.uebernommen} übernommen, ${ergebnis.fehlgeschlagen} offen.`);
	process.exit(ergebnis.fehlgeschlagen > 0 ? 1 : 0);
}
```

- [ ] **Schritt 4: Test ausführen, Erfolg prüfen**

Ausführen: `npx vitest run --project server src/tools/import-legacy-inbox.test.ts`
Erwartet: PASS, 7 Tests

- [ ] **Schritt 5: Skript im Wurzel-`package.json` eintragen**

```json
		"import:legacy-inbox": "vite-node src/tools/import-legacy-inbox.js --",
```

Grund für `vite-node`: Das Skript importiert aus `$lib`-Pfaden und braucht die Auflösung von SvelteKit; mit blankem `node` schlägt der Import fehl.

- [ ] **Schritt 6: Committen**

```bash
git add src/tools/import-legacy-inbox.js src/tools/import-legacy-inbox.test.ts package.json && git commit -m "feat(api): import inbox files through the repository, not over http"
```

---

## Aufgabe 11: Betriebsdokumentation und Inbetriebnahme

Die drei Punkte aus Abschnitt 11 des Entwurfs fängt kein Code ab. Ohne sie ist die Zusage „es geht nichts verloren" nicht haltbar.

**Dateien:**

- Erstellen: `legacy-inbox/README.md`
- Ändern: `docs/archive/README.md` (Zeile für den Plan)
- Ändern: `docs/LEGACY_API_SPECIFICATION.md:7`
- Ändern: `.claude/rules/legacy-api.md`

- [ ] **Schritt 1: README schreiben**

`legacy-inbox/README.md`:

```markdown
# Legacy-Posteingang

Eigenständiger Node-Dienst für den Plesk-Server. Bedient drei Endpunkte der
Legacy-API und legt jede eingehende Sichtung als JSON-Datei ab.

Entwurf und Begründungen: `docs/archive/LEGACY_INBOX_ENTWURF_2026-07-30.md`
Vertrag: `docs/LEGACY_API_SPECIFICATION.md`

## Der Leitsatz

Was den Dienst erreicht hat, wird geschrieben — ausnahmslos, auch wenn es
ungültig, unparsbar oder Unsinn ist. Die Validierung entscheidet nur über die
HTTP-Antwort und das Zielverzeichnis, nie über die Existenz der Daten.

Der zugehörige Test heißt „hinterlässt auch bei vollständigem Unsinn eine
Datei". Fällt er weg, ist der Dienst wieder einer, der Daten verwerfen kann.

## Endpunkte

| URL                                           | Methode |
| --------------------------------------------- | ------- |
| `/rest_sichtungen`                            | POST    |
| `/rest_sichtungen/antworten.json` (+ `/en/…`) | GET     |
| `/rest_sichtungen/inBaltic.json`              | GET     |
| `/health`                                     | GET     |

`/sichtungen/showreports.json` wird bewusst **nicht** bedient — ohne Datenbank
könnte der Dienst dort nur ein falsches leeres Array liefern.

`/health` gehört nicht zum Legacy-Vertrag. Es ist ein zusätzlicher Pfad für die
Überwachung und liefert keine Daten aus dem Posteingang.

## Umgebungsvariablen

| Variable                         | Vorgabe | Bedeutung                                                     |
| -------------------------------- | ------- | ------------------------------------------------------------- |
| `LEGACY_INBOX_DATA_DIR`          | —       | **Pflicht.** Datenverzeichnis, außerhalb des Document-Roots   |
| `PORT`                           | 3000    | Wird von Passenger gesetzt                                    |
| `LEGACY_INBOX_RATE_LIMIT_IP`     | 100     | Requests pro IP und Stunde — weist ab, schreibt aber trotzdem |
| `LEGACY_INBOX_RATE_LIMIT_GLOBAL` | 1000    | Reißleine über alle IPs — weist ohne Schreiben ab             |
| `LEGACY_INBOX_MAX_BODY_BYTES`    | 262144  | Obergrenze des Request-Bodys                                  |

## Einrichtung in Plesk

**1.** Node.js-Extension der Domain aktivieren, Anwendungswurzel auf
`legacy-inbox/` und Startdatei auf `app.js` setzen.

**2.** `npm ci` über die Plesk-Oberfläche oder per SSH.

**3.** Datenverzeichnis **außerhalb** des Document-Roots anlegen und
`LEGACY_INBOX_DATA_DIR` darauf setzen:

    mkdir -p /var/www/vhosts/schweinswalsichtung.de/legacy-inbox-data
    chmod 700 /var/www/vhosts/schweinswalsichtung.de/legacy-inbox-data
    chown <anwendungsbenutzer> /var/www/vhosts/schweinswalsichtung.de/legacy-inbox-data

Läge es im Document-Root, wären Namen, E-Mail-Adressen und Telefonnummern der
Melder über die Domain abrufbar. Das ist die wichtigste einzelne Einstellung des
gesamten Aufbaus.

**4.** `X-Real-IP` in den nginx-Zusatzdirektiven der Domain setzen — sonst kennt
der Dienst nur die Adresse des Proxys und zählt alle Melder als einen:

    proxy_set_header X-Real-IP $remote_addr;

`X-Forwarded-For` wird bewusst **nicht** ausgewertet: Die Kopfzeile kommt vom
Client, und ein zufälliger Wert je Request würde das Rate-Limit aushebeln.

**5.** Let's Encrypt aktivieren — **ohne** erzwungene HTTPS-Umleitung. Die Spec
nennt `http://` als Basis-URL, und ein `301` auf ein POST lässt bei etlichen
HTTP-Clients den Body verschwinden.

**6.** Prüfen:

    curl -s https://schweinswalsichtung.de/health
    curl -s 'https://schweinswalsichtung.de/rest_sichtungen/inBaltic.json?location=53,10'

Erwartet: `{"status":"ok","datenverzeichnis":"beschreibbar","frei_mb":…}` und
`{"inbaltic":false,"inchartarea":true}`

## In den Posteingang schauen

Es gibt bewusst keine Oberfläche — die Dateien liegen im Dateisystem:

    cd "$LEGACY_INBOX_DATA_DIR"

    ls posteingang | wc -l        # wie viele warten auf den Import
    ls abgewiesen  | wc -l        # Warnsignal, siehe unten
    ls importiert  | wc -l        # bereits übernommen

    # letzter Eingang, ohne die persönlichen Daten
    ls -t posteingang | head -1 | xargs -I{} jq '{empfangen_am, lfd_nr, validierung}' posteingang/{}

    # welche Felder bemängelt wurden — die Frage bei jedem Eintrag in abgewiesen/
    jq -r '.validierung.fehler | keys[]' abgewiesen/*.json | sort | uniq -c | sort -rn

## Betrieb — Voraussetzung, nicht Kür

**Sicherung.** Bis zum Import ist die Platte dieses Servers der einzige Ort, an
dem eine eingegangene Sichtung existiert. Nötig sind beide Hälften: eine
Sicherung des Datenverzeichnisses auf einen **anderen Rechner** und ein
regelmäßiger, kurz getakteter Import. Der Import ist damit nicht nur
Datenübernahme, sondern der eigentliche Schutzmechanismus.

**Überwachung.** Eine **externe** Überwachung muss `/health` regelmäßig abfragen
— extern, weil eine Überwachung auf demselben Server genau dann mit ausfällt,
wenn sie gebraucht wird. Mit zu überwachen: die Anzahl der Dateien in
`abgewiesen/` und das Feld `frei_mb`.

**Jeder Eintrag in `abgewiesen/` ist ein Warnsignal.** Entweder Missbrauch —
dann kann er weg — oder eine echte Sichtung, die der Validierer zu Unrecht
abgelehnt hat. Der zweite Fall ist stiller Datenverlust und muss auffallen. Der
`jq`-Befehl oben zeigt, welche Felder bemängelt wurden; häufen sich dieselben
Namen, liegen Validierer und reale App auseinander.

**Plattenplatz.** Der Dienst startet nicht mehr, wenn weniger als 500 MB frei
sind, und liefert den freien Platz über `/health` mit. Zu bedenken: Allein der
Geo-Index belegt 33 MB, und innerhalb der globalen Reißleine passen im
schlimmsten Fall rund 6 GB pro Tag auf die Platte (1.000 Requests/Stunde à
256 KB). Die Reißleine schützt vor einer Flut, nicht vor einem geduldigen
Angreifer.

**Aufräumen.** Weder `abgewiesen/` noch `importiert/` räumen sich selbst auf:

- `abgewiesen/` nach Sichtung durch einen Menschen leeren — echte Sichtungen
  von Hand nachtragen, Missbrauch löschen
- `importiert/` nach gesicherter Übernahme in die Datenbank archivieren oder
  löschen. Die Dateien werden nur noch als Herkunftsnachweis gebraucht

## Import

    npm run import:legacy-inbox -- /var/www/vhosts/schweinswalsichtung.de/legacy-inbox-data

Läuft im Hauptrepo, nicht auf dem Plesk-Server. Übernommene Dateien wandern nach
`importiert/`; was liegen bleibt, ist genau das, was noch offen ist.

## Tests

Die Tests laufen im Vitest des Hauptrepos mit:

    npm run test:quick
```

- [ ] **Schritt 2: Archiv-README ergänzen**

In `docs/archive/README.md` nach der Zeile zu `LEGACY_INBOX_ENTWURF_2026-07-30.md` einfügen:

```markdown
| `LEGACY_INBOX_PLAN_2026-07-30.md` | Implementierungsplan dazu |
```

- [ ] **Schritt 3: Client-Status in beiden Dateien aktualisieren**

**Erst ausführen, wenn der Dienst tatsächlich in Betrieb geht.** Bis dahin bleibt der Stand korrekt.

In `docs/LEGACY_API_SPECIFICATION.md:7` den Absatz „Status 2026-07-28: no clients are connected" ersetzen durch den dann gültigen Stand: Clients sind angebunden, Abweichungen kosten Daten, die von dieser Seite nicht zu reparieren sind.

Denselben Hinweisblock in `.claude/rules/legacy-api.md` entsprechend anpassen.

- [ ] **Schritt 4: Gesamten Testlauf ausführen**

Ausführen: `npm run test:quick`
Erwartet: alles grün

- [ ] **Schritt 5: Committen**

```bash
git add legacy-inbox/README.md docs/archive/README.md && git commit -m "docs(api): document the inbox service and its operational prerequisites"
```

---

## Abschluss

Nach Aufgabe 11 steht:

- ein lauffähiger Dienst mit drei vertragstreuen Endpunkten und einem Health-Check
- ein Vertragstest, der Übereinstimmung mit der Hauptanwendung und dem Original-PDF nachweist
- ein Import-Skript, das dieselben Bausteine benutzt wie die Route der Hauptanwendung
- eine Betriebsanleitung, die die Punkte benennt, die kein Code abfängt

**Vor der Inbetriebnahme zu klären** (nicht Teil dieses Plans, weil außerhalb des Codes):

1. Wohin wird das Datenverzeichnis gesichert, und in welchem Takt?
2. Welches System fragt `/health` von außen ab, und wer bekommt den Alarm?
3. Wer sieht sich `abgewiesen/` an, und wie oft?
4. Wann läuft der Import — und wer entscheidet, dass die Hauptanwendung so weit ist?

Ohne Antworten auf diese vier Fragen sollte der Dienst nicht online gehen.

**Später zu prüfen:** Sobald die Hauptanwendung produktiv und vom Plesk-Server aus
erreichbar ist, lohnt ein zweiter Blick auf den Zuschnitt. Dann könnte der Dienst
jede Sichtung sofort weiterreichen und die Platte nur noch als Rückfallpuffer für
gescheiterte Zustellungen benutzen. Das Verlustfenster schrumpfte von Tagen auf
Sekunden, und die halbe Betriebslast aus Abschnitt 11 des Entwurfs entfiele. Der
Sammelimport ist die richtige Form für die jetzige Lage, nicht für alle Zeit.
