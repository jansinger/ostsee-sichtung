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

/**
 * Für die Tests unten, die tatsächlich bis zum Absenden laufen: `submitSightingForm`
 * ist der einzige Ort, an dem das reale Absende-Objekt als Ganzes sichtbar wird —
 * genau die Naht, an der Review-Befund 1 (Task 11, zweite Runde) saß. Ein Test, der
 * stattdessen nur den Autosave-Schnappschuss `FORM_DATA` liest (wie die vorherige
 * Fassung dieser Datei), sieht den `$form`-Zustand, aber nie das tatsächlich
 * übergebene Objekt — dort klaffte die Lücke.
 */
const { submitSightingFormMock } = vi.hoisted(() => ({
	submitSightingFormMock: vi.fn<
		(values: Record<string, unknown>) => Promise<{ status: 'ok'; id: number }>
	>(async () => ({ status: 'ok', id: 1 }))
}));

vi.mock('$lib/form/submitSightingForm', () => ({
	submitSightingForm: submitSightingFormMock,
	describeSubmitFailure: () => 'Die Sichtung konnte nicht gespeichert werden'
}));

import { initialFormState } from '$lib/report/formConfig';
import { SightingFromEnum } from '$lib/report/formOptions/sightingFrom';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '$lib/storage/localStorage';
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
 * B1 (Abschlussreview, kritisch): `onReset()` räumte Storage und
 * Formular-Zustand auf, informierte den Aufrufer aber nie darüber, dass der
 * Zweig aus `+page.svelte` mit zurückgesetzt werden muss — die Auswahlseite
 * erschien nach einem Reset nie wieder. Die Strecke bis zur sichtbar wieder
 * eingeblendeten Auswahlseite steht in `e2e/report-kind-choice.spec.ts`; hier
 * wird nur die neue Naht selbst geprüft: Ruft der Reset das `onreset`-Prop
 * auf, sobald der Formular-Zustand aufgeräumt ist?
 */
describe('ModernReportForm — Reset meldet den Zweig-Reset an den Aufrufer (B1)', () => {
	it('ruft onreset auf, nachdem der Formular-Zustand aufgeräumt ist', async () => {
		seedFormWithUpload();
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		const onreset = vi.fn();
		render(ModernReportForm, { onreset });

		resetButton().click();

		await vi.waitFor(() => expect(onreset).toHaveBeenCalledOnce());
	});

	it('ruft onreset nicht auf, wenn die Rückfrage abgelehnt wird', async () => {
		seedFormWithUpload();
		vi.spyOn(window, 'confirm').mockReturnValue(false);
		const onreset = vi.fn();
		render(ModernReportForm, { onreset });

		resetButton().click();

		await vi.waitFor(() => expect(persistedUploads()).toEqual([UPLOAD]));
		expect(onreset).not.toHaveBeenCalled();
	});
});

/**
 * B3 (Abschlussreview, wichtig): `REPORT_KIND` lag im `localStorage`, während
 * `clearFormDataOnly()` — läuft direkt nach jedem erfolgreichen Absenden — nur
 * `FORM_DATA`/`POSITION_FILE_UIDS` räumte. Der Zweig überlebte damit die
 * Formulardaten, die er beschreibt, teils um Wochen. Geprüft wird über
 * `loadFromStorage`/`saveToStorage` (storage-agnostisch): Der Test bleibt
 * unabhängig davon rot bzw. grün, ob der Schlüssel in session- oder
 * localStorage liegt — er belegt die Wirkung, nicht die Fundstelle.
 */
