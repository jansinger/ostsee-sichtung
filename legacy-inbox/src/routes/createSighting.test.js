import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { erstelleStore } from '../store.js';
import { erstelleServer } from '../server.js';
import { erstelleRateLimit } from '../rateLimit.js';

let verzeichnis;
let server;
let basis;

const gueltig = {
	sichtungsdatum: '2026-07-30 14:50',
	vorname: 'Jörg',
	name: 'Schneider',
	email: 'joerg@example.de',
	anzahl_gesamt: 1
};

const dateienIn = async (unter) => readdir(path.join(verzeichnis, unter)).catch(() => []);

const einzigeDateiIn = async (unter) => {
	const dateien = await dateienIn(unter);
	expect(dateien).toHaveLength(1);
	return JSON.parse(await readFile(path.join(verzeichnis, unter, dateien[0]), 'utf8'));
};

beforeEach(async () => {
	verzeichnis = await mkdtemp(path.join(tmpdir(), 'inbox-'));
	const store = await erstelleStore({ datenVerzeichnis: verzeichnis });
	await store.initialisiere();

	server = erstelleServer({
		konfiguration: { maxBodyBytes: 262144 },
		store,
		rateLimit: erstelleRateLimit({ proIpProStunde: 100, globalProStunde: 1000 })
	});
	await new Promise((fertig) => server.listen(0, fertig));
	basis = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
	await new Promise((fertig) => server.close(fertig));
	await rm(verzeichnis, { recursive: true, force: true });
});

const sende = (koerper, kopfzeilen = { 'Content-Type': 'application/json' }) =>
	fetch(`${basis}/rest_sichtungen`, { method: 'POST', headers: kopfzeilen, body: koerper });

/**
 * Rohes TCP statt fetch: simuliert einen Client, der die Verbindung mitten in
 * der Übertragung abbricht. Ein Content-Length-Versprechen, das nie eingelöst
 * wird, plus ein Half-Close (FIN) auf der Schreibseite reicht, damit Node den
 * Body-Stream serverseitig mit einem Fehler statt mit 'end' abschließt — die
 * Leseseite bleibt offen, damit die Antwort noch gelesen werden kann.
 */
const sendeUnterbrochen = (port, teilkoerper) =>
	new Promise((resolve, reject) => {
		const socket = net.connect(port, '127.0.0.1', () => {
			socket.write(
				'POST /rest_sichtungen HTTP/1.1\r\n' +
					'Host: localhost\r\n' +
					'Content-Type: application/json\r\n' +
					`Content-Length: ${teilkoerper.length + 1000}\r\n` +
					'\r\n' +
					teilkoerper
			);
			socket.end();
		});
		let antwortRoh = '';
		socket.on('data', (stueck) => {
			antwortRoh += stueck.toString();
		});
		socket.on('close', () => resolve(antwortRoh));
		socket.on('error', reject);
	});

describe('POST /rest_sichtungen — der Leitsatz', () => {
	it('hinterlässt auch bei vollständigem Unsinn eine Datei', async () => {
		const antwort = await sende('das ist überhaupt kein gültiger Request');

		expect(antwort.status).toBe(400);
		const umschlag = await einzigeDateiIn('abgewiesen');
		expect(umschlag.roh).toBe('das ist überhaupt kein gültiger Request');
		expect(umschlag.validierung.gueltig).toBe(false);
	});

	it('hinterlässt bei kaputtem JSON eine Datei mit dem Rohtext', async () => {
		await sende('{"anzahl_gesamt": 1, kaputt');
		const umschlag = await einzigeDateiIn('abgewiesen');
		expect(umschlag.roh).toBe('{"anzahl_gesamt": 1, kaputt');
		expect(umschlag.payload).toBeNull();
	});

	it('hinterlässt bei leerem Body eine Datei', async () => {
		const antwort = await sende('');
		expect(antwort.status).toBe(400);
		expect(await dateienIn('abgewiesen')).toHaveLength(1);
	});
});

