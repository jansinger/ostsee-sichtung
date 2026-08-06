import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * „Formular zurücksetzen" verwarf bis PR #717 nur den Browser-Zustand.
 *
 * `onReset()` räumte ausschließlich clientseitig auf (`clearFormDataOnly`,
 * `clearStorage`, `updateInitialValues`) — die bereits hochgeladenen Dateien
 * blieben auf der Platte und als Zeile in `sichtungen_dateien` liegen, ohne
 * dass je eine Sichtung entstand, zu der sie gehören. Wer das Formular
 * verwarf, hinterließ seine Fotos dauerhaft.
 *
 * Getestet wird deshalb an der Naht, an der die Absicht verloren ging: Ruft
 * der Reset dieselbe serverseitige Löschung an wie „Alle löschen"
 * (`DropzoneEnhanced.handleClear`), und tut er es, BEVOR er die Dateiliste
 * verwirft — danach weiß niemand mehr, was zu löschen war.
 */
const { deleteMultipleFiles } = vi.hoisted(() => ({
	deleteMultipleFiles: vi.fn<(files: unknown[]) => Promise<void>>(async () => undefined)
}));

vi.mock('$lib/utils/upload/fileProcessing', () => ({ deleteMultipleFiles }));

import { initialFormState } from '$lib/report/formConfig';
import { SightingFromEnum } from '$lib/report/formOptions/sightingFrom';
import { STORAGE_KEYS } from '$lib/storage/localStorage';
import type { UploadedFileInfo } from '$lib/types';
import ModernReportForm from './ModernReportForm.svelte';

const UPLOAD: UploadedFileInfo = {
	uid: 'uid-1',
	filePath: 'ref-1/uid-1.jpg',
	originalName: 'foto.jpg',
	fileName: 'uid-1.jpg',
	mimeType: 'image/jpeg',
	size: 1024
} as UploadedFileInfo;

/**
 * Schritt 4 (Index 3) trägt kein Medien- und kein Kartenelement — der Reset
 * ist von dort aus genauso erreichbar, das Rendern bleibt aber leicht.
 */
function seedFormWithUpload(step = 3): void {
	sessionStorage.setItem(STORAGE_KEYS.CURRENT_STEP, JSON.stringify(step));
	sessionStorage.setItem(
		STORAGE_KEYS.FORM_DATA,
		JSON.stringify({ ...initialFormState, referenceId: 'ref-1', uploadedFiles: [UPLOAD] })
	);
}

function resetButton(): HTMLButtonElement {
	const button = Array.from(document.querySelectorAll('button')).find(
		(candidate) => candidate.textContent?.trim() === 'Formular zurücksetzen'
	);
	if (!button) throw new Error('Schaltfläche „Formular zurücksetzen" nicht im DOM');
	return button;
}

function persistedUploads(): UploadedFileInfo[] {
	const stored = sessionStorage.getItem(STORAGE_KEYS.FORM_DATA);
	return stored ? (JSON.parse(stored).uploadedFiles ?? []) : [];
}

describe('ModernReportForm — Zurücksetzen räumt die Uploads mit auf', () => {
	beforeEach(() => {
		deleteMultipleFiles.mockReset();
		deleteMultipleFiles.mockResolvedValue(undefined);
	});

	it('löscht die hochgeladenen Dateien vom Server', async () => {
		seedFormWithUpload();
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		render(ModernReportForm);

		resetButton().click();

		await vi.waitFor(() => expect(deleteMultipleFiles).toHaveBeenCalled());
		expect(deleteMultipleFiles.mock.calls[0]?.[0]).toEqual([UPLOAD]);
	});

	it('verwirft den Formularzustand trotzdem, wenn die Löschung scheitert', async () => {
		// `deleteMultipleFiles` nutzt intern `Promise.allSettled` und wirft nicht —
		// hier trotzdem der harte Fall (Netz weg, 403): Der Reset ist eine Zusage an
		// den Nutzer und darf nicht daran hängenbleiben, dass der Server nicht
		// mitspielt. Die Datei ist dann verwaist und Sache des serverseitigen
		// Aufräumens (`media:cleanup-orphans`).
		deleteMultipleFiles.mockRejectedValueOnce(new Error('Verbindung zum Server unterbrochen'));
		seedFormWithUpload();
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		render(ModernReportForm);

		resetButton().click();

		await vi.waitFor(() => expect(persistedUploads()).toEqual([]));
	});

	it('löscht nichts, wenn die Rückfrage abgelehnt wird', async () => {
		seedFormWithUpload();
		vi.spyOn(window, 'confirm').mockReturnValue(false);
		render(ModernReportForm);

		resetButton().click();

		await vi.waitFor(() => expect(persistedUploads()).toEqual([UPLOAD]));
		expect(deleteMultipleFiles).not.toHaveBeenCalled();
	});
});

