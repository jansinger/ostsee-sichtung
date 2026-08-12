import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	analyzeFormOptionsSource,
	analyzeSightingSchemaSource,
	analyzeSvelteSource,
	classifyText,
	renderMarkdownReport,
	runInventory,
	slugify,
	type FileSystemAdapter,
	type Finding
} from './i18n-inventory';

const PROJECT_ROOT = resolve(__dirname, '..', '..');

describe('classifyText', () => {
	it('ordnet leere/nur-Whitespace-Eingaben nicht ein', () => {
		expect(classifyText('')).toBeNull();
		expect(classifyText('   \n\t')).toBeNull();
	});

	it('erkennt CSS-Klassenlisten als technisch', () => {
		expect(classifyText('btn btn-primary')?.category).toBe('technisch');
	});

	it('erkennt Testid-artige kebab-case Strings als technisch', () => {
		expect(classifyText('upload-notice-trigger')?.category).toBe('technisch');
	});

	it('erkennt Icon-Namen als technisch', () => {
		expect(classifyText('lucide:map-pin')?.category).toBe('technisch');
		expect(classifyText('custom:porpoise')?.category).toBe('technisch');
	});

	it('erkennt Enum-Werte (UPPER_SNAKE_CASE) als technisch', () => {
		expect(classifyText('HARBOR_PORPOISE')?.category).toBe('technisch');
	});

	it('erkennt URLs als technisch', () => {
		expect(classifyText('https://meeresmuseum.de')?.category).toBe('technisch');
	});

	it('erkennt MIME-Typen als technisch', () => {
		expect(classifyText('image/jpeg')?.category).toBe('technisch');
		expect(classifyText('application/pdf')?.category).toBe('technisch');
	});

	it('erkennt reine Zahlen als technisch', () => {
		expect(classifyText('0')?.category).toBe('technisch');
		expect(classifyText('42')?.category).toBe('technisch');
	});

	it('erkennt eindeutigen deutschen Fließtext als uebersetzbar', () => {
		expect(classifyText('Wo ungefähr?')?.category).toBe('uebersetzbar');
		expect(classifyText('Bitte geben Sie den Zustand des toten Tieres an.')?.category).toBe(
			'uebersetzbar'
		);
	});

	it('erkennt mehrwortige Phrasen ohne technisches Muster als uebersetzbar', () => {
		expect(classifyText('Kegelrobbe Seehund')?.category).toBe('uebersetzbar');
	});

	it('ordnet ein großgeschriebenes deutsches Einzelwort als uebersetzbar ein (Substantiv-/Verb-Muster)', () => {
		// Technische Einzelwort-Tokens sind so gut wie nie TitleCase (Enum-Werte sind
		// UPPER_SNAKE_CASE, Testids/Klassen kleingeschrieben-mit-Bindestrich) — ein
		// Wort wie "Speichern" oder "Schweinswal" ist deshalb sicher genug für
		// uebersetzbar, siehe classifyText-Dokumentation Schritt 6.
		expect(classifyText('Speichern')?.category).toBe('uebersetzbar');
	});

	it('ordnet ein kleingeschriebenes Einzelwort ohne Sprachsignal als unklar ein (konservativer Default)', () => {
		const result = classifyText('anzeigen');
		expect(result?.category).toBe('unklar');
	});

	it('flaggt Texte mit Zahl nicht automatisch als etwas anderes — das prüft der Aufrufer separat', () => {
		// classifyText selbst entscheidet keine Pluralform; das übernimmt containsNumber
		// eine Ebene höher in analyzeSvelteSource/analyzeSightingSchemaSource.
		expect(classifyText('3 Tiere gesichtet')?.category).toBe('uebersetzbar');
	});
});

describe('slugify', () => {
	it('transliteriert Umlaute', () => {
		expect(slugify('Wo ungefähr?')).toBe('wo_ungefaehr');
	});

	it('kürzt auf die angegebene Länge', () => {
		expect(slugify('a'.repeat(100), 10).length).toBeLessThanOrEqual(10);
	});
});

