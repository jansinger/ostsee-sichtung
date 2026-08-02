import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Wächter über eine Kopplung, die sonst erst im Docker-Build auffällt:
 * `npm run build` lädt vite.config.ts, und jeder Modul-Import darin muss im
 * Build-Kontext liegen. `.dockerignore` schließt `src/tools` pauschal aus —
 * fehlt die Ausnahme für eine importierte Datei, bricht schon das Laden der
 * Config ab (UNRESOLVED_IMPORT), lange bevor irgendetwas gebaut wird.
 * Passiert mit `vite-stable-dep-hash.ts` und erneut mit `dev-server-identity.ts`.
 */

const repoRoot = new URL('../../', import.meta.url);

/** Vite-Configs, die im Docker-Build tatsächlich geladen werden. */
const VITE_CONFIGS = ['vite.config.ts', 'vite.config.ci.ts'];

const IMPORT_EXTENSIONS = ['', '.ts', '.js', '.mjs', '/index.ts'];

function read(relativePath: string): string {
	return readFileSync(fileURLToPath(new URL(relativePath, repoRoot)), 'utf-8');
}

function exists(relativePath: string): boolean {
	return existsSync(fileURLToPath(new URL(relativePath, repoRoot)));
}

/**
 * Sammelt die Repo-eigenen Imports einer Config — also die mit `./`, im
 * Gegensatz zu Paketen aus node_modules. Erfasst beide Formen: mit Bindung
 * (`import x from './y'`) und als reinen Side-Effect-Import (`import './y'`).
 * Beide landen im gebündelten Config-Modul und brauchen die Datei im Kontext.
 */
function localImportsIn(source: string): string[] {
	const matches = source.matchAll(/^import\s+(?:[^'"]*\sfrom\s+)?'(\.\/[^']+)'/gm);
	return [...matches].map((match) => match[1] as string);
}

function localImportsOf(configFile: string): string[] {
	return localImportsIn(read(configFile));
}

/** Löst einen Import-Specifier auf den Pfad relativ zum Repo-Root auf. */
function resolveToRepoPath(specifier: string): string {
	const withoutDot = specifier.replace(/^\.\//, '');
	for (const extension of IMPORT_EXTENSIONS) {
		const candidate = `${withoutDot}${extension}`;
		if (exists(candidate)) return candidate;
	}
	throw new Error(`Import "${specifier}" zeigt auf keine existierende Datei`);
}

/** Ein `.dockerignore`-Muster als Regex über den vollen Pfad. */
function patternToRegExp(pattern: string): RegExp {
	const body = pattern
		.split('/')
		.map((segment) =>
			segment === '**'
				? '.*'
				: segment
						.replace(/[.+^${}()|[\]\\]/g, '\\$&')
						.replace(/\*/g, '[^/]*')
						.replace(/\?/g, '[^/]')
		)
		.join('/');
	return new RegExp(`^${body}$`);
}

/**
 * Docker prüft jedes Muster gegen den Pfad und gegen jedes seiner
 * Elternverzeichnisse — `src/tools` schließt damit alles darunter aus.
 * Ein `*` überschreitet dabei keinen `/` (Go-`filepath.Match` gegen den vollen
 * Pfad, kein git-artiges Basename-Matching): `*.test.ts` greift nur auf
 * Dateien im Repo-Wurzelverzeichnis. Die Tests unten pinnen das fest.
 */
function patternMatches(pattern: string, path: string): boolean {
	const regExp = patternToRegExp(pattern);
	const segments = path.split('/');
	for (let length = segments.length; length > 0; length--) {
		if (regExp.test(segments.slice(0, length).join('/'))) return true;
	}
	return false;
}

const dockerignorePatterns = read('.dockerignore')
	.split('\n')
	.map((line) => line.trim())
	.filter((line) => line.length > 0 && !line.startsWith('#'));

/** Letztes passendes Muster gewinnt — so entscheidet auch Docker. */
function isInBuildContext(path: string): boolean {
	let included = true;
	for (const line of dockerignorePatterns) {
		const negated = line.startsWith('!');
		const pattern = negated ? line.slice(1) : line;
		if (patternMatches(pattern, path)) included = negated;
	}
	return included;
}

describe('Import-Erkennung in den Vite-Configs', () => {
	it('erfasst benannte, Default-, Namespace- und Side-Effect-Imports', () => {
		const source = [
			"import { a } from './src/tools/named';",
			"import b from './src/tools/default';",
			"import * as c from './src/tools/namespace';",
			"import './src/tools/side-effect';",
			"import {\n\td\n} from './src/tools/multiline';"
		].join('\n');

		expect(localImportsIn(source)).toEqual([
			'./src/tools/named',
			'./src/tools/default',
			'./src/tools/namespace',
			'./src/tools/side-effect',
			'./src/tools/multiline'
		]);
	});

	it('ignoriert Pakete aus node_modules', () => {
		const source =
			"import { defineConfig } from 'vite';\nimport tailwindcss from '@tailwindcss/vite';";

		expect(localImportsIn(source)).toEqual([]);
	});
});

describe('.dockerignore und die Vite-Configs', () => {
	it('erkennt ausgeschlossene Dateien überhaupt', () => {
		// Absicherung des Matchers: ohne diesen Fall wäre ein immer-true-Matcher grün.
		expect(isInBuildContext('src/tools/analyse-legacy-inbox.js')).toBe(false);
		expect(isInBuildContext('node_modules/vite/index.js')).toBe(false);
	});

	it('lässt ein `*` keinen `/` überschreiten', () => {
		// Gegen einen Matcher abgesichert, der Wildcards git-artig auf den
		// Dateinamen anwendet — der würde hier alles ausschließen und den
		// eigentlichen Test damit wertlos machen.
		// Gegengeprüft an einem echten `docker build`: `find /ctx/src/lib
		// -name '*.test.ts'` liefert Treffer, `ls /ctx/vitest*` nicht.
		expect(isInBuildContext('src/lib/form/validation/stepNavigation.test.ts')).toBe(true);
		expect(isInBuildContext('vitest-setup-client.ts')).toBe(false);
	});

	it('hält die Tests der Vite-Config-Module draußen', () => {
		// Nicht über `*.test.ts` — das greift nur im Wurzelverzeichnis —,
		// sondern weil `src/tools` alles ausschließt, was keine Ausnahme hat.
		expect(isInBuildContext('src/tools/dev-server-identity.test.ts')).toBe(false);
		expect(isInBuildContext('src/tools/vite-stable-dep-hash.test.ts')).toBe(false);
	});

	it.each(VITE_CONFIGS)('hält %s selbst im Build-Kontext', (configFile) => {
		expect(isInBuildContext(configFile)).toBe(true);
	});

	it.each(VITE_CONFIGS)('hält alle Modul-Imports von %s im Build-Kontext', (configFile) => {
		const imports = localImportsOf(configFile);
		expect(imports.length).toBeGreaterThan(0);

		for (const specifier of imports) {
			const path = resolveToRepoPath(specifier);
			expect(isInBuildContext(path), `${specifier} fehlt im Docker-Build-Kontext`).toBe(true);
		}
	});
});
