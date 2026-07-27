import { describe, expect, it } from 'vitest';
import { getStepAlertMessages, shouldShowStepAlert } from './stepNavigationState';

describe('shouldShowStepAlert', () => {
	it('zeigt keinen Alert beim ersten Betreten eines Schritts, auch wenn dieser invalide ist', () => {
		expect(shouldShowStepAlert(null, 1, false)).toBe(false);
	});

	it('zeigt den Alert nach einem fehlgeschlagenen Weiter-Versuch auf einem invaliden Schritt', () => {
		expect(shouldShowStepAlert(1, 1, false)).toBe(true);
	});

	it('zeigt keinen Alert, sobald der Schritt valide ist, obwohl bereits versucht wurde', () => {
		expect(shouldShowStepAlert(1, 1, true)).toBe(false);
	});

	it('zeigt keinen Alert, wenn der markierte Versuch zu einem anderen Schritt gehört', () => {
		expect(shouldShowStepAlert(1, 2, false)).toBe(false);
	});

	it('zeigt keinen Alert mehr, nachdem der Versuch zurückgesetzt wurde (Schrittwechsel)', () => {
		expect(shouldShowStepAlert(1, 1, false)).toBe(true);
		expect(shouldShowStepAlert(null, 1, false)).toBe(false);
	});

	it('zeigt den Alert wieder, wenn nach einem Reset erneut auf demselben Schritt versucht wird', () => {
		expect(shouldShowStepAlert(null, 1, false)).toBe(false);
		expect(shouldShowStepAlert(1, 1, false)).toBe(true);
	});
});

describe('getStepAlertMessages', () => {
	it('gibt ein leeres Array bei keinen Fehlern zurück', () => {
		expect(getStepAlertMessages({})).toEqual([]);
	});

	it('gibt alle vorhandenen Fehlermeldungen inkl. Feldname als Array zurück', () => {
		const errors = { lat: 'Position erforderlich', date: 'Datum erforderlich' };
		expect(getStepAlertMessages(errors)).toEqual([
			{ field: 'lat', message: 'Position erforderlich' },
			{ field: 'date', message: 'Datum erforderlich' }
		]);
	});

	it('filtert leere/undefined Fehlermeldungen heraus', () => {
		const errors = { lat: 'Position erforderlich', date: '' } as Record<string, string>;
		expect(getStepAlertMessages(errors)).toEqual([
			{ field: 'lat', message: 'Position erforderlich' }
		]);
	});

	it('liefert für zwei Felder mit identischer Meldung zwei eigenständige Einträge (eindeutige Keys)', () => {
		// Regressionstest: sightingFrom/sightingFromText teilen sich dieselbe Fehlermeldung.
		// Ein {#each ... (message)} in StepNavigation.svelte würde hier mit
		// each_key_duplicate kollidieren — deshalb trägt jeder Eintrag seinen Feldnamen.
		const errors = {
			sightingFrom: 'Bitte angeben, von wo aus beobachtet wurde',
			sightingFromText: 'Bitte angeben, von wo aus beobachtet wurde'
		};
		const messages = getStepAlertMessages(errors);
		expect(messages).toHaveLength(2);
		expect(new Set(messages.map((m) => m.field)).size).toBe(2);
	});
});
