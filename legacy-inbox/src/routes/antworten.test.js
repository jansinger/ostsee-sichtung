import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { erstelleServer } from '../server.js';

let server;
let basis;

beforeAll(async () => {
	server = erstelleServer({
		konfiguration: { maxBodyBytes: 262144 },
		store: { istBeschreibbar: async () => true },
		rateLimit: { pruefeIp: () => true, pruefeGlobal: () => true }
	});
	await new Promise((fertig) => server.listen(0, fertig));
	basis = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise((fertig) => server.close(fertig)));

describe('GET /rest_sichtungen/antworten.json', () => {
	it('liefert die deutsche Enum-Tabelle', async () => {
		const antwort = await fetch(`${basis}/rest_sichtungen/antworten.json`);
		expect(antwort.status).toBe(200);

		const koerper = await antwort.json();
		expect(koerper.tierart['0']).toBe('Schweinswal');
		expect(koerper.bootsantrieb['5']).toBe('Kein Boot');
		expect(koerper.vonwo['4']).toBe('Fähre');
	});

	it('liefert unter /en/ die englische Fassung', async () => {
		const antwort = await fetch(`${basis}/en/rest_sichtungen/antworten.json`);
		expect(antwort.status).toBe(200);
		expect(await antwort.json()).toHaveProperty('tierart');
	});
});