describe('ModernReportForm — der Zweig verlässt den Speicher mit den Formulardaten (B3)', () => {
	const today = new Date().toISOString().split('T')[0];

	async function submit(): Promise<void> {
		await page.getByRole('button', { name: 'Formular absenden' }).click();
		await vi.waitFor(() => expect(submitSightingFormMock).toHaveBeenCalled());
	}

	beforeEach(() => {
		submitSightingFormMock.mockClear();
		submitSightingFormMock.mockResolvedValue({ status: 'ok', id: 1 });
	});

	it('räumt den gemerkten Zweig weg, sobald erfolgreich abgesendet wurde', async () => {
		saveToStorage(STORAGE_KEYS.REPORT_KIND, 'dead');
		sessionStorage.setItem(STORAGE_KEYS.CURRENT_STEP, JSON.stringify(3));
		sessionStorage.setItem(
			STORAGE_KEYS.FORM_DATA,
			JSON.stringify({
				...initialFormState,
				referenceId: 'ref-b3-zweig',
				entryChannel: 0,
				isDead: true,
				deadCondition: 1,
				species: 0,
				totalCount: 1,
				distance: 1,
				sightingFrom: SightingFromEnum.LAND,
				hasPosition: true,
				latitude: 54.5,
				longitude: 13.5,
				sightingDate: today,
				firstName: 'Max',
				lastName: 'Mustermann',
				email: 'max@example.com',
				privacyConsent: true
			})
		);

		render(ModernReportForm, { initialIsDead: true });

		await submit();

		expect(loadFromStorage<string | null>(STORAGE_KEYS.REPORT_KIND, null)).toBeNull();
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

	/**
	 * Abschlussreview B4: `fieldsOutsideReportKind('dead')` leitete sich aus
	 * `getFormSteps({ isDead: true })` ab — ohne `uploadedFiles`, wodurch
	 * `getFormSteps` zusätzlich `mediaConsent` entfernte (formConfig.ts,
	 * `hasUploadedMedia(undefined)` ist `false`). Die Liste trug damit vier
	 * Felder statt der drei Verhaltensfelder, und der Aufräum-Block oben
	 * (Zeile ~138) setzte `mediaConsent` bei JEDEM Mount im Totfund-Zweig auf
	 * den Schema-Default zurück — auch dann, wenn eine Aufnahme vorlag und der
	 * Melder die Veröffentlichung bereits erlaubt hatte. `mediaConsent` ist
	 * eine dritte, von Zweig UND Beobachtungsort unabhängige Achse (Medien-
	 * Upload) und gehört nicht in diese Zweig-Bereinigung.
	 */
	it('lässt eine erteilte Medien-Einwilligung samt Aufnahme unangetastet, wenn das Formular im Totfund-Zweig startet (B4)', async () => {
		sessionStorage.setItem(
			STORAGE_KEYS.FORM_DATA,
			JSON.stringify({
				...initialFormState,
				referenceId: 'ref-totfund-medien',
				isDead: true,
				mediaConsent: true,
				uploadedFiles: [UPLOAD],
				species: 7,
				latitude: 54.5,
				longitude: 12.1
			})
		);

		render(ModernReportForm, { initialIsDead: true });

		await vi.waitFor(() => {
			const data = persistedFormData();
			expect(data.species).toBe(7);
		});

		const data = persistedFormData();
		expect(data.mediaConsent).toBe(true);
		expect(data.uploadedFiles).toEqual([UPLOAD]);
	});
});

/**
 * Review-Befund 1 (Task 11, zweite Runde): Ausgeblendete Bootsangaben wurden
 * trotzdem abgesendet — UND der erste Fix dafür (ein `$effect`, das `$form`
 * leerte, sobald „Land" galt) hat einen zweiten, schwereren Schaden angerichtet:
 * `onSubmit` baut die dauerhaft zu speichernden Kontaktdaten aus denselben
 * (dann geleerten) Werten, und `saveUserContactDataWithConsent` überschreibt
 * den gespeicherten Datensatz vollständig, ohne Merge
 * (`src/lib/storage/localStorage.ts`). Ein wiederkehrender Melder verlor seine
 * gespeicherten Bootsdaten beim nächsten Land-Bericht.
 *
 * Der jetzige Fix entfernt die Felder deshalb NICHT im Formular-Zustand,
 * sondern erst am Absende-Rand (`HIDDEN_WHEN_FROM_LAND` in `formConfig.ts`,
 * dort die volle Begründung samt verworfenem `$effect`-Ansatz).
 *
 * Der vorherige Test hier las nur den Autosave-Schnappschuss `FORM_DATA` —
 * genau in der Lücke zwischen ihm und dem tatsächlich an den Server gehenden
 * Objekt saß der Befund: `FORM_DATA` konnte die Felder korrekt NICHT mehr
 * enthalten (weil der `$effect` sie geleert hatte), während gleichzeitig der
 * gespeicherte Kontaktdatensatz kaputtging. Die Tests unten laufen deshalb
 * bis zum echten Absende-Aufruf (`submitSightingForm`, gemockt oben) und
 * prüfen dort das tatsächlich übergebene Objekt — nicht `FORM_DATA`.
 */
describe('ModernReportForm — Bootsangaben werden beim Absenden entfernt, die Kontaktdaten überleben', () => {
	const today = new Date().toISOString().split('T')[0];

	function persistedFormData(): Record<string, unknown> {
		const stored = sessionStorage.getItem(STORAGE_KEYS.FORM_DATA);
		if (!stored) throw new Error('FORM_DATA wurde noch nicht persistiert');
		return JSON.parse(stored);
	}

	function contactData(): Record<string, unknown> {
		return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_CONTACT_DATA) ?? '{}');
	}

	async function submit(): Promise<Record<string, unknown>> {
		await page.getByRole('button', { name: 'Formular absenden' }).click();
		await vi.waitFor(() => expect(submitSightingFormMock).toHaveBeenCalled());
		return submitSightingFormMock.mock.calls[0]?.[0] as Record<string, unknown>;
	}

	beforeEach(() => {
		submitSightingFormMock.mockClear();
		submitSightingFormMock.mockResolvedValue({ status: 'ok', id: 1 });
	});

	/**
	 * Der reine Mount-Fall (Review, Punkt „Der reine Mount-Fall ist
	 * ungetestet"): `sightingFrom` steht schon beim Laden auf „Land" — kein
	 * Bedienschritt wählt es. `shipName`/`homePort`/`boatType`/
	 * `shipNameConsent` fehlen in `FORM_DATA` absichtlich: Sie kommen aus der
	 * Kontaktdaten-Vorbefüllung (`loadUserContactData()`), der eigentlichen
	 * Leckquelle aus dem Review.
	 */
	it('sendet keine Bootsangaben, wenn das Formular schon mit sightingFrom=Land startet — kein Bedienschritt', async () => {
		// Wiederkehrender Melder: eine frühere Bootsmeldung hat mit Einwilligung
		// Kontaktdaten hinterlassen (`persistentDataConsent` -> localStorage).
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

		sessionStorage.setItem(STORAGE_KEYS.CURRENT_STEP, JSON.stringify(3));
		sessionStorage.setItem(
			STORAGE_KEYS.FORM_DATA,
			JSON.stringify({
				referenceId: 'ref-mount-land',
				entryChannel: 0,
				species: 0,
				totalCount: 1,
				distance: 1,
				shipCount: 2,
				hasPosition: true,
				latitude: 54.5,
				longitude: 13.5,
				sightingDate: today,
				sightingFrom: SightingFromEnum.LAND,
				privacyConsent: true
			})
		);

		render(ModernReportForm);

		const sent = await submit();

		expect('shipName' in sent).toBe(false);
		expect('homePort' in sent).toBe(false);
		expect('boatType' in sent).toBe(false);
		expect('shipNameConsent' in sent).toBe(false);
		expect('reaction' in sent).toBe(false);
		// Unbeteiligte Felder bleiben im Absende-Objekt stehen.
		expect(sent.shipCount).toBe(2);
		expect(sent.distance).toBe(1);

		// Die dauerhaft gespeicherten Kontaktdaten wurden nie berührt — sie
		// kommen aus `values` (dem UNGEKÜRZTEN Objekt), nicht aus dem
		// bereinigten `submitValues`.
		const contact = contactData();
		expect(contact.shipName).toBe('MS Seelöwe');
		expect(contact.homePort).toBe('Kiel');
		expect(contact.boatType).toBe('Segelboot');
		expect(contact.shipNameConsent).toBe(true);
	});

	/**
	 * Der Nutzen des gewählten Wegs gegenüber dem verworfenen `$effect`: ein
	 * MITTEN im Formular getippter Schiffsname geht beim Wechsel auf „Land"
	 * nicht verloren — er bleibt im Formular-Zustand (`FORM_DATA`) stehen und
	 * wird erst beim tatsächlichen Absenden aus dem gesendeten Objekt
	 * entfernt. Ein Melder, der versehentlich auf „Land" stellt und
	 * zurückwechselt, findet seine Eingabe unverändert vor.
	 */
	it('behält eine mitten im Formular getippte Bootsangabe im Zustand, entfernt sie aber beim Absenden', async () => {
		sessionStorage.setItem(STORAGE_KEYS.CURRENT_STEP, JSON.stringify(1));
		sessionStorage.setItem(
			STORAGE_KEYS.FORM_DATA,
			JSON.stringify({
				...initialFormState,
				referenceId: 'ref-boot-zu-land',
				entryChannel: 0,
				species: 0,
				totalCount: 1,
				distance: 1,
				shipCount: 2,
				hasPosition: true,
				latitude: 54.5,
				longitude: 13.5,
				sightingDate: today,
				sightingFrom: SightingFromEnum.SAILBOAT,
				shipName: 'MS Testboot',
				homePort: 'Rostock',
				boatType: 'Segelboot',
				reaction: 'neugierig genähert',
				shipNameConsent: true,
				firstName: 'Erika',
				lastName: 'Musterfrau',
				email: 'erika@example.com',
				privacyConsent: true,
				persistentDataConsent: true
			})
		);

		render(ModernReportForm);

		await page.getByTestId('field-sightingFrom').selectOptions(String(SightingFromEnum.LAND));

		// Der Formular-ZUSTAND bleibt unangetastet — anders als beim
		// verworfenen `$effect`-Ansatz.
		await vi.waitFor(() => {
			const data = persistedFormData();
			// `selectOptions` liefert den DOM-Wert als String — dieselbe Umwandlung,
			// die `isFromLand` selbst vornimmt (`Number(value)`).
			expect(Number(data.sightingFrom)).toBe(SightingFromEnum.LAND);
			expect(data.shipName).toBe('MS Testboot');
			expect(data.homePort).toBe('Rostock');
			expect(data.boatType).toBe('Segelboot');
			expect(data.reaction).toBe('neugierig genähert');
			expect(data.shipNameConsent).toBe(true);
		});

		// Weiter bis zum letzten Schritt und absenden.
		await page.getByRole('button', { name: 'Nächster Schritt' }).click();
		await page.getByRole('button', { name: 'Nächster Schritt' }).click();
		const sent = await submit();

		expect('shipName' in sent).toBe(false);
		expect('homePort' in sent).toBe(false);
		expect('boatType' in sent).toBe(false);
		expect('reaction' in sent).toBe(false);
		expect('shipNameConsent' in sent).toBe(false);
		expect(sent.shipCount).toBe(2);

		// Die (unangetasteten) getippten Werte wurden mit Einwilligung
		// gespeichert — kein Datenverlust gegenüber dem vorherigen Zustand.
		const contact = contactData();
		expect(contact.shipName).toBe('MS Testboot');
		expect(contact.homePort).toBe('Rostock');
		expect(contact.boatType).toBe('Segelboot');
		expect(contact.shipNameConsent).toBe(true);
	});
});

