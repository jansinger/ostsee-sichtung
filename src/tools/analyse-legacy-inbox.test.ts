import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { analysiere, formatiere } from './analyse-legacy-inbox.js';

let verzeichnis: string;

beforeEach(async () => {
	verzeichnis = await mkdtemp(path.join(tmpdir(), 'legacy-inbox-analyse-'));
	await mkdir(path.join(verzeichnis, 'posteingang'), { recursive: true });
	await mkdir(path.join(verzeichnis, 'abgewiesen'), { recursive: true });
	await mkdir(path.join(verzeichnis, 'importiert'), { recursive: true });
});

afterEach(async () => {
	await rm(verzeichnis, { recursive: true, force: true });
});

/**
 * Legt einen Umschlag im angegebenen Unterverzeichnis an. Übernimmt sinnvolle
 * Defaults, damit jeder Test nur die für ihn relevanten Felder angeben muss.
 */
async function legeUmschlagAn(
	unterordner: 'posteingang' | 'abgewiesen' | 'importiert',
	dateiname: string,
	teile: {
		payload?: Record<string, unknown> | null;
		empfangen_am?: string;
		validierung?: { gueltig: boolean; fehler: Record<string, string[]> };
	}
) {
	const umschlag = {
		empfangen_am: teile.empfangen_am ?? '2026-07-30T14:33:03.636Z',
		lfd_nr: 1,
		quelle: { ip: '1.2.3.4', user_agent: 'OstSeeTiere/8', content_type: 'application/json' },
		roh: JSON.stringify(teile.payload ?? null),
		abgeschnitten: false,
		payload: teile.payload ?? null,
		validierung: teile.validierung ?? { gueltig: teile.payload !== null, fehler: {} }
	};
	await writeFile(path.join(verzeichnis, unterordner, dateiname), JSON.stringify(umschlag));
}

