import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { flattenScript, readScripts } from './testGate';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Wächter über den Paraglide-Compile-Schritt.
 *
 * Der erzeugte Code unter `src/lib/paraglide` liegt nicht im Repository. `lint`,
 * `type-check` und `check` müssen ihn trotzdem vorfinden — sonst ist ein frisch
 * ausgecheckter Worktree rot, und die Ursache sieht nach einem kaputten Setup
 * aus statt nach einem fehlenden Build-Schritt. Dieser Test hält fest, dass der
 * Schritt in `test:quick`, `build`, `build:docker`, `dev` und `check` läuft.
 *
 * Geprüft wird gegen `paraglide-js compile`, nicht gegen den Skriptnamen
 * `i18n:compile`: `flattenScript` löst jeden `npm run <name>`-Verweis rekursiv bis
 * zum tatsächlichen Shell-Kommando auf (siehe `scripts/testGate.test.ts`,
 * „löst verschachtelte npm-run-Aufrufe auf") — ein Skriptname taucht im Ergebnis
 * grundsätzlich nie auf, nur das Kommando, das er letztlich ausführt. Eine
 * Assertion auf `'i18n:compile'` wäre deshalb mit keiner lauffähigen
 * `package.json` erfüllbar; das bewahrt Nachfolgende davor, sie „naheliegend"
 * wieder auf den Skriptnamen zurückzudrehen.
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

		// Ein fehlender Treffer liefert -1 und wäre sonst immer "kleiner" als jeder
		// echte Index — das machte die reine Reihenfolgeprüfung wertlos, wenn der
		// Compile-Schritt gar nicht liefe. Beide Indizes müssen also zuerst
		// tatsächlich gefunden worden sein.
		expect(compileIndex).toBeGreaterThanOrEqual(0);
		expect(typeCheckIndex).toBeGreaterThanOrEqual(0);
		expect(compileIndex).toBeLessThan(typeCheckIndex);
	});

	// `test:quick` allein beweist nicht, dass ein frischer Checkout (`dev`, `build`,
	// `build:docker`) oder `check` allein (z. B. in einer IDE) den generierten Code
	// vorfindet — jedes dieser Kommandos kann unabhängig von `test:quick` aufgerufen
	// werden.
	it.each(['build', 'build:docker', 'dev', 'check'])('läuft auch in %s', (name) => {
		const scripts = readScripts();
		const flat = flattenScript(name, scripts);
		expect(flat.some((command) => command.includes('paraglide-js compile'))).toBe(true);
	});
});

/**
 * Extrahiert die `--strategy`-Tokens eines `paraglide-js compile`-CLI-Aufrufs.
 *
 * Bewusst nur ein Regex statt eines Shell-Arg-Parsers — wie in `testGate.ts`
 * begründet: Kommt etwas Komplexeres in `i18n:compile` dazu, fällt es hier auf.
 */
function cliStrategy(command: string): string[] {
	const match = /--strategy\s+((?:(?!--)\S+\s*)+)/.exec(command);
	if (!match) throw new Error(`Kein --strategy-Flag in: ${command}`);
	return match[1].trim().split(/\s+/);
}

/** Extrahiert den Wert eines einzelnen `--<flag> <wert>`-Arguments aus einem CLI-Aufruf. */
function cliOption(command: string, flag: string): string {
	const match = new RegExp(`--${flag}\\s+(\\S+)`).exec(command);
	if (!match) throw new Error(`Kein --${flag}-Flag in: ${command}`);
	return match[1];
}