/**
 * Task 15: Keine Einwilligung ohne Gegenstand. `mediaConsent` fragt nach der
 * Freigabe von Aufnahmen — ohne mindestens eine sitzt die Frage ohne
 * Bezugsgegenstand, und `mapFormToSighting` würde dafür trotzdem einen
 * datierten, versionierten Nachweis stempeln, käme das Feld als `true` beim
 * Server an.
 *
 * Erster Block: die gute Bedienführung — ein `$effect` in `ModernReportForm`
 * hält die Invariante „kein `mediaConsent: true` ohne `uploadedFiles`"
 * durchgehend ein, nicht nur bei einem bestimmten Klick. Das deckt sowohl
 * das Entfernen der letzten Aufnahme als auch einen mit `mediaConsent: true`
 * gestarteten, aber medienlosen Formularzustand ab (z. B. Altbestand aus
 * `localStorage`, von vor diesem Task).
 */
describe('ModernReportForm — mediaConsent ohne Aufnahme wird zurückgesetzt (Task 15)', () => {
	function persistedFormData(): Record<string, unknown> {
		const stored = sessionStorage.getItem(STORAGE_KEYS.FORM_DATA);
		if (!stored) throw new Error('FORM_DATA wurde noch nicht persistiert');
		return JSON.parse(stored);
	}

	it('setzt mediaConsent zurück, wenn keine Aufnahme vorliegt', async () => {
		sessionStorage.setItem(STORAGE_KEYS.CURRENT_STEP, JSON.stringify(3));
		sessionStorage.setItem(
			STORAGE_KEYS.FORM_DATA,
			JSON.stringify({
				...initialFormState,
				referenceId: 'ref-media-keine-aufnahme',
				mediaConsent: true,
				uploadedFiles: []
			})
		);

		render(ModernReportForm);

		await vi.waitFor(() => {
			expect(persistedFormData().mediaConsent).toBe(false);
		});
	});

	it('lässt mediaConsent stehen, solange eine Aufnahme vorliegt', async () => {
		sessionStorage.setItem(STORAGE_KEYS.CURRENT_STEP, JSON.stringify(3));
		sessionStorage.setItem(
			STORAGE_KEYS.FORM_DATA,
			JSON.stringify({
				...initialFormState,
				referenceId: 'ref-media-vorhanden',
				mediaConsent: true,
				uploadedFiles: [UPLOAD]
			})
		);

		render(ModernReportForm);

		// Auf denselben Aufbau warten wie im Reset-Fall, damit ein fälschlich
		// greifender Reset Zeit hätte, sich zu zeigen.
		await vi.waitFor(() => {
			expect(persistedFormData().referenceId).toBe('ref-media-vorhanden');
		});
		expect(persistedFormData().mediaConsent).toBe(true);
	});
});

