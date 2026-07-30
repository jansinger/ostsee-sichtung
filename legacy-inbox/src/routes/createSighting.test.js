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

/**
 * Die .tmp-Datei zählt bewusst nicht mit: Sie ist ein Zwischenstand vor dem
 * rename und beweist gerade nicht, dass die Sichtung dauerhaft abgelegt ist.
 * Ohne diesen Filter kann ein Test grün werden, obwohl der Schreibvorgang
 * danach noch scheitert — genau das war vor dem Fix auf dem Abbruch-Pfad der
 * Fall (rename lief ins Leere, die Prüfung sah die .tmp-Datei).
 */
const dateienIn = async (unter) =>
	readdir(path.join(verzeichnis, unter))
		.catch(() => [])
		.then((dateien) => dateien.filter((datei) => !datei.endsWith('.tmp')));

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

/**
 * Ein einzelner rm() ohne Wiederholungen — und das ist Absicht.
 *
 * Früher brauchte dieses Aufräumen mehrere Anläufe: Auf dem Abbruch-Pfad
 * antwortete der clientError-Handler dem Client, während createSighting.js
 * noch schrieb. Der Test war damit fertig, bevor die Sichtung auf der Platte
 * lag, und traf mit rm() auf ein Verzeichnis, in das gerade noch geschrieben
 * wurde. Die Wiederholungen verdeckten genau den Fehler, den zu prüfen der
 * Sinn dieser Tests ist.
 *
 * Seit die Antwort erst nach dem Schreiben rausgeht, kann kein Schreibvorgang
 * das Ende eines Tests überleben. Bricht rm() hier wieder mit ENOTEMPTY ab,
 * ist das die Regression und soll auffallen, statt weggewartet zu werden.
 */
afterEach(async () => {
	await new Promise((fertig) => server.close(fertig));
	await rm(verzeichnis, { recursive: true, force: true });
});

const sende = (koerper, kopfzeilen = { 'Content-Type': 'application/json' }) =>
	fetch(`${basis}/rest_sichtungen`, { method: 'POST', headers: kopfzeilen, body: koerper });

/**
 * Rohes Socket statt fetch: simuliert einen Client, der die Verbindung mitten
 * in der Übertragung abbricht. Ein Content-Length-Versprechen, das nie
 * eingelöst wird, plus ein Half-Close (FIN) auf der Schreibseite reicht,
 * damit Node den Body-Stream serverseitig mit einem Fehler statt mit 'end'
 * abschließt — die Leseseite bleibt offen, damit die Antwort noch gelesen
 * werden kann.
 *
 * Verbindet über einen Unix-Domain-Socket-Pfad, nicht über einen per
 * server.listen(0) vergebenen TCP-Port (siehe serverAufUnixSocket() unten für
 * die Begründung).
 */
