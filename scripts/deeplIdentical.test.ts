import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BEWUSST_GLEICH } from './deeplIdentical';

/**
 * Der Wächter zum Register der bewusst gleichen Botschaften.
 *
 * Warum es das Register überhaupt gibt: `deeplPretranslate.ts` erkennt „schon
 * übersetzt" allein daran, dass der englische Wert vom deutschen abweicht. Für
 * eine Botschaft, deren englische Fassung mit der deutschen übereinstimmt, kann
 * dieser Test nie zutreffen — sie gilt bei jedem Lauf wieder als offen und wird
 * neu übersetzt. Am 2026-08-13 hat das vier Korrekturen rückgängig gemacht,
 * darunter `Land` → „Country" und die Domain `Meeresmuseum.de` →
 * „Oceanographic Museum.de".
 *
 * Ein Register, das niemand nachrechnet, verrottet. Deshalb prüft dieser Test
 * beide Richtungen:
 *  - Jeder Eintrag existiert und ist in beiden Katalogen tatsächlich gleich.
 *    Wird eine Botschaft später doch übersetzt, fällt der Eintrag auf.
 *  - Kein Eintrag ist überflüssig: Ein Schlüssel, dessen Fassungen sich
 *    unterscheiden, wird vom Skript ohnehin übersprungen und hat hier nichts
 *    verloren.
 */
const de = JSON.parse(readFileSync('messages/de.json', 'utf-8')) as Record<string, unknown>;
const en = JSON.parse(readFileSync('messages/en.json', 'utf-8')) as Record<string, unknown>;

describe('BEWUSST_GLEICH', () => {
	it('ist nicht leer — sonst wäre der Schutz wirkungslos', () => {
		expect(BEWUSST_GLEICH.size).toBeGreaterThan(0);
	});

	it.each([...BEWUSST_GLEICH])('%s steht in beiden Katalogen', (key) => {
		expect(de).toHaveProperty(key);
		expect(en).toHaveProperty(key);
	});

	it.each([...BEWUSST_GLEICH])('%s ist in beiden Katalogen wortgleich', (key) => {
		expect(JSON.stringify(en[key])).toBe(JSON.stringify(de[key]));
	});
});
