/**
 * Der riskante Teil von `refresh-email-template.ts` ist nicht das UPDATE,
 * sondern die Frage, wann überschrieben werden darf: ein angepasster
 * Kundentext darf nicht stillschweigend verloren gehen.
 */
import { describe, expect, it } from 'vitest';
import { PREVIOUS_SHIPPED_TEMPLATE_HASHES } from '../lib/server/templates/notificationEmailDefault.ts';
import { decideTemplateRefresh } from './refresh-email-template.ts';

const SEED = 'a'.repeat(64);
const TARGET = 'b'.repeat(64);
const CUSTOM = 'c'.repeat(64);

describe('decideTemplateRefresh', () => {
	it('erkennt einen bereits aktuellen Wert', () => {
		expect(
			decideTemplateRefresh({ storedHash: TARGET, targetHash: TARGET, knownHashes: [SEED] })
		).toBe('already-current');
	});

	it('zieht einen unveränderten Seed nach', () => {
		expect(
			decideTemplateRefresh({ storedHash: SEED, targetHash: TARGET, knownHashes: [SEED] })
		).toBe('refresh');
	});

	// Der Kern der Zusicherung: ein Text, den niemand als ausgelieferten Stand
	// kennt, wurde angepasst und bleibt liegen.
	it('lässt einen angepassten Text unangetastet', () => {
		expect(
			decideTemplateRefresh({ storedHash: CUSTOM, targetHash: TARGET, knownHashes: [SEED] })
		).toBe('customised');
	});

	it('überschreibt einen angepassten Text nur mit --force', () => {
		expect(
			decideTemplateRefresh({
				storedHash: CUSTOM,
				targetHash: TARGET,
				knownHashes: [SEED],
				force: true
			})
		).toBe('refresh');
	});

	// --force darf einen bereits aktuellen Wert nicht zu einem Schreibvorgang
	// machen — sonst setzt jeder Aufruf updated_by und updated_at neu.
	it('schreibt auch mit --force nicht, wenn der Wert schon aktuell ist', () => {
		expect(
			decideTemplateRefresh({
				storedHash: TARGET,
				targetHash: TARGET,
				knownHashes: [SEED],
				force: true
			})
		).toBe('already-current');
	});

	// Ohne Einträge in der Allowlist wäre jeder Bestand „angepasst" und das
	// Werkzeug wirkungslos. Der Test bindet die echte Liste ein, damit ein
	// versehentliches Leeren auffällt.
	it('behandelt jeden ausgelieferten Stand als nachziehbar', () => {
		for (const hash of PREVIOUS_SHIPPED_TEMPLATE_HASHES) {
			expect(
				decideTemplateRefresh({
					storedHash: hash,
					targetHash: TARGET,
					knownHashes: PREVIOUS_SHIPPED_TEMPLATE_HASHES
				})
			).toBe('refresh');
		}
	});
});
