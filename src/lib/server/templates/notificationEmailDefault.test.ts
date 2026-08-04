/**
 * Rendert die **ausgelieferte** Standard-Vorlage und prüft, was in der Mail
 * ankommt. Ein Test gegen `balticSeaEmailContext` allein würde nicht bemerken,
 * dass die Vorlage den Wert falsch verzweigt — genau dort saß der Fehler.
 */
import { createHash } from 'crypto';
import Handlebars from 'handlebars';
import { describe, expect, it } from 'vitest';
import { balticSeaEmailContext } from './balticSeaEmailContext';
import { emailColorContext } from './emailTokens';
import {
	NOTIFICATION_EMAIL_DEFAULT_TEMPLATE,
	PREVIOUS_SHIPPED_TEMPLATE_HASHES
} from './notificationEmailDefault';

const render = Handlebars.compile(NOTIFICATION_EMAIL_DEFAULT_TEMPLATE);

/**
 * Baut den Kontext so, wie `emailService.sendEmailNotification()` ihn baut —
 * inklusive `coordinatesFormatted`, weil der Positionsblock daran hängt.
 */
function renderWithFlags(flags: {
	inBalticSea?: number | null;
	inBalticSeaGeo?: number | null;
	latitude?: string | null;
	longitude?: string | null;
}) {
	const hasPosition = Boolean(flags.latitude && flags.longitude);
	return render({
		referenceId: 'REF-1',
		adminUrl: 'https://example.com/admin/1',
		currentDate: '30.07.2026',
		currentTime: '12:00',
		spamCheck: { score: 0, isHighRisk: false, indicators: [] },
		sighting: {
			species: 'Schweinswal',
			sightingDate: '30.07.2026',
			coordinatesFormatted: hasPosition ? `${flags.latitude}, ${flags.longitude}` : null,
			balticSea: balticSeaEmailContext(flags)
		},
		...emailColorContext()
	});
}

