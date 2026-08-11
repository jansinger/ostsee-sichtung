import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExtractionPlan } from './i18n-extract/render';
import { main, writeMessageCatalogue } from './i18n-extract-cli';

// `vi.spyOn` scheitert an ESM-Modulnamespaces ("Module namespace is not
// configurable"). `vi.mock` mit Durchreichen zur echten Implementierung
// erlaubt trotzdem, jeden ECHTEN `writeFileSync`-Aufruf mit Zielpfad
// mitzuschneiden — das Modul schreibt weiterhin wirklich, der Spion sieht nur
// zusätzlich mit.
vi.mock('node:fs', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:fs')>();
	return { ...actual, writeFileSync: vi.fn(actual.writeFileSync) };
});

// Die Kernauflage von Aufgabe 1, seit Aufgabe 3.1 präzisiert: Der Trockenlauf
// schreibt weiterhin nichts. Neu ist GENAU EIN Schreibpfad — `--write-messages`
// —, und der darf ausschließlich `messages/de.json` und `messages/en.json`
// anfassen, insbesondere KEINE Quelldatei unter `src/lib/`.
//
// Ein Spion auf `writeFileSync` wäre für `planExtraction` WERTLOS gewesen (die
// Funktion bekommt ein Attrappen-Dateisystem und fasst `node:fs` nie an), aber
// für den neuen Schreibpfad ist ein Spion genau richtig: `writeMessageCatalogue`
// ruft echtes `node:fs`, und der Spion sieht jeden echten Aufruf samt Zielpfad
// — unabhängig davon, was der Quelltext behauptet.
//
// Befund E: Die Text-Tests lesen die Dateiliste zur Laufzeit (`readdirSync`
// über `src/tools/i18n-extract/`), nicht als feste Aufzählung.
describe('Trockenlauf schreibt nicht, --write-messages nur messages/*.json', () => {
	async function toolFiles(): Promise<string[]> {
		const { readdirSync } = await import('node:fs');
		return [
			'src/tools/i18n-extract-cli.ts',
			...readdirSync('src/tools/i18n-extract')
				.filter((n) => n.endsWith('.ts') && !n.endsWith('.test.ts'))
				.map((n) => `src/tools/i18n-extract/${n}`)
		];
	}

	it('nennt außerhalb von i18n-extract-cli.ts keine schreibende fs-Funktion', async () => {
		for (const file of await toolFiles()) {
			if (file === 'src/tools/i18n-extract-cli.ts') {
				// Einzige Ausnahme: hier lebt der --write-messages-Schreibpfad.
				continue;
			}
			const source = readFileSync(file, 'utf-8');
			for (const forbidden of ['writeFileSync', 'mkdirSync', 'appendFileSync', 'rmSync']) {
				expect(source, `${file} darf nicht schreiben`).not.toContain(forbidden);
			}
		}
	});

	it('kennt in keiner Werkzeugdatei eine --apply-Option', async () => {
		for (const file of await toolFiles()) {
			const source = readFileSync(file, 'utf-8');
			expect(source, `${file} darf --apply nicht kennen`).not.toContain('--apply');
		}
	});

	// Verhaltenstest statt Textsuche: Er ruft den echten Schreibpfad auf einem
	// echten temporären Dateisystem auf und spioniert `node:fs` aus. Das prüft
	// tatsächlich, WOHIN geschrieben wird — nicht nur, ob das Wort im Quelltext
	// vorkommt.
	//
	// Mutationsbeleg (siehe Bericht): ein Schreibaufruf auf einen anderen Pfad
	// in `writeMessageCatalogue` eingebaut → dieser Test wurde rot → zurückgesetzt.
	it('schreibt mit --write-messages ausschließlich messages/de.json und messages/en.json', () => {
		const root = mkdtempSync(join(tmpdir(), 'i18n-write-messages-'));
		mkdirSync(join(root, 'messages'), { recursive: true });
		writeFileSync(
			join(root, 'messages/de.json'),
			JSON.stringify({ $schema: 'x', i18n_selbsttest: 'Sprachumschaltung aktiv' })
		);
		writeFileSync(
			join(root, 'messages/en.json'),
			JSON.stringify({ $schema: 'x', i18n_selbsttest: 'Language switching active' })
		);
		mkdirSync(join(root, 'src/lib/form/validation'), { recursive: true });
		mkdirSync(join(root, 'src/lib/report/formOptions'), { recursive: true });
		writeFileSync(
			join(root, 'src/lib/form/validation/sightingSchema.ts'),
			`const s = yup.object().shape({ waterway: yup.string().label('Wo ungefähr?') });\n`
		);

		// Nur die Aufrufe ab hier zählen — die Fixture-Vorbereitung oben
		// benutzt dieselbe (mitgeschnittene) `writeFileSync`.
		vi.mocked(writeFileSync).mockClear();

		try {
			main(['--write-messages', `--root=${root}`]);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}

		const calls = vi.mocked(writeFileSync).mock.calls.map(([path]) => String(path));
		expect(calls.length).toBeGreaterThan(0);
		for (const path of calls) {
			const targetsAllowedFile =
				path.endsWith(join('messages', 'de.json')) || path.endsWith(join('messages', 'en.json'));
			expect(targetsAllowedFile, `unerwarteter Schreibpfad: ${path}`).toBe(true);
		}
	});
});

