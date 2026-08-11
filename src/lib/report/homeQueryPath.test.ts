import { describe, expect, it } from 'vitest';
import { buildHomeQueryPath } from './homeQueryPath';

describe('buildHomeQueryPath', () => {
	it('liefert den kanonischen Pfad ohne Query, wenn keine Parameter übrig sind', () => {
		// Reproduziert `returnToSelection()`: `meldung` war der einzige
		// Parameter und wurde gerade gelöscht — `searchParams` ist danach leer.
		const searchParams = new URLSearchParams();
		expect(buildHomeQueryPath(searchParams)).toBe('/');
	});

	it('hängt eine nicht-leere Query mit führendem `?` an', () => {
		const searchParams = new URLSearchParams({ meldung: 'lebend' });
		expect(buildHomeQueryPath(searchParams)).toBe('/?meldung=lebend');
	});

	it('erhält mehrere Parameter, auch Kampagnen-Marker aus Museums-Links', () => {
		// Query-Erhalt darf durch die Leer-Prüfung nicht zurückgehen — dieselbe
		// Zusage hing bereits dreimal als Critical-Fund an dieser Funktion.
		const searchParams = new URLSearchParams({ campaign: 'museum', meldung: 'totfund' });
		expect(buildHomeQueryPath(searchParams)).toBe('/?campaign=museum&meldung=totfund');
	});
});
