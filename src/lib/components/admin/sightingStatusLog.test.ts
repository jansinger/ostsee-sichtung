import { describe, expect, it } from 'vitest';
import { SIGHTING_STATUS_PRESENTATION, verdictToStatus } from './sightingStatus';
import { VERDICT_LOG_LABEL } from './sightingStatusLog';

/**
 * @fileoverview Der Wortlaut der Historie darf nicht vom Statuswort abdriften.
 *
 * `VERDICT_LOG_LABEL` führt eigene Literale, und der Docblock dort begründet
 * genau **eine** Abweichung: `reset` heißt „Zurückgesetzt" statt „Offen", weil
 * ein Eintrag ein Ereignis beschreibt und keinen Zustand. Für `approve` und
 * `reject` fallen Ereignis und Zustand zusammen — dass sie das auch bleiben,
 * prüft dieser Test. Ohne ihn wäre eine Umbenennung in
 * `SIGHTING_STATUS_PRESENTATION` an einer Stelle sichtbar und an der anderen
 * nicht, und niemandem fiele auf, welche der beiden die richtige ist.
 */
describe('VERDICT_LOG_LABEL', () => {
	it.each(['approve', 'reject'] as const)(
		'sagt bei %s dasselbe wie das Statuswort',
		(verdict) => {
			expect(VERDICT_LOG_LABEL[verdict]).toBe(
				SIGHTING_STATUS_PRESENTATION[verdictToStatus(verdict)].label
			);
		}
	);

	it('weicht bei reset bewusst ab — Ereignis statt Zustand', () => {
		expect(VERDICT_LOG_LABEL.reset).toBe('Zurückgesetzt');
		expect(SIGHTING_STATUS_PRESENTATION[verdictToStatus('reset')].label).toBe('Offen');
	});
});
