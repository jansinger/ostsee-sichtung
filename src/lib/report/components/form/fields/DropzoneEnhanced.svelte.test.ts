import { render } from 'vitest-browser-svelte';
import { describe, expect, it } from 'vitest';
import { createForm } from '$lib/form/createForm';
import { key as formContextKey } from '$lib/report/formContext';
import { initialFormState } from '$lib/report/formConfig';
import type { FormContext, SightingFormData, UploadedFileInfo, ValidationPreset } from '$lib/types';
import { MediaFile, type MediaStore } from '$lib/utils/media/MediaFile';
import { markPositionFile } from './positionFileOrigin';
import DropzoneEnhanced from './DropzoneEnhanced.svelte';

/**
 * Herkunft wiederhergestellter Dateien.
 *
 * `$form.uploadedFiles` wird persistiert, `mediaStore` nicht — nach einem Reload
 * baut der `$effect.pre` in DropzoneEnhanced die `MediaFile`s neu auf. Vorher gab
 * er dabei jeder Datei die Herkunft der *mountenden* Instanz mit, und weil
 * bereits vorhandene Dateien übersprungen werden, gewann schlicht die Dropzone,
 * die zuerst mountete:
 *
 * - Reload auf Schritt 1 mit Medien aus Schritt 3 → alle galten als
 *   Positions-Foto, und das Panel behauptete „In diesem Foto sind keine
 *   GPS-Daten gespeichert", obwohl in Schritt 1 nie eines lag.
 * - Reload auf Schritt 2+ → das echte Positions-Foto galt als Schritt-3-Medium
 *   und der Hinweis war weg.
 *
 * Die Herkunft wird deshalb neben den Formulardaten persistiert (uid-Menge in
 * `positionFileOrigin.ts`) statt aus der Mount-Reihenfolge geraten.
 *
 * `mediaStore` ist hier bewusst ein einfaches Objekt: In `.svelte.test.ts` gibt
 * es keine Runes, und für die geprüfte Aussage genügt der Wert, den der
 * `$effect.pre` beim Mounten hineinschreibt.
 */

const CONFIG: ValidationPreset = {
	allowedTypes: ['image/jpeg'],
	maxFileSize: 10 * 1024 * 1024,
	maxFiles: 10,
	accept: 'image/*'
};

function uploadedFile(uid: string): UploadedFileInfo {
	return {
		uid,
		filePath: `ref-1/${uid}.jpg`,
		originalName: `${uid}.jpg`,
		fileName: `${uid}.jpg`,
		mimeType: 'image/jpeg',
		size: 1234
	} as UploadedFileInfo;
}

function renderDropzone(
	files: UploadedFileInfo[],
	props: { maxFiles: number; enableGPSExtraction: boolean },
	seededMediaFiles: MediaFile[] = []
): MediaStore {
	const mediaStore: MediaStore = { mediaFiles: seededMediaFiles };
	const context = {
		...createForm<SightingFormData>({
			initialValues: { ...initialFormState, uploadedFiles: files } as SightingFormData,
			onSubmit: () => undefined
		}),
		mediaStore
	} as unknown as FormContext;

	render(DropzoneEnhanced, {
		props: { referenceId: 'ref-1', config: CONFIG, ...props },
		context: new Map([[formContextKey, context]])
	});

	return mediaStore;
}

describe('DropzoneEnhanced — Herkunft wiederhergestellter Dateien', () => {
	it('markiert ein nicht vorgemerktes Medium nicht als Positions-Foto, auch wenn die Positions-Dropzone zuerst mountet', async () => {
		const mediaStore = renderDropzone([uploadedFile('media-uid')], {
			maxFiles: 1,
			enableGPSExtraction: true
		});

		await expect.poll(() => mediaStore.mediaFiles.length).toBe(1);
		expect(mediaStore.mediaFiles[0]?.isFromPositionStep).toBe(false);
	});

	it('markiert ein vorgemerktes Foto als Positions-Foto, auch wenn die Medien-Dropzone zuerst mountet', async () => {
		markPositionFile('position-uid');

		const mediaStore = renderDropzone([uploadedFile('position-uid')], {
			maxFiles: 10,
			enableGPSExtraction: false
		});

		await expect.poll(() => mediaStore.mediaFiles.length).toBe(1);
		expect(mediaStore.mediaFiles[0]?.isFromPositionStep).toBe(true);
	});

	it('trennt beide Herkünfte in einem gemeinsamen Store', async () => {
		markPositionFile('position-uid');

		const mediaStore = renderDropzone([uploadedFile('position-uid'), uploadedFile('media-uid')], {
			maxFiles: 10,
			enableGPSExtraction: false
		});

		await expect.poll(() => mediaStore.mediaFiles.length).toBe(2);
		const byUid = Object.fromEntries(
			mediaStore.mediaFiles.map((file) => [file.uid, file.isFromPositionStep])
		);
		expect(byUid).toEqual({ 'position-uid': true, 'media-uid': false });
	});
});

/**
 * Baut ein `MediaFile`, dessen Metadaten-Auswertung ablehnt — der Fall, den
 * `analyzeClientFile` heute selbst schluckt, den die injizierte Promise aber
 * jederzeit liefern darf.
 */
function failingMediaFile(uid: string): MediaFile {
	const mediaFile = new MediaFile(
		uid,
		`${uid}.jpg`,
		'ref-1',
		Promise.resolve(uploadedFile(uid)),
		Promise.reject(new Error('exif kaputt'))
	);
	mediaFile.isFromPositionStep = true;
	return mediaFile;
}

/**
 * Scheitert die EXIF-Auswertung, hat der `{#await}`-Block bisher keinen
 * `{:catch}`-Zweig: Die Ablehnung schlägt als Svelte-Fehler durch und der
 * Nutzer sieht im besten Fall gar nichts, im schlechteren eine kaputte Seite.
 * Sichtbar bleiben muss mindestens ein Ausweg — die Datei selbst ist ja da.
 */
describe('DropzoneEnhanced — gescheiterte EXIF-Auswertung', () => {
	it('zeigt einen Hinweis statt eines Dauer-Spinners oder eines Absturzes', async () => {
		renderDropzone([], { maxFiles: 1, enableGPSExtraction: true }, [failingMediaFile('kaputt')]);

		await expect
			.poll(() => document.querySelectorAll('[data-testid="photo-analysis-failed"]').length)
			.toBe(1);
		expect(document.querySelectorAll('[aria-label="Analysiere Bilddaten"]').length).toBe(0);
	});
});
