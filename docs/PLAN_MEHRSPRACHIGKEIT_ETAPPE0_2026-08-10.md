# Mehrsprachigkeit DE/EN — Etappe 0: Infrastruktur und Routing

> **Für agentische Bearbeiter:** PFLICHT-SUB-SKILL: `superpowers:subagent-driven-development`
> (empfohlen) oder `superpowers:executing-plans`. Schritte tragen Checkbox-Syntax
> (`- [ ]`) zur Nachverfolgung.

**Ziel:** Paraglide JS ist installiert, das pfadbasierte Routing steht mitsamt
Ausschlussliste, und `/en` liefert eine — noch deutschsprachige — Seite aus. Es
wird in dieser Etappe **kein einziger Text übersetzt**.

**Architektur:** Ein `reroute`-Export in `src/hooks.ts` mit drei Schritten
(Legacy-Präfix → Ausschlussliste → `deLocalizeUrl`), dazu `paraglideMiddleware`
in `src/hooks.server.ts` für die serverseitige Locale und den `%lang%`-Platzhalter.
Spracherkennung ausschließlich über URL und Cookie; `Accept-Language` wirkt nur
auf `/`.

**Tech Stack:** SvelteKit 5, `@inlang/paraglide-js`, Vitest, Playwright.

**Vorlage:** [DESIGN_MEHRSPRACHIGKEIT_2026-08-10.md](DESIGN_MEHRSPRACHIGKEIT_2026-08-10.md),
Abschnitte 2, 4 und 5.6. Bei Widerspruch gewinnt der Entwurf; Abweichungen dort
nachtragen.

## Globale Randbedingungen

- **Sprache:** Bezeichner und Commit-Messages englisch, Subject kleingeschrieben.
  Kommentare und Dokumentation **deutsch**. Kommentare in `.svelte` gehören ins
  Markup, nicht in den `<script>`-Block (`CLAUDE.md`).
- **Commit-Format:** `<type>(<scope>): <beschreibung>`. Erlaubte Scopes hier:
  `config`, `build`, `api`, `ui`, `test`, `docs`.
- **Test-First ist Pflicht.** Jeder Task beginnt mit einem fehlschlagenden Test.
- **Gate vor jedem Commit:** `npm run test:quick` muss grün sein.
- **Es gibt drei Vite-Konfigurationen** — `vite.config.ts`, `vite.config.ci.ts`,
  `vite.config.preview.ts`. Ein Plugin, das nur in einer steht, fehlt in E2E oder
  Preview.
- **Kein `npm install` im Worktree**, außer der Task ändert `package-lock.json` —
  Task 1 tut das, alle anderen nicht.
- **Nicht übersetzen in dieser Etappe.** Wer hier eine Zeichenkette anfasst,
  arbeitet außerhalb des Plans.

---

## Dateiübersicht

| Datei                                                     | Verantwortung                                                       | Task |
| --------------------------------------------------------- | ------------------------------------------------------------------- | ---- |
| `project.inlang/settings.json`                            | Locale-Liste und Nachrichtenquelle (neu)                            | 1    |
| `messages/de.json`, `messages/en.json`                    | Botschaften; in Etappe 0 nur ein Platzhalter-Eintrag (neu)          | 1    |
| `package.json`                                            | `i18n:compile`, eingehängt in `test:quick`, `check`, `build`, `dev` | 1    |
| `vite.config*.ts` (3×)                                    | `paraglideVitePlugin`                                               | 1    |
| `.gitignore`                                              | `src/lib/paraglide` ausschließen                                    | 1    |
| `scripts/setup-worktree.sh`                               | Compile-Schritt neben `svelte-kit sync`                             | 1    |
| `scripts/i18nGate.test.ts`                                | Guard: `test:quick` fährt den Compile-Schritt (neu)                 | 1    |
| `src/lib/legacy-api/languagePrefix.ts`                    | zusätzlich: Ausschlussliste `istAusgeschlossen`                     | 2    |
| `src/hooks.ts`                                            | `reroute`-Komposition aus drei Schritten                            | 3    |
| `src/hooks.server.ts`                                     | `paraglideMiddleware`, `/`-Weiterleitung                            | 4, 5 |
| `src/app.html`                                            | `%lang%` statt `lang="de"`, `<meta name="language">` entfällt       | 4    |
| `e2e/i18n-routing.spec.ts`                                | Guard: Ausschlüsse liefern 404 (neu)                                | 6    |
| `src/lib/utils/format/dateTime.ts`                        | Zeitzonen-Invariante festgenagelt                                   | 7    |
| `PublicNavbar`, `PublicFooter`, `+layout`                 | interne Verweise über `localizeHref`                                | 8    |
| `src/lib/components/LanguageSwitcher.svelte`              | Sprachumschalter, nur außerhalb des iframes (neu)                   | 9    |
| `eslint.config.js`, `.prettierignore`, `vitest.config.ts` | erzeugten Code ausnehmen                                            | 1    |

---

## Task 1: Paraglide installieren und in alle Gates einhängen

**Dateien:**

- Neu: `project.inlang/settings.json`, `messages/de.json`, `messages/en.json`,
  `scripts/i18nGate.test.ts`
- Ändern: `package.json`, `vite.config.ts`, `vite.config.ci.ts`,
  `vite.config.preview.ts`, `.gitignore`, `scripts/setup-worktree.sh`

**Schnittstellen:**

- Erzeugt: Modul `$lib/paraglide/runtime` mit `deLocalizeUrl(url: URL): URL`,
  `localizeUrl(url: URL, opts?: { locale?: string }): URL`,
  `getLocale(): 'de' | 'en'`, `baseLocale`, `locales`.
- Erzeugt: Modul `$lib/paraglide/server` mit
  `paraglideMiddleware(request: Request, resolve: (args: { request: Request; locale: string }) => Response | Promise<Response>): Promise<Response>`.
- Erzeugt: Modul `$lib/paraglide/messages` mit je einer Funktion pro Botschaft.

- [ ] **Schritt 1: Guard-Test schreiben, der noch fehlschlägt**

