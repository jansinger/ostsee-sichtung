import { describe, expect, it } from 'vitest';
import { ADMIN_BEREICHE, aktiverAdminBereich, istAdminPfad } from './adminNav';

describe('istAdminPfad', () => {
	it('erkennt den Bereich und seine Unterseiten', () => {
		expect(istAdminPfad('/admin')).toBe(true);
		expect(istAdminPfad('/admin/settings')).toBe(true);
		expect(istAdminPfad('/admin/1234')).toBe(true);
		expect(istAdminPfad('/admin/ref/AB-12')).toBe(true);
	});

	it('lässt sich von einem Pfad mit gleichem Präfix nicht täuschen', () => {
		/* Der Grund für den Schrägstrich in der Implementierung: `/administration`
		   beginnt mit `/admin`, gehört aber nicht dazu. */
		expect(istAdminPfad('/administration')).toBe(false);
		expect(istAdminPfad('/admin-handbuch')).toBe(false);
	});

	it('erkennt Pfade außerhalb der Verwaltung nicht als Verwaltung', () => {
		expect(istAdminPfad('/')).toBe(false);
		expect(istAdminPfad('/map')).toBe(false);
		expect(istAdminPfad('/docs')).toBe(false);
	});
});

describe('aktiverAdminBereich', () => {
	it('ordnet die drei Bereiche ihrem eigenen Pfad zu', () => {
		for (const bereich of ADMIN_BEREICHE) {
			expect(aktiverAdminBereich(bereich.href)).toBe(bereich.href);
		}
	});

	it('rechnet Detail- und Referenzseiten der Sichtungsverwaltung zu', () => {
		/* Ohne diese Zuordnung verlöre die Unternavigation beim Öffnen einer
		   Sichtung ohne erkennbaren Grund ihre Markierung. */
		expect(aktiverAdminBereich('/admin/1234')).toBe('/admin');
		expect(aktiverAdminBereich('/admin/1234/edit')).toBe('/admin');
		expect(aktiverAdminBereich('/admin/ref/AB-12')).toBe('/admin');
	});

	it('markiert auf Unterseiten der Statistiken und Einstellungen den richtigen Bereich', () => {
		expect(aktiverAdminBereich('/admin/statistics')).toBe('/admin/statistics');
		expect(aktiverAdminBereich('/admin/settings')).toBe('/admin/settings');
	});

	it('markiert auf /admin/docs keinen Bereich', () => {
		expect(aktiverAdminBereich('/admin/docs')).toBeNull();
	});

	it('markiert außerhalb der Verwaltung keinen Bereich', () => {
		expect(aktiverAdminBereich('/')).toBeNull();
		expect(aktiverAdminBereich('/map')).toBeNull();
		expect(aktiverAdminBereich('/administration')).toBeNull();
	});
});