/**
 * Zweiter Hop der Task-7-Kette (`+page.svelte` → `ModernReportForm` →
 * `Step2SightingDetails` → `AnimalInfo`): `ModernReportForm` muss ein
 * mitgegebenes `onchangekind` bis zum „Ändern"-Knopf auf Schritt 2
 * durchreichen. Ohne diesen Test bliebe ein versehentlich entfernter
 * Prop-Hop unbemerkt — der Knopf sähe im DOM unverändert aus, wäre aber
 * wirkungslos (die Lücke, an der Task 6 schon einmal scheiterte).
 */
describe('ModernReportForm — „Ändern" auf Schritt 2 erreicht die Kette', () => {
	it('reicht onchangekind bis zu AnimalInfo durch', async () => {
		sessionStorage.setItem(STORAGE_KEYS.CURRENT_STEP, JSON.stringify(1));
		const onchangekind = vi.fn();
		render(ModernReportForm, { onchangekind });

		await page.getByRole('button', { name: /ändern/i }).click();

		expect(onchangekind).toHaveBeenCalledOnce();
	});
});

/**
 * Task 8: Zweigfremde Felder leeren.
 *
 * Reiner Funktionstest an `fieldsOutsideReportKind` allein hätte diese Lücke
 * nicht gefunden — er beschreibt nur, WELCHE Felder zweigfremd sind, nicht ob
 * `ModernReportForm` die Liste beim Start auch tatsächlich anwendet. Genau das
 * ist der Fehler, an dem dieses Vorhaben laut Auftrag schon zweimal
 * vorbeigelaufen ist: eine richtige Funktion, aber nicht verdrahtet.
 *
 * Beide Tests seeden `FORM_DATA`, wie es eine ÄLTERE Sitzung hinterlassen
 * hätte — ohne Rücksicht darauf, ob ein Wechsel stattfand. Das ist bewusst:
 * Korrektur 1 dreht die Semantik um „was gehört nicht in den Zweig, in dem ich
 * JETZT bin", gerade weil ein vorheriger Zweig nach `changeKind()` nicht mehr
 * rekonstruierbar ist.
 */
describe('ModernReportForm — zweigfremde Felder werden beim Start geleert', () => {
	function persistedFormData(): Record<string, unknown> {
		const stored = sessionStorage.getItem(STORAGE_KEYS.FORM_DATA);
		if (!stored) throw new Error('FORM_DATA wurde noch nicht persistiert');
		return JSON.parse(stored);
	}

	it('leert die Totfund-Felder, wenn das Formular jetzt im Lebend-Zweig startet', async () => {
		sessionStorage.setItem(
			STORAGE_KEYS.FORM_DATA,
			JSON.stringify({
				...initialFormState,
				referenceId: 'ref-alt-totfund',
				isDead: true,
				deadCondition: 2,
				deadSize: 150,
				deadPhoneContact: true,
				// gemeinsame Felder — müssen unangetastet bleiben
				species: 7,
				latitude: 54.5,
				longitude: 12.1
			})
		);

		render(ModernReportForm, { initialIsDead: false });

		await vi.waitFor(() => {
			const data = persistedFormData();
			expect(data.deadCondition).toBeUndefined();
			expect(data.deadSize).toBeUndefined();
			expect(data.deadPhoneContact).toBe(false);
		});

		const data = persistedFormData();
		expect(data.species).toBe(7);
		expect(data.latitude).toBe(54.5);
		expect(data.longitude).toBe(12.1);
	});

	it('leert die Verhaltensfelder, wenn das Formular jetzt im Totfund-Zweig startet', async () => {
		sessionStorage.setItem(
			STORAGE_KEYS.FORM_DATA,
			JSON.stringify({
				...initialFormState,
				referenceId: 'ref-alt-lebend',
				isDead: false,
				behavior: 3,
				behaviorText: 'ruhiges Schwimmen',
				reaction: 'neugierig genähert',
				species: 7,
				latitude: 54.5,
				longitude: 12.1
			})
		);

		render(ModernReportForm, { initialIsDead: true });

		await vi.waitFor(() => {
			const data = persistedFormData();
			expect(data.behavior).toBeUndefined();
			expect(data.behaviorText).toBeUndefined();
			expect(data.reaction).toBeUndefined();
		});

		const data = persistedFormData();
		expect(data.species).toBe(7);
		expect(data.latitude).toBe(54.5);
		expect(data.longitude).toBe(12.1);
	});
});

