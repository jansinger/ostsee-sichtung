import { describe, expect, it } from 'vitest';
import { buildSightingsQuery } from './statusRequestParams';

describe('buildSightingsQuery', () => {
	it('lässt den Statusparameter bei der öffentlichen Auswahl weg', () => {
		expect(buildSightingsQuery(2026, '', ['approved'])).toBe('year=2026');
	});

	it('hängt eine abweichende Auswahl an', () => {
		expect(buildSightingsQuery(2026, '', ['open', 'rejected'])).toBe(
			'year=2026&status=open%2Crejected'
		);
	});

	it('nimmt den Suchbegriff mit', () => {
		expect(buildSightingsQuery(2026, 'Trave', ['approved'])).toBe('year=2026&search=Trave');
	});

	it('lässt einen leeren Suchbegriff weg', () => {
		expect(buildSightingsQuery(2026, '   ', ['approved'])).toBe('year=2026');
	});
});
