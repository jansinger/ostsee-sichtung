import { describe, expect, it } from 'vitest';
import { slugify } from './slugify';

// Übernommen aus i18n-inventory.test.ts (Befund D: slugify lebt jetzt hier,
// i18n-inventory.ts importiert und exportiert es nur noch weiter).
describe('slugify', () => {
	it('transliteriert Umlaute', () => {
		expect(slugify('Wo ungefähr?')).toBe('wo_ungefaehr');
	});

	it('kürzt auf die angegebene Länge', () => {
		expect(slugify('a'.repeat(100), 10).length).toBeLessThanOrEqual(10);
	});

	it('transliteriert das große Eszett großgeschriebenes ß nicht separat (ß bleibt klein bekannt)', () => {
		expect(slugify('Straße')).toBe('strasse');
	});

	it('entfernt führende und folgende Unterstriche nach der Ersetzung', () => {
		expect(slugify('!!!Titel!!!')).toBe('titel');
	});

	it('fällt bei einer leeren Ausgabe auf "text" zurück', () => {
		expect(slugify('???')).toBe('text');
	});
});
