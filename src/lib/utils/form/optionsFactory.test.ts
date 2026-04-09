import { describe, expect, it } from 'vitest';
import {
	createBooleanOptionsFactory,
	createConsentOptionsFactory,
	createOptionsFactory,
	createSimpleOptionsFactory
} from './optionsFactory';

// Plain const objects — TypeScript numeric enums have bidirectional Object.entries()
// and would produce 6 entries instead of 3
const TestColor = { RED: 0, GREEN: 1, BLUE: 2 } as const;
type TestColor = (typeof TestColor)[keyof typeof TestColor];

const testLabels = {
	RED: 'Rot',
	GREEN: 'Grün',
	BLUE: 'Blau'
};

describe('optionsFactory', () => {
	describe('createOptionsFactory()', () => {
		it('gibt alle Optionen zurück', () => {
			const factory = createOptionsFactory(TestColor, testLabels, 'TestColor');
			const options = factory.getOptions();
			expect(options).toHaveLength(3);
		});

		it('Optionen haben korrekte value/label Paare', () => {
			const factory = createOptionsFactory(TestColor, testLabels, 'TestColor');
			const options = factory.getOptions();
			expect(options).toContainEqual({ value: 0, label: 'Rot' });
			expect(options).toContainEqual({ value: 1, label: 'Grün' });
			expect(options).toContainEqual({ value: 2, label: 'Blau' });
		});

		it('gibt korrektes Label für bekannten Wert zurück', () => {
			const factory = createOptionsFactory(TestColor, testLabels, 'TestColor');
			expect(factory.getLabel(0)).toBe('Rot');
			expect(factory.getLabel(1)).toBe('Grün');
			expect(factory.getLabel(2)).toBe('Blau');
		});

		it('gibt "Unbekannt" für unbekannten Wert zurück', () => {
			const factory = createOptionsFactory(TestColor, testLabels, 'TestColor');
			expect(factory.getLabel(99)).toBe('Unbekannt');
		});

		it('isValid gibt true für gültige Werte zurück', () => {
			const factory = createOptionsFactory(TestColor, testLabels, 'TestColor');
			expect(factory.isValid(0)).toBe(true);
			expect(factory.isValid(1)).toBe(true);
			expect(factory.isValid(2)).toBe(true);
		});

		it('isValid gibt false für ungültige Werte zurück', () => {
			const factory = createOptionsFactory(TestColor, testLabels, 'TestColor');
			expect(factory.isValid(99)).toBe(false);
			expect(factory.isValid(-1)).toBe(false);
		});

		it('getDefault gibt 0 zurück wenn kein Default angegeben', () => {
			const factory = createOptionsFactory(TestColor, testLabels, 'TestColor');
			expect(factory.getDefault()).toBe(0);
		});

		it('getDefault gibt angegebenen Default zurück', () => {
			const factory = createOptionsFactory(TestColor, testLabels, 'TestColor', 2);
			expect(factory.getDefault()).toBe(2);
		});
	});

	describe('createBooleanOptionsFactory()', () => {
		it('hat zwei Optionen (false/true)', () => {
			const factory = createBooleanOptionsFactory();
			expect(factory.getOptions()).toHaveLength(2);
		});

		it('Default-Labels sind Nein/Ja', () => {
			const factory = createBooleanOptionsFactory();
			expect(factory.getLabel(0)).toBe('Nein');
			expect(factory.getLabel(1)).toBe('Ja');
		});

		it('Custom-Labels werden verwendet', () => {
			const factory = createBooleanOptionsFactory({ true: 'Ja, bitte', false: 'Nein, danke' });
			expect(factory.getLabel(0)).toBe('Nein, danke');
			expect(factory.getLabel(1)).toBe('Ja, bitte');
		});

		it('0 und 1 sind gültige Werte', () => {
			const factory = createBooleanOptionsFactory();
			expect(factory.isValid(0)).toBe(true);
			expect(factory.isValid(1)).toBe(true);
		});

		it('2 ist kein gültiger Wert', () => {
			const factory = createBooleanOptionsFactory();
			expect(factory.isValid(2)).toBe(false);
		});

		it('Default ist 0 (false)', () => {
			const factory = createBooleanOptionsFactory();
			expect(factory.getDefault()).toBe(0);
		});
	});

	describe('createConsentOptionsFactory()', () => {
		it('hat zwei Optionen', () => {
			const factory = createConsentOptionsFactory();
			expect(factory.getOptions()).toHaveLength(2);
		});

		it('Labels sind Nicht einverstanden / Einverstanden', () => {
			const factory = createConsentOptionsFactory();
			expect(factory.getLabel(0)).toBe('Nicht einverstanden');
			expect(factory.getLabel(1)).toBe('Einverstanden');
		});

		it('Default ist 0 (kein Einverständnis)', () => {
			const factory = createConsentOptionsFactory();
			expect(factory.getDefault()).toBe(0);
		});
	});

	describe('createSimpleOptionsFactory()', () => {
		it('transformiert Enum-Keys zu Labels', () => {
			const factory = createSimpleOptionsFactory(TestColor, 'TestColor');
			// RED → RED (kein Unterstrich), default transform ersetzt _ durch Leerzeichen
			expect(factory.getLabel(0)).toBe('RED');
		});

		it('custom labelTransform wird angewendet', () => {
			const factory = createSimpleOptionsFactory(TestColor, 'TestColor', (key) =>
				key.toLowerCase()
			);
			expect(factory.getLabel(0)).toBe('red');
			expect(factory.getLabel(1)).toBe('green');
		});

		it('ersetzt Unterstriche durch Leerzeichen (default transform)', () => {
			const EnumWithUnderscore = { FOO_BAR: 0, BAZ_QUX: 1 };
			const factory = createSimpleOptionsFactory(EnumWithUnderscore, 'Test');
			expect(factory.getLabel(0)).toBe('FOO BAR');
			expect(factory.getLabel(1)).toBe('BAZ QUX');
		});

		it('gibt korrekte Anzahl Optionen zurück', () => {
			const factory = createSimpleOptionsFactory(TestColor, 'TestColor');
			expect(factory.getOptions()).toHaveLength(3);
		});
	});
});