`scripts/i18nGate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { flattenScript, readScripts } from './testGate';

/**
 * Wächter über den Paraglide-Compile-Schritt.
 *
 * Der erzeugte Code unter `src/lib/paraglide` liegt nicht im Repository. `lint`,
 * `type-check` und `check` müssen ihn trotzdem vorfinden — sonst ist ein frisch
 * ausgecheckter Worktree rot, und die Ursache sieht nach einem kaputten Setup
 * aus statt nach einem fehlenden Build-Schritt. Dieser Test hält fest, dass der
 * Schritt in `test:quick` läuft, bevor die prüfenden Kommandos starten.
 *
 * Geprüft wird gegen `'paraglide-js compile'`, nicht gegen den Skriptnamen
 * `i18n:compile`: `flattenScript` löst jeden `npm run <name>`-Verweis rekursiv
 * bis zum tatsächlichen Shell-Kommando auf — ein Skriptname taucht im Ergebnis
 * grundsätzlich nie auf, nur das Kommando, das er ausführt. Eine Assertion auf
 * `'i18n:compile'` wäre mit keiner lauffähigen `package.json` erfüllbar.
 */
describe('i18n-Compile-Schritt', () => {
	it('läuft in test:quick', () => {
		const scripts = readScripts();
		const flat = flattenScript('test:quick', scripts);
		expect(flat.some((command) => command.includes('paraglide-js compile'))).toBe(true);
	});

	it('läuft vor type-check', () => {
		const scripts = readScripts();
		const flat = flattenScript('test:quick', scripts);
		const compileIndex = flat.findIndex((command) => command.includes('paraglide-js compile'));
		const typeCheckIndex = flat.indexOf('tsc --noEmit');

		// Ein fehlender Treffer liefert -1 und wäre sonst immer "kleiner" als
		// jeder echte Index — die reine Reihenfolgeprüfung bestünde dann auch,
		// wenn der Compile-Schritt gar nicht liefe. Beide Indizes müssen also
		// zuerst tatsächlich gefunden worden sein.
		expect(compileIndex).toBeGreaterThanOrEqual(0);
		expect(typeCheckIndex).toBeGreaterThanOrEqual(0);
		expect(compileIndex).toBeLessThan(typeCheckIndex);
	});
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

```bash
npx vitest run --project server scripts/i18nGate.test.ts
```

Erwartet: FAIL — kein Kommando enthält `'paraglide-js compile'`.

- [ ] **Schritt 3: Paraglide über das offizielle Init einrichten**

```bash
npx sv add paraglide
```

Auf die Rückfragen: Basissprache `de`, weitere Sprache `en`, Demo-Seite **nicht**
anlegen.

**Bewusst nicht von Hand.** Der Befehl erzeugt `project.inlang/settings.json`
mit einer **versionsgepinnten** Modul-Referenz. Eine handgeschriebene Fassung mit
`@latest` wäre eine ungepinnte Fernabhängigkeit — in einem öffentlichen
Repository ein unnötiges Lieferketten-Risiko, und der Aufbau der Datei ändert
sich zwischen Versionen.

Danach die erzeugte Konfiguration prüfen **und den Cookie-Namen feststellen** —
Task 5 braucht ihn und darf ihn nicht raten:

```bash
cat project.inlang/settings.json
grep -rn "cookieName" src/lib/paraglide/runtime.js | head -3
```

Erwartet: `baseLocale: "de"`, `locales: ["de","en"]`, gepinnte Modul-URL ohne
`@latest`. Den gefundenen Cookie-Namen hier eintragen, bevor der Task
weitergeht:

```
Cookie-Name laut erzeugter Laufzeit: ______________
```

Weicht der `pathPattern` von `./messages/{locale}.json` ab, gewinnt die erzeugte
Fassung; die Pfade in Schritt 4 sind dann anzupassen.

Dies ist der einzige Task, der `package-lock.json` ändert; `npm install` im
Worktree ist hier ausdrücklich richtig.

- [ ] **Schritt 4: Botschaftsdateien auf den Selbsttest reduzieren**

Was `sv add` an Beispielbotschaften angelegt hat, wird durch genau diesen einen
Eintrag ersetzt.

`messages/de.json`:

```json
{
	"$schema": "https://inlang.com/schema/inlang-message-format",
	"i18n_selbsttest": "Sprachumschaltung aktiv"
}
```

`messages/en.json`:

```json
{
	"$schema": "https://inlang.com/schema/inlang-message-format",
	"i18n_selbsttest": "Language switching active"
}
```

Der eine Eintrag ist Absicht: Er beweist in Task 6, dass die Kette bis zur
gerenderten Seite trägt, ohne dass in dieser Etappe irgendein echter Text
angefasst wird.

- [ ] **Schritt 5: Plugin in alle drei Vite-Konfigurationen eintragen**

In `vite.config.ts`, `vite.config.ci.ts` und `vite.config.preview.ts` jeweils
den Import ergänzen:

```ts
import { paraglideVitePlugin } from '@inlang/paraglide-js';
```

und im `plugins`-Array **vor** `sveltekit()` einsetzen:

```ts
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true,
			// Ohne `preferredLanguage`: präfixlos ist immer Deutsch. Sonst rendert
			// dieselbe URL je nach Browser-Header zwei Inhalte — nicht cachebar und
			// für Suchmaschinen ein Duplikat. Begründung: Entwurf, Abschnitt 4.5.
			strategy: ['url', 'cookie', 'baseLocale']
		}),
```

- [ ] **Schritt 6: `.gitignore` ergänzen**

Unter der Zeile `/.svelte-kit`:

```
/src/lib/paraglide
```

- [ ] **Schritt 6b: Erzeugten Code aus Lint, Prettier und Coverage nehmen**

`src/lib/paraglide` steht in `.gitignore`, liegt aber unter `src/` — ESLint,
Prettier und die Vitest-Coverage greifen trotzdem darauf zu. Ohne diesen Schritt
ist `test:quick` nach Task 1 rot oder verrauscht.

In `eslint.config.js` zu den globalen `ignores` ergänzen:

```js
	{ ignores: ['src/lib/paraglide/**'] },
