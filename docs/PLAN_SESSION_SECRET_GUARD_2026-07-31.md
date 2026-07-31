# Startup-Guard für Produktions-Secrets — Implementierungsplan (PR 1 / Paket A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Produktions-Deployment startet nicht mehr, wenn `SESSION_SECRET` ein öffentlich
bekannter Wert ist oder `ENCRYPTION_KEY` kein gültiger 32-Byte-Hex-Schlüssel.

**Architecture:** Die Prüflogik zieht aus dem Modul-Scope von `src/hooks.server.ts` in ein
neues, reines Modul `src/lib/server/config/secretGuard.ts`.

Grund ist **nicht** der Dateiort — der Server-Test-Include ist
`src/**/*.{test,spec}.{js,ts}` und würde ein `src/hooks.server.test.ts` erfassen. Der Grund
sind die Seiteneffekte beim Import: `hooks.server.ts` zieht das DB-Modul, die
Middleware-Kette und `process.once`-Signal-Handler mit, und die Guards laufen im Modul-Scope —
ein Test müsste also für jeden Fall das ganze Modul mit anderen Env-Werten neu importieren.
Dazu zählt die Coverage ohnehin nur `src/lib/**` (`vitest.config.ts`, `coverage.include`).
Reine Funktionen mit den Werten als Parameter sind ohne all das prüfbar; `hooks.server.ts` ruft
sie nur noch auf.

**Tech Stack:** TypeScript, SvelteKit 5, Vitest (Node-Umgebung), `$env/dynamic/private`.

## Global Constraints

- **Test-First ist Projektpflicht** (`.claude/rules/testing.md`): jeder Schritt beginnt mit
  einem fehlschlagenden Test.
- **Keine `any`-Typen, explizite Return-Types** für alle Funktionen
  (`.claude/rules/architecture.md`).
- **Imports über `$lib`** mit vollständigen Pfaden, nie relativ über Verzeichnisgrenzen.
- **Kommentare und Doku auf Deutsch**, Bezeichner und Commit-Messages auf Englisch, Subject
  lowercase (`CLAUDE.md`, Commit Conventions).
- **Commit-Format:** `<type>(<scope>): <beschreibung>`, hier `fix(security)` bzw. `docs(security)`.
- **`npm run test:quick` muss vor jedem Commit grün sein.** Der Pre-Commit-Hook dieses Repos
  führt `lint` und `type-check` ohnehin bei jedem `git commit` aus; in den Tasks 1, 2 und 4
  genügt daher der fokussierte `vitest run`, den der jeweilige Schritt nennt. Der vollständige
  Lauf steht in Task 3 Schritt 6 und Task 5 Schritt 1.
- Der Guard greift **nur** bei `NODE_ENV === 'production'`. Lokale Entwicklung und CI arbeiten
  bewusst mit dem Platzhalter aus `.env.example` (`.github/workflows/ci.yml:109,261,376`) und
  dürfen nicht brechen.
- Die exakten öffentlich bekannten Werte, verbatim:
  - `your-secret-key-here-min-32-chars` (aus `.env.example:40`, **33 Zeichen** — eine reine
    Längenprüfung lässt ihn durch)
  - `8K7h3L9mN2pQ4rS6tU8vW0xY2zA4bC6dE` (aus `docs/ENVIRONMENT.md:96`, ebenfalls 33 Zeichen)
  - `'0'.repeat(64)` für `ENCRYPTION_KEY` (bereits als `PLACEHOLDER_ENCRYPTION_KEY` in
    `src/hooks.server.ts:21`)

**Spec:** `docs/SESSION_STORE_SPEC_2026-07-31.md`, Abschnitt 4.

---

## Dateistruktur