describe('POST /rest_sichtungen — Vertrag', () => {
	it('antwortet 201 mit Location und Saved', async () => {
		const antwort = await sende(JSON.stringify(gueltig));

		expect(antwort.status).toBe(201);
		expect(antwort.headers.get('location')).toBe('/rest_sichtungen/view/1.json');
		expect(await antwort.json()).toEqual({ message: 'Saved' });
	});

	it('legt Gültiges in posteingang/ und den Payload unverändert ab', async () => {
		await sende(JSON.stringify({ ...gueltig, voellig_neues_feld: 'bleibt erhalten' }));

		const umschlag = await einzigeDateiIn('posteingang');
		expect(umschlag.payload.voellig_neues_feld).toBe('bleibt erhalten');
		expect(umschlag.payload.vorname).toBe('Jörg');
		expect(umschlag.validierung.gueltig).toBe(true);
		expect(umschlag.quelle.content_type).toBe('application/json');
		expect(umschlag.empfangen_am).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it('antwortet bei ungültigen Daten mit der flachen Fehlerform', async () => {
		const antwort = await sende(JSON.stringify({ vorname: 'Jörg' }));

		expect(antwort.status).toBe(400);
		const koerper = await antwort.json();
		expect(koerper.message).toBe('Validation failed.');
		expect(koerper.errors.anzahl_gesamt).toEqual(['Dieses Feld kann nicht leer gelassen werden.']);
	});

	it('nimmt Formulardaten ohne Content-Type an', async () => {
		const formular = new URLSearchParams({ ...gueltig, anzahl_gesamt: '1' }).toString();
		const antwort = await sende(formular, {});

		expect(antwort.status).toBe(201);
		const umschlag = await einzigeDateiIn('posteingang');
		expect(umschlag.payload.name).toBe('Schneider');
	});

	it('erhält Umlaute über Formularkodierung', async () => {
		const formular = new URLSearchParams({ ...gueltig, vorname: 'Jörg' }).toString();
		await sende(formular, { 'Content-Type': 'application/x-www-form-urlencoded' });

		const umschlag = await einzigeDateiIn('posteingang');
		expect(umschlag.payload.vorname).toBe('Jörg');
	});

	it('markiert überlange Bodys als abgeschnitten, statt sie zu verwerfen', async () => {
		await new Promise((fertig) => server.close(fertig));
		const store = await erstelleStore({ datenVerzeichnis: verzeichnis });
		await store.initialisiere();
		server = erstelleServer({
			konfiguration: { maxBodyBytes: 100 },
			store,
			rateLimit: erstelleRateLimit({ proIpProStunde: 100, globalProStunde: 1000 })
		});
		await new Promise((fertig) => server.listen(0, fertig));
		basis = `http://127.0.0.1:${server.address().port}`;

		await sende(JSON.stringify({ ...gueltig, bemerkungen: 'x'.repeat(500) }));

		const umschlag = await einzigeDateiIn('abgewiesen');
		expect(umschlag.abgeschnitten).toBe(true);
		// Byte-Länge statt Zeichen-Länge: `gueltig.vorname` ("Jörg") enthält ein
		// mehrbytiges UTF-8-Zeichen vor der Schnittstelle. maxBytes ist eine
		// Byte-Grenze (siehe readBody.test.js), die JS-String-Länge wäre hier
		// 99 statt 100, obwohl exakt 100 Bytes gelesen wurden.
		expect(Buffer.byteLength(umschlag.roh, 'utf8')).toBe(100);
	});

	it('weist eine bei Padding abgeschnittene, sonst gültige Sichtung ab statt sie zu speichern', async () => {
		// Anders als der Test oben wird NICHT mitten im JSON geschnitten: Der
		// gültige JSON-Text passt vollständig vor die Grenze, nur das
		// Padding danach fällt weg. roh bleibt dadurch valides, vollständiges
		// JSON — validiere(...) allein würde gueltig:true liefern. Das ist
		// genau der Fall, den Fix 1 abfängt: abgeschnitten muss die Antwort
		// auch dann auf ungültig ziehen, wenn die Nutzdaten selbst
		// vollständig und korrekt sind.
		await new Promise((fertig) => server.close(fertig));
		const store = await erstelleStore({ datenVerzeichnis: verzeichnis });
		await store.initialisiere();
		const json = JSON.stringify(gueltig);
		server = erstelleServer({
			konfiguration: { maxBodyBytes: Buffer.byteLength(json, 'utf8') },
			store,
			rateLimit: erstelleRateLimit({ proIpProStunde: 100, globalProStunde: 1000 })
		});
		await new Promise((fertig) => server.listen(0, fertig));
		basis = `http://127.0.0.1:${server.address().port}`;

		const antwort = await sende(json + ' '.repeat(50));

		expect(antwort.status).toBe(400);
		const umschlag = await einzigeDateiIn('abgewiesen');
		expect(umschlag.abgeschnitten).toBe(true);
		expect(umschlag.validierung.gueltig).toBe(false);
		const koerper = await antwort.json();
		expect(koerper.errors._general.join(' ')).toMatch(/abgebrochen.*vollständig empfangen/);
	});

	it('antwortet 500 statt 201, wenn nicht geschrieben werden kann', async () => {
		await new Promise((fertig) => server.close(fertig));
		server = erstelleServer({
			konfiguration: { maxBodyBytes: 262144 },
			store: {
				istBeschreibbar: async () => false,
				schreibe: async () => {
					throw new Error('ENOSPC: no space left on device');
				}
			},
			rateLimit: erstelleRateLimit({ proIpProStunde: 100, globalProStunde: 1000 })
		});
		await new Promise((fertig) => server.listen(0, fertig));
		basis = `http://127.0.0.1:${server.address().port}`;

		const antwort = await sende(JSON.stringify(gueltig));
		expect(antwort.status).toBe(500);
	});

	it('schreibt trotzdem ab, wenn der Body-Stream mitten in der Übertragung abbricht', async () => {
		const antwortRoh = await sendeUnterbrochen(server.address().port, '{"anzahl_gesamt": 1');

		const [statuszeile] = antwortRoh.split('\r\n');
		expect(statuszeile).toContain(' 400 ');

		const umschlag = await einzigeDateiIn('abgewiesen');
		expect(umschlag.validierung.gueltig).toBe(false);
	});
});