describe('analyzeSvelteSource — Markup-Kommentare vs. Textknoten (Kernanforderung)', () => {
	it('erfasst einen Markup-Kommentar NICHT', () => {
		const source = `
			<!-- Dieser Kommentar erklärt eine Design-Entscheidung -->
			<p>Kein sichtbarer Text hier</p>
		`;
		const findings = analyzeSvelteSource(source, 'src/lib/Example.svelte');
		const commentLeaked = findings.some((f) => f.rawText.includes('erklärt eine Design'));
		expect(commentLeaked).toBe(false);
	});

	it('erfasst einen echten Textknoten mit mindestens zwei Wörtern', () => {
		const source = `<p>Kein sichtbarer Text hier</p>`;
		const findings = analyzeSvelteSource(source, 'src/lib/Example.svelte');
		expect(findings.some((f) => f.rawText === 'Kein sichtbarer Text hier')).toBe(true);
	});

	it('überspringt Textknoten mit nur einem Wort (dokumentierte Grenze)', () => {
		const source = `<button>Speichern</button>`;
		const findings = analyzeSvelteSource(source, 'src/lib/Example.svelte');
		expect(findings.some((f) => f.rawText === 'Speichern')).toBe(false);
	});

	it('klassifiziert class="btn btn-primary" nicht — class wird nicht erfasst (kein Ziel-Attribut)', () => {
		const source = `<button class="btn btn-primary">Zwei Wörter hier</button>`;
		const findings = analyzeSvelteSource(source, 'src/lib/Example.svelte');
		expect(findings.some((f) => f.rawText.includes('btn'))).toBe(false);
	});

	it('erfasst placeholder als technisch, wenn es wie ein Klassenname aussieht', () => {
		const source = `<input placeholder="btn-primary-outline" />`;
		const findings = analyzeSvelteSource(source, 'src/lib/Example.svelte');
		const finding = findings.find((f) => f.attribute === 'placeholder');
		expect(finding?.category).toBe('technisch');
	});

	it('erfasst placeholder mit deutschem Beispieltext als uebersetzbar', () => {
		const source = `<input placeholder="z.B. 54.123456" />`;
		const findings = analyzeSvelteSource(source, 'src/lib/Example.svelte');
		const finding = findings.find((f) => f.attribute === 'placeholder');
		expect(finding?.category).toBe('uebersetzbar');
	});

	it('erfasst title, aria-label und alt', () => {
		const source = `
			<button title="Hinweis schließen">X</button>
			<div aria-label="Hinweis schließen jetzt">Y</div>
			<img alt="Foto der Sichtung" />
		`;
		const findings = analyzeSvelteSource(source, 'src/lib/Example.svelte');
		expect(findings.some((f) => f.attribute === 'title')).toBe(true);
		expect(findings.some((f) => f.attribute === 'aria-label')).toBe(true);
		expect(findings.some((f) => f.attribute === 'alt')).toBe(true);
	});

	it('ignoriert Attribute außerhalb der Zielmenge (z.B. data-testid)', () => {
		const source = `<button data-testid="upload-notice-trigger">Zwei Wörter hier</button>`;
		const findings = analyzeSvelteSource(source, 'src/lib/Example.svelte');
		expect(findings.some((f) => f.attribute === 'data-testid')).toBe(false);
	});

	it('markiert Texte mit Zahl über containsNumber, ohne eine Pluralform zu erraten', () => {
		const source = `<p>Sie haben 3 Tiere gemeldet</p>`;
		const findings = analyzeSvelteSource(source, 'src/lib/Example.svelte');
		const finding = findings.find((f) => f.rawText.includes('3 Tiere'));
		expect(finding?.containsNumber).toBe(true);
	});

	it('erfasst Text innerhalb von {#if}/{#each}-Blöcken (Block-Typen ohne Sonderfall abgedeckt)', () => {
		const source = `
			{#if visible}
				<p>Text im if Block</p>
			{/if}
			{#each items as item}
				<span>Text im each Block</span>
			{/each}
		`;
		const findings = analyzeSvelteSource(source, 'src/lib/Example.svelte');
		expect(findings.some((f) => f.rawText === 'Text im if Block')).toBe(true);
		expect(findings.some((f) => f.rawText === 'Text im each Block')).toBe(true);
	});

	it('behandelt dynamisch interpolierte Attribute als unklar statt sie zu erraten', () => {
		const source = `<img alt="Foto {index} von {total}" />`;
		const findings = analyzeSvelteSource(source, 'src/lib/Example.svelte');
		const finding = findings.find((f) => f.attribute === 'alt');
		expect(finding?.category).toBe('unklar');
	});

	it('bricht bei nicht parsebarem Markup nicht ab, sondern liefert eine leere Liste', () => {
		const findings = analyzeSvelteSource('<div><', 'src/lib/Broken.svelte');
		expect(findings).toEqual([]);
	});

	it('generiert einen sprechenden Schlüsselvorschlag statt einer Nummerierung', () => {
		const source = `<p>Wo ungefähr war die Sichtung</p>`;
		const findings = analyzeSvelteSource(
			source,
			'src/lib/report/components/form/position/LocationDescription.svelte'
		);
		const finding = findings[0];
		expect(finding).toBeDefined();
		expect(finding?.keySuggestion).not.toMatch(/^msg_\d+$/);
		expect(finding?.keySuggestion).toContain('locationdescription');
	});
});

