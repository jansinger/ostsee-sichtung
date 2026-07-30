import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
// Kein `@ts-expect-error` nötig: `allowJs`/`checkJs` sind projektweit aktiv,
// daher erzeugt der Import selbst keinen Fehler (anders als bei reinem
// `allowJs: false`, wo hier TS7016 stünde). tsc zieht die importierten
// legacy-inbox-Module stattdessen in die Prüfung hinein — die betroffenen
// Dateien tragen deshalb seit dieser Aufgabe ein eigenes `@ts-nocheck`
// (reines JavaScript ohne Typdeklarationen, siehe CLAUDE.md).
import { erstelleServer } from '../../../legacy-inbox/src/server.js';
import { erstelleStore } from '../../../legacy-inbox/src/store.js';
import { erstelleRateLimit } from '../../../legacy-inbox/src/rateLimit.js';
import { GET as antwortenRoute } from '../../routes/rest_sichtungen/antworten.json/+server';
import { GET as inBalticRoute } from '../../routes/rest_sichtungen/inBaltic.json/+server';

// Same convention as every other file in src/tests/contract/: silence the
// main app's pino logger so it doesn't spam the terminal on every invocation
// of the real GET handlers. Does not affect the comparisons below — those
// only touch response bodies/status codes, never the logger.
vi.mock('$lib/logger.server', () => ({
	createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

vi.mock('$lib/logger', () => ({
	createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

let server: Server;
let basis: string;
let verzeichnis: string;

beforeAll(async () => {
	verzeichnis = await mkdtemp(path.join(tmpdir(), 'inbox-contract-'));
	const store = await erstelleStore({ datenVerzeichnis: verzeichnis });
	await store.initialisiere();

	server = erstelleServer({
		konfiguration: { maxBodyBytes: 262144 },
		store,
		rateLimit: erstelleRateLimit({ proIpProStunde: 10000, globalProStunde: 10000 })
	});
	await new Promise<void>((fertig) => server.listen(0, () => fertig()));
	const adresse = server.address();
	basis = `http://127.0.0.1:${typeof adresse === 'object' && adresse ? adresse.port : 0}`;
});

afterAll(async () => {
	await new Promise<void>((fertig) => server.close(() => fertig()));
	await rm(verzeichnis, { recursive: true, force: true });
});

function hauptanwendung(pfad: string) {
	return {
		url: new URL(`https://localhost${pfad}`),
		getClientAddress: () => '127.0.0.1',
		request: new Request(`https://localhost${pfad}`)
	} as never;
}

describe('Posteingang gegen Hauptanwendung — antworten.json', () => {
	it('liefert dieselbe Enum-Tabelle', async () => {
		const ausApp = await (
			await antwortenRoute(hauptanwendung('/rest_sichtungen/antworten.json'))
		).json();
		const ausPosteingang = await (await fetch(`${basis}/rest_sichtungen/antworten.json`)).json();

		expect(ausPosteingang).toEqual(ausApp);
	});
});

describe('Posteingang gegen Hauptanwendung — inBaltic.json', () => {
	const punkte = [
		'53,10',
		'54.5,10.5',
		'54.646667,11.333333',
		'56.093587,10.512543',
		'66.5,20',
		'40,-70'
	];

	for (const location of punkte) {
		it(`stimmt für location=${location} überein`, async () => {
			const pfad = `/rest_sichtungen/inBaltic.json?location=${location}`;
			const ausApp = await (await inBalticRoute(hauptanwendung(pfad))).json();
			const ausPosteingang = await (await fetch(`${basis}${pfad}`)).json();

			expect(ausPosteingang).toEqual(ausApp);
		});
	}

	it('stimmt auch bei Fehleingaben überein', async () => {
		for (const abfrage of ['', 'location=53', 'location=abc,def', 'location=95,10']) {
			const pfad = `/rest_sichtungen/inBaltic.json?${abfrage}`;
			const appAntwort = await inBalticRoute(hauptanwendung(pfad));
			const posteingangAntwort = await fetch(`${basis}${pfad}`);

			expect(posteingangAntwort.status).toBe(appAntwort.status);
			expect(await posteingangAntwort.json()).toEqual(await appAntwort.json());
		}
	});
});

describe('Posteingang gegen den Vertrag — POST /rest_sichtungen', () => {
	// Der Erfolgsfall ist in beiden Implementierungen identisch und wird
	// direkt gegen das PDF geprüft.
	it('antwortet bei Erfolg exakt wie im PDF', async () => {
		const antwort = await fetch(`${basis}/rest_sichtungen`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				sichtungsdatum: '2026-07-30 14:50',
				vorname: 'Jörg',
				name: 'Schneider',
				email: 'joerg@example.de',
				anzahl_gesamt: 1
			})
		});

		expect(antwort.status).toBe(201);
		expect(antwort.headers.get('location')).toMatch(/^\/rest_sichtungen\/view\/\d+\.json$/);
		expect(await antwort.json()).toEqual({ message: 'Saved' });
	});

	/**
	 * Bewusste, dokumentierte Abweichung von der Hauptanwendung:
	 * Der Posteingang antwortet flach, wie das Original-PDF
	 * (docs/archive/Sichtungsdb-Web-Schnittstelle.pdf). Die Hauptanwendung
	 * erzeugt in src/lib/legacy-api/error-messages.ts eine geschachtelte
	 * Struktur — siehe Entwurf, Abschnitt 2.1.
	 *
	 * Ist die parallele Korrektur der Hauptanwendung eingeflossen, ist dieser
	 * Test um einen Vergleich mit ihrer Antwort zu erweitern.
	 */
	it('antwortet bei Validierungsfehlern flach, wie das PDF', async () => {
		const antwort = await fetch(`${basis}/rest_sichtungen`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ vorname: 'Jörg' })
		});

		expect(antwort.status).toBe(400);
		const koerper = await antwort.json();

		expect(typeof koerper.message).toBe('string');
		expect(koerper.message).toBe('Validation failed.');
		expect(koerper.errors.anzahl_gesamt).toEqual(['Dieses Feld kann nicht leer gelassen werden.']);
	});
});