```

In `.prettierignore` anhängen:

```
src/lib/paraglide
```

In `vitest.config.ts` bei `coverage.exclude` ergänzen — neben dem vorhandenen
`**/*.testutil.ts`, aus demselben Grund: nicht ausgelieferter beziehungsweise
erzeugter Code zählt sonst als ungedeckter Produktionscode.

```js
			'src/lib/paraglide/**',
```

- [ ] **Schritt 7: Skripte in `package.json` einhängen**

```json
		"i18n:compile": "paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide",
		"check": "npm run i18n:compile && svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
		"build": "npm run i18n:compile && svelte-kit sync && vite build",
		"dev": "npm run certs:setup && npm run i18n:compile && vite dev",
		"test:quick": "npm run i18n:compile && npm run test:e2e:shards && npm run lint && npm run type-check && npm run check && npm run test:unit && npm run test:unit:client",
```

`build:docker` bekommt denselben Vorlauf wie `build`.

- [ ] **Schritt 8: Worktree-Setup ergänzen**

In `scripts/setup-worktree.sh` direkt nach dem `svelte-kit sync`-Block (um
Zeile 66) einfügen:

```sh
# Paraglide erzeugt src/lib/paraglide/ — nicht im Repository, aber von
# type-check, lint und check vorausgesetzt. Ohne diesen Schritt ist ein frischer
# Worktree rot, und zwar mit Fehlern, die nach kaputtem Setup aussehen.
if npx --no-install paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide >/dev/null 2>&1; then
	say "worktree-setup: src/lib/paraglide/ erzeugt (paraglide-js compile)"
else
	warn "paraglide-js compile fehlgeschlagen — 'npm install' im Haupt-Repo nötig?"
fi
```

- [ ] **Schritt 9: Guard-Test laufen lassen, Erfolg bestätigen**

```bash
npm run i18n:compile && npx vitest run --project server scripts/i18nGate.test.ts
```

Erwartet: PASS, 2 Tests. Zusätzlich muss `src/lib/paraglide/runtime.js`
existieren.

- [ ] **Schritt 10: Gate laufen lassen**

```bash
npm run test:quick
```

Erwartet: grün.

- [ ] **Schritt 11: Commit**

```bash
git add package.json package-lock.json project.inlang messages .gitignore vite.config.ts vite.config.ci.ts vite.config.preview.ts scripts/setup-worktree.sh scripts/i18nGate.test.ts
git commit -m "build(config): add paraglide js and wire its compile step into the gates"
```

---

## Task 2: Ausschlussliste in `languagePrefix.ts`

**Dateien:**

- Ändern: `src/lib/legacy-api/languagePrefix.ts`
- Test: `src/lib/legacy-api/languagePrefix.test.ts`

**Schnittstellen:**

- Nutzt: nichts aus Task 1.
- Erzeugt: `export function istAusgeschlossen(pfad: string): boolean` — `true`,
  wenn der Pfad **nicht** lokalisiert werden darf. Task 3 ruft sie auf.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**

An `src/lib/legacy-api/languagePrefix.test.ts` anhängen:

```ts
describe('istAusgeschlossen', () => {
	it.each([
		'/api/sightings',
		'/api/media/foo.jpg',
		'/admin',
		'/admin/sichtungen',
		'/uploads/2026/bild.jpg',
		'/health',
		'/maintenance',
		'/docs',
		'/docs/api',
		'/styleguide'
	])('schließt %s aus', (pfad) => {
		expect(istAusgeschlossen(pfad)).toBe(true);
	});

	it.each(['/', '/sichtungen', '/map', '/about', '/bestimmungshilfe'])('lokalisiert %s', (pfad) => {
		expect(istAusgeschlossen(pfad)).toBe(false);
	});

	it('trifft nur ganze Pfadsegmente', () => {
		// `/apidoku` beginnt mit `/api`, ist aber ein anderer Pfad. Ein reines
		// startsWith hätte ihn stillschweigend mit ausgeschlossen.
		expect(istAusgeschlossen('/apidoku')).toBe(false);
		expect(istAusgeschlossen('/administration')).toBe(false);
	});
});
```

Den Import in Zeile 1 der Testdatei um `istAusgeschlossen` ergänzen.

- [ ] **Schritt 2: Tests laufen lassen, Fehlschlag bestätigen**

```bash
npx vitest run --project server src/lib/legacy-api/languagePrefix.test.ts
```

Erwartet: FAIL — `istAusgeschlossen is not a function`.

- [ ] **Schritt 3: Implementieren**

An `src/lib/legacy-api/languagePrefix.ts` anhängen:

```ts
/**
 * Pfade, die **nie** ein Sprachpräfix bekommen.
 *
 * Bewusst eine Ausschluss- und keine Positivliste: Eine vergessene Positivliste
 * liefert bei einer neuen öffentlichen Seite still Deutsch aus, eine vergessene
 * Ausschlussliste erzeugt einen zusätzlichen erreichbaren Pfad — und den findet
 * `e2e/i18n-routing.spec.ts`. Ein sichtbarer Fehlschlag ist einem stillen
 * vorzuziehen.
 *
 * `/admin` steht hier, weil der Bereich einsprachig deutsch bleibt: Ein `/en/`
 * davor wäre ein Sprachversprechen, das die Oberfläche nicht einlöst — ein
 * zweiter kanonischer Pfad auf dieselbe Ansicht, nur ohne Übersetzung.
 * (Kein Sicherheitsargument: Der Zugriffsschutz auf `/admin` ist route-basiert
 * — `requireUserRole(url, locals.user, [...])` in
 * `src/routes/admin/+layout.server.ts` — und griffe unverändert auch unter
 * `/en/admin`. `event.url.pathname` in `hooks.server.ts` dient dort nur dem
 * `/rest_sichtungen`-CSRF-Hinweis und dem Error-Logging, nicht der Autorisierung.)
 *
 * Bewusst **ohne** `/sichtungen`: Unter `src/routes/sichtungen/` liegt zwar eine
 * reale Route, aber nur der Legacy-API-Endpunkt `showreports.json` (bereits über
 * `/rest_sichtungen` und `LEGACY_PFADE` abgedeckt) — keine Seitenroute. Ein
 * Präfix hier hätte `istAusgeschlossen('/sichtungen')` fälschlich
 * ausgeschlossen; der bloße Pfad `/sichtungen` existiert als Seite nicht und
 * muss lokalisierbar bleiben.
 */
const NICHT_LOKALISIERT = [
	'/api',
	'/admin',
	'/uploads',
	'/health',
	'/maintenance',
	'/docs',
	'/styleguide',
	'/rest_sichtungen'
] as const;

/**
 * Ob ein Pfad von der Sprachlokalisierung ausgenommen ist.
 *
 * Vergleicht auf **ganze Segmente**: `/apidoku` beginnt zwar mit `/api`, ist
 * aber ein anderer Pfad und wird lokalisiert.
 *
 * @param pfad Pfad ohne Sprachpräfix und ohne Query-String
 */
export function istAusgeschlossen(pfad: string): boolean {
	return NICHT_LOKALISIERT.some((praefix) => pfad === praefix || pfad.startsWith(`${praefix}/`));
}
```

- [ ] **Schritt 4: Tests laufen lassen, Erfolg bestätigen**

```bash
npx vitest run --project server src/lib/legacy-api/languagePrefix.test.ts
```

Erwartet: PASS.

- [ ] **Schritt 5: Commit**

```bash
git add src/lib/legacy-api/languagePrefix.ts src/lib/legacy-api/languagePrefix.test.ts
git commit -m "feat(api): add path exclusion list for locale routing"
```

---

## Task 3: `reroute`-Komposition

**Dateien:**

- Ändern: `src/hooks.ts`
- Test neu: `src/hooks.test.ts`

**Schnittstellen:**

- Nutzt: `stripLegacyLanguagePrefix`, `istAusgeschlossen` (Task 2),
  `deLocalizeUrl` (Task 1).
- Erzeugt: `export const reroute: Reroute`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

`src/hooks.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { reroute } from './hooks';