const sendeUnterbrochen = (sockPfad, teilkoerper) =>
	new Promise((resolve, reject) => {
		const socket = net.connect(sockPfad, () => {
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

/**
 * Schließt den übergebenen Server und ersetzt ihn durch einen auf einem
 * Unix-Domain-Socket im Testverzeichnis — nur für sendeUnterbrochen(...)
 * gebraucht.
 *
 * Grund: server.listen(0) lässt die Laufzeitumgebung einen freien TCP-Port
 * wählen, aber "frei" ist nur eine Momentaufnahme beim Binden. In der Zeit
 * zwischen dem close() des einen Servers und dem listen(0) des nächsten kann
 * ein fremder, kurzlebiger Prozess denselben Port belegen (beobachtet auf
 * einer Maschine mit vielen parallelen Kurzlebig-Listenern: der Client bekam
 * eine SSH-Banner-Zeile bzw. eine fremde 401/404-Antwort statt der eigenen
 * Serverantwort — die Sichtung landete dann folgerichtig nirgends, was wie
 * ein Schreib-Race aussah, aber keins war). Ein Unix-Domain-Socket-Pfad liegt
 * dagegen im mkdtemp-Testverzeichnis dieses Tests und ist damit exklusiv:
 * kein anderer Prozess kann zufällig auf denselben Pfad binden.
 */
async function serverAufUnixSocket(aktuellerServer, store) {
	await new Promise((fertig) => aktuellerServer.close(fertig));
	const sockPfad = path.join(verzeichnis, 'ipc.sock');
	const neuerServer = erstelleServer({
		konfiguration: { maxBodyBytes: 262144 },
		store,
		rateLimit: erstelleRateLimit({ proIpProStunde: 100, globalProStunde: 1000 })
	});
	await new Promise((fertig) => neuerServer.listen(sockPfad, fertig));
	return { server: neuerServer, sockPfad };
}

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
		const store = await erstelleStore({ datenVerzeichnis: verzeichnis });
		await store.initialisiere();
		const ersetzt = await serverAufUnixSocket(server, store);
		server = ersetzt.server;

		const antwortRoh = await sendeUnterbrochen(ersetzt.sockPfad, '{"anzahl_gesamt": 1');

		const [statuszeile] = antwortRoh.split('\r\n');
		expect(statuszeile).toContain(' 400 ');

		const umschlag = await einzigeDateiIn('abgewiesen');
		expect(umschlag.validierung.gueltig).toBe(false);
		// Der eigentliche Punkt: Eine Datei, die nur belegt, dass irgendwann
		// irgendwas ankam, ist wertlos. Was bis zum Abbruch übertragen wurde,
		// muss im Umschlag stehen — sonst ist die Sichtung genauso verloren,
		// als hätte der Dienst nie geschrieben.
		expect(umschlag.roh).toBe('{"anzahl_gesamt": 1');
	});

	it('antwortet auf dem Abbruch-Pfad 500, wenn der Schreibvorgang scheitert', async () => {
		// Die Zusage „nie antworten, bevor geschrieben ist" gilt gerade hier:
		// Antwortete der clientError-Handler selbst, käme beim Client ein 400
		// an, obwohl nichts auf der Platte liegt — und ein 500, das ihn zum
		// erneuten Versuch bewegen würde, wäre nicht mehr möglich.
		const ersetzt = await serverAufUnixSocket(server, {
			istBeschreibbar: async () => false,
			schreibe: async () => {
				throw new Error('ENOSPC: no space left on device');
			}
		});
		server = ersetzt.server;

		const antwortRoh = await sendeUnterbrochen(ersetzt.sockPfad, '{"anzahl_gesamt": 1');

		const [statuszeile] = antwortRoh.split('\r\n');
		expect(statuszeile).toContain(' 500 ');
	});

	it('antwortet mit der eigenen JSON-Fehlerform statt Nodes Klartext-400, wenn der Body-Stream mitten in der Übertragung abbricht', async () => {
		// Ohne server.on('clientError', ...) gewinnt Node's eingebaute
		// Default-Antwort ("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n",
		// reiner Text, kein Content-Type) das Rennen gegen die eigene
		// antworteJson-Antwort aus createSighting.js — siehe Diagnose in
		// task-5-report.md, Abschnitt "Fix: flakiger Stream-Abbruch-Test". Dieser
		// Test prüft direkt gegen die Bytes auf der Leitung, dass stattdessen die
		// vertragskonforme JSON-Form ankommt.
		const store = await erstelleStore({ datenVerzeichnis: verzeichnis });
		await store.initialisiere();
		const ersetzt = await serverAufUnixSocket(server, store);
		server = ersetzt.server;

		const antwortRoh = await sendeUnterbrochen(ersetzt.sockPfad, '{"anzahl_gesamt": 1');

		const trennstelle = antwortRoh.indexOf('\r\n\r\n');
		expect(trennstelle).toBeGreaterThan(-1);
		const kopfzeilen = antwortRoh.slice(0, trennstelle);
		const koerperRoh = antwortRoh.slice(trennstelle + 4);

		expect(kopfzeilen).toContain(' 400 ');
		expect(kopfzeilen.toLowerCase()).toContain('content-type: application/json');

		const koerper = JSON.parse(koerperRoh);
		expect(koerper.message).toBe('Validation failed.');
		expect(koerper.errors._general.join(' ')).toMatch(/unvollständig/);

		const umschlag = await einzigeDateiIn('abgewiesen');
		expect(umschlag.validierung.gueltig).toBe(false);
	});
});

describe('POST /rest_sichtungen — Rate-Limit', () => {
	it('schreibt trotz 429 pro IP', async () => {
		await new Promise((fertig) => server.close(fertig));
		const store = await erstelleStore({ datenVerzeichnis: verzeichnis });
		await store.initialisiere();
		server = erstelleServer({
			konfiguration: { maxBodyBytes: 262144 },
			store,
			rateLimit: erstelleRateLimit({ proIpProStunde: 1, globalProStunde: 1000 })
		});
		await new Promise((fertig) => server.listen(0, fertig));
		basis = `http://127.0.0.1:${server.address().port}`;

		expect((await sende(JSON.stringify(gueltig))).status).toBe(201);
		expect((await sende(JSON.stringify(gueltig))).status).toBe(429);

		expect(await dateienIn('posteingang')).toHaveLength(2);
	});

	it('schreibt bei der globalen Reißleine bewusst NICHT', async () => {
		await new Promise((fertig) => server.close(fertig));
		const store = await erstelleStore({ datenVerzeichnis: verzeichnis });
		await store.initialisiere();
		server = erstelleServer({
			konfiguration: { maxBodyBytes: 262144 },
			store,
			rateLimit: erstelleRateLimit({ proIpProStunde: 100, globalProStunde: 1 })
		});
		await new Promise((fertig) => server.listen(0, fertig));
		basis = `http://127.0.0.1:${server.address().port}`;

		expect((await sende(JSON.stringify(gueltig))).status).toBe(201);
		expect((await sende(JSON.stringify(gueltig))).status).toBe(429);

		expect(await dateienIn('posteingang')).toHaveLength(1);
	});
});
