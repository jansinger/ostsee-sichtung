import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { erstelleServer } from './server.js';

let server;
let basis;

const storeAttrappe = { istBeschreibbar: async () => true };
const rateLimitAttrappe = { pruefeIp: () => true, pruefeGlobal: () => true };

beforeAll(async () => {
	server = erstelleServer({
		konfiguration: { maxBodyBytes: 262144 },
		store: storeAttrappe,
		rateLimit: rateLimitAttrappe
	});
	await new Promise((fertig) => server.listen(0, fertig));
	basis = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise((fertig) => server.close(fertig)));

describe('Router', () => {
	it('meldet über /health, dass das Datenverzeichnis beschreibbar ist', async () => {
		const antwort = await fetch(`${basis}/health`);
		expect(antwort.status).toBe(200);
		expect(await antwort.json()).toEqual({ status: 'ok', datenverzeichnis: 'beschreibbar' });
	});

	it('antwortet 404 auf unbekannte Pfade', async () => {
		const antwort = await fetch(`${basis}/gibtesnicht`);
		expect(antwort.status).toBe(404);
	});

	it('antwortet 405, wenn die Methode nicht zum Pfad passt', async () => {
		const antwort = await fetch(`${basis}/rest_sichtungen`, { method: 'GET' });
		expect(antwort.status).toBe(405);
	});

	it('meldet 503, wenn das Datenverzeichnis nicht beschreibbar ist', async () => {
		const kaputt = erstelleServer({
			konfiguration: { maxBodyBytes: 262144 },
			store: { istBeschreibbar: async () => false },
			rateLimit: rateLimitAttrappe
		});
		await new Promise((fertig) => kaputt.listen(0, fertig));
		const antwort = await fetch(`http://127.0.0.1:${kaputt.address().port}/health`);
		expect(antwort.status).toBe(503);
		await new Promise((fertig) => kaputt.close(fertig));
	});
});