/**
 * Reihenfolge der drei Schritte, nicht ihre Einzelteile — die sind in
 * `languagePrefix.test.ts` und bei Paraglide geprüft. Hier geht es darum, dass
 * der Legacy-Vertrag vor der Lokalisierung greift: `/en/rest_sichtungen` muss
 * die deutsche Route treffen, nicht eine englische Oberfläche.
 *
 * Ein Pfad wie `/en/api/sightings` beweist die Reihenfolge NICHT: Er berührt
 * ausschließlich Schritt 2 (Ausschlussliste) und Schritt 3 (Lokalisierung),
 * ein vollständig entfernter Schritt 1 ließe diesen Test unverändert grün.
 * Echte Divergenz zwischen den Schritten entsteht nur bei einem Legacy-Pfad
 * **mit** `/de/`-Präfix: Liefe die `/de/`-Ablehnung (Schritt 2) vor dem
 * Legacy-Präfix (Schritt 1), bekäme `/de/rest_sichtungen/antworten.json`
 * fälschlich `undefined` (404) statt der deutschen Legacy-Antwort — für alle
 * vier Legacy-Pfade unter `/de/`, mit einem live angebundenen iOS-Client der
 * teuerste denkbare Regress.
 */
const pfadNach = (url: string): string | undefined => {
	const ergebnis = reroute({ url: new URL(url, 'https://example.test') } as never);
	return typeof ergebnis === 'string' ? ergebnis : undefined;
};

describe('reroute', () => {
	it('schneidet das Legacy-Präfix ab und trifft die deutsche Route', () => {
		expect(pfadNach('/en/rest_sichtungen/antworten.json')).toBe('/rest_sichtungen/antworten.json');
	});

	it('schreibt ausgeschlossene Pfade nicht um', () => {
		expect(pfadNach('/en/api/sightings')).toBeUndefined();
		expect(pfadNach('/en/admin/sichtungen')).toBeUndefined();
	});

	it('lokalisiert eine Seitenroute', () => {
		expect(pfadNach('/en/map')).toBe('/map');
	});

	it('lässt einen präfixlosen Pfad unverändert', () => {
		expect(pfadNach('/map')).toBe('/map');
	});

	it('schreibt /de/ nicht um — Deutsch ist präfixlos', () => {
		// Ohne ausdrückliche Ablehnung räumt deLocalizeUrl das Präfix ab und
		// liefert die deutsche Seite unter einer zweiten URL aus.
		expect(pfadNach('/de/sichtungen')).toBeUndefined();
		expect(pfadNach('/de')).toBeUndefined();
	});

	it('schneidet /de/ vor einem Legacy-Pfad ab, statt ihn per /de/-Ablehnung zu blockieren', () => {
		// Der eigentliche Reihenfolge-Wächter (siehe Docstring oben) — nicht die
		// beiden /en/-Fälle weiter oben.
		expect(pfadNach('/de/rest_sichtungen/antworten.json')).toBe('/rest_sichtungen/antworten.json');
	});

	it('lehnt /de/ case-insensitiv ab, analog zu Paraglides toLocale()', () => {
		// toLocale() in runtime.js vergleicht per toLowerCase() — ein rein
		// kleingeschriebener Regex ließe /DE/... durch, und deLocalizeUrl würde
		// es trotzdem als Deutsch erkennen: zwei URLs für dieselbe Seite.
		expect(pfadNach('/DE/sichtungen')).toBeUndefined();
	});
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

```bash
npx vitest run --project server src/hooks.test.ts
```

Erwartet: FAIL — `/en/api/sightings` wird umgeschrieben statt `undefined` zu liefern.

- [ ] **Schritt 3: `src/hooks.ts` ersetzen**

```ts
import { baseLocale, deLocalizeUrl, toLocale } from '$lib/paraglide/runtime';
import { istAusgeschlossen, stripLegacyLanguagePrefix } from '$lib/legacy-api/languagePrefix';
import type { Reroute } from '@sveltejs/kit';

/**
 * Drei Schritte, und die Reihenfolge ist nicht beliebig.
 *
 * 1. **Legacy-Präfix.** Für die vier Pfade aus `LEGACY_PFADE` ist `/en/` reine
 *    Routenkosmetik mit **deutscher** Antwort — so hat es CakePHP gemacht, und
 *    ein iOS-Client hängt live daran. Muss vor der Lokalisierung greifen.
 * 2. **Ausschlussliste.** `undefined` heißt „nicht umschreiben": SvelteKit löst
 *    den Pfad wörtlich auf, findet keine Route `/en/api/...` und liefert 404.
 *    Genau das ist gewollt.
 * 3. **Lokalisierung** für alles Übrige.
 *
 * `reroute` betrifft nur die Routenauflösung. `event.url` bleibt in
 * `hooks.server.ts` und in den Endpunkten die vom Client gesendete URL — der
 * Auth-Schutz sieht weiterhin den echten Pfad.
 */
export const reroute: Reroute = ({ url }) => {
	const legacy = stripLegacyLanguagePrefix(url.pathname);
	if (legacy !== undefined) return legacy;

	// `/de/x` ist kein zweiter Weg auf `/x`: Deutsch ist bei `baseLocale: 'de'`
	// präfixlos. `deLocalizeUrl` räumt das Präfix bereitwillig ab und lieferte
	// damit zwei URLs für denselben Inhalt aus. Die vier Legacy-Pfade behalten
	// ihr `/de/` über Schritt 1 oben — sie sind hier schon durch.
	//
	// Über `toLocale` geprüft, nicht über einen eigenen Regex: `toLocale`
	// vergleicht case-insensitiv (`toLowerCase()`, runtime.js), genau wie
	// Paraglides eigene Präfix-Erkennung. Ein eigener kleingeschriebener Regex
	// hätte `/DE/...` durchgelassen, obwohl `deLocalizeUrl` es trotzdem als
	// Deutsch erkannt hätte — zwei URLs für dieselbe Seite, exakt der Fehler,
	// den diese Ablehnung verhindern soll.
	const erstesSegment = url.pathname.split('/')[1];
	if (toLocale(erstesSegment) === baseLocale) return undefined;

	const entlokalisiert = deLocalizeUrl(url).pathname;
	if (istAusgeschlossen(entlokalisiert)) return undefined;

	return entlokalisiert;
};
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

```bash
npx vitest run --project server src/hooks.test.ts
```

Erwartet: PASS, 7 Tests.

- [ ] **Schritt 5: Commit**

```bash
git add src/hooks.ts src/hooks.test.ts
git commit -m "feat(api): compose legacy prefix, exclusions and locale in reroute"
```

---

## Task 4: `paraglideMiddleware` und `%lang%`

**Dateien:**

- Ändern: `src/hooks.server.ts`, `src/app.html`
- Test: `e2e/i18n-routing.spec.ts` (in Task 6 angelegt — hier nur manuell geprüft)

**Schnittstellen:**

- Nutzt: `paraglideMiddleware` (Task 1).
- Erzeugt: nichts, was spätere Tasks aufrufen.

- [ ] **Schritt 1: `src/app.html` anpassen**

`<html lang="de" data-theme="meeresmuseum">` wird zu:

```html
<html lang="%lang%" data-theme="meeresmuseum"></html>
```

Und die Zeile `<meta name="language" content="de" />` **ersatzlos entfernen** —
sie ist kein von Suchmaschinen ausgewertetes Merkmal und wäre nur eine zweite,
potenziell widersprüchliche Quelle neben `<html lang>`.

- [ ] **Schritt 2: Middleware in `src/hooks.server.ts` einhängen**

Import ergänzen:

```ts
import { paraglideMiddleware } from '$lib/paraglide/server';
```

Und einen `handle`-Abschnitt **nach** der bestehenden Auth-Prüfung ergänzen (die
prüft `event.url.pathname` und muss das vor jeder Umschreibung tun):

```ts
/**
 * Löst die Locale serverseitig auf und ersetzt `%lang%` im ausgelieferten HTML.
 *
 * Ohne diesen Schritt gibt es keine serverseitig bekannte Sprache — SSR rendert
 * dann in der Standardsprache, während der Client umschaltet, und der
 * Platzhalter bliebe wörtlich im Dokument stehen.
 *
 * Steht bewusst NACH der Auth-Prüfung: Die hängt an `event.url.pathname`, und
 * dieser Pfad darf ihr nicht verschoben unter den Händen weggezogen werden.
 */
const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;
		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%lang%', locale)
		});
	});
