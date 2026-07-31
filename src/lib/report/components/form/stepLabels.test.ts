import { describe, expect, it } from 'vitest';
import { stepNavigationLabel } from './stepLabels';

describe('stepNavigationLabel', () => {
	it('benennt beim zurückliegenden Schritt die Richtung', () => {
		expect(stepNavigationLabel(0, 2, 'Position & Zeitpunkt')).toBe(
			'Zurück zu Schritt 1: Position & Zeitpunkt'
		);
	});

	it('benennt beim vorausliegenden Schritt die Richtung', () => {
		expect(stepNavigationLabel(3, 1, 'Kontaktdaten')).toBe('Weiter zu Schritt 4: Kontaktdaten');
	});

	it('nennt beim aktuellen Schritt keine Richtung', () => {
		// Dass es der aktuelle Schritt ist, trägt bereits `aria-current="step"`.
		// Ein „Zurück zu" im Label würde dem widersprechen.
		expect(stepNavigationLabel(1, 1, 'Angaben zum Tier')).toBe('Schritt 2: Angaben zum Tier');
	});

	it('zählt für die Anzeige ab 1, nicht ab 0', () => {
		expect(stepNavigationLabel(0, 0, 'Position & Zeitpunkt')).toContain('Schritt 1');
	});

	it('unterscheidet sich vom sichtbaren Titel', () => {
		// Der bisherige `aria-label` war wortgleich mit dem Titel und damit ohne
		// Nutzen. Diese Zusicherung hält den Regressionsweg zu.
		const title = 'Weitere Informationen';
		expect(stepNavigationLabel(2, 0, title)).not.toBe(title);
	});
});