/** Extrahiert `strategy: [...]` aus dem `paraglideVitePlugin({...})`-Aufruf einer Vite-Config. */
function pluginStrategy(viteConfigSource: string): string[] {
	const strategyLine = /strategy:\s*\[([^\]]*)\]/.exec(pluginCallSource(viteConfigSource));
	if (!strategyLine) throw new Error('Kein strategy: [...] im paraglideVitePlugin-Aufruf gefunden');
	return [...strategyLine[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

/** Extrahiert den Wert einer einzelnen `<key>: '<wert>'`-Option aus dem Plugin-Aufruf. */
function pluginOption(viteConfigSource: string, key: string): string {
	const match = new RegExp(`${key}:\\s*'([^']+)'`).exec(pluginCallSource(viteConfigSource));
	if (!match) throw new Error(`Kein ${key}: '...' im paraglideVitePlugin-Aufruf gefunden`);
	return match[1];
}

function pluginCallSource(viteConfigSource: string): string {
	const pluginCall = /paraglideVitePlugin\(\{[\s\S]*?\n\t*\}\)/.exec(viteConfigSource);
	if (!pluginCall) throw new Error('Kein paraglideVitePlugin({...})-Aufruf gefunden');
	return pluginCall[0];
}

const VITE_CONFIGS = ['vite.config.ts', 'vite.config.ci.ts', 'vite.config.preview.ts'];

function compileCommandFromPackageJson(): string {
	const scripts = readScripts();
	const compileCommand = flattenScript('i18n:compile', scripts).find((command) =>
		command.includes('paraglide-js compile')
	);
	if (!compileCommand) throw new Error('i18n:compile enthält keinen paraglide-js-compile-Aufruf');
	return compileCommand;
}

/**
 * Sichert die Erkenntnisse aus dem Review ab: `i18n:compile` (CLI, läuft in
 * `worktree:setup`, `test:quick`, `check`, `build`, `dev`) und die drei
 * `paraglideVitePlugin`-Aufrufe (Dev-Server, E2E, Preview) schreiben in dasselbe
 * `outdir` (`src/lib/paraglide`). Weichen `strategy`, `emitTsDeclarations`,
 * `outputStructure`, `project` oder `outdir` voneinander ab, gewinnt beim
 * Kompilieren, wer zuletzt lief — in einem frischen Worktree ist das
 * ausschließlich die CLI, deren Runtime dann nie geprüft wird (Vitest lädt den
 * Vite-Plugin-Pfad nicht). Ohne Übereinstimmung testen `deLocalizeUrl`/`localizeUrl`
 * in Folge-Tasks also eine Konfiguration, die im Betrieb nie gilt.
 */
describe('CLI und Vite-Plugin erzeugen dieselbe Paraglide-Laufzeit', () => {
	it('nutzen dieselbe --strategy wie das paraglideVitePlugin', () => {
		const fromCli = cliStrategy(compileCommandFromPackageJson());

		for (const configFile of VITE_CONFIGS) {
			const source = readFileSync(path.join(repoRoot, configFile), 'utf8');
			expect(pluginStrategy(source), `strategy in ${configFile}`).toEqual(fromCli);
		}
	});

	it('setzen --emit-ts-declarations wie das paraglideVitePlugin', () => {
		expect(compileCommandFromPackageJson()).toContain('--emit-ts-declarations');

		for (const configFile of VITE_CONFIGS) {
			const source = readFileSync(path.join(repoRoot, configFile), 'utf8');
			expect(source, `emitTsDeclarations in ${configFile}`).toMatch(/emitTsDeclarations:\s*true/);
		}
	});

	// unplugin.js (bundler-plugins/unplugin.js) wechselt außerhalb von
	// `NODE_ENV=production` von sich aus auf `locale-modules` statt
	// `message-modules` ("default to locale-modules for development to speed up
	// the dev server") — die CLI kennt diesen Sonderfall nicht und erzeugt immer
	// `message-modules` (compiler-options.js: `defaultCompilerOptions.outputStructure`).
	// Jede Vite-Config muss den Dev-Sonderfall deshalb explizit festnageln, sonst
	// hängt die Dateistruktur unter `src/lib/paraglide/messages/` (Deep-Imports auf
	// einzelne Botschaften) davon ab, wer zuletzt kompiliert hat.
	it('nageln den outputStructure-Dev-Sonderfall des Plugins auf den CLI-Default fest', () => {
		const cliCommand = compileCommandFromPackageJson();
		// Kein --output-structure-Flag gesetzt → CLI-Default aus compiler-options.js.
		expect(cliCommand).not.toContain('--output-structure');

		for (const configFile of VITE_CONFIGS) {
			const source = readFileSync(path.join(repoRoot, configFile), 'utf8');
			expect(source, `outputStructure in ${configFile}`).toMatch(
				/outputStructure:\s*'message-modules'/
			);
		}
	});

	it('zeigen auf dasselbe project und outdir wie das paraglideVitePlugin', () => {
		const cliCommand = compileCommandFromPackageJson();
		const cliProject = cliOption(cliCommand, 'project');
		const cliOutdir = cliOption(cliCommand, 'outdir');

		for (const configFile of VITE_CONFIGS) {
			const source = readFileSync(path.join(repoRoot, configFile), 'utf8');
			expect(pluginOption(source, 'project'), `project in ${configFile}`).toEqual(cliProject);
			expect(pluginOption(source, 'outdir'), `outdir in ${configFile}`).toEqual(cliOutdir);
		}
	});
});
