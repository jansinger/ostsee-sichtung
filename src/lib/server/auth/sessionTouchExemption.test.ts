import { describe, expect, it } from 'vitest';
import { verlaengertSession } from './sessionTouchExemption';

describe('verlaengertSession', () => {
	it('schreibt das Inaktivitätsfenster für den Inbox-Poll-Endpunkt NICHT fort', () => {
		expect(verlaengertSession('/api/admin/inbox-status')).toBe(false);
	});

	it('schreibt das Inaktivitätsfenster für alle anderen Pfade fort', () => {
		expect(verlaengertSession('/admin')).toBe(true);
		expect(verlaengertSession('/api/sightings')).toBe(true);
		expect(verlaengertSession('/')).toBe(true);
	});
});
