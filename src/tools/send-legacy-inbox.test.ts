/**
 * Tests für den HTTP-Versand des Legacy-Posteingangs an eine laufende Instanz.
 *
 * Der Unterschied zu import-legacy-inbox.test.ts ist der Weg: Dort werden
 * `mapLegacyToCurrentSchema` und `saveSighting` direkt gerufen, hier geht jede
 * Sichtung über `POST /rest_sichtungen` — denselben Endpunkt, den die App
 * benutzt hat. Getestet wird deshalb genau das, was daran neu ist: Was passiert
 * bei 429, was bei einer inhaltlichen Ablehnung, und wann darf eine Datei nach
 * importiert/ wandern.
 */
import { describe, expect, it, vi } from 'vitest';
import { erstelleSshSpeicher, sende } from './send-legacy-inbox.js';

/** Speicher-Attrappe: hält den Posteingang im Arbeitsspeicher. */
function speicherMit(dateien: Record<string, unknown>) {
	const eingang = new Map(Object.entries(dateien).map(([name, inhalt]) => [name, inhalt]));
	const verschoben: string[] = [];

	return {
		verschoben,
		eingang,
		liste: async () => [...eingang.keys()].sort(),
		lies: async (name: string) => JSON.stringify(eingang.get(name)),
		verschiebe: async (name: string) => {
			eingang.delete(name);
			verschoben.push(name);
		}
	};
}

function umschlag(payload: Record<string, unknown> | null, extra: Record<string, unknown> = {}) {
	return {
		empfangen_am: '2026-08-08T17:19:47.919Z',
		quelle: { ip: '1.2.3.4', user_agent: 'OstSeeTiere/8', content_type: 'application/json' },
		roh: payload === null ? '' : JSON.stringify(payload),
		abgeschnitten: false,
		payload,
		validierung: { gueltig: true, fehler: {} },
		...extra
	};
}

const stumm = { log: () => {}, error: () => {} };

function antwort(status: number, body = '{"message":"Saved"}') {
	return new Response(body, { status, headers: { Location: '/rest_sichtungen/view/1.json' } });
}

