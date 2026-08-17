import { describe, expect, it } from 'vitest';
import {
	MAX_ENTRY_CLIENT_LENGTH,
	UNKNOWN_ENTRY_CLIENT,
	resolveEntryClient
} from './resolveEntryClient';

describe('resolveEntryClient', () => {
	describe('Webformular', () => {
		it('stellt der eigenen Release-Version das Präfix web/ voran', () => {
			expect(resolveEntryClient({ source: 'web', appVersion: '2.21.0' })).toBe('web/2.21.0');
		});

		it('meldet unbekannt statt web/ ohne Version, wenn die Version leer ist', () => {
			// Ein „web/" ohne Version sähe wie ein gültiger Wert aus und wäre keiner.
			expect(resolveEntryClient({ source: 'web', appVersion: '   ' })).toBe(UNKNOWN_ENTRY_CLIENT);
		});
	});

	describe('User-Agent', () => {
		it('übernimmt den User-Agent unverändert', () => {
			expect(resolveEntryClient({ source: 'agent', userAgent: 'OstSeeTiere/8' })).toBe(
				'OstSeeTiere/8'
			);
		});

		it('schneidet umgebende Leerzeichen ab', () => {
			expect(resolveEntryClient({ source: 'agent', userAgent: '  okhttp/3.10.0 ' })).toBe(
				'okhttp/3.10.0'
			);
		});

		it.each([
			['null', null],
			['undefined', undefined],
			['Leerstring', ''],
			['nur Leerzeichen', '   ']
		])('liefert unbekannt bei %s statt eines leeren Wertes', (_fall, userAgent) => {
			// NULL ist für den Altbestand reserviert — ein neuer Datensatz ohne
			// User-Agent muss unterscheidbar bleiben (siehe Spec, Festlegung 1).
			expect(resolveEntryClient({ source: 'agent', userAgent })).toBe(UNKNOWN_ENTRY_CLIENT);
		});
	});

	describe('Längenbegrenzung', () => {
		it('lässt einen Wert von genau 128 Zeichen unangetastet', () => {
			const genau = 'a'.repeat(MAX_ENTRY_CLIENT_LENGTH);

			expect(resolveEntryClient({ source: 'agent', userAgent: genau })).toBe(genau);
		});

		it('kürzt längere Werte auf die Spaltenlänge und markiert die Kürzung', () => {
			// Länger als die Spalte würde den Insert scheitern lassen, statt zu kürzen.
			const zuLang = 'b'.repeat(MAX_ENTRY_CLIENT_LENGTH + 50);

			const ergebnis = resolveEntryClient({ source: 'agent', userAgent: zuLang });

			expect(ergebnis).toHaveLength(MAX_ENTRY_CLIENT_LENGTH);
			expect(ergebnis.endsWith('…')).toBe(true);
		});

		it('kürzt auch den Web-Wert, wenn die Version absurd lang ist', () => {
			const ergebnis = resolveEntryClient({ source: 'web', appVersion: 'c'.repeat(200) });

			expect(ergebnis).toHaveLength(MAX_ENTRY_CLIENT_LENGTH);
		});
	});
});
