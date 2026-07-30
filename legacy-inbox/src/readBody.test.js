import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import { leseBody, parseBody } from './readBody.js';

const anfrage = (text) => Readable.from([Buffer.from(text, 'utf8')]);

/**
 * Ein Strom, der ein Stück liefert und danach mit einem Fehler abbricht —
 * der Mobilclient, dem mitten im Senden die Verbindung wegbricht.
 */
const abbrechenderStrom = (text) => {
	let geliefert = false;
	return new Readable({
		read() {
			if (!geliefert) {
				geliefert = true;
				this.push(Buffer.from(text, 'utf8'));
				return;
			}
			this.destroy(new Error('Übertragung abgebrochen'));
		}
	});
};

describe('leseBody', () => {
	it('liest den vollständigen Body', async () => {
		const { roh, abgeschnitten, leseFehler } = await leseBody(anfrage('{"a":1}'), {
			maxBytes: 1000
		});
		expect(roh).toBe('{"a":1}');
		expect(abgeschnitten).toBe(false);
		expect(leseFehler).toBeNull();
	});

	it('behält das Gelesene, wenn der Strom mitten in der Übertragung abbricht', async () => {
		// Der Kern der Zusage: Ein Abbruch darf die bereits empfangenen Bytes
		// nicht unerreichbar machen. Würde hier geworfen, stünde am Aufrufort
		// nur noch ein leeres roh zur Verfügung — die Sichtung wäre auf der
		// Platte vorhanden, aber inhaltsleer.
		const { roh, abgeschnitten, leseFehler } = await leseBody(
			abbrechenderStrom('{"anzahl_gesamt": 1'),
			{ maxBytes: 1000 }
		);

		expect(roh).toBe('{"anzahl_gesamt": 1');
		expect(leseFehler).toBeInstanceOf(Error);
		// abgeschnitten meint ausschließlich die Byte-Obergrenze (Entwurf,
		// Abschnitt 5); ein Verbindungsabbruch ist ein eigener Vermerk.
		expect(abgeschnitten).toBe(false);
	});

	it('wirft auch bei einem Abbruch ohne jedes gelesene Byte nicht', async () => {
		const strom = new Readable({
			read() {
				this.destroy(new Error('sofort weg'));
			}
		});

		const { roh, leseFehler } = await leseBody(strom, { maxBytes: 1000 });
		expect(roh).toBe('');
		expect(leseFehler).toBeInstanceOf(Error);
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

	it('schneidet nicht mitten in einem Mehrbyte-Zeichen ab', async () => {
		// 'ö' ist in UTF-8 zwei Byte lang; bei maxBytes: 10 landet die Grenze
		// genau zwischen den beiden Bytes. Das unvollständige Zeichen muss
		// verworfen werden, alles davor bleibt erhalten.
		const roh = 'a'.repeat(9) + 'ö';
		const { roh: text, abgeschnitten } = await leseBody(anfrage(roh), { maxBytes: 10 });
		expect(text).toBe('a'.repeat(9));
		expect(abgeschnitten).toBe(true);
	});

	it('wirft ohne maxBytes, statt die Grenze stillschweigend zu deaktivieren', async () => {
		await expect(leseBody(anfrage('x'), {})).rejects.toThrow();
	});

	it('wirft bei maxBytes 0 oder negativ', async () => {
		await expect(leseBody(anfrage('x'), { maxBytes: 0 })).rejects.toThrow();
		await expect(leseBody(anfrage('x'), { maxBytes: -5 })).rejects.toThrow();
	});

	it('wirft bei maxBytes NaN', async () => {
		await expect(leseBody(anfrage('x'), { maxBytes: NaN })).rejects.toThrow();
	});

	it('wirft bei maxBytes Infinity', async () => {
		await expect(leseBody(anfrage('x'), { maxBytes: Infinity })).rejects.toThrow();
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

	it('wirft nicht bei undefined roh', () => {
		const ergebnis = parseBody(undefined, 'application/json');
		expect(ergebnis.payload).toBeNull();
		expect(ergebnis.parseFehler).toBeTruthy();
	});

	it('wirft nicht bei null roh', () => {
		const ergebnis = parseBody(null, 'application/json');
		expect(ergebnis.payload).toBeNull();
		expect(ergebnis.parseFehler).toBeTruthy();
	});

	it('wirft nicht bei numerischem roh', () => {
		const ergebnis = parseBody(42, 'application/json');
		expect(ergebnis.payload).toBeNull();
		expect(ergebnis.parseFehler).toBeTruthy();
	});

	it('behandelt einen nicht-string Content-Type wie fehlend', () => {
		// Ein truthy, aber nicht-stringiger Content-Type (z.B. ein Array aus
		// kaputtem Client-Code) darf nicht an toLowerCase() durchgereicht werden.
		const ergebnis = parseBody('{"a":1}', ['application/json']);
		expect(ergebnis).toEqual({ payload: { a: 1 }, parseFehler: null });
	});
});