```

und in die bestehende `sequence(...)` als **letztes** Glied aufnehmen.

- [ ] **Schritt 3: Dev-Server starten und prüfen**

```bash
npm run dev
```

Danach `https://localhost:4000/` aufrufen und im ausgelieferten Quelltext
`<html lang="de"` erwarten, `https://localhost:4000/en` und dort
`<html lang="en"` erwarten. In beiden Fällen darf **kein** `%lang%` im Dokument
stehen.

- [ ] **Schritt 4: Gate laufen lassen**

```bash
npm run test:quick
```

Erwartet: grün. `e2e/seo-meta.spec.ts` darf nicht brechen — falls doch, prüft er
das entfernte `<meta name="language">` und ist entsprechend anzupassen.

- [ ] **Schritt 5: Commit**

```bash
git add src/hooks.server.ts src/app.html
git commit -m "feat(ui): resolve locale server-side and fill the lang placeholder"
```

---

## Task 5: `Accept-Language` — nur auf `/`

**Dateien:**

- Ändern: `src/hooks.server.ts`
- Test neu: `src/lib/i18n/startseitenWeiterleitung.test.ts`
- Neu: `src/lib/i18n/startseitenWeiterleitung.ts`

**Schnittstellen:**

- Erzeugt: `export function zielFuerStartseite(pfad: string, search: string, acceptLanguage: string | null, cookieLocale: string | null): string | null` — Zielpfad (inkl. erhaltenem Query-String) oder `null`, wenn nicht weitergeleitet wird.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**

`src/lib/i18n/startseitenWeiterleitung.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { zielFuerStartseite } from './startseitenWeiterleitung';

describe('zielFuerStartseite', () => {
	it('leitet bei englischem Header auf /en', () => {
		expect(zielFuerStartseite('/', '', 'en-GB,en;q=0.9', null)).toBe('/en');
	});

	it('leitet bei deutschem Header nicht', () => {
		expect(zielFuerStartseite('/', '', 'de-DE,de;q=0.9', null)).toBeNull();
	});

	it('respektiert eine ausdrückliche Wahl im Cookie', () => {
		expect(zielFuerStartseite('/', '', 'en-GB,en;q=0.9', 'de')).toBeNull();
	});

	it('wirkt nur auf der Startseite', () => {
		// Sonst wäre jede präfixlose URL je nach Browser zweierlei Inhalt — nicht
		// cachebar und für Suchmaschinen ein Duplikat.
		expect(zielFuerStartseite('/sichtungen', '', 'en-GB,en;q=0.9', null)).toBeNull();
	});

	it('leitet ohne Header nicht', () => {
		expect(zielFuerStartseite('/', '', null, null)).toBeNull();
	});

	it('erhält bestehende Query-Parameter (z. B. einen Kampagnen-Marker aus einem Museums-Link)', () => {
		// Ein Redirect, der den Query-String verschluckt, wirft einen solchen
		// Marker weg — dieselbe Zusage gilt für reportKindHref() in +page.svelte
		// für jeden Klick nach der Hydration.
		expect(zielFuerStartseite('/', '?meldung=totfund', 'en-GB,en;q=0.9', null)).toBe(
			'/en?meldung=totfund'
		);
	});
});
```

- [ ] **Schritt 2: Tests laufen lassen, Fehlschlag bestätigen**

```bash
npx vitest run --project server src/lib/i18n/startseitenWeiterleitung.test.ts
```

Erwartet: FAIL — Modul nicht gefunden.

- [ ] **Schritt 3: Implementieren**

`src/lib/i18n/startseitenWeiterleitung.ts`:

```ts
/**
 * Einmalige Sprachweiterleitung — ausschließlich auf `/`.
 *
 * `Accept-Language` steht bewusst **nicht** in der Paraglide-Strategie: Stünde
 * es dort, würde `/sichtungen` je nach Browser-Header zwei verschiedene Inhalte
 * unter derselben URL ausliefern. Nicht cachebar, für Suchmaschinen ein
 * Duplikat, und hinter der iframe-Einbettung auf meeresmuseum.de besonders
 * schwer zu durchschauen.
 *
 * Die Startseite ist der einzige Ort, an dem ein Nutzer „ankommt" — dort ist die
 * Vermutung nützlich und ihre Kosten sind auf eine Antwort begrenzt. Diese eine
 * Antwort trägt `Vary: Accept-Language`.
 *
 * @param pfad            Pfad der Anfrage, ohne Query-String
 * @param search          Query-String der Anfrage, inkl. führendem `?` oder leer
 * @param acceptLanguage  Header-Wert oder `null`
 * @param cookieLocale    Ausdrückliche frühere Wahl oder `null`
 * @returns Zielpfad (inkl. erhaltenem Query-String), oder `null` wenn nicht
 *          weitergeleitet wird
 */
export function zielFuerStartseite(
	pfad: string,
	search: string,
	acceptLanguage: string | null,
	cookieLocale: string | null
): string | null {
	if (pfad !== '/') return null;
	// Eine getroffene Wahl schlägt die Vermutung — immer, in beide Richtungen.
	if (cookieLocale) return null;
	if (!acceptLanguage) return null;

	const bevorzugt = acceptLanguage.split(',')[0]?.trim().toLowerCase() ?? '';
	if (!bevorzugt.startsWith('en')) return null;

	// Query-String erhalten: Ein Kampagnen-Marker aus einem Museums-Link (siehe
	// reportKindHref() in +page.svelte) darf die Weiterleitung nicht wegwerfen.
	// Ein Literal `'/en'` täte das stillschweigend.
	return `/en${search}`;
}
```

- [ ] **Schritt 4: Tests laufen lassen, Erfolg bestätigen**

```bash
npx vitest run --project server src/lib/i18n/startseitenWeiterleitung.test.ts
```

Erwartet: PASS, 6 Tests.

- [ ] **Schritt 5: In `hooks.server.ts` verwenden**

Vor `handleParaglide` in die `sequence` einsetzen:

