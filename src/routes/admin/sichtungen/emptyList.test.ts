import { describe, expect, it } from 'vitest';
import { describeEmptyList } from './emptyList';

describe('describeEmptyList', () => {
	it('unterscheidet Filter ohne Treffer von einer leeren Datenbasis', () => {
		const gefiltert = describeEmptyList(true);
		const leer = describeEmptyList(false);

		expect(gefiltert.title).not.toBe(leer.title);
		expect(gefiltert.description).not.toBe(leer.description);
	});

	it('bietet den Ausweg nur an, wenn ein Filter aktiv ist', () => {
		expect(describeEmptyList(true).resetLabel).toBeTypeOf('string');
		expect(describeEmptyList(false).resetLabel).toBeUndefined();
	});

	it('nennt im Filterfall den Filter als Ursache', () => {
		const { title, description } = describeEmptyList(true);

		expect(`${title} ${description}`.toLowerCase()).toContain('filter');
	});

	it('behauptet ohne Filter nicht, es sei gefiltert worden', () => {
		const { title, description } = describeEmptyList(false);

		expect(`${title} ${description}`.toLowerCase()).not.toContain('filter');
	});
});
