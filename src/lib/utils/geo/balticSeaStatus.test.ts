import { describe, expect, it } from 'vitest';
import { BALTIC_SEA_STATUS_PRESENTATION, getBalticSeaStatus } from './balticSeaStatus';

const ALL_STATUSES = ['baltic', 'edge', 'outside', 'noPosition'] as const;

/**
 * Eine Position in der Lübecker Bucht — liegt im Polygon *und* in der Bounding Box.
 * Die Flags kommen im Test explizit dazu; die Koordinaten sind nur dafür da, dass
 * die Zeile überhaupt eine verwertbare Position hat.
 */
const withPosition = (flags: { inBalticSea?: number | null; inBalticSeaGeo?: number | null }) => ({
	latitude: '54.020000',
	longitude: '11.100000',
	...flags
});

describe('getBalticSeaStatus', () => {
	it('weist eine Sichtung im Polygon und in der Bounding Box als Ostsee aus', () => {
		expect(getBalticSeaStatus(withPosition({ inBalticSea: 1, inBalticSeaGeo: 1 }))).toBe('baltic');
	});

	// Der eigentliche Befund: ostsee_geo ist die grobe Bounding Box, die Jütland,
	// Nordostdeutschland und Polen einschließt. Eine Meldung aus Hamburg hat
	// ostsee = 0 bei ostsee_geo = 1 — sie ist nachweislich NICHT in der Ostsee.
	// Lokal betrifft das 9.316 Zeilen (docs/OSTSEE_FLAGS.md).
	it('weist eine Sichtung in der Bounding Box, aber außerhalb des Polygons NICHT als Ostsee aus', () => {
		expect(getBalticSeaStatus(withPosition({ inBalticSea: 0, inBalticSeaGeo: 1 }))).toBe('outside');
	});

	// Gegenprobe zum Altbestand: ostsee_geo = 2 bedeutet dasselbe wie 1
	// ("im Kartenbereich"), darf also am Ergebnis nichts ändern.
	it('behandelt den Altsystem-Wert 2 in ostsee_geo wie 1', () => {
		expect(getBalticSeaStatus(withPosition({ inBalticSea: 1, inBalticSeaGeo: 2 }))).toBe('baltic');
		expect(getBalticSeaStatus(withPosition({ inBalticSea: 0, inBalticSeaGeo: 2 }))).toBe('outside');
	});

	// Widerspruch zwischen den Flags: als Ostsee markiert, Position außerhalb des
	// Kartenbereichs. Das ist im Bestand ein Altdaten-Artefakt — die frühere
	// Deutung als "Westkante" ist am 2026-07-30 widerlegt worden (das Polygon
	// reicht dort nicht westlich der Box). Siehe docs/OSTSEE_FLAGS.md, Fehler 3.
	it('weist einen Widerspruch zwischen Polygon-Flag und Bounding Box aus', () => {
		expect(
			getBalticSeaStatus({
				inBalticSea: 1,
				inBalticSeaGeo: 0,
				latitude: '54.783000',
				longitude: '9.417000'
			})
		).toBe('edge');
	});

	it('weist eine Position außerhalb von Polygon und Box als außerhalb aus', () => {
		expect(getBalticSeaStatus(withPosition({ inBalticSea: 0, inBalticSeaGeo: 0 }))).toBe('outside');
	});

	// ostsee ist nullable (Altbestand-Asymmetrie, siehe schema.ts). Praktisch
	// enthält die Spalte derzeit keine NULL-Werte, erlaubt sie aber.
	it('behandelt NULL in ostsee als nicht in der Ostsee', () => {
		expect(getBalticSeaStatus(withPosition({ inBalticSea: null, inBalticSeaGeo: 1 }))).toBe(
			'outside'
		);
		expect(getBalticSeaStatus(withPosition({ inBalticSea: null, inBalticSeaGeo: 0 }))).toBe(
			'outside'
		);
	});

	// FrontendSighting leitet sich von Drizzles InferInsertModel ab — Spalten mit
	// Default sind dort optional, die Flags können also ganz fehlen.
	it('behandelt fehlende Flags als nicht in der Ostsee', () => {
		expect(getBalticSeaStatus(withPosition({}))).toBe('outside');
		expect(getBalticSeaStatus(withPosition({ inBalticSea: 0 }))).toBe('outside');
	});

	// Ohne Kartenbereichs-Angabe ist „im Polygon" die belastbare Aussage — der
	// Fall darf nicht still zu 'baltic' werden und den Hinweis verlieren.
	it('weist einen Polygon-Treffer ohne Kartenbereichs-Angabe als Widerspruch aus', () => {
		expect(getBalticSeaStatus(withPosition({ inBalticSea: 1 }))).toBe('edge');
	});

	describe('ohne verwertbare Koordinaten', () => {
		// Ohne Koordinaten trägt kein Flag eine Aussage — auch ostsee = 1 nicht.
		// Der Altbestand hat davon 378 Zeilen (ostsee = 1, ostsee_geo = 0,
		// gps_laenge/gps_breite NULL). Sie als "Widerspruch" zu führen wäre derselbe Fehler wie der
		// behobene. Gemessen 2026-07-30, siehe docs/OSTSEE_FLAGS.md.
		it('schlägt jedes Flag — auch ostsee = 1', () => {
			expect(
				getBalticSeaStatus({ inBalticSea: 1, inBalticSeaGeo: 0, latitude: null, longitude: null })
			).toBe('noPosition');
			expect(
				getBalticSeaStatus({ inBalticSea: 1, inBalticSeaGeo: 1, latitude: null, longitude: null })
			).toBe('noPosition');
			expect(
				getBalticSeaStatus({ inBalticSea: 0, inBalticSeaGeo: 0, latitude: null, longitude: null })
			).toBe('noPosition');
		});

		it('behandelt eine halbe Koordinate wie keine', () => {
			expect(
				getBalticSeaStatus({ inBalticSea: 1, inBalticSeaGeo: 1, latitude: '54.3', longitude: null })
			).toBe('noPosition');
			expect(
				getBalticSeaStatus({ inBalticSea: 1, inBalticSeaGeo: 1, latitude: null, longitude: '9.1' })
			).toBe('noPosition');
		});

		it('behandelt fehlende und leere Koordinatenfelder wie keine', () => {
			expect(getBalticSeaStatus({ inBalticSea: 1, inBalticSeaGeo: 1 })).toBe('noPosition');
			expect(
				getBalticSeaStatus({ inBalticSea: 1, inBalticSeaGeo: 1, latitude: '  ', longitude: '  ' })
			).toBe('noPosition');
		});

		// 0/0 ist eine gültige Zahl (Null Island) und darf nicht als "fehlend"
		// durchfallen — die Karten-Review hat dort 165 echte Features gefunden.
		it('behandelt 0/0 als vorhandene Position', () => {
			expect(
				getBalticSeaStatus({
					inBalticSea: 0,
					inBalticSeaGeo: 0,
					latitude: '0.000000',
					longitude: '0.000000'
				})
			).toBe('outside');
		});
	});
});

describe('BALTIC_SEA_STATUS_PRESENTATION', () => {
	it('deckt jeden Status mit Label, Badge und Tooltip ab', () => {
		for (const status of ALL_STATUSES) {
			const presentation = BALTIC_SEA_STATUS_PRESENTATION[status];
			expect(presentation.label).toBeTruthy();
			expect(presentation.badgeClass).toBeTruthy();
			expect(presentation.title).toBeTruthy();
		}
	});

	// Statusfarben sind hier Flächenfarbe (badge-*), nicht Vordergrund — deshalb
	// ohne -strong-Suffix. Vgl. .claude/rules/design-system.md.
	it('nutzt Badge-Flächenfarben ohne -strong-Suffix', () => {
		for (const status of ALL_STATUSES) {
			expect(BALTIC_SEA_STATUS_PRESENTATION[status].badgeClass).not.toContain('-strong');
		}
	});

	it('unterscheidet alle Zustände sichtbar voneinander', () => {
		const labels = ALL_STATUSES.map((status) => BALTIC_SEA_STATUS_PRESENTATION[status].label);
		expect(new Set(labels).size).toBe(ALL_STATUSES.length);
	});
});