describe('analysiere', () => {
	it('zählt Umschläge je Verzeichnis', async () => {
		await legeUmschlagAn('posteingang', '000001__a.json', { payload: { anzahl_gesamt: 1 } });
		await legeUmschlagAn('posteingang', '000002__b.json', { payload: { anzahl_gesamt: 2 } });
		await legeUmschlagAn('abgewiesen', '000003__c.json', {
			payload: { anzahl_gesamt: null },
			validierung: { gueltig: false, fehler: { anzahl_gesamt: ['Pflichtfeld'] } }
		});

		const ergebnis = await analysiere(verzeichnis);

		expect(ergebnis.counts).toEqual({ posteingang: 2, abgewiesen: 1, importiert: 0 });
	});

	it('meldet abgewiesene Umschläge mit Dateiname und Fehlern', async () => {
		await legeUmschlagAn('abgewiesen', '000001__x.json', {
			payload: { vorname: 'Jörg' },
			validierung: {
				gueltig: false,
				fehler: { anzahl_gesamt: ['Dieses Feld kann nicht leer gelassen werden.'] }
			}
		});

		const ergebnis = await analysiere(verzeichnis);

		expect(ergebnis.rejected).toEqual([
			{
				file: '000001__x.json',
				errors: { anzahl_gesamt: ['Dieses Feld kann nicht leer gelassen werden.'] }
			}
		]);
	});

	it('erkennt einen Vertragsverstoß bei windstaerke außerhalb 0-12', async () => {
		await legeUmschlagAn('posteingang', '000001__a.json', {
			payload: { anzahl_gesamt: 1, windstaerke: 15 }
		});

		const ergebnis = await analysiere(verzeichnis);

		expect(ergebnis.violations).toContainEqual(
			expect.objectContaining({ file: '000001__a.json', field: 'windstaerke', value: 15 })
		);
	});

	it('akzeptiert windstaerke = 0 als gültige Windstille ohne Verstoß', async () => {
		await legeUmschlagAn('posteingang', '000001__a.json', {
			payload: { anzahl_gesamt: 1, windstaerke: 0 }
		});

		const ergebnis = await analysiere(verzeichnis);

		expect(ergebnis.violations.filter((v) => v.field === 'windstaerke')).toEqual([]);
	});

	it('erkennt einen nicht-0/1 Boolean', async () => {
		await legeUmschlagAn('posteingang', '000001__a.json', {
			payload: { anzahl_gesamt: 1, totfund: true }
		});

		const ergebnis = await analysiere(verzeichnis);

		expect(ergebnis.violations).toContainEqual(
			expect.objectContaining({ file: '000001__a.json', field: 'totfund', value: true })
		);
	});

	it('erkennt eine Windrichtung außerhalb der akzeptierten Menge', async () => {
		await legeUmschlagAn('posteingang', '000001__a.json', {
			payload: { anzahl_gesamt: 1, windrichtung: 'XX' }
		});

		const ergebnis = await analysiere(verzeichnis);

		expect(ergebnis.violations).toContainEqual(
			expect.objectContaining({ file: '000001__a.json', field: 'windrichtung', value: 'XX' })
		);
	});

	it('akzeptiert deutsche und englische Windrichtungen ohne Verstoß', async () => {
		await legeUmschlagAn('posteingang', '000001__a.json', {
			payload: { anzahl_gesamt: 1, windrichtung: 'NE' }
		});
		await legeUmschlagAn('posteingang', '000002__b.json', {
			payload: { anzahl_gesamt: 1, windrichtung: 'SO' }
		});

		const ergebnis = await analysiere(verzeichnis);

		expect(ergebnis.violations.filter((v) => v.field === 'windrichtung')).toEqual([]);
	});

	it('erkennt einen zu langen String', async () => {
		await legeUmschlagAn('posteingang', '000001__a.json', {
			payload: { anzahl_gesamt: 1, vorname: 'x'.repeat(70) }
		});

		const ergebnis = await analysiere(verzeichnis);

		expect(ergebnis.violations).toContainEqual(
			expect.objectContaining({ file: '000001__a.json', field: 'vorname' })
		);
		// Der volle Name darf trotzdem nirgends im Ergebnis auftauchen.
		expect(JSON.stringify(ergebnis)).not.toContain('x'.repeat(70));
	});

	it('gibt bei personenbezogenen Feldern nie den echten Wert zurück', async () => {
		await legeUmschlagAn('posteingang', '000001__a.json', {
			payload: {
				anzahl_gesamt: 1,
				vorname: 'Jörg',
				name: 'Schneider',
				email: 'joerg@example.test',
				telefon: '0123456789',
				fax: '0123456789',
				strasse: 'Hauptstraße 1',
				plz: '18119',
				ort: 'Warnemünde'
			}
		});

		const ergebnis = await analysiere(verzeichnis);
		const alsText = JSON.stringify(ergebnis);

		for (const wert of [
			'Jörg',
			'Schneider',
			'joerg@example.test',
			'0123456789',
			'Hauptstraße 1',
			'18119',
			'Warnemünde'
		]) {
			expect(alsText).not.toContain(wert);
		}

		const vornameFeld = ergebnis.fields.find((f) => f.name === 'vorname');
		expect(vornameFeld?.count).toBe(1);
	});

	it('übersteht einen Umschlag mit payload: null ohne Absturz', async () => {
		await legeUmschlagAn('posteingang', '000001__a.json', { payload: null });
		await legeUmschlagAn('posteingang', '000002__b.json', { payload: { anzahl_gesamt: 1 } });

		const ergebnis = await analysiere(verzeichnis);

		expect(ergebnis.counts.posteingang).toBe(2);
		expect(ergebnis.fields.find((f) => f.name === 'anzahl_gesamt')?.count).toBe(1);
	});

	it('listet Vertragsfelder auf, die nie gesendet wurden', async () => {
		await legeUmschlagAn('posteingang', '000001__a.json', {
			payload: { anzahl_gesamt: 1, sichtungsdatum: '2026-07-30 14:00' }
		});

		const ergebnis = await analysiere(verzeichnis);

		expect(ergebnis.neverSent).toContain('gps_breite');
		expect(ergebnis.neverSent).not.toContain('anzahl_gesamt');
		expect(ergebnis.neverSent).not.toContain('sichtungsdatum');
	});

	it('markiert Felder, die nicht im Vertrag stehen', async () => {
		await legeUmschlagAn('posteingang', '000001__a.json', {
			payload: { anzahl_gesamt: 1, appVersion: '8.0.1' }
		});

		const ergebnis = await analysiere(verzeichnis);

		const appVersionFeld = ergebnis.fields.find((f) => f.name === 'appVersion');
		expect(appVersionFeld?.inContract).toBe(false);
		const anzahlFeld = ergebnis.fields.find((f) => f.name === 'anzahl_gesamt');
		expect(anzahlFeld?.inContract).toBe(true);
	});

	it('meldet fehlende Pflichtfelder mit Dateiname', async () => {
		await legeUmschlagAn('abgewiesen', '000001__a.json', {
			payload: { anzahl_gesamt: 1, vorname: 'Jörg', name: 'Schneider' },
			validierung: { gueltig: false, fehler: { email: ['Pflichtfeld'] } }
		});

		const ergebnis = await analysiere(verzeichnis);

		const emailEintrag = ergebnis.missingRequired.find((f) => f.field === 'email');
		expect(emailEintrag?.count).toBe(1);
		expect(emailEintrag?.files).toEqual(['000001__a.json']);
	});

	it('berechnet die Differenz zwischen Sichtungszeit und Empfangszeit', async () => {
		await legeUmschlagAn('posteingang', '000001__a.json', {
			payload: { anzahl_gesamt: 1, sichtungsdatum: '2026-07-30 14:00' },
			empfangen_am: '2026-07-30T14:33:00.000Z'
		});

		const ergebnis = await analysiere(verzeichnis);

		expect(ergebnis.times).toEqual([
			expect.objectContaining({
				file: '000001__a.json',
				sichtungsdatum: '2026-07-30 14:00',
				empfangenAm: '2026-07-30T14:33:00.000Z',
				diffMinutes: -33
			})
		]);
	});
});

