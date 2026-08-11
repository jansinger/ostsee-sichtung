import { describe, expect, it } from 'vitest';
import { applySitesToSource } from './apply';
import { collectSchemaSites } from './collect';
import { createKeyRegistry } from './messageKey';

// Verschoben aus render.test.ts (Befund E): applySitesToSource ist die
// eigentliche Quelltransformation und lebt jetzt in apply.ts, nicht mehr in
// der Berichtsformatierung.
describe('applySitesToSource', () => {
	it('ersetzt das Literal durch den Botschaftsaufruf', () => {
		const source = `const s = yup.object().shape({ a: yup.string().label('Titel') });`;
		const { sites } = collectSchemaSites(source, 'probe.ts', createKeyRegistry());
		expect(applySitesToSource(source, sites)).toBe(
			`const s = yup.object().shape({ a: yup.string().label(m.sighting_a_label({}, { locale })) });`
		);
	});

	// Von hinten nach vorn ersetzen: Sonst verschieben frühere Ersetzungen die
	// Offsets aller späteren. Zwei Literale im selben Aufruf machen das sichtbar.
	it('hält die Offsets bei mehreren Ersetzungen in einer Zeile', () => {
		const source = `const s = yup.object().shape({ a: yup.string().max(9, 'zu lang').label('Titel') });`;
		const { sites } = collectSchemaSites(source, 'probe.ts', createKeyRegistry());
		const result = applySitesToSource(source, sites);
		expect(result).toContain('m.sighting_a_max({}, { locale })');
		expect(result).toContain('m.sighting_a_label({}, { locale })');
		expect(result).not.toContain(`'zu lang'`);
		expect(result).not.toContain(`'Titel'`);
	});

	it('lässt die Quelle unverändert, wenn es keine Fundstellen gibt', () => {
		const source = `const x = 1;`;
		expect(applySitesToSource(source, [])).toBe(source);
	});
});
