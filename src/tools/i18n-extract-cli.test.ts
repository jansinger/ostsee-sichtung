import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExtractionPlan } from './i18n-extract/render';
import {
	isGitWorkingTreeClean,
	main,
	WRITE_SOURCES_SCOPE,
	writeMessageCatalogue,
	writeSourceFiles
} from './i18n-extract-cli';

// `vi.spyOn` scheitert an ESM-Modulnamespaces ("Module namespace is not
// configurable"). `vi.mock` mit Durchreichen zur echten Implementierung
// erlaubt trotzdem, jeden ECHTEN `writeFileSync`-Aufruf mit Zielpfad
// mitzuschneiden — das Modul schreibt weiterhin wirklich, der Spion sieht nur
// zusätzlich mit.
vi.mock('node:fs', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:fs')>();
	return { ...actual, writeFileSync: vi.fn(actual.writeFileSync) };
});

// Die Kernauflage von Aufgabe 1, seit Aufgabe 3.1 präzisiert und seit Aufgabe
// 2.3a (Werkzeugteil) erneut geschärft: Der Trockenlauf schreibt weiterhin
// nichts. Es gibt GENAU ZWEI Schreibpfade:
//
//  - `--write-messages` — ausschließlich `messages/de.json` und
//    `messages/en.json`.
//  - `--write-sources` — zusätzlich die Quelldateien in `WRITE_SOURCES_SCOPE`
//    (Welle 1, Aufgabe 2.3a), sonst nichts. Ein Schreibzugriff auf irgendeinen
//    anderen Pfad bleibt ein Fehlschlag — die Auflage wird NICHT abgeschwächt,
//    nur um den definierten Umfang erweitert.
//
// Ein Spion auf `writeFileSync` wäre für `planExtraction` WERTLOS gewesen (die
// Funktion bekommt ein Attrappen-Dateisystem und fasst `node:fs` nie an), aber
// für den neuen Schreibpfad ist ein Spion genau richtig: `writeMessageCatalogue`
// und `writeSourceFiles` rufen echtes `node:fs`, und der Spion sieht jeden
// echten Aufruf samt Zielpfad — unabhängig davon, was der Quelltext behauptet.
//
// Befund E: Die Text-Tests lesen die Dateiliste zur Laufzeit (`readdirSync`
// über `src/tools/i18n-extract/`), nicht als feste Aufzählung.
describe('Trockenlauf schreibt nicht, --write-messages/--write-sources nur im definierten Umfang', () => {
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

	// Aufgabe 2.3a, Werkzeugteil: Der zweite Schreibpfad. Baut eine echte
	// Fixture aus JEDER Datei in `WRITE_SOURCES_SCOPE` (nicht eine feste
	// Teilliste — sonst prüft der Test eine Kopie der Konstante statt der
	// Konstante selbst) plus einer Datei AUSSERHALB des Umfangs mit derselben
	// mechanisch extrahierbaren Form. Nur die Scope-Dateien dürfen angefasst
	// werden.
	//
	// Mutationsbeleg (siehe Bericht): ein Schreibaufruf auf einen Pfad
	// außerhalb des Umfangs in `writeSourceFiles` eingebaut → dieser Test
	// wurde rot → zurückgesetzt.
	it('schreibt mit --write-sources zusätzlich ausschließlich Dateien aus WRITE_SOURCES_SCOPE', () => {
		const root = mkdtempSync(join(tmpdir(), 'i18n-write-sources-'));
		mkdirSync(join(root, 'messages'), { recursive: true });
		writeFileSync(join(root, 'messages/de.json'), JSON.stringify({ $schema: 'x' }));
		writeFileSync(join(root, 'messages/en.json'), JSON.stringify({ $schema: 'x' }));
		mkdirSync(join(root, 'src/lib/form/validation'), { recursive: true });
		mkdirSync(join(root, 'src/lib/report/formOptions'), { recursive: true });
		writeFileSync(join(root, 'src/lib/form/validation/sightingSchema.ts'), 'const s = 1;\n');

		for (const relativePath of WRITE_SOURCES_SCOPE) {
			mkdirSync(join(root, dirname(relativePath)), { recursive: true });
			writeFileSync(join(root, relativePath), '<p>Mechanischer Testtext</p>\n');
		}
		// Ausserhalb des Umfangs, mit derselben extrahierbaren Form — muss trotz
		// vorhandener Fundstelle unberührt bleiben.
		mkdirSync(join(root, 'src/lib/components'), { recursive: true });
		writeFileSync(join(root, 'src/lib/components/OutOfScope.svelte'), '<p>Nicht im Umfang</p>\n');

		execSync('git -c user.email=t@t -c user.name=t init -q', { cwd: root });
		execSync('git -c user.email=t@t -c user.name=t add -A', { cwd: root });
		execSync('git -c user.email=t@t -c user.name=t commit -q -m init', { cwd: root });

		vi.mocked(writeFileSync).mockClear();
		try {
			main(['--write-sources', `--root=${root}`]);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}

		const calls = vi.mocked(writeFileSync).mock.calls.map(([path]) => String(path));
		expect(calls.length).toBeGreaterThan(0);
		for (const path of calls) {
			const targetsAllowedFile =
				path.endsWith(join('messages', 'de.json')) ||
				path.endsWith(join('messages', 'en.json')) ||
				WRITE_SOURCES_SCOPE.some((scoped) => path.endsWith(join(...scoped.split('/'))));
			expect(targetsAllowedFile, `unerwarteter Schreibpfad: ${path}`).toBe(true);
		}
		expect(calls.some((p) => p.includes('OutOfScope.svelte'))).toBe(false);
	});
});

