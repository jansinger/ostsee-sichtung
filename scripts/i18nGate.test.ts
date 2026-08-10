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
});
