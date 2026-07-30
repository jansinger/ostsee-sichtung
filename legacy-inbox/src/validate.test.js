import { describe, it, expect } from 'vitest';
import { validiere, fehlerAntwort } from './validate.js';

const gueltig = {
	sichtungsdatum: '2026-07-30 14:50',
	vorname: 'Jörg',
	name: 'Schneider',
	email: 'joerg@example.de',
	anzahl_gesamt: 1
};

describe('validiere', () => {
	it('nimmt eine vollständige Sichtung an', async () => {
		expect(await validiere(gueltig)).toEqual({ gueltig: true, fehler: {} });
	});

	it('lässt anzahl_gesamt = 0 zu (Totfund)', async () => {
		const ergebnis = await validiere({ ...gueltig, anzahl_gesamt: 0 });
		expect(ergebnis.gueltig).toBe(true);
	});

	it('meldet fehlende Pflichtfelder mit den deutschen Meldungen des Vertrags', async () => {
		const ergebnis = await validiere({});
		expect(ergebnis.gueltig).toBe(false);
		expect(ergebnis.fehler.anzahl_gesamt).toEqual(['Dieses Feld kann nicht leer gelassen werden.']);
		expect(ergebnis.fehler.email).toEqual(['Bitte geben Sie eine gültige E-Mail-Adresse ein.']);
		expect(ergebnis.fehler.sichtungsdatum).toEqual(['Bitte geben Sie ein gültiges Datum an.']);
	});

	it('weist ein Datum im falschen Format ab', async () => {
		const ergebnis = await validiere({ ...gueltig, sichtungsdatum: '30.07.2026 14:50' });
		expect(ergebnis.fehler.sichtungsdatum).toEqual(['Bitte geben Sie ein gültiges Datum an.']);
	});

	it('prüft die Koordinatengrenzen', async () => {
		const ergebnis = await validiere({ ...gueltig, gps_breite: 95 });
		expect(ergebnis.fehler.gps_breite).toEqual([
			'Der Breitengrad muss zwischen -90 und 90 liegen.'
		]);
	});

	it('nimmt sonstige_auffaelligkeiten in der Schreibweise des Vertrags an', async () => {
		const ergebnis = await validiere({ ...gueltig, sonstige_auffaelligkeiten: 'Sehr ruhig' });
		expect(ergebnis.gueltig).toBe(true);
	});

	it('nimmt auch die Umlaut-Schreibweise der Hauptanwendung an', async () => {
		const ergebnis = await validiere({ ...gueltig, sonstige_auffälligkeiten: 'Sehr ruhig' });
		expect(ergebnis.gueltig).toBe(true);
	});

	it('lässt unbekannte Felder durchgehen, ohne sie zu bemängeln', async () => {
		const ergebnis = await validiere({ ...gueltig, voellig_neues_feld: 'wert' });
		expect(ergebnis.gueltig).toBe(true);
	});

	it('akzeptiert leere Strings in optionalen Zahlenfeldern (Formular-Encoding)', async () => {
		const ergebnis = await validiere({ ...gueltig, vonwo: '', entfernung: '' });
		expect(ergebnis.gueltig).toBe(true);
		expect(ergebnis.fehler.vonwo).toBeUndefined();
		expect(ergebnis.fehler.entfernung).toBeUndefined();
	});

	it.each([
		['null', null],
		['undefined', undefined],
		['einen String', 'kein Objekt'],
		['eine Zahl', 42],
		['ein Array', ['kein Objekt']]
	])('wirft nicht bei %s als Payload und meldet gueltig: false', async (_beschreibung, payload) => {
		await expect(validiere(payload)).resolves.toEqual(expect.objectContaining({ gueltig: false }));
	});
});

describe('fehlerAntwort', () => {
	it('erzeugt die flache Form aus dem PDF', () => {
		expect(
			fehlerAntwort({ anzahl_gesamt: ['Dieses Feld kann nicht leer gelassen werden.'] })
		).toEqual({
			message: 'Validation failed.',
			errors: { anzahl_gesamt: ['Dieses Feld kann nicht leer gelassen werden.'] }
		});
	});
});
