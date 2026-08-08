import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TABELLEN_PARAMETER, tableReturnUrl } from './tableReturnUrl';

describe('tableReturnUrl — Rückweg aus der Detailansicht', () => {
	it('behält den Ostsee-Filter (balticSea)', () => {
		const ziel = tableReturnUrl(new URL('https://x/admin/29518?balticSea=baltic'));
		expect(new URL(ziel).searchParams.get('balticSea')).toBe('baltic');
	});

	it('behält den Meldeart-Filter (deadFinding)', () => {
		const ziel = tableReturnUrl(new URL('https://x/admin/29518?deadFinding=1'));
		expect(new URL(ziel).searchParams.get('deadFinding')).toBe('1');
	});

	it('behält Status, Ostsee-Status und Meldeart gemeinsam', () => {
		const ziel = new URL(
			tableReturnUrl(new URL('https://x/admin/29518?verified=open&balticSea=baltic&deadFinding=1'))
		);
		expect(ziel.pathname).toBe('/admin/sichtungen');
		expect(ziel.searchParams.get('verified')).toBe('open');
		expect(ziel.searchParams.get('balticSea')).toBe('baltic');
		expect(ziel.searchParams.get('deadFinding')).toBe('1');
	});

	it('übernimmt fremde Parameter nicht', () => {
		const ziel = new URL(tableReturnUrl(new URL('https://x/admin/29518?tab=media&from=inbox')));
		expect(ziel.searchParams.has('tab')).toBe(false);
		expect(ziel.searchParams.has('from')).toBe(false);
	});

	it('führt ohne Parameter auf die nackte Tabellen-URL', () => {
		expect(tableReturnUrl(new URL('https://x/admin/29518'))).toBe('https://x/admin/sichtungen');
	});

	it('deckt alle Filter-Parameter ab, die die Tabelle tatsächlich liest', () => {
		// Abgleich gegen die Quelle statt gegen eine zweite Liste: Wer der Tabelle
		// einen Filter hinzufügt, ohne ihn hier nachzuziehen, bekommt genau den
		// Bug, um den es geht — der Rückweg verlöre ihn still.
		const quellen = ['+page.server.ts', '+page.svelte'].map((datei) =>
			readFileSync(new URL(`../sichtungen/${datei}`, import.meta.url), 'utf-8')
		);
		const gelesen = new Set<string>();
		for (const quelle of quellen) {
			for (const treffer of quelle.matchAll(/searchParams\.get\('([^']+)'\)/g)) {
				if (treffer[1]) gelesen.add(treffer[1]);
			}
		}

		expect(gelesen.size).toBeGreaterThan(0);
		expect([...gelesen].sort()).toEqual([...TABELLEN_PARAMETER].sort());
	});
});