describe('NOTIFICATION_EMAIL_DEFAULT_TEMPLATE — Ostsee-Status', () => {
	// Der Kern des Befunds. Hamburger Hafen: in der Bounding Box, nicht im
	// Polygon. Die alte Vorlage verzweigte über `inBalticSeaGeo` und setzte
	// dafür ein grünes „Ostsee ✓".
	it('weist eine Sichtung in der Box, aber außerhalb des Polygons NICHT als Ostsee aus', () => {
		const html = renderWithFlags({
			inBalticSea: 0,
			inBalticSeaGeo: 1,
			latitude: '53.540000',
			longitude: '9.970000'
		});

		expect(html).not.toContain('Ostsee ✓');
		expect(html).toContain('außerhalb');
		// Der Hinweiskasten muss erscheinen — die Meldung soll auffallen.
		expect(html).toContain('Achtung:');
	});

	it('weist eine echte Ostsee-Sichtung als Ostsee aus und warnt nicht', () => {
		const html = renderWithFlags({
			inBalticSea: 1,
			inBalticSeaGeo: 1,
			latitude: '54.020000',
			longitude: '11.100000'
		});

		expect(html).toContain('>Ostsee<');
		expect(html).not.toContain('Achtung:');
	});

	// Altsystem-Wert 2 in ostsee_geo bedeutet dasselbe wie 1.
	it('behandelt den Altsystem-Wert 2 wie 1', () => {
		const html = renderWithFlags({
			inBalticSea: 1,
			inBalticSeaGeo: 2,
			latitude: '54.020000',
			longitude: '11.100000'
		});

		expect(html).toContain('>Ostsee<');
		expect(html).not.toContain('Achtung:');
	});

	// Dass keine der Vorlagen wieder über die Rohflags verzweigt, prüft
	// `emailTokens.test.ts` — dort läuft die Schleife über **beide**
	// ausgelieferten Vorlagen. Hier stünde der Guard nur für den Seed und
	// ließe die Datei-Vorlage unbewacht.

	it('ist gültiges Handlebars und rendert ohne Ausnahme', () => {
		expect(() =>
			renderWithFlags({ inBalticSea: 1, inBalticSeaGeo: 1, latitude: '54.0', longitude: '11.1' })
		).not.toThrow();
	});

	// Der Statusblock hing früher an den Koordinaten. Eine Meldung ohne Position
	// erwähnte die Position dann gar nicht, während die Admin-Übersicht „ohne
	// Position" anzeigte — dieselbe Divergenz, nur durch Weglassen.
	it('nennt den Status auch ohne Koordinaten', () => {
		const html = renderWithFlags({ inBalticSea: 1, inBalticSeaGeo: 1 });

		expect(html).toContain('Positionsangabe');
		expect(html).toContain('ohne Position');
		// Ohne Koordinaten darf keine Koordinatenzeile stehen.
		expect(html).not.toContain('<strong>Koordinaten:</strong>');
	});

	/**
	 * Foto-Ankündigung (neu gebauter iOS-Client `OstSeeTiere/8`, Stand
	 * 2026-07-30): Der Client setzt `aufnahmeHochladen`, kann aber kein Foto
	 * hochladen — es kommt separat per E-Mail nach. Ohne einen Hinweis in
	 * dieser Mail lässt sich eine später eintreffende Foto-Mail keiner
	 * Sichtung zuordnen.
	 */
	describe('Foto-Ankündigung', () => {
		function renderWithMediaUpload(mediaUpload: boolean) {
			return render({
				referenceId: 'REF-77',
				adminUrl: 'https://example.com/admin/1',
				currentDate: '30.07.2026',
				currentTime: '12:00',
				spamCheck: { score: 0, isHighRisk: false, indicators: [] },
				sighting: {
					species: 'Schweinswal',
					sightingDate: '30.07.2026',
					coordinatesFormatted: null,
					mediaUpload,
					balticSea: balticSeaEmailContext({})
				},
				...emailColorContext()
			});
		}

		it('weist beim Empfänger auf das nachfolgende Foto hin und nennt die Referenz-ID', () => {
			const html = renderWithMediaUpload(true);

			expect(html).toContain('Foto angekündigt');
			// Referenz-ID steht bereits im Kopfbereich — hier zählt, dass sie
			// auch innerhalb des Hinweises zum Zuordnen genannt wird.
			expect(html.match(/REF-77/g)?.length).toBeGreaterThan(1);
		});

		it('lässt den Hinweis weg, wenn kein Foto angekündigt wurde', () => {
			const html = renderWithMediaUpload(false);

			expect(html).not.toContain('Foto angekündigt');
		});
	});

	/**
	 * Totfund: `isDead`, `deadCondition` und `deadSize` lagen bis 2026-08-04 im
	 * Kontext, ohne dass eine ausgelieferte Vorlage sie je gerendert hätte — die
	 * Mail zu einem Totfund unterschied sich in nichts von der zu einer lebenden
	 * Sichtung. Ein Totfund ist der Fall, der eine Rückmeldung braucht (Bergung,
	 * Beprobung).
	 *
	 * Der Betreff bleibt unverändert „Neue Sichtung: <REF>" — erkennbar ist der
	 * Totfund also erst beim Öffnen der Mail, nicht schon in der Übersicht des
	 * Posteingangs. Ein Betreff-Präfix wäre eine eigene Entscheidung (Mailfilter
	 * beim DMM) und gehört nicht in diese Vorlage.
	 */
	describe('Totfund', () => {
		function renderDeadFind(dead: {
			isDead: boolean;
			deadCondition?: string;
			deadSize?: number | null;
			deadPhoneContact?: boolean;
		}) {
			return render({
				referenceId: 'REF-42',
				adminUrl: 'https://example.com/admin/1',
				currentDate: '04.08.2026',
				currentTime: '12:00',
				spamCheck: { score: 0, isHighRisk: false, indicators: [] },
				sighting: {
					species: 'Schweinswal',
					sightingDate: '04.08.2026',
					coordinatesFormatted: null,
					balticSea: balticSeaEmailContext({}),
					...dead
				},
				...emailColorContext()
			});
		}

		it('weist einen Totfund aus und nennt Zustand und Körperlänge', () => {
			const html = renderDeadFind({
				isDead: true,
				deadCondition: 'Mittlere Verwesung',
				deadSize: 150
			});

			expect(html).toContain('Totfund');
			expect(html).toContain('Mittlere Verwesung');
			expect(html).toContain('150 cm');
		});

		it('lässt den Block bei einer lebenden Sichtung weg', () => {
			const html = renderDeadFind({ isDead: false });

			expect(html).not.toContain('Totfund');
		});

		// Zustand und Größe sind optional (`deadSize` ist in der Datenbank
		// nullable). Ohne beides muss der Totfund trotzdem als solcher dastehen.
		it('weist den Totfund auch ohne Zustand und Körperlänge aus', () => {
			const html = renderDeadFind({ isDead: true, deadSize: null });

			expect(html).toContain('Totfund');
			expect(html).not.toContain('Zustand:');
			// Nicht auf 'cm' prüfen: zwei Zeichen gegen das ganze Dokument wären
			// bei jedem künftigen „cm" im Text falsch-rot.
			expect(html).not.toContain('Körperlänge');
		});

		/**
		 * `deadPhoneContact` beantwortet die Frage, ob das Meeresmuseum schon
		 * telefonisch von dem Fund weiß. **Beide** Antworten sind eine Handlung:
		 * „ja" heißt, dass die Bergung womöglich schon läuft und ein zweiter
		 * Rückruf eine Doppelmeldung wäre; „nein" heißt, dass sich niemand
		 * gemeldet hat. Ein Block, der nur den Ja-Fall zeigt, ließe den
		 * Empfänger im Nein-Fall im Unklaren, ob die Angabe fehlt oder verneint
		 * wurde — deshalb hier als einziges Feld mit `{{else}}`-Zweig.
		 */
		it('nennt eine bereits erfolgte telefonische Meldung', () => {
			const html = renderDeadFind({ isDead: true, deadPhoneContact: true });

			expect(html).toContain('Meeresmuseum');
			expect(html).toContain('bereits telefonisch');
		});

		it('weist eine fehlende telefonische Meldung ebenfalls aus', () => {
			const html = renderDeadFind({ isDead: true, deadPhoneContact: false });

			expect(html).toContain('Meeresmuseum');
			expect(html).not.toContain('bereits telefonisch');
			expect(html).toContain('keine telefonische Meldung');
		});
	});

	/**
	 * Ein `<!-- … -->` mit `{{#if …}}` darin wird von Handlebars **ausgewertet**,
	 * nicht zitiert — genau daran ist diese Vorlage beim Umbau einmal
	 * unbalanciert geworden (Parse-Fehler erst zur Laufzeit). Erklärende Notizen
	 * gehören deshalb in `{{!-- … --}}`; das hält sie zusätzlich aus der
	 * versendeten Mail heraus.
	 */
	it('führt keine Handlebars-Blöcke in HTML-Kommentaren', () => {
		const htmlComments = NOTIFICATION_EMAIL_DEFAULT_TEMPLATE.match(/<!--[\s\S]*?-->/g) ?? [];

		for (const comment of htmlComments) {
			expect(comment).not.toMatch(/\{\{[#/]/);
		}
	});
});

describe('Fingerabdruck des ausgelieferten Stands', () => {
	/**
	 * Dieser Test ist ein **Zwang, keine Zusicherung über den Inhalt**: Der Seed
	 * in `app_config` gewinnt gegen den Code-Default, eine Vorlagenänderung wirkt
	 * also auf keine bestehende Installation. `refresh-email-template.ts` zieht
	 * den Seed nur nach, wenn er einen der bekannten Stände trägt.
	 *
	 * Schlägt dieser Test fehl, wurde die Vorlage geändert. Dann beides tun:
	 *   1. den hier gepinnten (alten) Hash oben in
	 *      `PREVIOUS_SHIPPED_TEMPLATE_HASHES` eintragen,
	 *   2. den neuen Hash aus der Fehlermeldung hier einsetzen.
	 * Wer nur (2) macht, kappt den Nachzieh-Pfad für alle bestehenden
	 * Installationen.
	 */
	it('entspricht dem gepinnten Hash', () => {
		const hash = createHash('sha256')
			.update(NOTIFICATION_EMAIL_DEFAULT_TEMPLATE, 'utf8')
			.digest('hex');

		expect(hash).toBe('32d2355c29f5800ece131f19746243cdb5962b0d884f6d50042bc0e3c80ea47e');
	});

	it('führt den aktuellen Stand nicht als früheren Stand', () => {
		const hash = createHash('sha256')
			.update(NOTIFICATION_EMAIL_DEFAULT_TEMPLATE, 'utf8')
			.digest('hex');

		expect(PREVIOUS_SHIPPED_TEMPLATE_HASHES).not.toContain(hash);
	});

	it('listet die früheren Stände als 64-stellige SHA-256-Hex-Werte', () => {
		expect(PREVIOUS_SHIPPED_TEMPLATE_HASHES.length).toBeGreaterThan(0);
		for (const hash of PREVIOUS_SHIPPED_TEMPLATE_HASHES) {
			expect(hash).toMatch(/^[0-9a-f]{64}$/);
		}
	});
});