| Datei                                       | Verantwortung                                                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/server/config/secretGuard.ts`      | **neu.** Reine Validierung der beiden Produktions-Secrets. Kein I/O, kein Env-Zugriff — die Werte kommen als Parameter herein.  |
| `src/lib/server/config/secretGuard.test.ts` | **neu.** Vitest, Node-Umgebung.                                                                                                 |
| `src/hooks.server.ts`                       | Ruft den Guard auf; die beiden inline-Guards (Zeilen 20–22 und 25–45) und die Konstante `PLACEHOLDER_ENCRYPTION_KEY` entfallen. |
| `docs/ENVIRONMENT.md`                       | Beispielwert entschärfen, Rotations-Abschnitt ergänzen.                                                                         |
| `docs/RELEASE_PIPELINE.md`                  | „Zwei Dinge, die getrennt sein müssen" wird zu drei.                                                                            |

`src/lib/server/config/` existiert bereits (`accessControl.ts`) — kein neues Verzeichnis.

---

## Task 1: Validierung für `SESSION_SECRET`

**Files:**

- Create: `src/lib/server/config/secretGuard.ts`
- Test: `src/lib/server/config/secretGuard.test.ts`

**Interfaces:**

- Consumes: nichts
- Produces:

  ```ts
  export const PUBLIC_SESSION_SECRETS: ReadonlySet<string>;
  export const MIN_SESSION_SECRET_LENGTH: number; // 32
  export function validateSessionSecret(value: string): string | null;
  ```

  Rückgabe `null` bedeutet gültig; ein String ist die fertige, für Menschen lesbare
  Fehlermeldung.

- [ ] **Step 1: Write the failing test**

Datei `src/lib/server/config/secretGuard.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
	MIN_SESSION_SECRET_LENGTH,
	PUBLIC_SESSION_SECRETS,
	validateSessionSecret
} from '$lib/server/config/secretGuard';