/**
 * Review-Befund 1 (Task 11, Nachbesserung): Ausgeblendete Bootsangaben wurden
 * trotzdem abgesendet. `HIDDEN_WHEN_FROM_LAND` (`formConfig.ts`) nimmt die
 * Felder zwar aus `getFormSteps()`, und dieselbe Bedingung blendet sie im
 * Markup aus (`BoatInfo.svelte`, `Behavior.svelte`, `Step4Contact.svelte`) —
 * beides ändert nichts am `$form`-Zustand. Ein unsichtbares Feld mit stehen
 * gebliebenem Wert geht beim Absenden trotzdem mit: `onSubmit` in
 * `ModernReportForm.svelte` reicht `$form` fast unverändert weiter (nur
 * `verified`/`internalComment`/`uploadedFiles` fallen weg).
 *
 * Ein reiner Funktionstest an `formConfig.ts` hätte diese Lücke nicht
 * gefunden — dieselbe Fehlerklasse wie beim Totfund-Test oben („zweigfremde
 * Felder"): eine richtige Feldliste, aber nicht bis zum Absendeweg
 * verdrahtet. Beide Tests hier lesen den Zustand deshalb über die
 * persistierten `FORM_DATA` — denselben Weg, über den auch der spätere
 * Submit tatsächlich sendet.
 *
 * Zwei Leckquellen, beide hier abgedeckt:
 * - `loadUserContactData()` befüllt `shipName`/`homePort`/`boatType`/
 *   `shipNameConsent` schon beim Formularstart aus einer FRÜHEREN
 *   Bootsmeldung — der Melder hat diese Werte in DIESER Meldung nie gesehen.
 * - Ein Wechsel MITTEN im Formular (Boot ausgefüllt, dann auf Land
 *   umgestellt) hinterlässt eigene Eingaben unsichtbar im State.
 */
describe('ModernReportForm — Bootsfelder überleben eine Land-Meldung nicht', () => {
	function persistedFormData(): Record<string, unknown> {
		const stored = sessionStorage.getItem(STORAGE_KEYS.FORM_DATA);
		if (!stored) throw new Error('FORM_DATA wurde noch nicht persistiert');
		return JSON.parse(stored);
	}

	it('räumt vorbefüllte Kontaktdaten auf, sobald der Melder "Land" wählt', async () => {
		// Wiederkehrender Melder: eine frühere Bootsmeldung hat mit Einwilligung
		// Kontaktdaten hinterlassen (`persistentDataConsent` -> localStorage).
		// `FORM_DATA` (sessionStorage) ist dagegen leer — eine neue Sitzung, der
		// Melder hat diese Werte hier noch nicht gesehen.
		localStorage.setItem(
			STORAGE_KEYS.USER_CONTACT_DATA,
			JSON.stringify({
				firstName: 'Max',
				lastName: 'Mustermann',
				email: 'max@example.com',
				phone: '',
				shipName: 'MS Seelöwe',
				homePort: 'Kiel',
				boatType: 'Segelboot',
				nameConsent: false,
				shipNameConsent: true,
				persistentDataConsent: true
			})
		);
		// Direkt auf Schritt 2 ("Angaben zum Tier") starten — dort steht
		// `sightingFrom`.
		sessionStorage.setItem(STORAGE_KEYS.CURRENT_STEP, JSON.stringify(1));

		render(ModernReportForm);

		await page.getByTestId('field-sightingFrom').selectOptions(String(SightingFromEnum.LAND));

		await vi.waitFor(() => {
			const data = persistedFormData();
			expect(data.shipName).toBeUndefined();
			expect(data.homePort).toBeUndefined();
			expect(data.boatType).toBeUndefined();
			expect(data.shipNameConsent).toBe(false);
		});

		// Der Reset betrifft nur DIESE Meldung (`$form`/`FORM_DATA`) — die
		// dauerhaft gespeicherten Kontaktdaten bleiben unangetastet, damit der
		// Melder sie beim nächsten Mal, wenn er wieder vom Boot meldet, zurückbekommt.
		const contactData = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_CONTACT_DATA) ?? '{}');
		expect(contactData.shipName).toBe('MS Seelöwe');
		expect(contactData.homePort).toBe('Kiel');
		expect(contactData.boatType).toBe('Segelboot');
		expect(contactData.shipNameConsent).toBe(true);
	});

	it('räumt eigene Eingaben auf, wenn mitten im Formular von Boot auf Land gewechselt wird', async () => {
		sessionStorage.setItem(STORAGE_KEYS.CURRENT_STEP, JSON.stringify(1));
		sessionStorage.setItem(
			STORAGE_KEYS.FORM_DATA,
			JSON.stringify({
				...initialFormState,
				referenceId: 'ref-boot-zu-land',
				sightingFrom: SightingFromEnum.SAILBOAT,
				shipName: 'MS Testboot',
				homePort: 'Rostock',
				boatType: 'Segelboot',
				reaction: 'neugierig genähert',
				shipNameConsent: true,
				shipCount: 2,
				distance: 50,
				species: 7,
				latitude: 54.5,
				longitude: 12.1
			})
		);

		render(ModernReportForm);

		await page.getByTestId('field-sightingFrom').selectOptions(String(SightingFromEnum.LAND));

		await vi.waitFor(() => {
			const data = persistedFormData();
			expect(data.shipName).toBeUndefined();
			expect(data.homePort).toBeUndefined();
			expect(data.boatType).toBeUndefined();
			expect(data.reaction).toBeUndefined();
			expect(data.shipNameConsent).toBe(false);
		});

		const data = persistedFormData();
		// Unbeteiligte Felder bleiben stehen — keine Kollateralschäden.
		expect(data.shipCount).toBe(2);
		expect(data.distance).toBe(50);
		expect(data.species).toBe(7);
		expect(data.latitude).toBe(54.5);
		expect(data.longitude).toBe(12.1);
	});
});