/**
 * Zweiter Block: der Riegel am Absende-Rand — derselbe Mechanismus wie
 * `OWN_VESSEL_FIELDS` oben (`omitFields` auf das Submit-Objekt), diesmal für
 * `mediaConsent`. Geprüft gegen das tatsächlich an `submitSightingForm`
 * übergebene Objekt, nicht gegen `$form` — genau die Naht, an der Review-
 * Befund 1 (Task 11, zweite Runde) saß.
 */
describe('ModernReportForm — mediaConsent ohne fertigen Upload erreicht den Server nicht (Task 15)', () => {
	const today = new Date().toISOString().split('T')[0];

	async function submit(): Promise<Record<string, unknown>> {
		await page.getByRole('button', { name: 'Formular absenden' }).click();
		await vi.waitFor(() => expect(submitSightingFormMock).toHaveBeenCalled());
		return submitSightingFormMock.mock.calls[0]?.[0] as Record<string, unknown>;
	}

	beforeEach(() => {
		submitSightingFormMock.mockClear();
		submitSightingFormMock.mockResolvedValue({ status: 'ok', id: 1 });
	});

	it('entfernt mediaConsent aus der Absende-Anfrage, wenn kein Upload abgeschlossen ist', async () => {
		sessionStorage.setItem(STORAGE_KEYS.CURRENT_STEP, JSON.stringify(3));
		sessionStorage.setItem(
			STORAGE_KEYS.FORM_DATA,
			JSON.stringify({
				...initialFormState,
				referenceId: 'ref-submit-ohne-upload',
				entryChannel: 0,
				species: 0,
				totalCount: 1,
				distance: 1,
				sightingFrom: SightingFromEnum.LAND,
				hasPosition: true,
				latitude: 54.5,
				longitude: 13.5,
				sightingDate: today,
				firstName: 'Max',
				lastName: 'Mustermann',
				email: 'max@example.com',
				privacyConsent: true,
				mediaConsent: true,
				uploadedFiles: []
			})
		);

		render(ModernReportForm);

		const sent = await submit();

		expect('mediaConsent' in sent).toBe(false);
	});

	it('sendet mediaConsent, wenn ein Upload abgeschlossen ist', async () => {
		sessionStorage.setItem(STORAGE_KEYS.CURRENT_STEP, JSON.stringify(3));
		sessionStorage.setItem(
			STORAGE_KEYS.FORM_DATA,
			JSON.stringify({
				...initialFormState,
				referenceId: 'ref-submit-mit-upload',
				entryChannel: 0,
				species: 0,
				totalCount: 1,
				distance: 1,
				sightingFrom: SightingFromEnum.LAND,
				hasPosition: true,
				latitude: 54.5,
				longitude: 13.5,
				sightingDate: today,
				firstName: 'Max',
				lastName: 'Mustermann',
				email: 'max@example.com',
				privacyConsent: true,
				mediaConsent: true,
				uploadedFiles: [UPLOAD]
			})
		);

		render(ModernReportForm);

		const sent = await submit();

		expect(sent.mediaConsent).toBe(true);
	});
});
