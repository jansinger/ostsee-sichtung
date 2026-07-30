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

const frage = (abfrage) => fetch(`${basis}/rest_sichtungen/inBaltic.json?${abfrage}`);

describe('GET /rest_sichtungen/inBaltic.json', () => {
	it('liefert das Beispiel aus dem PDF', async () => {
		const antwort = await frage('location=53,10');
		expect(antwort.status).toBe(200);
		expect(await antwort.json()).toEqual({ inbaltic: false, inchartarea: true });
	});

	it('nutzt die Reihenfolge Breite,Länge', async () => {
		const antwort = await frage('location=54.5,10.5');
		expect(await antwort.json()).toEqual({ inbaltic: true, inchartarea: true });
	});

	it('antwortet 400 ohne location', async () => {
		expect((await frage('')).status).toBe(400);
	});

	it('antwortet 400 bei falschem Format', async () => {
		expect((await frage('location=53')).status).toBe(400);
	});

	it('antwortet 400 bei nicht-numerischen Koordinaten', async () => {
		expect((await frage('location=abc,def')).status).toBe(400);
	});

	it('antwortet 400 bei unmöglicher Breite', async () => {
		expect((await frage('location=95,10')).status).toBe(400);
	});
});
