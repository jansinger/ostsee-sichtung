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
 * Gegensatz zu Paketen aus node_modules.
 */
function localImportsOf(configFile: string): string[] {
	const source = read(configFile);
	const matches = source.matchAll(/^import\s[^'"]*from\s+'(\.\/[^']+)'/gm);
	return [...matches].map((match) => match[1] as string);
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

describe('.dockerignore und die Vite-Configs', () => {
	it('erkennt ausgeschlossene Dateien überhaupt', () => {
		// Absicherung des Matchers: ohne diesen Fall wäre ein immer-true-Matcher grün.
		expect(isInBuildContext('src/tools/analyse-legacy-inbox.js')).toBe(false);
		expect(isInBuildContext('node_modules/vite/index.js')).toBe(false);
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
