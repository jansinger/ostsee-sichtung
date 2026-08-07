import { describe, expect, it } from 'vitest';
import { istTabellenUrl } from './tableRedirect';

describe('istTabellenUrl — gemerkte Tabellen-URLs erkennen', () => {
	it.each(['page=2', 'sort=email', 'verified=0', 'fromDate=2026-01-01', 'perPage=50'])(
		'erkennt ?%s als Tabellen-URL',
		(query) => {
			expect(istTabellenUrl(new URL(`https://x/admin?${query}`))).toBe(true);
		}
	);

	it('erkennt die nackte Eingangs-URL nicht als Tabellen-URL', () => {
		expect(istTabellenUrl(new URL('https://x/admin'))).toBe(false);
	});

	it('der Sortier-Parameter der Eingangsseite (order) löst keinen Redirect aus', () => {
		expect(istTabellenUrl(new URL('https://x/admin?order=desc'))).toBe(false);
	});
});
