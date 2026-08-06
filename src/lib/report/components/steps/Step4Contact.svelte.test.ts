import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { renderWithFormContext } from '$lib/report/components/testing/renderWithFormContext.testutil';
import { SightingFromEnum } from '$lib/report/formOptions/sightingFrom';
import type { SightingFormData, UploadedFileInfo } from '$lib/types';
import Step4Contact from './Step4Contact.svelte';

/**
 * Task 11: `shipNameConsent` fragt nach der Freigabe eines Schiffsnamens.
 * Bei einer Land-Meldung wird nie ein Schiffsname erhoben (`BoatInfo.svelte`
 * blendet `shipName` dort aus) — die Einwilligung dazu ist dann eine Frage
 * ohne Bezugsgegenstand.
 *
 * `Step4Contact` gehört ausschließlich dem Meldeformular (`ModernReportForm.svelte`)
 * — keine Admin-Nutzung, also kein `adminMode`-Zweig zu prüfen.
 */
function renderStep4(overrides: Partial<SightingFormData> = {}): void {
	renderWithFormContext(Step4Contact, { overrides });
}

/**
 * Ein abgeschlossen hochgeladenes File, wie es `$form.uploadedFiles` nach
 * einem erfolgreichen Upload enthält. Genügt, um `hasMedia` (Task 15) zu
 * erfüllen.
 */
const UPLOADED_FILE: UploadedFileInfo = {
	uid: 'uid-1',
	filePath: 'ref-1/uid-1.jpg',
	originalName: 'foto.jpg',
	fileName: 'uid-1.jpg',
	mimeType: 'image/jpeg',
	size: 1234
} as UploadedFileInfo;

const SECOND_UPLOADED_FILE: UploadedFileInfo = {
	...UPLOADED_FILE,
	uid: 'uid-2',
	filePath: 'ref-1/uid-2.jpg',
	originalName: 'robbe-am-strand.jpg',
	fileName: 'uid-2.jpg'
} as UploadedFileInfo;

function field(name: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(`[data-testid="field-${name}"]`);
}

describe('Step4Contact — Einwilligung zum Schiffsnamen entfällt bei Land', () => {
	it('blendet shipNameConsent aus, wenn von Land gemeldet wird', () => {
		renderStep4({ sightingFrom: SightingFromEnum.LAND });

		expect(field('shipNameConsent')).toBeNull();
	});

	it('zeigt shipNameConsent, wenn von einem Boot gemeldet wird', () => {
		renderStep4({ sightingFrom: SightingFromEnum.SAILBOAT });

		expect(field('shipNameConsent')).not.toBeNull();
	});

	it('zeigt shipNameConsent bei „Sonstiges" — 0 ist Default UND „Sonstiges", nicht Land', () => {
		renderStep4({ sightingFrom: SightingFromEnum.OTHER });

		expect(field('shipNameConsent')).not.toBeNull();
	});

	// Gegenprobe: `nameConsent` betrifft den eigenen Namen, nicht das Boot —
	// bleibt unabhängig vom Beobachtungsort stehen.
	it('lässt nameConsent auch bei Land stehen', () => {
		renderStep4({ sightingFrom: SightingFromEnum.LAND });

		expect(field('nameConsent')).not.toBeNull();
	});
});

/**
 * Task 14: `mediaConsent` steht seit dem 2026-08-05 hier bei den übrigen
 * Einwilligungen, nicht mehr bei der Dropzone auf Schritt 2 —
 * `sections/Media.svelte.test.ts` deckt ab, dass es dort im öffentlichen
 * Formular nicht mehr rendert. Seit Task 15 hängt es an einer Bedingung wie
 * `shipNameConsent` oben — hier deshalb mit vorliegender Aufnahme gerendert
 * (`uploadedFiles`); der Fall ohne Aufnahme steht in der eigenen Beschreibung
 * weiter unten.
 */