describe('sende', () => {
	it('schickt jede Datei an den Endpunkt und verschiebt sie nach einem 201', async () => {
		const speicher = speicherMit({
			'000001__a.json': umschlag({ tierart: 0 }),
			'000002__b.json': umschlag({ tierart: 1 })
		});
		const fetchImpl = vi.fn().mockResolvedValue(antwort(201));

		const ergebnis = await sende({
			basisUrl: 'https://beispiel.test',
			speicher,
			fetchImpl,
			log: stumm
		});

		expect(fetchImpl).toHaveBeenCalledTimes(2);
		expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://beispiel.test/rest_sichtungen');
		expect(ergebnis).toMatchObject({ uebernommen: 2, abgelehnt: [], abbruch: null });
		expect(speicher.verschoben).toEqual(['000001__a.json', '000002__b.json']);
	});

	it('schickt den Rohtext wörtlich, damit der Vertrag nicht durch ein Re-Serialisieren verändert wird', async () => {
		const roh = '{"tierart":0,"gps_breite":"54.359396"}';
		const speicher = speicherMit({
			'000001__a.json': umschlag({ tierart: 0, gps_breite: '54.359396' }, { roh })
		});
		const fetchImpl = vi.fn().mockResolvedValue(antwort(201));

		await sende({ basisUrl: 'https://beispiel.test', speicher, fetchImpl, log: stumm });

		expect(fetchImpl.mock.calls[0]?.[1].body).toBe(roh);
		expect(fetchImpl.mock.calls[0]?.[1].headers['content-type']).toBe('application/json');
	});

	it('bricht bei einem 429 ab, ohne die Datei zu verschieben', async () => {
		const speicher = speicherMit({
			'000001__a.json': umschlag({ tierart: 0 }),
			'000002__b.json': umschlag({ tierart: 1 })
		});
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(antwort(201))
			.mockResolvedValueOnce(antwort(429, 'Too Many Requests'));

		const ergebnis = await sende({
			basisUrl: 'https://beispiel.test',
			speicher,
			fetchImpl,
			log: stumm
		});

		expect(ergebnis.uebernommen).toBe(1);
		expect(ergebnis.abbruch).toMatchObject({ grund: 'rate-limit', datei: '000002__b.json' });
		expect(speicher.verschoben).toEqual(['000001__a.json']);
		// Nach dem Abbruch darf nichts weiter gesendet werden.
		expect(fetchImpl).toHaveBeenCalledTimes(2);
	});

	it('lässt eine inhaltlich abgelehnte Datei liegen und macht weiter', async () => {
		const speicher = speicherMit({
			'000001__a.json': umschlag({ tierart: 0 }),
			'000002__b.json': umschlag({ tierart: 1 })
		});
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(antwort(400, '{"error":"Validation failed"}'))
			.mockResolvedValueOnce(antwort(201));

		const ergebnis = await sende({
			basisUrl: 'https://beispiel.test',
			speicher,
			fetchImpl,
			log: stumm
		});

		expect(ergebnis.uebernommen).toBe(1);
		expect(ergebnis.abgelehnt).toMatchObject([{ datei: '000001__a.json', http: 400 }]);
		expect(ergebnis.abbruch).toBeNull();
		expect(speicher.verschoben).toEqual(['000002__b.json']);
	});

	it('überspringt einen Umschlag ohne Payload, ohne ihn zu senden', async () => {
		const speicher = speicherMit({ '000001__a.json': umschlag(null, { roh: 'kaputt' }) });
		const fetchImpl = vi.fn().mockResolvedValue(antwort(201));

		const ergebnis = await sende({
			basisUrl: 'https://beispiel.test',
			speicher,
			fetchImpl,
			log: stumm
		});

		expect(fetchImpl).not.toHaveBeenCalled();
		expect(ergebnis.uebernommen).toBe(0);
		expect(ergebnis.abgelehnt).toMatchObject([{ datei: '000001__a.json', grund: 'kein Payload' }]);
		expect(speicher.verschoben).toEqual([]);
	});

	it('bricht ab, wenn eine bereits angelegte Sichtung nicht verschoben werden kann', async () => {
		const speicher = speicherMit({
			'000001__a.json': umschlag({ tierart: 0 }),
			'000002__b.json': umschlag({ tierart: 1 })
		});
		speicher.verschiebe = async () => {
			throw new Error('Platte voll');
		};
		const fetchImpl = vi.fn().mockResolvedValue(antwort(201));

		const ergebnis = await sende({
			basisUrl: 'https://beispiel.test',
			speicher,
			fetchImpl,
			log: stumm
		});

		expect(ergebnis.abbruch).toMatchObject({
			grund: 'verschieben',
			datei: '000001__a.json',
			sichtungId: '/rest_sichtungen/view/1.json'
		});
		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});

	it('bricht bei einem Netzwerkfehler ab, statt die restlichen Dateien blind zu senden', async () => {
		const speicher = speicherMit({
			'000001__a.json': umschlag({ tierart: 0 }),
			'000002__b.json': umschlag({ tierart: 1 })
		});
		const fetchImpl = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

		const ergebnis = await sende({
			basisUrl: 'https://beispiel.test',
			speicher,
			fetchImpl,
			log: stumm
		});

		expect(ergebnis.abbruch).toMatchObject({ grund: 'netzwerk', datei: '000001__a.json' });
		expect(fetchImpl).toHaveBeenCalledTimes(1);
		expect(speicher.verschoben).toEqual([]);
	});
});

describe('erstelleSshSpeicher', () => {
	function speicherMitAufrufen(stdout = '') {
		const aufrufe: string[][] = [];
		const speicher = erstelleSshSpeicher({
			host: 'hawking',
			datenVerzeichnis: '/daten',
			ausfuehren: async (argumente: string[]) => {
				aufrufe.push(argumente);
				return { stdout };
			}
		});
		return { speicher, aufrufe };
	}

	it('listet nur JSON-Dateien und ruft sudo -n auf', async () => {
		const { speicher, aufrufe } = speicherMitAufrufen('b.json\na.json\n.gitkeep\n\n');

		expect(await speicher.liste()).toEqual(['a.json', 'b.json']);
		expect(aufrufe[0]).toEqual(['sudo', '-n', 'ls', '-1', '/daten/posteingang']);
	});

	it('verschiebt mit mv -n, damit nichts überschrieben wird', async () => {
		const { speicher, aufrufe } = speicherMitAufrufen();

		await speicher.verschiebe('a.json');

		expect(aufrufe[0]).toEqual([
			'sudo',
			'-n',
			'mv',
			'-n',
			'/daten/posteingang/a.json',
			'/daten/importiert/a.json'
		]);
	});

	it('weist einen Dateinamen zurück, der auf der Gegenseite als Kommando wirken könnte', async () => {
		// ssh setzt seine Argumente auf der Gegenseite wieder zu einer
		// Kommandozeile zusammen, die dort durch eine Shell läuft. Ohne diese
		// Prüfung wäre ein solcher Name ausführbarer Code auf dem Plesk-Server.
		const { speicher, aufrufe } = speicherMitAufrufen();

		await expect(speicher.lies('a.json; rm -rf /')).rejects.toThrow('nicht verwendbar');
		await expect(speicher.verschiebe('$(id).json')).rejects.toThrow('nicht verwendbar');
		expect(aufrufe).toEqual([]);
	});
});
