/**
 * @fileoverview Foto-Ankündigung in der Admin-Detailansicht.
 *
 * Der neu gebaute iOS-Client setzt `mediaUpload`, kann aber keine Datei
 * hochladen — das Foto kommt per E-Mail nach. Ohne Einordnung zeigte die
 * Detailansicht dafür nur „Upload: Ja" ohne jede Datei, was wie ein defekter
 * Datensatz aussieht. Siehe `$lib/utils/media/photoAnnouncement.ts`.
 */
import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import AdminSightingView from './AdminSightingView.svelte';
import { DEAD_FINDING_PRESENTATION } from './deadFinding';
import type { FrontendSighting } from '$lib/types';
import { EntryChannelEnum } from '$lib/report/formOptions/entryChannel';
import {
	PHOTO_ANNOUNCEMENT_LABEL,
	PHOTO_ANNOUNCEMENT_TITLE
} from '$lib/utils/media/photoAnnouncement';

// Minimales Objekt, wie an anderer Stelle bereits üblich
// (src/lib/server/export/csvExport.timezone.test.ts) — die Komponente prüft
// zur Laufzeit nur die tatsächlich gelesenen Felder, nicht das volle Schema.
// `created` liegt bewusst NACH NEW_IOS_CLIENT_LAUNCH_DATE (2026-07-30): nur
// Sichtungen ab dann können „wartet auf E-Mail" bedeuten — siehe den
// eigenen Test unten für Altbestand vor diesem Datum.
function baseSighting(overrides: Record<string, unknown> = {}): FrontendSighting {
	return {
		id: 1,
		species: 0,
		totalCount: 1,
		sightingDate: new Date('2026-07-30T10:00:00Z'),
		created: new Date('2026-07-30T09:00:00Z'),
		mediaFile: null,
		mediaUpload: 0,
		mediaConsent: 0,
		// App-Kanal: Nur dort kann ein Client ein Foto ankündigen, ohne es zu
		// übertragen (`photoAnnouncement.ts`). Ein eigener Test unten deckt die
		// übrigen Kanäle ab.
		entryChannel: EntryChannelEnum.APP,
		uploadedFiles: [],
		...overrides
	} as unknown as FrontendSighting;
}

describe('AdminSightingView — Foto-Ankündigung', () => {
	it('zeigt einen Hinweis statt der reinen Ja/Nein-Anzeige, wenn ein Foto angekündigt, aber keine Datei angehängt ist', async () => {
		render(AdminSightingView, {
			sighting: baseSighting({ mediaUpload: 1, uploadedFiles: [] })
		});

		const hint = page.getByText(PHOTO_ANNOUNCEMENT_LABEL);
		await expect.element(hint).toBeVisible();
		await expect.element(hint).toHaveClass(/badge-info/);
		await expect.element(hint).toHaveAttribute('title', PHOTO_ANNOUNCEMENT_TITLE);
	});

	it('zeigt weiterhin die einfache Ja/Nein-Anzeige, wenn kein Foto angekündigt wurde', async () => {
		render(AdminSightingView, {
			sighting: baseSighting({ mediaUpload: 0, uploadedFiles: [] })
		});

		// Mehrere Zeilen zeigen „Nein" (Namensnennung, Schiffsnennung, …) —
		// deshalb gezielt die Upload-Zeile über ihre Beschriftung greifen.
		await expect.element(page.getByRole('row', { name: 'Upload Nein' })).toBeVisible();
		expect(document.body.textContent).not.toContain(PHOTO_ANNOUNCEMENT_LABEL);
	});

	it('zeigt keinen Ankündigungs-Hinweis mehr, sobald eine Datei angehängt wurde (Medien-Galerie übernimmt)', async () => {
		render(AdminSightingView, {
			sighting: baseSighting({
				mediaUpload: 1,
				uploadedFiles: [
					{
						id: 1,
						fileName: 'foto.jpg',
						originalName: 'foto.jpg',
						mimeType: 'image/jpeg',
						size: 1234,
						url: '/uploads/foto.jpg'
					}
				]
			})
		});

		expect(document.body.textContent).not.toContain(PHOTO_ANNOUNCEMENT_LABEL);
	});

	// Live auf der lokalen DB gefunden: `aufnahmeHochladen` trägt 13 Jahre
	// Altbestand, dessen Bedeutung nicht „wartet auf E-Mail vom neuen Client"
	// ist. Eine Sichtung von vor dem Client-Start darf den Hinweis deshalb
	// trotz gesetztem Flag und fehlender Datei nicht zeigen.
	it('zeigt keinen Ankündigungs-Hinweis für Altbestand von vor dem Client-Start', async () => {
		render(AdminSightingView, {
			sighting: baseSighting({
				mediaUpload: 1,
				uploadedFiles: [],
				created: new Date('2015-03-12T08:00:00Z')
			})
		});

		await expect.element(page.getByRole('row', { name: 'Upload Ja' })).toBeVisible();
		expect(document.body.textContent).not.toContain(PHOTO_ANNOUNCEMENT_LABEL);
	});
});

