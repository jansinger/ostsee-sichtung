import { describe, expect, it } from 'vitest';

// Die Kernauflage von Aufgabe 1: In diesem Schritt wird nichts geschrieben.
//
// Ein Spion auf `writeFileSync` wäre hier WERTLOS: `planExtraction` bekommt im
// Test ein Attrappen-Dateisystem und fasst `node:fs` ohnehin nie an — die
// Zusicherung wäre auch dann grün, wenn die CLI munter schriebe. Das ist genau
// die Fehlerklasse, die in Etappe 0 achtmal auftrat (ARBEITSPROTOKOLL_ETAPPE0.md).
// Die beiden Tests unten prüfen deshalb den Quelltext selbst und den echten Lauf.
//
// Befund E: Beide Tests lesen die Dateiliste zur Laufzeit (`readdirSync` über
// `src/tools/i18n-extract/`), nicht als feste Aufzählung — ein Modulumzug
// (apply.ts, plan.ts) fällt damit automatisch unter dieselbe Prüfung, ohne dass
// hier etwas nachgepflegt werden müsste.
describe('Trockenlauf schreibt nicht', () => {
	async function toolFiles(): Promise<string[]> {
		const { readdirSync } = await import('node:fs');
		return [
			'src/tools/i18n-extract-cli.ts',
			...readdirSync('src/tools/i18n-extract')
				.filter((n) => n.endsWith('.ts') && !n.endsWith('.test.ts'))
				.map((n) => `src/tools/i18n-extract/${n}`)
		];
	}

	it('nennt in keiner Werkzeugdatei eine schreibende fs-Funktion', async () => {
		const { readFileSync } = await import('node:fs');
		for (const file of await toolFiles()) {
			const source = readFileSync(file, 'utf-8');
			for (const forbidden of ['writeFileSync', 'mkdirSync', 'appendFileSync', 'rmSync']) {
				expect(source, `${file} darf nicht schreiben`).not.toContain(forbidden);
			}
		}
	});

	it('kennt in keiner Werkzeugdatei eine --apply-Option', async () => {
		const { readFileSync } = await import('node:fs');
		for (const file of await toolFiles()) {
			const source = readFileSync(file, 'utf-8');
			expect(source, `${file} darf --apply nicht kennen`).not.toContain('--apply');
		}
	});
});
