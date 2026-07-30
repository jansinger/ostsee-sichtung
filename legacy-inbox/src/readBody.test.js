import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import { leseBody, parseBody } from './readBody.js';

const anfrage = (text) => Readable.from([Buffer.from(text, 'utf8')]);

describe('leseBody', () => {
	it('liest den vollständigen Body', async () => {
		const { roh, abgeschnitten } = await leseBody(anfrage('{"a":1}'), { maxBytes: 1000 });
		expect(roh).toBe('{"a":1}');
		expect(abgeschnitten).toBe(false);
	});

	it('behält das Gelesene bei Überschreitung, statt es zu verwerfen', async () => {
		const lang = 'x'.repeat(500);
		const { roh, abgeschnitten } = await leseBody(anfrage(lang), { maxBytes: 100 });
		expect(abgeschnitten).toBe(true);
		expect(roh).toHaveLength(100);
	});

	it('liefert bei leerem Body einen leeren Text', async () => {
		const { roh } = await leseBody(anfrage(''), { maxBytes: 1000 });
		expect(roh).toBe('');
	});
});

describe('parseBody', () => {
	it('parst JSON', () => {
		expect(parseBody('{"anzahl_gesamt":3}', 'application/json')).toEqual({
			payload: { anzahl_gesamt: 3 },
			parseFehler: null
		});
	});

	it('parst Formulardaten', () => {
		const ergebnis = parseBody('name=Meier&anzahl_gesamt=2', 'application/x-www-form-urlencoded');
		expect(ergebnis.payload).toEqual({ name: 'Meier', anzahl_gesamt: '2' });
	});

	it('parst Formulardaten auch ohne Content-Type', () => {
		const ergebnis = parseBody('name=Meier', '');
		expect(ergebnis.payload).toEqual({ name: 'Meier' });
	});

	it('erhält Umlaute in Formulardaten', () => {
		const ergebnis = parseBody('name=J%C3%B6rg+Schn%C3%B6r', 'application/x-www-form-urlencoded');
		expect(ergebnis.payload.name).toBe('Jörg Schnör');
	});

	it('meldet einen Parse-Fehler, ohne zu werfen', () => {
		const ergebnis = parseBody('{kaputt', 'application/json');
		expect(ergebnis.payload).toBeNull();
		expect(ergebnis.parseFehler).toMatch(/JSON/i);
	});

	it('meldet einen Parse-Fehler bei leerem Body', () => {
		const ergebnis = parseBody('', 'application/json');
		expect(ergebnis.payload).toBeNull();
		expect(ergebnis.parseFehler).toBeTruthy();
	});
});
