import { describe, expect, it } from 'vitest';
import { planExtraction, type ExtractFileSystem } from './plan';

// Verschoben aus i18n-extract-cli.test.ts (Befund E): planExtraction lebt
// jetzt in plan.ts, die CLI ist nur noch eine dünne Hülle darüber.
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
	// planExtraction oben: Getrennte Register ließen den Kollisionszähler
	// (`_2`, `_3`, …) je Quelle bei 1 neu anfangen, sobald die Präfixe sich
	// einmal ändern oder überschneiden. Das ist eine Zukunftsabsicherung, keine
	// heute beobachtbare Eigenschaft — der Testname darf deshalb nicht mehr
	// behaupten, als hier geprüft wird.
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

	// Defekt 2: eine formOptions-Datei ohne jeden Fund (0 Botschaften, 0
	// Übersprungene) fiel bisher aus `plan.files` ganz heraus — sie erschien
	// nirgends im Bericht, nicht einmal als Zeile mit 0. Jede gescannte Datei
	// muss jetzt in `plan.files` stehen.
	it('nimmt eine formOptions-Datei ohne jeden Fund trotzdem in den Plan auf', () => {
		const fs: ExtractFileSystem = {
			readFile: (path: string) => {
				if (path.includes('empty')) {
					return `export const x = 1;\n`;
				}
				return path.includes('formOptions') ? OPTIONS_SOURCE : SCHEMA_SOURCE;
			},
			listFormOptionFiles: () => [
				'src/lib/report/formOptions/sex.ts',
				'src/lib/report/formOptions/empty.ts'
			]
		};

		const plan = planExtraction('/repo', fs);

		const emptyFile = plan.files.find((f) => f.file === 'src/lib/report/formOptions/empty.ts');
		expect(emptyFile).toBeDefined();
		expect(emptyFile?.sites).toEqual([]);
	});
});
