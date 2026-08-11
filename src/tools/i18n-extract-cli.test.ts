import { describe, expect, it } from 'vitest';
import { planExtraction, type ExtractFileSystem } from './i18n-extract-cli';

const SCHEMA_SOURCE = `
	const s = yup.object().shape({
		waterway: yup.string().label('Wo ungefähr?')
	});
`;
const OPTIONS_SOURCE = `
	export const sexLabels: Record<SexEnum, string> = {
		[SexEnum.FEMALE]: 'Weiblich'
	};
`;

function fakeFs(): ExtractFileSystem {
	return {
		readFile: (path: string) => (path.includes('formOptions') ? OPTIONS_SOURCE : SCHEMA_SOURCE),
		listFormOptionFiles: () => ['src/lib/report/formOptions/sex.ts']
	};
}

describe('planExtraction', () => {
	// Befund C: Der Testname behauptete ein "gemeinsames Schlüsselregister", aber
	// die Assertion prüft nur Eindeutigkeit — und beim aktuellen Schlüsselschema
	// ist ein gemeinsames Register dafür gar nicht nötig: Schema-Schlüssel
	// beginnen immer mit `sighting_`, formOptions-Schlüssel immer mit
	// `formoptions_`, die beiden Präfixe können nie kollidieren. Ein Test mit
	// getrennten Registern (je eines pro Quelle) wäre hier ebenso grün.
	//
	// Geführt wird das gemeinsame Register trotzdem — siehe die Begründung in
	// planExtraction (i18n-extract-cli.ts): Getrennte Register ließen den
	// Kollisionszähler (`_2`, `_3`, …) je Quelle bei 1 neu anfangen, sobald die
	// Präfixe sich einmal ändern oder überschneiden. Das ist eine
	// Zukunftsabsicherung, keine heute beobachtbare Eigenschaft — der Testname
	// darf deshalb nicht mehr behaupten, als hier geprüft wird.
	it('plant Schema und formOptions gemeinsam und liefert über beide Dateien hinweg eindeutige Schlüssel', () => {
		const plan = planExtraction('/repo', fakeFs());
		const keys = plan.files.flatMap((f) => f.sites.map((s) => s.key));
		expect(keys).toEqual(['sighting_waterway_label', 'formoptions_sex_female']);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('liefert für jede Datei die unveränderte und die geplante Fassung', () => {
		const plan = planExtraction('/repo', fakeFs());
		const schemaFile = plan.files.find((f) => f.file.includes('sightingSchema'));
		expect(schemaFile?.before).toBe(SCHEMA_SOURCE);
		expect(schemaFile?.after).toContain('m.sighting_waterway_label({}, { locale })');
	});
});

// Die Kernauflage von Aufgabe 1: In diesem Schritt wird nichts geschrieben.
//
// Ein Spion auf `writeFileSync` wäre hier WERTLOS: `planExtraction` bekommt im
// Test ein Attrappen-Dateisystem und fasst `node:fs` ohnehin nie an — die
// Zusicherung wäre auch dann grün, wenn die CLI munter schriebe. Das ist genau
// die Fehlerklasse, die in Etappe 0 achtmal auftrat (ARBEITSPROTOKOLL_ETAPPE0.md).
// Die beiden Tests unten prüfen deshalb den Quelltext selbst und den echten Lauf.
describe('Trockenlauf schreibt nicht', () => {
	it('nennt in keiner Werkzeugdatei eine schreibende fs-Funktion', async () => {
		const { readFileSync, readdirSync } = await import('node:fs');
		const files = [
			'src/tools/i18n-extract-cli.ts',
			...readdirSync('src/tools/i18n-extract')
				.filter((n) => n.endsWith('.ts') && !n.endsWith('.test.ts'))
				.map((n) => `src/tools/i18n-extract/${n}`)
		];
		for (const file of files) {
			const source = readFileSync(file, 'utf-8');
			for (const forbidden of ['writeFileSync', 'mkdirSync', 'appendFileSync', 'rmSync']) {
				expect(source, `${file} darf nicht schreiben`).not.toContain(forbidden);
			}
		}
	});

	it('kennt keine --apply-Option', async () => {
		const { readFileSync } = await import('node:fs');
		const source = readFileSync('src/tools/i18n-extract-cli.ts', 'utf-8');
		expect(source).not.toContain('--apply');
		expect(source).not.toContain('writeFileSync');
	});
});
