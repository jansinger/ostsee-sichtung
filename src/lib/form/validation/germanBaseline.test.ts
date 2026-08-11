import { describe, expect, it } from 'vitest';
import { collectDomainLabels, collectSchemaShape } from './germanBaseline.testutil';

describe('collectSchemaShape', () => {
	it('erfasst alle 56 Felder mit Beschriftung und meta', () => {
		const shape = collectSchemaShape();
		expect(Object.keys(shape).length).toBe(56);
		expect(shape.latitude).toEqual({
			label: 'Breitengrad',
			meta: {
				type: 'number',
				placeholder: 'z.B. 54.123456',
				helpText: 'Nördliche Position (N) - je mehr Nachkommastellen, desto genauer',
				valueText: 'GPS-Präzision: 6 Nachkommastellen = 11cm Genauigkeit'
			}
		});
	});

	// `icon` traegt einen Bezeichner, keinen Anzeigetext, und wuerde den
	// Schnappschuss bei jedem Icon-Wechsel rot machen, ohne dass sich ein
	// einziges sichtbares Wort geaendert haette.
	it('nimmt icon nicht in den Schnappschuss auf', () => {
		const shape = collectSchemaShape();
		expect(shape.latitude?.meta).not.toHaveProperty('icon');
	});
});

describe('collectDomainLabels', () => {
	it('erfasst je formOptions-Datei die Optionen in Reihenfolge', () => {
		const labels = collectDomainLabels();
		expect(labels['species'].options).toEqual([
			{ value: '0', label: 'Schweinswal' },
			{ value: '1', label: 'Kegelrobbe' },
			{ value: '2', label: 'Seehund' },
			{ value: '3', label: 'Delfin' },
			{ value: '4', label: 'Beluga' },
			{ value: '5', label: 'Zwergwal' },
			{ value: '6', label: 'Finnwal' },
			{ value: '7', label: 'Buckelwal' },
			{ value: '8', label: 'Unbekannte Walart' },
			{ value: '9', label: 'Ringelrobbe' },
			{ value: '10', label: 'Unbekannte Robbenart' }
		]);
	});

	// Die Rueckfaelle sind nutzersichtbar und stehen ausserhalb des
	// Record<Enum, string>-Musters — der Extraktor meldet sie als nicht
	// getroffen. Der Schnappschuss deckt sie trotzdem ab, damit Aufgabe 3 sie
	// nicht unbemerkt veraendert.
	it('erfasst die Rückfalltexte der getXLabel-Funktionen', () => {
		const labels = collectDomainLabels();
		expect(labels['species'].fallbacks).toEqual({
			nullish: 'Nicht angegeben',
			unknown: 'Unbekannt'
		});
	});

	it('erfasst die Gruppennamen der Artauswahl', () => {
		const labels = collectDomainLabels();
		expect(labels['species'].groups).toEqual(['Kleinwale', 'Großwale', 'Robben']);
	});
});
