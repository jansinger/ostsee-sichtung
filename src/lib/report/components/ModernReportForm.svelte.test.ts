import { render } from 'vitest-browser-svelte';
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