/**
 * Die Ausgabe dieses Werkzeugs wird in Notizen, Issues und Chats eingefügt —
 * von Menschen, die sie für geschwärzt halten. Deshalb gilt umgekehrt zu
 * vorher: Ein Feld wird geschwärzt, **außer** es ist ausdrücklich als
 * unbedenklich markiert (Zahlen- und Auswahlfelder des Vertrags).
 *
 * Bis zum 2026-07-30 galt das Gegenteil (`regel?.personal === true`). Für ein
 * Feld, das nicht in CONTRACT_FIELDS steht, ist `regel` `undefined` — dessen
 * Werte wurden also im Klartext ausgegeben. Genau das sind aber die Felder,
 * für die es dieses Werkzeug gibt.
 */
describe('analysiere — Schwärzung', () => {
	it('gibt den Wert eines unbekannten Feldes nirgends aus', async () => {
		await legeUmschlagAn('posteingang', '000001__a.json', {
			payload: {
				anzahl_gesamt: 1,
				reporterEmail: 'joerg@example.test',
				deviceName: 'iPhone von Jörg'
			}
		});

		const ergebnis = await analysiere(verzeichnis);
		const alsText = `${JSON.stringify(ergebnis)}\n${formatiere(ergebnis)}`;

		expect(alsText).not.toContain('joerg@example.test');
		expect(alsText).not.toContain('iPhone von Jörg');
	});

	it('zeigt ein unbekanntes Feld trotz Schwärzung mit Häufigkeit und Typ', async () => {
		await legeUmschlagAn('posteingang', '000001__a.json', {
			payload: { anzahl_gesamt: 1, deviceName: 'iPhone von Jörg' }
		});
		await legeUmschlagAn('posteingang', '000002__b.json', {
			payload: { anzahl_gesamt: 1, deviceName: 'iPhone von Anna' }
		});

		const ergebnis = await analysiere(verzeichnis);

		const feld = ergebnis.fields.find((f) => f.name === 'deviceName');
		expect(feld?.count).toBe(2);
		expect(feld?.types).toEqual(['string']);
		expect(feld?.inContract).toBe(false);
		expect(formatiere(ergebnis)).toContain('deviceName [NICHT IM VERTRAG] — 2×');
	});

	it('gibt den Freitext eines bekannten Vertragsfeldes nirgends aus', async () => {
		// Bürger schreiben regelmäßig Namen und Rückrufnummern in Kommentarfelder.
		await legeUmschlagAn('posteingang', '000001__a.json', {
			payload: {
				anzahl_gesamt: 1,
				bemerkungen: 'Bitte anrufen unter 0171 2345678, Jörg Schneider',
				reaktion: 'Tier tauchte ab, Kapitän Meier stoppte',
				vonwo_text: 'von der Fähre der Familie Schmidt',
				verteilung_text: 'zwei Gruppen, Meldung von Anna Krause',
				verhalten_text: 'kreiste um das Boot von Herrn Böhm',
				sonstige_auffaelligkeiten: 'Narbe am Rücken, Foto bei Lena Voß',
				seezeichen: 'Tonne 12, Steg von Familie Ahrens',
				schiffsname: 'MS Jörg Schneider'
			}
		});

		const ergebnis = await analysiere(verzeichnis);
		const alsText = `${JSON.stringify(ergebnis)}\n${formatiere(ergebnis)}`;

		for (const wert of [
			'0171 2345678',
			'Jörg Schneider',
			'Kapitän Meier',
			'Familie Schmidt',
			'Anna Krause',
			'Herrn Böhm',
			'Lena Voß',
			'Familie Ahrens'
		]) {
			expect(alsText).not.toContain(wert);
		}
	});

	it('zeigt die Werte der Zahlen- und Auswahlfelder weiterhin im Klartext', async () => {
		// Ohne diese Werte wäre das Werkzeug nutzlos: Es soll ja gerade zeigen,
		// welche Enum- und Zahlenwerte ein Client tatsächlich sendet.
		await legeUmschlagAn('posteingang', '000001__a.json', {
			payload: {
				anzahl_gesamt: 3,
				windstaerke: 0,
				windrichtung: 'NE',
				tierart: 2,
				namensnennung: 0,
				gps_breite: 54.5
			}
		});

		const ergebnis = await analysiere(verzeichnis);

		const werteVon = (name: string) => ergebnis.fields.find((f) => f.name === name)?.values;
		expect(werteVon('anzahl_gesamt')).toEqual([3]);
		expect(werteVon('windstaerke')).toEqual([0]);
		expect(werteVon('windrichtung')).toEqual(['NE']);
		expect(werteVon('tierart')).toEqual([2]);
		expect(werteVon('namensnennung')).toEqual([0]);
		expect(werteVon('gps_breite')).toEqual([54.5]);
	});

	it('schwärzt den Wert auch in der Verstoßliste eines unbekannten Feldes', async () => {
		// Unbekannte Felder erzeugen zwar keine Verstöße, bekannte Freitextfelder
		// mit maxLength schon — und deren Wert darf dort ebenfalls nicht stehen.
		await legeUmschlagAn('posteingang', '000001__a.json', {
			payload: { anzahl_gesamt: 1, schiffsname: 'MS Jörg Schneider'.padEnd(70, '!') }
		});

		const ergebnis = await analysiere(verzeichnis);

		expect(ergebnis.violations).toContainEqual(
			expect.objectContaining({ field: 'schiffsname', value: '[REDACTED]' })
		);
	});
});
