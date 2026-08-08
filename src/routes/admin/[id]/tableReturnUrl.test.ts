import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HERKUNFT_EINGANG, HERKUNFT_PARAMETER } from '$lib/components/admin/adminReturn';
import {
	TABELLEN_PARAMETER,
	carryReturnParams,
	returnTarget,
	tableReturnUrl
} from './tableReturnUrl';

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

describe('returnTarget — der Rückweg kennt seine Herkunft', () => {
	it('führt aus dem Eingang zurück in den Eingang, nicht in die Tabelle', () => {
		const ziel = returnTarget(
			new URL(`https://x/admin/29518?${HERKUNFT_PARAMETER}=${HERKUNFT_EINGANG}`)
		);
		expect(new URL(ziel.href).pathname).toBe('/admin');
		expect(ziel.label).toBe('Zurück zum Eingang');
	});

	it('springt dabei an die Karte, von der man kam', () => {
		const ziel = returnTarget(
			new URL(`https://x/admin/29518?${HERKUNFT_PARAMETER}=${HERKUNFT_EINGANG}`),
			29518
		);
		expect(new URL(ziel.href).hash).toBe('#sichtung-29518');
	});

	it('lässt den Anker weg, wenn es die Sichtung nicht mehr gibt', () => {
		const ziel = returnTarget(
			new URL(`https://x/admin/29518?${HERKUNFT_PARAMETER}=${HERKUNFT_EINGANG}`)
		);
		expect(new URL(ziel.href).hash).toBe('');
	});

	it('führt ohne Herkunft in die Tabelle — mit ihren Filtern', () => {
		const ziel = returnTarget(new URL('https://x/admin/29518?balticSea=baltic&page=3'), 29518);
		const url = new URL(ziel.href);
		expect(url.pathname).toBe('/admin/sichtungen');
		expect(url.searchParams.get('balticSea')).toBe('baltic');
		expect(url.searchParams.get('page')).toBe('3');
		expect(ziel.label).toBe('Zurück zur Tabelle');
		/* Der Anker gehört zur Eingangsliste; in der Tabelle gibt es ihn nicht —
		   ein Sprungziel ins Leere scrollt nirgendwohin und sieht nach Defekt aus. */
		expect(url.hash).toBe('');
	});

	/* Der Eingang hält seine Sortierung in `?order=` (`+page.server.ts`). Ohne
	   sie steht die Liste nach dem Rückweg wieder auf `desc` — der Anker träfe
	   dieselbe Karte an völlig anderer Stelle, also genau das Abreißen der
	   Arbeitsliste, das dieser Rückweg verhindern soll. Nur im `asc`-Fall
	   sichtbar, weil `desc` der Default ist. */
	it('behält die Sortierung des Eingangs', () => {
		const ziel = returnTarget(
			new URL(`https://x/admin/29518?${HERKUNFT_PARAMETER}=${HERKUNFT_EINGANG}&order=asc`),
			29518
		);
		const url = new URL(ziel.href);
		expect(url.searchParams.get('order')).toBe('asc');
		expect(url.hash).toBe('#sichtung-29518');
	});

	it('behandelt eine unbekannte Herkunft wie keine', () => {
		const ziel = returnTarget(new URL(`https://x/admin/29518?${HERKUNFT_PARAMETER}=irgendwas`));
		expect(new URL(ziel.href).pathname).toBe('/admin/sichtungen');
	});
});

describe('carryReturnParams — der Rundweg über „Bearbeiten"', () => {
	it('reicht die Herkunft weiter, sonst endet der Rückweg dort', () => {
		const query = carryReturnParams(
			new URL(`https://x/admin/29518?${HERKUNFT_PARAMETER}=${HERKUNFT_EINGANG}`)
		);
		expect(returnTarget(new URL(`https://x/admin/29518/edit${query}`)).label).toBe(
			'Zurück zum Eingang'
		);
	});

	it('reicht die Tabellenfilter weiter', () => {
		const query = carryReturnParams(new URL('https://x/admin/29518?verified=open&page=3'));
		const params = new URLSearchParams(query);
		expect(params.get('verified')).toBe('open');
		expect(params.get('page')).toBe('3');
	});

	it('übernimmt fremde Parameter nicht', () => {
		expect(
			new URLSearchParams(carryReturnParams(new URL('https://x/admin/29518?tab=media'))).has('tab')
		).toBe(false);
	});

	it('liefert ohne Parameter einen leeren String — keine nackte „?"-URL', () => {
		expect(carryReturnParams(new URL('https://x/admin/29518'))).toBe('');
	});
});