describe('writeSourceFiles', () => {
	const roots: string[] = [];
	afterEach(() => {
		while (roots.length > 0) {
			const root = roots.pop();
			if (root) {
				rmSync(root, { recursive: true, force: true });
			}
		}
	});

	function samplePlanWithTwoFiles(): ExtractionPlan {
		return {
			files: [
				{
					file: 'src/scope/InScope.svelte',
					before: '<p>Alter Text</p>',
					after: '<p>{m.scope_inscope_text_alter()}</p>',
					sites: [
						{
							file: 'src/scope/InScope.svelte',
							line: 1,
							start: 3,
							end: 13,
							text: 'Alter Text',
							key: 'scope_inscope_text_alter',
							aspect: 'text',
							field: 'p'
						}
					]
				},
				{
					file: 'src/scope/OutOfScope.svelte',
					before: '<p>Anderer Text</p>',
					after: '<p>{m.scope_outofscope_text_anderer()}</p>',
					sites: [
						{
							file: 'src/scope/OutOfScope.svelte',
							line: 1,
							start: 3,
							end: 16,
							text: 'Anderer Text',
							key: 'scope_outofscope_text_anderer',
							aspect: 'text',
							field: 'p'
						}
					]
				}
			],
			skipped: []
		};
	}

	function tempRootWithSources(): string {
		const root = mkdtempSync(join(tmpdir(), 'i18n-write-source-files-'));
		mkdirSync(join(root, 'src/scope'), { recursive: true });
		writeFileSync(join(root, 'src/scope/InScope.svelte'), '<p>Alter Text</p>');
		writeFileSync(join(root, 'src/scope/OutOfScope.svelte'), '<p>Anderer Text</p>');
		roots.push(root);
		return root;
	}

	it('schreibt nur Dateien, die im übergebenen scope stehen', () => {
		const root = tempRootWithSources();
		const result = writeSourceFiles(root, samplePlanWithTwoFiles(), {
			scope: ['src/scope/InScope.svelte'],
			isWorkingTreeClean: () => true
		});

		expect(result.written).toEqual(['src/scope/InScope.svelte']);
		expect(readFileSync(join(root, 'src/scope/InScope.svelte'), 'utf-8')).toBe(
			'<p>{m.scope_inscope_text_alter()}</p>'
		);
		// Ausserhalb des scope unangetastet.
		expect(readFileSync(join(root, 'src/scope/OutOfScope.svelte'), 'utf-8')).toBe(
			'<p>Anderer Text</p>'
		);
	});

	it('bricht ohne zu schreiben ab, wenn der Arbeitsbaum unsauber ist', () => {
		const root = tempRootWithSources();
		const result = writeSourceFiles(root, samplePlanWithTwoFiles(), {
			scope: ['src/scope/InScope.svelte'],
			isWorkingTreeClean: () => false
		});

		expect(result.written).toEqual([]);
		expect(result.aborted).toBeDefined();
		// Beleg, dass wirklich nichts geschrieben wurde — nicht nur, dass die
		// Rückgabe leer ist.
		expect(readFileSync(join(root, 'src/scope/InScope.svelte'), 'utf-8')).toBe('<p>Alter Text</p>');
	});

	it('lässt eine scope-Datei ohne Fundstellen unangetastet', () => {
		const root = tempRootWithSources();
		const plan = samplePlanWithTwoFiles();
		const [inScopeFile] = plan.files;
		if (!inScopeFile) {
			throw new Error('Fixture-Fehler: samplePlanWithTwoFiles() sollte immer files[0] liefern');
		}
		inScopeFile.sites = [];
		inScopeFile.after = inScopeFile.before;

		const result = writeSourceFiles(root, plan, {
			scope: ['src/scope/InScope.svelte'],
			isWorkingTreeClean: () => true
		});

		expect(result.written).toEqual([]);
	});
});

describe('isGitWorkingTreeClean', () => {
	function initGitRepo(): string {
		const root = mkdtempSync(join(tmpdir(), 'i18n-git-clean-'));
		execSync('git -c user.email=t@t -c user.name=t init -q', { cwd: root });
		writeFileSync(join(root, 'committed.txt'), 'a\n');
		execSync('git -c user.email=t@t -c user.name=t add -A', { cwd: root });
		execSync('git -c user.email=t@t -c user.name=t commit -q -m init', { cwd: root });
		return root;
	}

	it('meldet einen frisch committeten Baum als sauber', () => {
		const root = initGitRepo();
		try {
			expect(isGitWorkingTreeClean(root)).toBe(true);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it('meldet einen Baum mit unversionierter Datei als unsauber', () => {
		const root = initGitRepo();
		try {
			writeFileSync(join(root, 'unversioniert.txt'), 'b\n');
			expect(isGitWorkingTreeClean(root)).toBe(false);
		} finally {
			rmSync(root, { recursive: true, force: true });
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

	// Befund B: Bricht der Lauf wegen Konflikten in BEIDEN Dateien ab, mischte
	// die Meldung Konflikte aus de.json und en.json bisher in eine flache Liste
	// ohne Quellangabe — man musste beide Dateien von Hand durchsuchen. Jede
	// Konfliktzeile nennt jetzt die Datei, aus der sie stammt.
	it('nennt bei Konflikten in beiden Dateien je Zeile die Quelldatei', () => {
		const root = tempRootWithCatalogues(
			{ $schema: 'x', sighting_waterway_label: 'Woanders?' },
			{ $schema: 'x', sighting_waterway_label: 'Where approximately?' }
		);
		roots.push(root);

		const result = writeMessageCatalogue(root, samplePlan);

		expect(result.written).toBe(false);
		expect(result.conflicts).toHaveLength(2);
		expect(result.conflicts.some((line) => line.includes('messages/de.json'))).toBe(true);
		expect(result.conflicts.some((line) => line.includes('messages/en.json'))).toBe(true);
	});
});