/**
 * Totfund vs. Lebendsichtung.
 *
 * **Der Befund:** Die Karte „Totfund" wurde bei *jeder* Sichtung gerendert —
 * `deadAnimalRows` enthielt immer mindestens die Zeile „Totfund: Nein". Eine
 * Lebendsichtung behauptete damit optisch einen Totfund-Abschnitt, und beim
 * Überfliegen sahen beide Arten gleich aus.
 */
describe('AdminSightingView — Totfund-Auszeichnung', () => {
	it('zeichnet einen Totfund über allen Angaben aus und zeigt die Totfund-Karte', async () => {
		render(AdminSightingView, {
			sighting: baseSighting({ isDead: 1, deadCondition: 1, deadSize: 142 })
		});

		await expect.element(page.getByText(DEAD_FINDING_PRESENTATION.description)).toBeVisible();
		await expect.element(page.getByRole('heading', { name: 'Totfund' })).toBeVisible();
		await expect.element(page.getByRole('row', { name: 'Größe 142 cm' })).toBeVisible();
	});

	// Die Überschrift der Karte sagt es bereits — die Zeile darunter wiederholte
	// sie nur und kostete eine Zeile in einer ohnehin dichten Ansicht.
	it('wiederholt „Totfund" nicht als eigene Ja-Zeile in der Karte', async () => {
		render(AdminSightingView, {
			sighting: baseSighting({ isDead: 1, deadCondition: 1 })
		});

		await expect.element(page.getByRole('heading', { name: 'Totfund' })).toBeVisible();
		expect(page.getByRole('row', { name: 'Totfund Ja' }).elements()).toHaveLength(0);
	});

	it('zeigt bei einer Lebendsichtung weder Kennzeichen noch Totfund-Karte', async () => {
		render(AdminSightingView, {
			sighting: baseSighting({ isDead: 0 })
		});

		// Erst auf etwas warten, das sicher gerendert ist — sonst prüfte die
		// Abwesenheit unter Umständen einen noch leeren Baum und wäre grün,
		// ohne etwas zu belegen.
		await expect.element(page.getByRole('heading', { name: 'Tierinformationen' })).toBeVisible();
		expect(document.body.textContent).not.toContain(DEAD_FINDING_PRESENTATION.description);
		expect(page.getByRole('heading', { name: 'Totfund' }).elements()).toHaveLength(0);
		expect(page.getByRole('row', { name: 'Totfund Nein' }).elements()).toHaveLength(0);
	});
});

describe('AdminSightingView — Eingangskanal der Foto-Ankündigung', () => {
	it.each([
		['Web', EntryChannelEnum.WEB],
		['E-Mail', EntryChannelEnum.EMAIL],
		['Post', EntryChannelEnum.MAIL]
	])(
		'zeigt bei einer über %s eingegangenen Meldung keinen Ankündigungs-Hinweis — dort liegt das Foto bereits vor',
		async (_kanal, entryChannel) => {
			render(AdminSightingView, {
				sighting: baseSighting({ mediaUpload: 1, uploadedFiles: [], entryChannel })
			});

			await expect.element(page.getByRole('row', { name: 'Upload Ja' })).toBeVisible();
			expect(document.body.textContent).not.toContain(PHOTO_ANNOUNCEMENT_LABEL);
		}
	);
});

describe('AdminSightingView — Ablehnung', () => {
	it('zeigt Zeitpunkt und Urheber der Ablehnung', async () => {
		render(AdminSightingView, {
			sighting: baseSighting({
				rejectedAt: new Date('2026-08-06T14:30:00Z'),
				rejectedBy: 'admin@example.com'
			})
		});

		const zeile = page.getByRole('row', { name: /^Abgelehnt/ });
		await expect.element(zeile).toBeVisible();
		expect((await zeile.element()).textContent).toContain('admin@example.com');
	});

	it('zeigt gar keine Ablehnungs-Zeile, solange nicht abgelehnt wurde', async () => {
		render(AdminSightingView, { sighting: baseSighting({ rejectedAt: null }) });

		// Nicht über den Text „Abgelehnt" prüfen: Der Regelfall darf hier keine
		// Zeile erzeugen, auch keine mit „Nein" — sonst steht neben
		// „Verifiziert: Nein" ein zweites Nein und der Unterschied verschwindet.
		expect(document.body.textContent).not.toContain('Abgelehnt');
	});
});
