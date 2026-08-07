import { describe, expect, it } from 'vitest';
import { collectHits, sourceFiles, stripComments } from './sourceScan.testutil';

/**
 * @fileoverview Selbsttests der gemeinsamen Textaufbereitung
 *
 * `stripComments()` war bis zu diesem PR in `approvalPredicateScan.test.ts`
 * exportiert und nur **indirekt** über dessen Gegenproben abgesichert. Seit sie
 * zwei Guards trägt, gehören die Eigenschaften direkt geprüft — sonst merkt
 * niemand, wenn eine Änderung für die eine Regel passt und die andere blind
 * macht. Der `<!-- -->`-Zweig ist neu und braucht denselben Nachweis.
 */

describe('stripComments', () => {
	it('behält Länge und Zeilenumbrüche, damit Zeilennummern stimmen', () => {
		const source = ['const a = 1; // Kommentar', '/* Block */', 'const b = 2;'].join('\n');
		const stripped = stripComments(source);

		expect(stripped.length).toBe(source.length);
		expect(stripped.split('\n')).toHaveLength(3);
		expect(stripped.split('\n')[2]).toBe('const b = 2;');
	});

	it.each([
		['// weg', 'const a = 1; // weg'],
		['/* weg */', 'const a = 1; /* weg */'],
		['<!-- weg -->', '<span>x</span> <!-- weg -->']
	])('entfernt den Kommentar %s', (_name, source) => {
		expect(stripComments(source)).not.toContain('weg');
	});

	it('entfernt den mehrzeiligen Svelte-Kommentar', () => {
		const source = ['<!--', '  Begründung neben dem Markup', '-->', '<td>{status}</td>'].join('\n');

		expect(stripComments(source)).not.toContain('Begründung');
		expect(stripComments(source)).toContain('<td>{status}</td>');
	});

	/* Das `(?<!:)`: Ohne es verschluckt eine URL den Rest ihrer Zeile. */
	it('hält https:// aus der Kommentarerkennung heraus', () => {
		expect(stripComments("const url = 'https://x/y'; const a = 1;")).toContain('const a = 1;');
	});

	/* Das `(?<!\w)`: Ohne es eröffnet der MIME-Glob einen Blockkommentar, der bis
	   zum nächsten `*\/` alles verschluckt — im Bestand einmal 215 Zeilen. */
	it('hält den MIME-Glob aus der Kommentarerkennung heraus', () => {
		const source = ["const cfg = { accept: 'image/*' };", 'const a = 1;', '/** später */'].join(
			'\n'
		);

		expect(stripComments(source)).toContain('const a = 1;');
	});

	/* Der frühere Kommentaranfang gewinnt — deshalb eine Alternation und nicht
	   zwei Durchläufe. */
	it('erkennt `// mit /* darin` als Zeilenkommentar', () => {
		const source = 'const a = 1; // foo /* bar\nconst b = 2;';

		expect(stripComments(source)).toContain('const b = 2;');
	});
});

describe('collectHits', () => {
	it('meldet 1-basierte Zeilennummern', () => {
		const hits = collectHits(['erste', '', 'const a = TREFFER;'].join('\n'), [/TREFFER/g]);

		expect(hits).toEqual([{ line: 3, text: 'TREFFER' }]);
	});

	it('meldet je Zeile nur einmal, auch wenn zwei Muster greifen', () => {
		const hits = collectHits('const a = TREFFER;', [/TREFFER/g, /TREF/g]);

		expect(hits).toHaveLength(1);
	});

	it('normalisiert einen umgebrochenen Treffer auf eine Zeile', () => {
		const hits = collectHits('TREF\n\tFER', [/TREF\s*FER/g]);

		expect(hits[0]?.text).toBe('TREF FER');
	});
});

describe('sourceFiles', () => {
	it('liefert nur Dateien mit passender Endung, rekursiv und sortiert', () => {
		const files = sourceFiles('src/lib/testing', /\.(ts|js|svelte)$/);

		expect(files).toContain('src/lib/testing/sourceScan.testutil.ts');
		expect(files).toEqual([...files].sort());
	});

	/* Der Extension-Filter ist der Punkt: Ohne ihn las der Guard gegen `geprueft`
	   auch Webfonts und GeoJSON als UTF-8 ein. */
	it('lässt Dateien ohne passende Endung aus', () => {
		expect(sourceFiles('src/lib/testing', /\.geojson$/)).toEqual([]);
	});
});