describe('analyzeFormOptionsSource', () => {
	it('extrahiert String-Werte aus Record<Enum, string>', () => {
		const source = `
			export enum X { A = 0, B = 1 }
			export const xLabels: Record<X, string> = {
				[X.A]: 'Erster Wert',
				[X.B]: 'Zweiter Wert'
			};
		`;
		const findings = analyzeFormOptionsSource(source, 'src/lib/report/formOptions/x.ts');
		expect(findings).toHaveLength(2);
		expect(findings.map((f) => f.rawText)).toEqual(['Erster Wert', 'Zweiter Wert']);
	});

	it('ignoriert Objekte, die nicht als Record<Enum, string> typisiert sind (dokumentierte Grenze)', () => {
		const source = `
			export const groups = {
				Kleinwale: [0, 1],
				Grosswale: [2, 3]
			};
		`;
		const findings = analyzeFormOptionsSource(source, 'src/lib/report/formOptions/x.ts');
		expect(findings).toHaveLength(0);
	});

	it('liefert die korrekte Zeilennummer', () => {
		const source = `export const xLabels: Record<number, string> = {\n\t0: 'Zeile drei'\n};`;
		const findings = analyzeFormOptionsSource(source, 'src/lib/report/formOptions/x.ts');
		expect(findings).toHaveLength(1);
		expect(findings[0]?.line).toBe(2);
	});
});

describe('analyzeSightingSchemaSource', () => {
	it('extrahiert .label(...)', () => {
		const source = `
			const schema = yup.object({
				latitude: yup.number().label('Breitengrad')
			});
		`;
		const findings = analyzeSightingSchemaSource(
			source,
			'src/lib/form/validation/sightingSchema.ts'
		);
		const finding = findings.find((f) => f.rawText === 'Breitengrad');
		expect(finding).toBeDefined();
		expect(finding?.context).toBe('latitude.label');
	});

	it('extrahiert .meta({ placeholder, helpText, valueText })', () => {
		const source = `
			const schema = yup.object({
				latitude: yup.number().meta({
					placeholder: 'z.B. 54.123456',
					helpText: 'Nördliche Position',
					valueText: 'GPS-Präzision hilft'
				})
			});
		`;
		const findings = analyzeSightingSchemaSource(
			source,
			'src/lib/form/validation/sightingSchema.ts'
		);
		expect(findings.some((f) => f.context === 'latitude.meta.placeholder')).toBe(true);
		expect(findings.some((f) => f.context === 'latitude.meta.helpText')).toBe(true);
		expect(findings.some((f) => f.context === 'latitude.meta.valueText')).toBe(true);
	});

	it('extrahiert Validierungsmeldungen aus .required()/.max()', () => {
		const source = `
			const schema = yup.object({
				waterway: yup.string()
					.max(255, 'Der Name ist zu lang')
					.required('Bitte beschreiben Sie den Ort')
			});
		`;
		const findings = analyzeSightingSchemaSource(
			source,
			'src/lib/form/validation/sightingSchema.ts'
		);
		expect(findings.some((f) => f.rawText === 'Der Name ist zu lang')).toBe(true);
		expect(findings.some((f) => f.rawText === 'Bitte beschreiben Sie den Ort')).toBe(true);
	});
});

