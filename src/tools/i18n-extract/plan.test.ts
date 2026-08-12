import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	collectMessages,
	createNodeFileSystem,
	isSveltePathInScope,
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
		listFormOptionFiles: () => ['src/lib/report/formOptions/sex.ts'],
		listSvelteFiles: () => []
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
			],
			listSvelteFiles: () => []
		};

		const plan = planExtraction('/repo', fs);

		const emptyFile = plan.files.find((f) => f.file === 'src/lib/report/formOptions/empty.ts');
		expect(emptyFile).toBeDefined();
		expect(emptyFile?.sites).toEqual([]);
	});
});

describe('isSveltePathInScope — Ausschlussliste für Schicht C', () => {
	// Nachweis 2 (Auftrag): eine Admin-Datei und eine Styleguide-Datei dürfen
	// nicht im Umfang sein, eine öffentliche Komponente schon.
	it('schließt eine Datei unter src/routes/admin/ aus', () => {
		expect(isSveltePathInScope('src/routes/admin/sichtungen/+page.svelte')).toBe(false);
	});

	it('schließt eine Datei unter src/routes/admin/docs/ aus (deckt vom admin-Eintrag mit ab)', () => {
		expect(isSveltePathInScope('src/routes/admin/docs/+page.svelte')).toBe(false);
	});

	it('schließt eine Datei unter src/lib/components/admin/ aus', () => {
		expect(isSveltePathInScope('src/lib/components/admin/AdminFooter.svelte')).toBe(false);
	});

	it('schließt eine Datei unter src/routes/styleguide/ aus', () => {
		expect(isSveltePathInScope('src/routes/styleguide/+page.svelte')).toBe(false);
	});

	it('schließt eine Datei unter src/routes/docs/ aus', () => {
		expect(isSveltePathInScope('src/routes/docs/+page.svelte')).toBe(false);
	});

	it('schließt ApiDocumentation.svelte einzeln aus', () => {
		expect(isSveltePathInScope('src/lib/components/docs/ApiDocumentation.svelte')).toBe(false);
	});

	it('lässt eine öffentliche Komponente im Umfang', () => {
		expect(isSveltePathInScope('src/lib/report/components/FormHelp.svelte')).toBe(true);
		expect(isSveltePathInScope('src/routes/about/+page.svelte')).toBe(true);
	});
});

describe('createNodeFileSystem.listSvelteFiles — Verzeichnis-Scan, keine feste Liste', () => {
	let tempRoot: string;

	afterEach(() => {
		if (tempRoot) {
			rmSync(tempRoot, { recursive: true, force: true });
		}
	});

	// Nachweis 3 (Auftrag): eine NEUE öffentliche `.svelte`-Datei wird ohne
	// jede Code-Änderung mitgescannt, weil `listSvelteFiles` ein Verzeichnis
	// abläuft (`walkSvelteFiles`) statt eine feste Liste zu führen. Belegt an
	// einem echten Verzeichnis-Fixture, nicht an der fakeFs — die fakeFs
	// könnte die Bauart nicht unterscheiden.
	it('nimmt eine neu angelegte öffentliche Datei automatisch mit, ohne dass eine Liste gepflegt wird', () => {
		tempRoot = mkdtempSync(join(tmpdir(), 'i18n-extract-scope-'));
		mkdirSync(join(tempRoot, 'src/routes/admin'), { recursive: true });
		mkdirSync(join(tempRoot, 'src/lib/report/components'), { recursive: true });
		writeFileSync(join(tempRoot, 'src/routes/admin/+page.svelte'), '<h1>Admin</h1>');
		writeFileSync(join(tempRoot, 'src/lib/report/components/Existing.svelte'), '<p>Bestehend</p>');

		const before = createNodeFileSystem(tempRoot).listSvelteFiles();
		expect(before).toEqual(['src/lib/report/components/Existing.svelte']);

		// Die "neue" Datei entsteht erst jetzt — kein Eintrag in irgendeiner
		// Liste wurde dafür angepasst.
		writeFileSync(join(tempRoot, 'src/lib/report/components/NeuKomponente.svelte'), '<p>Neu</p>');

		const after = createNodeFileSystem(tempRoot).listSvelteFiles();
		expect(after).toEqual([
			'src/lib/report/components/Existing.svelte',
			'src/lib/report/components/NeuKomponente.svelte'
		]);
		// Die Admin-Datei bleibt in beiden Läufen draußen.
		expect(after).not.toContain('src/routes/admin/+page.svelte');
	});
});

describe('planExtraction — Schicht C (Svelte)', () => {
	it('sammelt Fundstellen aus Svelte-Dateien im Umfang und ersetzt sie in der Textknoten-Form', () => {
		const fs: ExtractFileSystem = {
			readFile: (path: string) => {
				if (path.endsWith('.svelte')) {
					return `<p>Hallo Welt</p>`;
				}
				return path.includes('formOptions') ? OPTIONS_SOURCE : SCHEMA_SOURCE;
			},
			listFormOptionFiles: () => [],
			listSvelteFiles: () => ['src/lib/report/components/Gruss.svelte']
		};

		const plan = planExtraction('/repo', fs);

		const svelteFile = plan.files.find((f) => f.file === 'src/lib/report/components/Gruss.svelte');
		expect(svelteFile).toBeDefined();
		expect(svelteFile?.sites).toHaveLength(1);
		expect(svelteFile?.after).toBe(`<p>{m.${svelteFile?.sites[0]?.key}()}</p>`);
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
