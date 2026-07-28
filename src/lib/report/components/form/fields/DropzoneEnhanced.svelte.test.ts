import { render } from 'vitest-browser-svelte';
import { describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
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
	props: { maxFiles: number; enableGPSExtraction: boolean; showPositionMap?: boolean },
	seededMediaFiles: MediaFile[] = []
): { mediaStore: MediaStore; form: FormContext['form'] } {
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

	return { mediaStore, form: context.form };
}

describe('DropzoneEnhanced — Herkunft wiederhergestellter Dateien', () => {
	it('markiert ein nicht vorgemerktes Medium nicht als Positions-Foto, auch wenn die Positions-Dropzone zuerst mountet', async () => {
		const { mediaStore } = renderDropzone([uploadedFile('media-uid')], {
			maxFiles: 1,
			enableGPSExtraction: true
		});

		await expect.poll(() => mediaStore.mediaFiles.length).toBe(1);
		expect(mediaStore.mediaFiles[0]?.isFromPositionStep).toBe(false);
	});

	it('markiert ein vorgemerktes Foto als Positions-Foto, auch wenn die Medien-Dropzone zuerst mountet', async () => {
		markPositionFile('position-uid');

		const { mediaStore } = renderDropzone([uploadedFile('position-uid')], {
			maxFiles: 10,
			enableGPSExtraction: false
		});

		await expect.poll(() => mediaStore.mediaFiles.length).toBe(1);
		expect(mediaStore.mediaFiles[0]?.isFromPositionStep).toBe(true);
	});

	it('trennt beide Herkünfte in einem gemeinsamen Store', async () => {
		markPositionFile('position-uid');

		const { mediaStore } = renderDropzone([uploadedFile('position-uid'), uploadedFile('media-uid')], {
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

/** Wiederhergestellte Datei ohne GPS — `analyzed` ist sofort true. */
function restoredMediaFile(uid: string, fromPositionStep: boolean): MediaFile {
	return MediaFile.fromUploadedFile(uploadedFile(uid), 'ref-1', fromPositionStep);
}

/**
 * `mediaStore` gehört dem ganzen Formular. `photoStatus` grenzt deshalb auf
 * `isFromPositionStep` ein — sein Geschwister `positionMediaFile` tat es nicht
 * und fiel auf `mediaFiles[0]` zurück. Nach einem Reload auf Schritt 1, mit
 * Medien nur aus Schritt 3, zeigte Schritt 1 damit ein fremdes Foto als „das
 * Positions-Foto" und ersetzte die Dropzone vollständig. Einziger Ausweg war
 * „Neu auswählen" — und das löschte serverseitig alle Medien aller Schritte.
 */
describe('DropzoneEnhanced — Eingrenzung auf den Positions-Schritt', () => {
	it('zeigt im Positions-Schritt die Dropzone, wenn nur Medien aus Schritt 3 vorliegen', async () => {
		renderDropzone([], { maxFiles: 1, enableGPSExtraction: true }, [
			restoredMediaFile('media-uid', false)
		]);

		await expect.poll(() => document.querySelectorAll('input[type="file"]').length).toBe(1);
		expect(document.body.textContent).not.toContain('Neu auswählen');
	});

	it('löscht mit „Neu auswählen" keine Medien der anderen Schritte', async () => {
		const { mediaStore, form } = renderDropzone(
			[uploadedFile('position-uid'), uploadedFile('media-uid')],
			{ maxFiles: 1, enableGPSExtraction: true },
			[restoredMediaFile('position-uid', true), restoredMediaFile('media-uid', false)]
		);

		const reset = await vi.waitUntil(() =>
			Array.from(document.querySelectorAll('button')).find(
				(button) => button.textContent?.trim() === 'Neu auswählen'
			)
		);
		reset.click();

		await expect.poll(() => mediaStore.mediaFiles.map((file) => file.uid)).toEqual(['media-uid']);
		expect(get(form).uploadedFiles.map((file) => file.uid)).toEqual(['media-uid']);
	});
});

/**
 * Zwei Karten derselben Position.
 *
 * Mit GPS-Foto rendert die Foto-Karte eine 300 px hohe, schreibgeschützte
 * `OLMap`, und die Disclosure des Panels klappt darunter eine zweite,
 * interaktive Karte mit demselben Marker auf — auf 375 px zusammen rund 600 px
 * Karte, ohne erkennbaren Unterschied, welche davon bedienbar ist. Die
 * Spezifikation sieht für Zustand B eine kompakte Bestätigungszeile plus GENAU
 * EINE Karte vor: die interaktive.
 *
 * Wie bei `showNoGpsWarning` steckt die Entscheidung in einer Prop mit dem
 * bisherigen Verhalten als Default — Schritt 3 und die Admin-Maske
 * (`sections/Media.svelte`, beide mit `enableGPSExtraction={false}`) erreichen
 * diesen Zweig ohnehin nicht.
 */
describe('DropzoneEnhanced — Karte in der Foto-Karte', () => {
	function gpsMediaFile(uid: string): MediaFile {
		const info = {
			...uploadedFile(uid),
			exifData: { latitude: 54.31, longitude: 12.09 }
		} as UploadedFileInfo;
		return MediaFile.fromUploadedFile(info, 'ref-1', true);
	}

	it('zeigt ohne `showPositionMap` die kompakte Bestätigungszeile statt einer zweiten Karte', async () => {
		renderDropzone(
			[],
			{ maxFiles: 1, enableGPSExtraction: true, showPositionMap: false },
			[gpsMediaFile('gps-uid')]
		);

		await expect
			.poll(() => document.querySelectorAll('[data-testid="photo-position-summary"]').length)
			.toBe(1);
		expect(document.querySelectorAll('.ol-viewport').length).toBe(0);
	});
});