describe('Duplikat-Markierung', () => {
	it('führt gleichlautende Texte nicht zusammen, markiert sie aber als Dublette', () => {
		const source = `<button>Zwei mal hier</button><button>Zwei mal hier</button>`;
		const findings = analyzeSvelteSource(source, 'src/lib/Example.svelte');
		expect(findings).toHaveLength(2);
	});
});

describe('runInventory — mit gefaktem Dateisystem', () => {
	function fakeFs(files: Record<string, string>): FileSystemAdapter {
		return {
			listFiles: () => Object.keys(files),
			readFile: (path: string) => files[path] ?? ''
		};
	}

	it('schließt /admin standardmäßig aus', () => {
		const files: Record<string, string> = {
			'/repo/src/routes/admin/+page.svelte': `<p>Admin Text hier</p>`,
			'/repo/src/routes/+page.svelte': `<p>Öffentlicher Text hier</p>`
		};
		const result = runInventory({ root: '/repo' }, fakeFs(files));
		expect(result.findings.some((f) => f.rawText === 'Admin Text hier')).toBe(false);
		expect(result.findings.some((f) => f.rawText === 'Öffentlicher Text hier')).toBe(true);
	});

	it('bezieht /admin ein, wenn includeAdmin gesetzt ist (Option, keine feste Verdrahtung)', () => {
		const files: Record<string, string> = {
			'/repo/src/routes/admin/+page.svelte': `<p>Admin Text hier</p>`
		};
		const result = runInventory({ root: '/repo', includeAdmin: true }, fakeFs(files));
		expect(result.findings.some((f) => f.rawText === 'Admin Text hier')).toBe(true);
	});

	it('liefert eine Zusammenfassung, deren Summen zu den Funden passen', () => {
		const files: Record<string, string> = {
			'/repo/src/routes/+page.svelte': `<p>Ein Text mit Wörtern</p><p>Noch ein Text mit Wörtern</p>`
		};
		const result = runInventory({ root: '/repo' }, fakeFs(files));
		const sum =
			result.summary.byCategory.uebersetzbar +
			result.summary.byCategory.technisch +
			result.summary.byCategory.unklar;
		expect(sum).toBe(result.summary.totalFindings);
		expect(result.summary.totalFindings).toBe(result.findings.length);
	});
});

describe('renderMarkdownReport', () => {
	it('rendert Gesamtzahlen und Funde gruppiert nach Kategorie/Datei', () => {
		const findings: Finding[] = [
			{
				file: 'src/routes/+page.svelte',
				line: 3,
				source: 'svelte-text',
				category: 'uebersetzbar',
				rawText: 'Ein Beispieltext',
				keySuggestion: 'routes_page_ein_beispieltext',
				containsNumber: false,
				reason: 'test'
			}
		];
		const summary = {
			totalFindings: 1,
			byCategory: { uebersetzbar: 1, technisch: 0, unklar: 0 },
			bySourceAndCategory: {
				'svelte-text': { uebersetzbar: 1, technisch: 0, unklar: 0 },
				'svelte-attr': { uebersetzbar: 0, technisch: 0, unklar: 0 },
				'form-options': { uebersetzbar: 0, technisch: 0, unklar: 0 },
				'yup-schema': { uebersetzbar: 0, technisch: 0, unklar: 0 }
			},
			byFile: [
				{
					file: 'src/routes/+page.svelte',
					total: 1,
					byCategory: { uebersetzbar: 1, technisch: 0, unklar: 0 }
				}
			],
			duplicateGroups: 0
		} as const;
		const markdown = renderMarkdownReport(
			{ findings, summary: summary as never },
			new Date('2026-08-10T00:00:00Z')
		);
		expect(markdown).toContain('Ein Beispieltext');
		expect(markdown).toContain('| uebersetzbar | 1 |');
	});
});