describe('Step4Contact — Medien-Einwilligung bei den übrigen Einwilligungen (Task 14)', () => {
	it('rendert mediaConsent', () => {
		renderStep4({ uploadedFiles: [UPLOADED_FILE] });

		expect(field('mediaConsent')).not.toBeNull();
	});

	it('rendert mediaConsent bedienbar — anders als in der Admin-Maske ist hier nichts gesperrt', () => {
		renderStep4({ uploadedFiles: [UPLOADED_FILE] });

		const input = document.querySelector<HTMLInputElement>('[data-testid="field-mediaConsent"]');
		expect(input?.disabled).toBe(false);
	});
});

/**
 * Task 15: Eine Einwilligung zur Veröffentlichung von Aufnahmen, die es nicht
 * gibt, ist eine Frage ohne Bezugsgegenstand — dieselbe Fehlerklasse wie
 * `shipNameConsent` bei einer Land-Meldung oben.
 *
 * Geprüft wird gegen `$form.uploadedFiles` (abgeschlossene Uploads), nicht
 * gegen den client-seitigen Medien-Store: Der Store gehört den Dropzone-
 * Instanzen auf Schritt 1 und Schritt 2 und bleibt leer, solange keine von
 * beiden gemountet ist — genau der Fall, wenn `Step4Contact` alleine steht
 * (auch beim Reload direkt auf Schritt 4). `uploadedFiles` ist dagegen ein
 * persistiertes Formularfeld und unabhängig davon korrekt.
 */
describe('Step4Contact — Medien-Einwilligung ohne vorliegende Aufnahme (Task 15)', () => {
	it('blendet mediaConsent aus, solange keine Aufnahme vorliegt', () => {
		renderStep4();

		expect(field('mediaConsent')).toBeNull();
	});

	it('blendet mediaConsent auch bei einer leeren uploadedFiles-Liste aus', () => {
		renderStep4({ uploadedFiles: [] });

		expect(field('mediaConsent')).toBeNull();
	});

	it('zeigt mediaConsent, sobald eine Aufnahme abgeschlossen hochgeladen ist', () => {
		renderStep4({ uploadedFiles: [UPLOADED_FILE] });

		expect(field('mediaConsent')).not.toBeNull();
	});

	// Gegenprobe: Nur mediaConsent reagiert auf den Medienstand, die übrigen
	// Einwilligungen bleiben unabhängig davon stehen. `privacyConsent` steht
	// nicht hier, sondern in `RequiredConsent.svelte` (eigene Komponente).
	it('lässt die übrigen Einwilligungen unabhängig vom Medienstand stehen', () => {
		renderStep4();

		expect(field('nameConsent')).not.toBeNull();
		expect(field('persistentDataConsent')).not.toBeNull();
	});
});

/**
 * Review-Befund 1 (Task 14, 2026-08-06): Die Gruppen-Überschrift blieb beim
 * Umzug auf „Optionale Veröffentlichung Ihres Namens" stehen. Darunter steht
 * seither aber auch `mediaConsent` — die Veröffentlichung von AUFNAHMEN ist
 * keine Namensnennung. Wer per Überschrift navigiert (Screenreader) oder die
 * Seite überfliegt, bekommt für die Medien-Einwilligung den falschen Rahmen.
 */
describe('Step4Contact — Gruppen-Überschrift deckt alle Einwilligungen ab (Review-Befund 1)', () => {
	function consentGroupHeading(): string | null {
		const mediaField = field('mediaConsent');
		const group = mediaField?.closest('.space-y-4');
		return group?.querySelector('h4')?.textContent ?? null;
	}

	it('nennt in der Überschrift auch die Veröffentlichung von Aufnahmen, nicht nur des Namens', () => {
		// Braucht eine vorliegende Aufnahme (Task 15) — sonst rendert
		// mediaConsent gar nicht und `consentGroupHeading()` liefert `null`.
		renderStep4({ uploadedFiles: [UPLOADED_FILE] });

		expect(consentGroupHeading()).toMatch(/Aufnahmen/i);
	});
});