```ts
// Name aus Task 1, Schritt 3 — NICHT raten. Steht er falsch hier, greift die
// Regel „ausdrückliche Wahl schlägt Vermutung" nie, und der Unit-Test in
// Schritt 4 bleibt trotzdem grün, weil er die Funktion isoliert prüft.
const LOCALE_COOKIE = '<aus Task 1, Schritt 3 eintragen>';

const handleStartseitenSprache: Handle = async ({ event, resolve }) => {
	const ziel = zielFuerStartseite(
		event.url.pathname,
		event.url.search,
		event.request.headers.get('accept-language'),
		event.cookies.get(LOCALE_COOKIE) ?? null
	);
	// `Vary` gehört AUF die Weiterleitung, nicht nur auf die normale Antwort:
	// Die 302 ist die inhaltsverhandelte Antwort. Ohne den Header cacht ein
	// Zwischenspeicher sie für alle Sprachen.
	if (ziel)
		return new Response(null, {
			status: 302,
			headers: { location: ziel, vary: 'Accept-Language' }
		});

	const antwort = await resolve(event);
	// Nur diese eine Antwort variiert nach Header — alle übrigen Pfade bleiben
	// voll cachebar.
	if (event.url.pathname === '/') antwort.headers.set('Vary', 'Accept-Language');
	return antwort;
};
```

- [ ] **Schritt 6: Gate laufen lassen und committen**

```bash
npm run test:quick
git add src/lib/i18n src/hooks.server.ts
git commit -m "feat(api): redirect the landing page once by accept-language"
```

---

## Task 6: E2E-Guard für die Ausschlüsse

**Dateien:**

- Neu: `e2e/i18n-routing.spec.ts`
- Ändern: die Shard-Zuordnung (siehe `npm run test:e2e:shards`)

- [ ] **Schritt 1: Test schreiben**

`e2e/i18n-routing.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

/**
 * Wächter über die Ausschlussliste aus `languagePrefix.ts`.
 *
 * Die Liste ist bewusst eine Ausschluss- und keine Positivliste: Ein vergessener
 * Eintrag erzeugt einen zusätzlichen, erreichbaren Pfad — sichtbar hier, statt
 * still im Betrieb. `/en/admin` steht dabei aus einem Umfangsgrund auf der
 * Liste, nicht aus einem Sicherheitsgrund: Der Zugriffsschutz auf `/admin` ist
 * route-basiert (`requireUserRole(...)` in
 * `src/routes/admin/+layout.server.ts`) und griffe unverändert auch unter
 * `/en/admin`, wäre der Pfad lokalisiert. Ohne den Eintrag entstünde trotzdem
 * ein zweiter, unübersetzter kanonischer Pfad auf dieselbe Ansicht — deshalb
 * bleibt er ausgeschlossen.
 */
test.describe('Sprachpräfix-Routing', () => {
	for (const pfad of [
		'/en/api/sightings',
		'/en/admin',
		'/en/admin/sichtungen',
		'/en/uploads/test.jpg',
		'/en/health',
		'/en/rest_sichtungen/view/1840.json',
		'/de',
		'/de/sichtungen'
	]) {
		test(`${pfad} liefert 404`, async ({ request }) => {
			expect((await request.get(pfad)).status()).toBe(404);
		});
	}

	test('/en liefert die Seite aus', async ({ page }) => {
		await page.goto('/en');
		await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	});

	test('/en/admin ist kein zweiter Weg auf /admin', async ({ request }) => {
		// Getrennt geprüft, weil ein 404 aus dem falschen Grund entstehen könnte:
		// Antwortet der Auth-Ablauf auf /admin mit 302 auf den Login, muss
		// /en/admin sich davon unterscheiden — es darf gar keine Route treffen.
		const geschuetzt = await request.get('/admin', { maxRedirects: 0 });
		const praefix = await request.get('/en/admin', { maxRedirects: 0 });
		expect(praefix.status()).toBe(404);
		expect(praefix.status()).not.toBe(geschuetzt.status());
	});

	test('/ bleibt deutsch', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('html')).toHaveAttribute('lang', 'de');
	});

	test('Legacy-Präfix liefert weiterhin deutsche Werte', async ({ request }) => {
		const antwort = await request.get('/en/rest_sichtungen/antworten.json');
		expect(antwort.status()).toBe(200);
		expect(JSON.stringify(await antwort.json())).toContain('Grobe See');
	});
});
```

- [ ] **Schritt 2: Test laufen lassen**

```bash
npx playwright test e2e/i18n-routing.spec.ts
```

Erwartet: alle grün. Läuft ein E2E-Lauf in einem Nachbar-Worktree, erst dort
abwarten — parallele Läufe erzeugen Last-Artefakte, die wie echte Fehlschläge
aussehen.

- [ ] **Schritt 3: Shard-Zuordnung prüfen**

```bash
npm run test:e2e:shards
```

Erwartet: keine Meldung über einen nicht zugeordneten Spec. Andernfalls die
Datei in der Shard-Konfiguration eintragen.

- [ ] **Schritt 4: Commit**

```bash
git add e2e/i18n-routing.spec.ts
git commit -m "test(test): guard the locale routing exclusions"
```

---

## Task 7: Zeitzonen-Invariante festnageln

**Dateien:**

- Test: `src/lib/utils/format/dateTime.test.ts`
- Ändern: nichts — dieser Task ist ein Guard, keine Umstellung.