describe('writeMessageCatalogue', () => {
	function tempRootWithCatalogues(de: object, en: object): string {
		const root = mkdtempSync(join(tmpdir(), 'i18n-write-messages-merge-'));
		mkdirSync(join(root, 'messages'), { recursive: true });
		writeFileSync(join(root, 'messages/de.json'), JSON.stringify(de));
		writeFileSync(join(root, 'messages/en.json'), JSON.stringify(en));
		return root;
	}

	const roots: string[] = [];
	afterEach(() => {
		while (roots.length > 0) {
			const root = roots.pop();
			if (root) {
				rmSync(root, { recursive: true, force: true });
			}
		}
	});

	const samplePlan: ExtractionPlan = {
		files: [
			{
				file: 'src/lib/form/validation/sightingSchema.ts',
				before: '',
				after: '',
				sites: [
					{
						file: 'src/lib/form/validation/sightingSchema.ts',
						line: 1,
						start: 0,
						end: 0,
						text: 'Wo ungefähr?',
						key: 'sighting_waterway_label',
						aspect: 'label',
						field: 'waterway'
					}
				]
			}
		],
		skipped: []
	};

	it('schreibt neue Schlüssel in beide Dateien und behält $schema/i18n_selbsttest', () => {
		const root = tempRootWithCatalogues(
			{ $schema: 'x', i18n_selbsttest: 'Sprachumschaltung aktiv' },
			{ $schema: 'x', i18n_selbsttest: 'Language switching active' }
		);
		roots.push(root);

		const result = writeMessageCatalogue(root, samplePlan);

		expect(result.written).toBe(true);
		const de = JSON.parse(readFileSync(join(root, 'messages/de.json'), 'utf-8'));
		const en = JSON.parse(readFileSync(join(root, 'messages/en.json'), 'utf-8'));
		expect(de.sighting_waterway_label).toBe('Wo ungefähr?');
		expect(en.sighting_waterway_label).toBe('Wo ungefähr?');
		expect(de.i18n_selbsttest).toBe('Sprachumschaltung aktiv');
		expect(en.i18n_selbsttest).toBe('Language switching active');
	});

	// Mutationsbeleg (siehe Bericht): den Abbruch probeweise durch stilles
	// Überschreiben ersetzt → dieser Test wurde rot → zurückgesetzt.
	it('bricht ohne zu schreiben ab, wenn ein bestehender Schlüssel einen abweichenden Wert trägt', () => {
		const root = tempRootWithCatalogues(
			{ $schema: 'x' },
			{ $schema: 'x', sighting_waterway_label: 'Where approximately?' }
		);
		roots.push(root);
		const enBefore = readFileSync(join(root, 'messages/en.json'), 'utf-8');

		const result = writeMessageCatalogue(root, samplePlan);

		expect(result.written).toBe(false);
		expect(result.conflicts.length).toBeGreaterThan(0);
		expect(readFileSync(join(root, 'messages/en.json'), 'utf-8')).toBe(enBefore);
	});
});
