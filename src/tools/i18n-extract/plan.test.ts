import { describe, expect, it } from 'vitest';
import {
	collectMessages,
	mergeMessageCatalogue,
	planExtraction,
	type ExtractFileSystem
} from './plan';

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

describe('collectMessages', () => {
	it('sammelt Schlüssel und Text aus allen Dateien, alphabetisch sortiert', () => {
		const plan = planExtraction('/repo', fakeFs());
		const messages = collectMessages(plan);
		expect(Object.keys(messages)).toEqual(['formoptions_sex_female', 'sighting_waterway_label']);
		expect(messages.sighting_waterway_label).toBe('Wo ungefähr?');
		expect(messages.formoptions_sex_female).toBe('Weiblich');
	});
});

describe('mergeMessageCatalogue', () => {
	it('übernimmt neue Schlüssel unverändert', () => {
		const { merged, conflicts } = mergeMessageCatalogue(
			{ $schema: 'https://inlang.com/schema/inlang-message-format' },
			{ sighting_waterway_label: 'Wo ungefähr?' }
		);
		expect(merged.sighting_waterway_label).toBe('Wo ungefähr?');
		expect(merged.$schema).toBe('https://inlang.com/schema/inlang-message-format');
		expect(conflicts).toEqual([]);
	});

	it('lässt einen bestehenden Schlüssel mit gleichem Wert unangetastet', () => {
		const { merged, conflicts } = mergeMessageCatalogue(
			{ sighting_waterway_label: 'Wo ungefähr?' },
			{ sighting_waterway_label: 'Wo ungefähr?' }
		);
		expect(merged.sighting_waterway_label).toBe('Wo ungefähr?');
		expect(conflicts).toEqual([]);
	});

	// Die eine Falle aus Schritt 3: ein bestehender Schlüssel mit ABWEICHENDEM
	// Wert (z. B. eine bereits gepflegte englische Übersetzung) darf nie still
	// überschrieben werden — sonst geht sie beim nächsten Extraktor-Lauf verloren.
	it('meldet einen bestehenden Schlüssel mit abweichendem Wert als Konflikt statt ihn zu überschreiben', () => {
		const { merged, conflicts } = mergeMessageCatalogue(
			{ sighting_waterway_label: 'Where approximately?' },
			{ sighting_waterway_label: 'Wo ungefähr?' }
		);
		expect(merged.sighting_waterway_label).toBe('Where approximately?');
		expect(conflicts).toEqual([
			{
				key: 'sighting_waterway_label',
				existingValue: 'Where approximately?',
				incomingValue: 'Wo ungefähr?'
			}
		]);
	});

	it('liefert das Ergebnis alphabetisch sortiert', () => {
		const { merged } = mergeMessageCatalogue(
			{ $schema: 'x' },
			{ sighting_zzz: 'z', sighting_aaa: 'a' }
		);
		expect(Object.keys(merged)).toEqual(['$schema', 'sighting_aaa', 'sighting_zzz']);
	});

	// Befund A: `localeCompare` ohne gebundenes Locale hängt vom Default-Locale
	// und ICU-Build der Node-Umgebung ab. Belegt an genau diesem Schlüsselpaar:
	// `formoptions_distance_from_10_to_50m` sortiert per `localeCompare` VOR
	// `formoptions_distance_from_101_to_500m` — keine Codepoint-Ordnung, denn an
	// der ersten abweichenden Stelle steht `_` (0x5F) gegen `1` (0x31), und `1`
	// ist der kleinere Codepoint. Ein Rückbau auf `localeCompare` macht diesen
	// Test rot, ohne dass sich am Inhalt der Katalog-Datei etwas ändert.
	it('sortiert nach Codepoint statt nach lokalisiertem Vergleich', () => {
		const { merged } = mergeMessageCatalogue(
			{ $schema: 'x' },
			{
				formoptions_distance_from_10_to_50m: '10 bis 50 Meter',
				formoptions_distance_from_101_to_500m: '101 bis 500 Meter'
			}
		);
		expect(Object.keys(merged)).toEqual([
			'$schema',
			'formoptions_distance_from_101_to_500m',
			'formoptions_distance_from_10_to_50m'
		]);
	});
});