**Warum kein Umbau.** `formatLocalDateTime` in
[dateTime.ts:49](../src/lib/utils/format/dateTime.ts#L49) nimmt bereits einen
`locale`-Parameter (`locale: string = APP_LOCALE`). Es ist also nichts
umzustellen — die Aufrufstellen bekommen in **Etappe 2** die aktive Locale
durchgereicht. Was hier fehlt, ist die Absicherung: dass ein zweisprachiger
Aufruf die Zeitzone nicht mitverschiebt. Dieser Test muss **vor** Etappe 2
stehen, sonst schützt er nichts.

**Schnittstellen:**

- Nutzt: `formatLocalDateTime(utcDateTime, format?, locale?)` — vorhanden.
- Erzeugt: nichts.

- [ ] **Schritt 1: Charakterisierungstest schreiben**

An `src/lib/utils/format/dateTime.test.ts` anhängen:

```ts
describe('Locale und Zeitzone', () => {
	it('formatiert unter englischer Locale englisch', () => {
		const datum = '2026-07-15T12:00:00Z';
		expect(formatLocalDateTime(datum, 'date', 'en-GB')).not.toBe(
			formatLocalDateTime(datum, 'date', 'de-DE')
		);
	});

	it('bleibt in beiden Sprachen auf Europe/Berlin', () => {
		// 22:30 UTC, NICHT 23:30: Um 23:30 UTC zeigen Berlin (Sommerzeit, 00:30)
		// UND London (Sommerzeit, 23:30) noch denselben Kalendertag — eine
		// versehentliche Kopplung en → Europe/London wäre an diesem Zeitpunkt
		// unsichtbar grün geblieben. Um 22:30 UTC ist Berlin bereits der 16.
		// (00:30), London noch der 15. (23:30) — die Zonen fallen also
		// tatsächlich auseinander, und der Test wird bei einer
		// Locale→Zone-Kopplung wirklich rot. Koppelt jemand die Zeitzone an die
		// Locale, zeigt eine Sichtung den falschen Tag — ein Datenfehler, keine
		// Darstellungsfrage. Siehe docs/ENVIRONMENT.md, Abschnitt TZ, und den
		// Kommentar an berlinToday() im Sichtungsschema.
		const spaet = '2026-07-15T22:30:00Z';

		// `de-DE`/`en-GB` allein reichen nicht: Eine Zone-Map, die nur nach den
		// kurzen Tags schlüsselt (`{ de: 'Europe/Berlin', en: 'Europe/London' }`),
		// träfe bei den langen BCP-47-Tags keinen Schlüssel, fiele auf den
		// Berlin-Default zurück und bliebe grün — während die Anwendung mit dem
		// kurzen Tag (`de`/`en`, so wie sie in `project.inlang/settings.json`
		// konfiguriert sind und ab Etappe 2 durchgereicht werden) den falschen
		// Tag zeigt. Beide Tag-Formen sind deshalb Teil dieses Tests.
		expect(formatLocalDateTime(spaet, 'date', 'de-DE')).toContain('16');
		expect(formatLocalDateTime(spaet, 'date', 'en-GB')).toContain('16');
		expect(formatLocalDateTime(spaet, 'date', 'de')).toContain('16');
		expect(formatLocalDateTime(spaet, 'date', 'en')).toContain('16');
	});
});
```

- [ ] **Schritt 2: Test laufen lassen**

```bash
npx vitest run --project server src/lib/utils/format/dateTime.test.ts
```

Erwartet: PASS. **Schlägt er fehl, ist das ein echter Befund** — dann fehlt der
Formatierung die feste `timeZone: 'Europe/Berlin'`-Angabe, und sie ist zu
ergänzen, bevor der Task weitergeht.

- [ ] **Schritt 3: Nicht-anzufassen-Liste im Datei-Doc festhalten**

Als Kommentar über `formatLocalDateTime` ergänzen:

```ts
/**
 * Die `locale` steuert **nur** die Darstellung. Die Zeitzone bleibt fest auf
 * `Europe/Berlin`, weil der Sichtungstag fachlich Berliner Ortszeit ist.
 *
 * Ausdrücklich NICHT an die Locale zu koppeln, auch wenn sie beim Aufräumen der
 * `de-DE`-Fundstellen danach aussehen:
 *   - `berlinCalendarDayIso()` unten und `berlinToday()` im Sichtungsschema
 *     benutzen `sv-SE` für ISO-Reihenfolge — Rechnung, keine Darstellung.
 *   - `formatForExport`, `formatForKmlExport`, `formatForXmlExport` bedienen
 *     Datenformate mit festem Vertrag (Entwurf, Abschnitt 6).
 */
```

- [ ] **Schritt 4: Gate laufen lassen und committen**

```bash
npm run test:quick
git add src/lib/utils/format
git commit -m "test(test): pin the europe/berlin invariant across locales"
```

---

## Task 8: Interne Verweise lokalisieren

**Dateien:**

- Ändern: `src/lib/components/PublicNavbar.svelte`,
  `src/lib/components/PublicFooter.svelte`, `src/routes/+layout.svelte` und jeden
  weiteren öffentlichen `<a href="/…">` außerhalb von `/admin`
- Test neu: `e2e/i18n-links.spec.ts`

**Warum das in Etappe 0 gehört und nicht in Etappe 2.** Ohne diesen Task zeigt
auf `/en` jeder interne Verweis weiter auf `/sichtungen`, `/map`, `/about` — der
Nutzer fällt beim **ersten Klick** zurück auf Deutsch. Im iframe gibt es keine
Navigation, über die er zurückfände. Das ist Routing, nicht Text: `/en` wäre
sonst erreichbar, aber unbenutzbar, und die Definition of Done dieser Etappe
wäre unehrlich.

**Schnittstellen:**

- Nutzt: `localizeHref(pfad: string): string` aus `$lib/paraglide/runtime`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

`e2e/i18n-links.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('bleibt beim Navigieren in der englischen Fassung', async ({ page }) => {
	await page.goto('/en');
	await page
		.getByRole('link', { name: /map|karte/i })
		.first()
		.click();
	await expect(page).toHaveURL(/\/en\//);
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

```bash
npx playwright test e2e/i18n-links.spec.ts
```

Erwartet: FAIL — die URL trägt nach dem Klick kein `/en/` mehr.

- [ ] **Schritt 3: Verweise umstellen**

In jeder betroffenen Komponente:

```svelte
<script lang="ts">
	import { localizeHref } from '$lib/paraglide/runtime';
</script>

<a href={localizeHref('/map')}>…</a>
```

**Nicht umstellen:** Verweise nach `/admin`, `/api`, `/uploads`, `/docs` und
`/styleguide` — sie stehen auf der Ausschlussliste aus Task 2, und ein
lokalisierter Verweis dorthin erzeugte eine 404.

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

```bash
npx playwright test e2e/i18n-links.spec.ts
```

Erwartet: PASS.

- [ ] **Schritt 5: Commit**

```bash
git add src/lib/components src/routes/+layout.svelte e2e/i18n-links.spec.ts
git commit -m "feat(ui): localize internal links so a locale survives navigation"
```

---

## Task 9: Sprachumschalter

**Dateien:**

- Neu: `src/lib/components/LanguageSwitcher.svelte`
- Ändern: `src/lib/components/PublicNavbar.svelte`
- Test neu: `src/lib/components/LanguageSwitcher.svelte.test.ts`

**Erwartungshaltung dämpfen.** Der Umschalter sitzt in der Navigation und ist
damit **im iframe unsichtbar** ([PublicNavbar.svelte:63](../src/lib/components/PublicNavbar.svelte#L63)).
Er ist Bequemlichkeit für Direktaufrufer, ausdrücklich **kein** tragender Weg zur
englischen Fassung — den liefert die Einbettung der Elternseite. Genau an dieser
Fehlannahme ist `/bestimmungshilfe` schon einmal gescheitert
([IFRAME_EINBETTUNG.md](IFRAME_EINBETTUNG.md)).

- [ ] **Schritt 1: Fehlschlagenden Komponententest schreiben**

`src/lib/components/LanguageSwitcher.svelte.test.ts`:

```ts
import { render } from 'vitest-browser-svelte';
import { expect, it } from 'vitest';
import LanguageSwitcher from './LanguageSwitcher.svelte';

it('verweist auf die jeweils andere Sprache und kennzeichnet sie', async () => {
	const bildschirm = render(LanguageSwitcher);
	const verweis = bildschirm.getByRole('link', { name: 'English' });
	await expect.element(verweis).toHaveAttribute('hreflang', 'en');
	// Ohne data-sveltekit-reload navigiert SvelteKit clientseitig, während die
	// Laufzeit-Locale aus dem zuerst gerenderten Dokument stammt — URL, SSR und
	// Locale laufen auseinander.
	await expect.element(verweis).toHaveAttribute('data-sveltekit-reload');
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

```bash
npx vitest run --project client src/lib/components/LanguageSwitcher.svelte.test.ts
```

Erwartet: FAIL — Komponente existiert nicht.

- [ ] **Schritt 3: Komponente schreiben**

`src/lib/components/LanguageSwitcher.svelte`:

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import { getLocale, localizeHref } from '$lib/paraglide/runtime';

	const andere = $derived(getLocale() === 'de' ? 'en' : 'de');
	const beschriftung = $derived(andere === 'en' ? 'English' : 'Deutsch');
	const ziel = $derived(localizeHref(page.url.pathname, { locale: andere }));
</script>

<!--
	`data-sveltekit-reload` ist Pflicht, nicht Vorsicht: Ohne vollen Seitenaufbau
	bleibt die Laufzeit-Locale die des zuerst gerenderten Dokuments, während sich
	die URL ändert. `hreflang` sagt Suchmaschinen und Screenreadern, wohin der
	Verweis führt; `lang` am Element sorgt dafür, dass „English" englisch
	vorgelesen wird und nicht deutsch.
-->
<a href={ziel} hreflang={andere} lang={andere} data-sveltekit-reload class="btn btn-ghost btn-sm">
	{beschriftung}
</a>
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

```bash
npx vitest run --project client src/lib/components/LanguageSwitcher.svelte.test.ts
```

Erwartet: PASS.

- [ ] **Schritt 5: In die Navigation einsetzen**

In `PublicNavbar.svelte` innerhalb des bestehenden `{#if isNotIFrame}`-Blocks
einfügen — nicht daneben. Außerhalb wäre er im iframe sichtbar, und dort gehört
er nicht hin.

- [ ] **Schritt 6: Gate laufen lassen und committen**

```bash
npm run test:quick
git add src/lib/components
git commit -m "feat(ui): add a language switcher to the public navbar"
```

---

## Abschluss der Etappe

- [x] **Dokumentation nachgezogen** (Commit `7dafd5e7`). In
      `src/lib/legacy-api/languagePrefix.ts` und
      [LEGACY_API_SPECIFICATION.md](LEGACY_API_SPECIFICATION.md) stand die
      Begründung „`/en/` vor der Startseite bleibt 404, weil die Anwendung
      einsprachig deutsch ist" — die Prämisse galt nicht mehr und wurde
      umgeschrieben. Die Begründung zu `/en/admin` wurde im selben Commit
      korrigiert: `/admin` bleibt aus einem Umfangsgrund ausgeschlossen
      (einsprachig deutsches Team), nicht aus einem Sicherheitsgrund — der
      Zugriffsschutz ist route-basiert (`requireUserRole` in
      `src/routes/admin/+layout.server.ts`) und unabhängig von
      `hooks.server.ts`.
- [ ] **`docs/WORKTREES.md`** um den Paraglide-Compile-Schritt ergänzen. Noch
      offen — kein entsprechender Abschnitt in der Datei.
- [ ] **Vollständiger E2E-Lauf**: `npm run test:e2e` (ohne `CI=1`, ohne
      parallelen Lauf in einem Nachbar-Worktree). Noch offen — belegt ist
      bisher nur der `map`-Shard (Task 6, 140/140 grün) und ein
      Deckungsnachweis 2/19, nicht die volle Suite.
- [x] **Produktions-Build verifiziert.** Task 4 hatte offengelassen, dass
      `npm run build` nie lief, nur der Dev-Server. Der abschließende
      Branch-Review hat das nachgeholt: mergefähig, kein Critical, Prod-Build
      verifiziert.

**Definition of Done:** `/en` liefert eine Seite mit `lang="en"` aus **und
bleibt beim Navigieren englisch**, der Umschalter führt außerhalb des iframes
hin und zurück, alle Ausschlüsse und `/de/…` liefern 404, die Legacy-API
antwortet unverändert deutsch, und `npm run test:quick` ist in einem frisch
aufgesetzten Worktree grün.

**Aufwand dieser Etappe: 4–5 Tage** statt der zuerst genannten 3–4. Die
Verweis-Lokalisierung (Task 8) und der Umschalter (Task 9) waren dort
fälschlich später einsortiert; sie sind Routing und gehören hierher. Die
Gesamtschätzung steigt entsprechend auf 16–23 Personentage; `hreflang` wandert
im Gegenzug nach Etappe 2. Beides ist im Entwurf nachgetragen.

**`/en` ist damit öffentlich erreichbar, aber vollständig deutschsprachig.** Das
ist beabsichtigt. Der ursprüngliche Plan sah vor, `/en` bis Etappe 3
zusätzlich in die Ausschlussliste aufzunehmen und den Pfad damit 404 zu
liefern; umgesetzt wurde stattdessen Entwurf Abschnitt 9.1, Option C: ein
Header-Riegel (`noindexEnglishPages` in `src/hooks.server.ts`) sendet
`X-Robots-Tag: noindex, follow` für alle `/en`-Antworten, solange die
Übersetzung aussteht. Grund für den Wechsel: `/en` steckt bereits in mehreren
E2E-Tests aus Task 6, ein nachträgliches Sperren hätte rund zehn davon rot
gemacht. Der Riegel muss beim Abschluss der Übersetzung entfernt werden — und
im selben Schritt `hreflang` ergänzt werden, sonst kippt das
Duplicate-Content-Risiko nur in die andere Richtung.

---

## Nicht in diesem Plan

Etappen 1–5 des Entwurfs bekommen je einen eigenen Plan, sobald die vorherige
steht. Sie sind hier bewusst ausgelassen, nicht vergessen:

| Etappe | Inhalt                                                                |
| ------ | --------------------------------------------------------------------- |
| 1      | Schichten A + B — `sightingSchema.ts`, `formOptions/`                 |
| 2      | Schicht C — öffentliches Markup, Plurale, Aufrufstellen von Task 7    |
| 3      | Einwilligung und Nachweis, Sprachsuffix an den Fassungskennungen      |
| 4      | Schicht E — Inhaltsseiten                                             |
| 5      | Hartcodiert-Scan (Entwurf 8.3), Vollständigkeitsprüfung, EN-Rauchtest |

**`hreflang` ist bewusst verschoben.** Der Entwurf führt es unter Etappe 0
(Abschnitt 4.6), aber die Verweise gehören in den Kopf-Block jeder Route — und
die zwölf `+page.svelte` werden in Etappe 2 ohnehin angefasst. Sie hier einmal
und dort ein zweites Mal zu öffnen wäre doppelte Arbeit an denselben Dateien.
Der Entwurf ist entsprechend nachzutragen.
