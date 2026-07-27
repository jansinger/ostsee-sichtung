/**
 * @fileoverview Epoch-Platzhalterdaten dürfen nicht in Statistiken einfließen
 *
 * In `sichtungen` liegen 280 Datensätze auf exakt `1970-01-01 01:00:00` — das
 * sind fehlerhafte Importe, keine echten Sichtungen aus dem Jahr 1970. Die
 * älteste echte Sichtung stammt von 2002.
 *
 * Die frühere Implementierung verglich auf Gleichheit mit
 * `new Date(0)` + `setHours(2)`. `setHours` arbeitet in der **lokalen**
 * Zeitzone: In Europe/Berlin ergibt das 1970-01-01T01:00Z und trifft die
 * Datensätze, in einem UTC-Container (so läuft die Produktion — im Docker-Setup
 * ist kein `TZ` gesetzt) dagegen 1970-01-01T02:00Z und trifft sie nicht.
 * Folge: `yearsOfService` sprang in Produktion von 24 auf ~56 Jahre.
 *
 * Dieser Test fixiert die Grenze zeitzonenunabhängig.
 */

import { describe, expect, it } from 'vitest';
import { EARLIEST_PLAUSIBLE_SIGHTING_DATE } from './sightingRepository';

/** Die Epoch-Platzhalter, wie sie tatsächlich in der Datenbank stehen. */
const EPOCH_PLACEHOLDER = new Date('1970-01-01T01:00:00Z');

describe('Epoch-Ausschluss in Sichtungs-Statistiken', () => {
	it('schließt den Epoch-Platzhalter aus', () => {
		expect(EPOCH_PLACEHOLDER.getTime()).toBeLessThan(EARLIEST_PLAUSIBLE_SIGHTING_DATE.getTime());
	});

	it('schließt Epoch unabhängig von der Zeitzone aus', () => {
		// Jede denkbare Auslegung von "1970-01-01 irgendeine Stunde" muss unter
		// der Grenze liegen — sonst hängt das Ergebnis an der Server-Zeitzone.
		for (let hour = 0; hour < 24; hour++) {
			const variante = new Date(Date.UTC(1970, 0, 1, hour));
			expect(
				variante.getTime(),
				`1970-01-01T${String(hour).padStart(2, '0')}:00Z wird nicht ausgeschlossen`
			).toBeLessThan(EARLIEST_PLAUSIBLE_SIGHTING_DATE.getTime());
		}
	});

	it('behält die älteste echte Sichtung (2002)', () => {
		const aeltesteEchte = new Date('2002-07-08T00:00:00Z');
		expect(aeltesteEchte.getTime()).toBeGreaterThanOrEqual(
			EARLIEST_PLAUSIBLE_SIGHTING_DATE.getTime()
		);
	});

	it('liegt die Grenze zwischen Epoch und der ältesten echten Sichtung', () => {
		expect(EARLIEST_PLAUSIBLE_SIGHTING_DATE.getUTCFullYear()).toBeGreaterThan(1970);
		expect(EARLIEST_PLAUSIBLE_SIGHTING_DATE.getUTCFullYear()).toBeLessThan(2002);
	});
});