/**
 * Review-Befund 4 (Task 14, 2026-08-06): Die bisherigen Tests prüften nur
 * Existenz und Bedienbarkeit von `mediaConsent`, nicht seine Position. Ein
 * Feld, das versehentlich am Kopf des Schritts oder außerhalb der
 * Einwilligungsgruppe landete, wäre damit unbemerkt geblieben. Diese
 * Feststellung prüft, dass `mediaConsent` in derselben Gruppe steht wie die
 * übrigen Nachweis-Einwilligungen — unter derselben Überschrift, nicht
 * irgendwo sonst im Schritt (z. B. bei „Zusätzliche Informationen" oder bei
 * der „Dauerhafte Speicherung"-Gruppe, die ebenfalls `.space-y-4` trägt).
 */
/**
 * UX-Review (2026-08-06, Punkt 2): `mediaConsent` steht zwei Schritte nach dem
 * Upload. Wer hier zustimmt, musste bis dahin aus dem Gedächtnis wissen,
 * worüber er entscheidet — die Dateien selbst liegen auf Schritt 2.
 *
 * Benannt wird `originalName` aus `$form.uploadedFiles`, also der Dateiname, den
 * der Melder selbst kennt — nicht der interne `fileName`.
 */
describe('Step4Contact — die Medien-Einwilligung benennt die Aufnahmen (UX-Review Punkt 2)', () => {
	it('nennt die einzelne Aufnahme im Singular und mit ihrem Namen', async () => {
		renderStep4({ uploadedFiles: [UPLOADED_FILE] });

		await expect.element(page.getByText(/Ihre hochgeladene Aufnahme/i)).toBeInTheDocument();
		await expect.element(page.getByText('foto.jpg')).toBeInTheDocument();
	});

	it('zählt mehrere Aufnahmen und benennt jede einzeln', async () => {
		renderStep4({ uploadedFiles: [UPLOADED_FILE, SECOND_UPLOADED_FILE] });

		await expect.element(page.getByText(/Ihre 2 hochgeladenen Aufnahmen/i)).toBeInTheDocument();
		await expect.element(page.getByText('foto.jpg')).toBeInTheDocument();
		await expect.element(page.getByText('robbe-am-strand.jpg')).toBeInTheDocument();
	});

	it('stellt die Aufzählung VOR das Ankreuzfeld, nicht dahinter', () => {
		renderStep4({ uploadedFiles: [UPLOADED_FILE] });

		const liste = document.querySelector('[data-testid="uploaded-media-summary"]');
		const feld = field('mediaConsent');
		expect(liste).not.toBeNull();
		expect(feld).not.toBeNull();
		// DOCUMENT_POSITION_FOLLOWING: das Feld steht im Dokument NACH der Liste.
		expect(
			(liste as Element).compareDocumentPosition(feld as Node) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
	});

	// Gegenprobe: Ohne Aufnahme gibt es weder Einwilligung noch Aufzählung —
	// sonst stünde eine leere Überschrift „Ihre 0 hochgeladenen Aufnahmen" da.
	it('zeigt ohne Aufnahme auch keine Aufzählung', () => {
		renderStep4();

		expect(document.querySelector('[data-testid="uploaded-media-summary"]')).toBeNull();
	});
});

describe('Step4Contact — mediaConsent steht in der Einwilligungsgruppe, nicht irgendwo im Schritt (Review-Befund 4)', () => {
	it('teilt sich mit nameConsent dieselbe Einwilligungsgruppe unter der Überschrift', () => {
		// Braucht eine vorliegende Aufnahme (Task 15) — sonst rendert
		// mediaConsent gar nicht und `mediaGroup` bliebe `null`.
		renderStep4({ uploadedFiles: [UPLOADED_FILE] });

		const mediaGroup = field('mediaConsent')?.closest('.space-y-4');
		const nameGroup = field('nameConsent')?.closest('.space-y-4');

		expect(mediaGroup).not.toBeNull();
		expect(mediaGroup?.querySelector('h4')).not.toBeNull();
		expect(mediaGroup).toBe(nameGroup);
	});
});