describe('Verifikation an echten Dateien', () => {
	// Aufgabe i18n-t3 3.2 hat species.ts als Pilotmodul umgebaut: Die elf
	// Artnamen kommen seit dem nicht mehr aus String-Literalen in einer
	// `speciesLabels`-Konstante, sondern aus dem Botschaftskatalog
	// (`speciesLabelBuilders` + `memoizePerLocale`). Dieses Altwerkzeug
	// erkennt nur das `[Enum.X]: 'Text'`-Literalmuster — nach dem Umbau
	// findet es dort folgerichtig nichts mehr. Das ist der Beleg, nicht der
	// Bug: species.ts trägt seither keine deutschen Anzeigetext-Literale
	// mehr, die dieses Werkzeug aufzählen könnte.
	it('species.ts: findet nach dem i18n-t3-3.2-Umbau keine Artnamen-Literale mehr', () => {
		const source = readFileSync(
			resolve(PROJECT_ROOT, 'src/lib/report/formOptions/species.ts'),
			'utf-8'
		);
		const findings = analyzeFormOptionsSource(source, 'src/lib/report/formOptions/species.ts');
		const speciesLabelFindings = findings.filter((f) => f.context?.startsWith('speciesLabels'));
		expect(speciesLabelFindings).toHaveLength(0);

		// Weiterhin unverändert: Die Gruppennamen (Kleinwale/Großwale/Robben)
		// stehen als Objektschlüssel in `speciesGroups`, nicht als Text-Literal
		// — von diesem Muster-basierten Werkzeug nie erfasst, vor UND nach 3.2.
		const groupNameFound = findings.some(
			(f) => f.rawText === 'Kleinwale' || f.rawText === 'Großwale'
		);
		expect(groupNameFound).toBe(false);
	});

	// Stand bis Welle 2 (Aufgabe 2.3a): UploadNotice.svelte trug noch
	// hartcodierten deutschen Text, dieser Test belegte, dass das
	// Muster-Werkzeug ihn findet (mehr als ein Wort), ohne den langen
	// Begründungskommentar am Dateikopf mitzureißen. Welle 2 hat den Text
	// mechanisch nach Paraglide extrahiert (`{m.…()}`) — das Muster-Werkzeug
	// erfasst `ExpressionTag`-Inhalte grundsätzlich nicht (dasselbe Prinzip
	// wie beim neuen Extraktor, siehe collect.ts-Dateikopf), findet also jetzt
	// nichts mehr davon. Das ist der beabsichtigte Endzustand, keine Lücke.
	it('UploadNotice.svelte: findet nach der Extraktion keinen hartcodierten Text mehr', () => {
		const source = readFileSync(
			resolve(PROJECT_ROOT, 'src/lib/report/components/form/UploadNotice.svelte'),
			'utf-8'
		);
		const findings = analyzeSvelteSource(
			source,
			'src/lib/report/components/form/UploadNotice.svelte'
		);

		// Der lange Begründungskommentar am Kopf der Datei darf unter keinen Umständen auftauchen.
		const leakedComment = findings.some((f) =>
			f.rawText.includes('Transparenzhinweis an jeder Dropzone')
		);
		expect(leakedComment).toBe(false);

		// Der Dialogtitel steckt jetzt in {m.…()} — kein Textknoten mehr, den
		// das Muster-Werkzeug sehen könnte.
		expect(findings.some((f) => f.rawText.includes('Was mit Ihrer Aufnahme passiert'))).toBe(false);

		// "Verstanden" und "Datenschutzhinweis" bleiben ungefunden — vorher wegen
		// der dokumentierten Einzelwort-Lücke, jetzt zusätzlich weil beide Texte
		// extrahiert sind.
		expect(findings.some((f) => f.rawText === 'Verstanden')).toBe(false);
		expect(findings.some((f) => f.rawText === 'Datenschutzhinweis')).toBe(false);

		// aria-label ist jetzt ebenfalls {m.…()} — kein Attribut-Literal mehr.
		expect(
			findings.some((f) => f.attribute === 'aria-label' && f.rawText === 'Hinweis schließen')
		).toBe(false);
	});
});