describe('validateSessionSecret', () => {
	it('akzeptiert ein ausreichend langes, unbekanntes Secret', () => {
		expect(validateSessionSecret('a'.repeat(48))).toBeNull();
	});

	it('lehnt einen leeren Wert ab', () => {
		expect(validateSessionSecret('')).toMatch(/SESSION_SECRET/);
	});

	it('lehnt einen zu kurzen Wert ab', () => {
		const tooShort = 'x'.repeat(MIN_SESSION_SECRET_LENGTH - 1);
		expect(validateSessionSecret(tooShort)).toMatch(/32/);
	});

	it('lehnt den Platzhalter aus .env.example ab', () => {
		expect(validateSessionSecret('your-secret-key-here-min-32-chars')).toMatch(/öffentlich/);
	});

	it('lehnt den Beispielwert aus docs/ENVIRONMENT.md ab', () => {
		expect(validateSessionSecret('8K7h3L9mN2pQ4rS6tU8vW0xY2zA4bC6dE')).toMatch(/öffentlich/);
	});

	/* Ein Leerzeichen oder Zeilenumbruch um den Platzhalter darf die Prüfung nicht
	   aushebeln — sonst ist der Guard still wirkungslos. */
	it('lehnt den Platzhalter auch mit Leerraum drumherum ab', () => {
		expect(validateSessionSecret('  your-secret-key-here-min-32-chars\n')).toMatch(/öffentlich/);
	});

	it('lehnt einen Wert ab, der nur aus Leerraum besteht', () => {
		expect(validateSessionSecret('   ')).toMatch(/erforderlich/);
	});

	/* Der Kern des Befunds aus #635: Beide öffentlich bekannten Werte sind 33 Zeichen lang
	   und bestehen jede reine Längenprüfung. Ohne diesen Test ist die naheliegende
	   Implementierung (nur `>= 32`) grün und trotzdem falsch. */
	it('erkennt, dass die öffentlichen Werte die Längenprüfung bestehen würden', () => {
		for (const known of PUBLIC_SESSION_SECRETS) {
			expect(known.length).toBeGreaterThanOrEqual(MIN_SESSION_SECRET_LENGTH);
			expect(validateSessionSecret(known)).not.toBeNull();
		}
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/server/config/secretGuard.test.ts
```

Erwartet: FAIL — `Failed to resolve import "$lib/server/config/secretGuard"`.

- [ ] **Step 3: Write minimal implementation**

Datei `src/lib/server/config/secretGuard.ts`:

```ts
/**
 * Prüfung der Produktions-Secrets beim Serverstart.
 *
 * Reine Funktionen ohne Env-Zugriff: Die Werte kommen als Parameter herein, damit sie
 * testbar sind. Der Aufruf und das Werfen passieren in `src/hooks.server.ts`.
 *
 * Hintergrund: Issue #635 — ein Deployment, das `.env.example` als Vorlage übernimmt,
 * lief bisher mit einem Secret, das im öffentlichen Repository steht.
 */

/**
 * Werte, die als `SESSION_SECRET` nie gelten dürfen, weil sie öffentlich einsehbar sind.
 *
 * Beide sind 33 Zeichen lang und bestehen damit jede reine Mindestlängenprüfung — der
 * Vergleich gegen diese Menge ist deshalb nicht optional.
 */
export const PUBLIC_SESSION_SECRETS: ReadonlySet<string> = new Set([
	'your-secret-key-here-min-32-chars', // .env.example
	'8K7h3L9mN2pQ4rS6tU8vW0xY2zA4bC6dE' // docs/ENVIRONMENT.md
]);

export const MIN_SESSION_SECRET_LENGTH = 32;

const GENERATE_HINT = 'Erzeugen mit: openssl rand -base64 32';

/**
 * Prüft einen `SESSION_SECRET`-Wert.
 *
 * @returns `null` wenn gültig, sonst die vollständige Fehlermeldung.
 */
export function validateSessionSecret(raw: string): string | null {
	/* Trimmen vor dem Vergleich, sonst umgeht ein versehentliches Leerzeichen oder ein
	   Zeilenumbruch (`openssl rand -base64 32 > datei`) die Prüfung gegen die bekannten
	   Werte — der Guard wäre dann still wirkungslos. */
	const value = raw.trim();

	if (!value) {
		return `SESSION_SECRET ist in Produktion erforderlich. ${GENERATE_HINT}`;
	}
	if (value.length < MIN_SESSION_SECRET_LENGTH) {
		return (
			`SESSION_SECRET ist zu kurz (${value.length} Zeichen, mindestens ` +
			`${MIN_SESSION_SECRET_LENGTH} erforderlich). ${GENERATE_HINT}`
		);
	}
	if (PUBLIC_SESSION_SECRETS.has(value)) {
		return (
			'SESSION_SECRET ist ein öffentlich bekannter Beispielwert aus dem Repository. ' +
			`Wer ihn kennt, kann sich eine Admin-Session ausstellen. ${GENERATE_HINT}`
		);
	}
	return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/server/config/secretGuard.test.ts
```

Erwartet: PASS, 8 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/config/secretGuard.ts src/lib/server/config/secretGuard.test.ts
git commit -m "fix(security): reject publicly known SESSION_SECRET values"
```

---

## Task 2: Validierung für `ENCRYPTION_KEY`

Der bestehende Guard (`src/hooks.server.ts:36–45`) prüft nur _leer_ und _Platzhalter_.
`src/lib/server/auth/crypto.ts:103` nutzt `aes-256-gcm`, das exakt 32 Byte Schlüssel verlangt.
Ein 32-stelliger Hex-Wert (= 16 Byte) kommt heute durch den Guard und lässt
`crypto.createCipheriv` erst beim ersten Login werfen — auf dem Auth-Pfad, wo der Fehler am
teuersten ist. #635 verlangt ausdrücklich, diesen Guard mitzuprüfen.

**Files:**

- Modify: `src/lib/server/config/secretGuard.ts`
- Test: `src/lib/server/config/secretGuard.test.ts`

**Interfaces:**

- Consumes: nichts aus Task 1 (eigenständige Funktion in derselben Datei)
- Produces:

  ```ts
  export const PLACEHOLDER_ENCRYPTION_KEY: string; // '0'.repeat(64)
  export const ENCRYPTION_KEY_LENGTH: number; // 64
  export function validateEncryptionKey(value: string): string | null;
  ```

- [ ] **Step 1: Write the failing test**

An `src/lib/server/config/secretGuard.test.ts` anhängen. Die drei neuen Namen
(`ENCRYPTION_KEY_LENGTH`, `PLACEHOLDER_ENCRYPTION_KEY`, `validateEncryptionKey`) in den
**bestehenden** Import-Block aus Task 1 aufnehmen — kein zweites `import`-Statement aus
demselben Modul, das würde ESLint anschlagen.

```ts
describe('validateEncryptionKey', () => {
	const valid = 'a3f1'.repeat(16); // 64 Hex-Zeichen = 32 Byte

	it('akzeptiert 64 Hex-Zeichen', () => {
		expect(valid).toHaveLength(ENCRYPTION_KEY_LENGTH);
		expect(validateEncryptionKey(valid)).toBeNull();
	});

	it('akzeptiert Grossbuchstaben in der Hex-Darstellung', () => {
		expect(validateEncryptionKey(valid.toUpperCase())).toBeNull();
	});

	it('lehnt einen leeren Wert ab', () => {
		expect(validateEncryptionKey('')).toMatch(/ENCRYPTION_KEY/);
	});

	it('lehnt den Platzhalter aus .env.example ab', () => {
		expect(validateEncryptionKey(PLACEHOLDER_ENCRYPTION_KEY)).toMatch(/Platzhalter/);
	});

	/* Der neue Fall: aes-256-gcm braucht 32 Byte. Ein 32-stelliger Hex-Wert sind 16 Byte
	   und liess createCipheriv bisher erst beim ersten Login werfen. */
	it('lehnt einen zu kurzen Hex-Wert ab, der bisher durchkam', () => {
		expect(validateEncryptionKey('a3f1'.repeat(8))).toMatch(/64/);
	});

	it('lehnt Nicht-Hex-Zeichen ab', () => {
		expect(validateEncryptionKey('z'.repeat(64))).toMatch(/hexadezimal/);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/server/config/secretGuard.test.ts
```

Erwartet: FAIL — `validateEncryptionKey is not a function` bzw. fehlende Exporte.

- [ ] **Step 3: Write minimal implementation**

An `src/lib/server/config/secretGuard.ts` anhängen:

```ts
/**
 * Platzhalter-Wert aus `.env.example` (64x "0") — NIE in Produktion nutzen.
 */
export const PLACEHOLDER_ENCRYPTION_KEY = '0'.repeat(64);

/**
 * `crypto.ts` nutzt aes-256-gcm. Das verlangt exakt 32 Byte Schlüssel,
 * hex-kodiert also 64 Zeichen.
 */
export const ENCRYPTION_KEY_LENGTH = 64;

const HEX_ONLY = /^[0-9a-f]+$/i;

/**
 * Prüft einen `ENCRYPTION_KEY`-Wert.
 *
 * @returns `null` wenn gültig, sonst die vollständige Fehlermeldung.
 */
export function validateEncryptionKey(value: string): string | null {
	const hint = 'Erzeugen mit: openssl rand -hex 32';

	if (!value) {
		return `ENCRYPTION_KEY ist in Produktion erforderlich. ${hint}`;
	}
	if (value === PLACEHOLDER_ENCRYPTION_KEY) {
		return (
			'ENCRYPTION_KEY ist der Platzhalter aus der Beispiel-Konfiguration. ' +
			`Die Verschlüsselung des PKCE-Verifiers wäre damit wirkungslos. ${hint}`
		);
	}
	if (value.length !== ENCRYPTION_KEY_LENGTH) {
		return (
			`ENCRYPTION_KEY muss genau ${ENCRYPTION_KEY_LENGTH} Zeichen lang sein ` +
			`(32 Byte für aes-256-gcm), ist aber ${value.length}. ${hint}`
		);
	}
	if (!HEX_ONLY.test(value)) {
		return `ENCRYPTION_KEY muss hexadezimal sein (nur 0-9 und a-f). ${hint}`;
	}
	return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/server/config/secretGuard.test.ts
```

Erwartet: PASS, 14 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/config/secretGuard.ts src/lib/server/config/secretGuard.test.ts
git commit -m "fix(security): require ENCRYPTION_KEY to be 64 hex chars"
```

---

## Task 3: Guard in `hooks.server.ts` verdrahten

**Files:**

- Modify: `src/hooks.server.ts:20-45` (Konstante und beide inline-Guards)
- Test: `src/lib/server/config/secretGuard.test.ts`

**Interfaces:**

- Consumes: `validateSessionSecret`, `validateEncryptionKey` aus Task 1 und 2
- Produces:

  ```ts
  export function assertProductionSecrets(env: {
  	NODE_ENV: string;
  	SESSION_SECRET: string;
  	ENCRYPTION_KEY: string;
  }): void; // wirft Error bei ungültiger Konfiguration
  ```

- [ ] **Step 1: Write the failing test**

An `src/lib/server/config/secretGuard.test.ts` anhängen (Import von
`assertProductionSecrets` in den bestehenden Import-Block aufnehmen):

```ts
describe('assertProductionSecrets', () => {
	const good = { SESSION_SECRET: 'a'.repeat(48), ENCRYPTION_KEY: 'a3f1'.repeat(16) };

	it('wirft nicht ausserhalb von production', () => {
		expect(() =>
			assertProductionSecrets({
				NODE_ENV: 'development',
				SESSION_SECRET: 'your-secret-key-here-min-32-chars',
				ENCRYPTION_KEY: '0'.repeat(64)
			})
		).not.toThrow();
	});

	it('wirft nicht bei gültiger Produktionskonfiguration', () => {
		expect(() => assertProductionSecrets({ NODE_ENV: 'production', ...good })).not.toThrow();
	});

	it('wirft in production bei öffentlich bekanntem SESSION_SECRET', () => {
		expect(() =>
			assertProductionSecrets({
				NODE_ENV: 'production',
				...good,
				SESSION_SECRET: 'your-secret-key-here-min-32-chars'
			})
		).toThrow(/öffentlich bekannter Beispielwert/);
	});

	it('wirft in production bei zu kurzem ENCRYPTION_KEY', () => {
		expect(() =>
			assertProductionSecrets({
				NODE_ENV: 'production',
				...good,
				ENCRYPTION_KEY: 'a3f1'.repeat(8)
			})
		).toThrow(/64 Zeichen/);
	});

	/* Beide Fehler zusammen: Die Meldung muss beide nennen, damit ein Betreiber nicht
	   zweimal deployen muss, um beide zu finden. */
	it('nennt beide Fehler in einer Meldung', () => {
		let message = '';
		try {
			assertProductionSecrets({
				NODE_ENV: 'production',
				SESSION_SECRET: '',
				ENCRYPTION_KEY: ''
			});
		} catch (error) {
			message = error instanceof Error ? error.message : String(error);
		}
		expect(message).toMatch(/SESSION_SECRET/);
		expect(message).toMatch(/ENCRYPTION_KEY/);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/server/config/secretGuard.test.ts
```

Erwartet: FAIL — `assertProductionSecrets is not a function`.

- [ ] **Step 3: Write minimal implementation**

An `src/lib/server/config/secretGuard.ts` anhängen:

```ts
/**
 * Prüft beim Serverstart alle Produktions-Secrets und wirft mit einer Meldung,
 * die **alle** gefundenen Probleme nennt.
 *
 * Beide Fehler gemeinsam zu melden ist Absicht: Ein Betreiber, der nur den ersten
 * sieht, deployt zweimal.
 */
export function assertProductionSecrets(env: {
	NODE_ENV: string;
	SESSION_SECRET: string;
	ENCRYPTION_KEY: string;
}): void {
	if (env.NODE_ENV !== 'production') {
		return;
	}

	const problems = [
		validateSessionSecret(env.SESSION_SECRET),
		validateEncryptionKey(env.ENCRYPTION_KEY)
	].filter((problem): problem is string => problem !== null);

	if (problems.length > 0) {
		throw new Error(
			`Ungültige Produktions-Konfiguration:\n- ${problems.join('\n- ')}\n` +
				'Der Server startet aus Sicherheitsgründen nicht.'
		);
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/server/config/secretGuard.test.ts
```

Erwartet: PASS, 19 Tests.

- [ ] **Step 5: Replace the inline guards in `hooks.server.ts`**

In `src/hooks.server.ts` den Import ergänzen:

```ts
import { assertProductionSecrets } from '$lib/server/config/secretGuard';
```

Dann **zwei getrennte** Bereiche anfassen — die Zeile 23 dazwischen (`const logger = …`) muss
stehen bleiben:

1. **Zeilen 20–22 löschen**: der Kommentar `// Platzhalter-Wert aus der Beispiel-Konfiguration …`,
   die Konstante `PLACEHOLDER_ENCRYPTION_KEY` und die folgende Leerzeile.
2. **Zeilen 25–45 ersetzen**: den Kommentar `// Guard: fail fast if SESSION_SECRET …` und
   **beide** `if (NODE_ENV === 'production' && …) { throw … }`-Blöcke durch:

```ts
// Guard: Der Server startet in Produktion nicht mit fehlenden, zu kurzen oder öffentlich
// bekannten Secrets. Die Prüflogik steht in secretGuard.ts, damit sie testbar ist —
// hooks.server.ts liegt ausserhalb von src/lib/** und wird von den Server-Tests nicht erfasst.
assertProductionSecrets({ NODE_ENV, SESSION_SECRET, ENCRYPTION_KEY });
```

Die Konstanten `NODE_ENV`, `SESSION_SECRET` und `ENCRYPTION_KEY` (Zeilen 16–18) bleiben — sie
werden hier übergeben und weiter unten noch gebraucht.

- [ ] **Step 6: Verify the whole suite**

```bash
npm run test:quick
```

Erwartet: lint, type-check, svelte-check und Unit-Tests grün. Kein Test darf durch das
Entfernen der inline-Guards brechen; sie waren nicht abgedeckt.

- [ ] **Step 7: Commit**

```bash
git add src/hooks.server.ts src/lib/server/config/secretGuard.ts src/lib/server/config/secretGuard.test.ts
git commit -m "fix(security): move startup secret validation into a tested module"
```

---

## Task 4: Dokumentation

**Files:**

- Modify: `docs/ENVIRONMENT.md:96` und Abschnitt `### SESSION_SECRET` (ab Zeile 79)
- Modify: `docs/RELEASE_PIPELINE.md:169-177`

Kein Test — reine Dokumentationsänderung, laut `.claude/rules/testing.md` eine zulässige
Ausnahme, die im Commit begründet wird.

- [ ] **Step 1: Beispielwert in `docs/ENVIRONMENT.md` entschärfen**

Zeile 96 lautet heute:

```bash
SESSION_SECRET=8K7h3L9mN2pQ4rS6tU8vW0xY2zA4bC6dE
```

Ersetzen durch:

```bash
SESSION_SECRET=<Ausgabe von openssl rand -base64 32>
```

Begründung im Kopf des Abschnitts ergänzen: Ein Wert, der echt aussieht, wird kopiert — und
seit PR 1 verweigert der Server den Start, wenn er es doch wurde.

- [ ] **Step 2: Rotations-Abschnitt in `docs/ENVIRONMENT.md` ergänzen**

Direkt nach dem `SESSION_SECRET`-Abschnitt einfügen:

```markdown
**Rotation:**

`SESSION_SECRET` lässt sich jederzeit wechseln — der neue Wert wird in die `.env` des
Hosts geschrieben, danach `docker compose up -d`.

**Nebenwirkung:** Jeder Wechsel beendet **alle** laufenden Sitzungen gleichzeitig. Jedes
`jwtVerify` gegen das alte Cookie schlägt fehl, das Cookie wird gelöscht, alle Angemeldeten
landen im Login. Das ist der Notausschalter für den Verdachtsfall („jemand könnte das
Secret kennen") — und der einzige Weg, eine ausgestellte Session ungültig zu machen.

Staging und Production müssen **verschiedene** Secrets haben. Sonst ist ein Staging-Zugang
ein Produktions-Zugang.
```

- [ ] **Step 3: `docs/RELEASE_PIPELINE.md` erweitern**

Die Überschrift auf Zeile 169 lautet „## Zwei Dinge, die getrennt sein müssen". Sie wird zu
„## Drei Dinge, die getrennt sein müssen". Nach dem Absatz „**Upload-Verzeichnisse.**"
(Zeile 175) einfügen:

```markdown
**`SESSION_SECRET`.** Jeder Stack braucht sein eigenes. Das Secret ist die alleinige
Grundlage dafür, dass eine Session echt ist — wer es kennt, kann sich eine Admin-Session
ausstellen, ohne Auth0 zu berühren. Ein geteiltes Secret macht einen Staging-Zugang zu
einem Produktions-Zugang. Siehe `docs/ENVIRONMENT.md`, Abschnitt `SESSION_SECRET`.
```

- [ ] **Step 4: Formatierung prüfen**

```bash
npx prettier --check docs/ENVIRONMENT.md docs/RELEASE_PIPELINE.md
```

Erwartet: `All matched files use Prettier code style!`. Bei Abweichung `--write` statt
`--check`.

- [ ] **Step 5: Commit**

```bash
git add docs/ENVIRONMENT.md docs/RELEASE_PIPELINE.md
git commit -m "docs(security): document SESSION_SECRET rotation and per-environment separation

Kein Test: reine Dokumentationsaenderung ohne Logik (Ausnahme nach
.claude/rules/testing.md)."
```

---

## Task 5: Abnahme

- [ ] **Step 1: Vollständiger Schnelltest**

```bash
npm run test:quick
```

Erwartet: grün.

- [ ] **Step 2: Gegenprobe — der Guard greift tatsächlich**

```bash
NODE_ENV=production SESSION_SECRET="your-secret-key-here-min-32-chars" \
ENCRYPTION_KEY="$(printf '0%.0s' {1..64})" \
npx vitest run src/lib/server/config/secretGuard.test.ts
```

Erwartet: PASS — die Tests prüfen die Funktion direkt, die Umgebungsvariablen sind hier nur
Kontrolle, dass nichts implizit aus der Umgebung gelesen wird. Schlägt einer der Tests fehl,
liest `secretGuard.ts` entgegen der Vorgabe aus `$env` statt aus seinen Parametern.

- [ ] **Step 3: Prüfen, dass Entwicklung und CI unberührt sind**

```bash
grep -n '^SESSION_SECRET=\|^ENCRYPTION_KEY=' .env.example
```

Erwartet: die unveränderten Platzhalter. `.env.example` wird in PR 1 **nicht** angefasst —
lokale Entwicklung und CI laufen weiter mit dem Platzhalter, weil der Guard nur bei
`NODE_ENV === 'production'` greift.

- [ ] **Step 4: Die eigentliche Wirkung prüfen — startet der Server wirklich nicht?**

Die Unit-Tests belegen, dass die Funktion wirft. Sie belegen **nicht**, dass ein Modul-Scope-
`throw` in `hooks.server.ts` den adapter-node-Prozess tatsächlich beendet, statt nur 500er zu
liefern. Ohne diesen Schritt ist der Guard eine Zusicherung, die nie an einem echten Server
geprüft wurde.

```bash
npm run build
NODE_ENV=production \
SESSION_SECRET="your-secret-key-here-min-32-chars" \
ENCRYPTION_KEY="$(printf '0%.0s' {1..64})" \
DATABASE_POSTGRES_URL="postgres://invalid/invalid" \
node build/index.js; echo "exit=$?"
```

Erwartet: Die Meldung „Ungültige Produktions-Konfiguration" mit **beiden** Punkten auf stderr,
und `exit=` mit einem Wert ungleich 0. Der Prozess darf **nicht** auf einem Port lauschen.

Kommt stattdessen ein laufender Server heraus, ist der Guard wirkungslos und der Aufruf muss
vor den SvelteKit-Server gezogen werden (dann zusätzlich in `scripts/docker-entrypoint.sh` —
mit dem Hinweis, dass `run-release.sh:275` das Skript per `--entrypoint ""` umgeht). Das in
diesem Fall als eigenen Befund festhalten, nicht stillschweigend umbauen.

- [ ] **Step 5: PR eröffnen**

```bash
gh pr create --fill --base main
```

Im PR-Text auf `docs/SESSION_STORE_SPEC_2026-07-31.md` Abschnitt 4 verweisen und festhalten,
dass dies Paket A ist — Paket D (Session-Store) folgt separat und entfernt `SESSION_SECRET`
dann vollständig.

---

## Was dieser PR ausdrücklich **nicht** tut

- Er behebt **nicht** die Ursache aus #635. Wer das echte `SESSION_SECRET` kennt, kann sich
  weiterhin eine Admin-Session ausstellen. Der Guard schliesst nur den Fall, dass dieses
  Secret ein öffentlich bekannter Wert ist.
- Er beurteilt **nicht die Güte** eines selbstgewählten Secrets. `passwort-passwort-passwort-1234`
  ist 32 Zeichen lang, unbekannt und kommt durch. Entropie-Schätzung ist unzuverlässig und
  würde falsche Sicherheit erzeugen; die Doku verweist stattdessen auf `openssl rand`.
- Er ändert **nichts** am Verhalten eines laufenden Deployments mit einem echten Secret.
- Er fasst `.env.example`, `docker-compose.production.yml`, `run-release.sh` und
  `scripts/docker-entrypoint.sh` nicht an. Der Guard in `hooks.server.ts` ist der einzige
  Punkt, den jeder Startweg durchläuft — `run-release.sh:275` startet mit `--entrypoint ""`
  und umgeht das Entrypoint-Skript vollständig.
