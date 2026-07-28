import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrowserFileMetadata, UploadedFileInfo } from '$lib/types';

/**
 * Warum dieser Test in Node und nicht im Browser läuft: `MediaFile` ist eine
 * schlichte Klasse. Die beiden Abhängigkeiten, die einen Browser bräuchten
 * (EXIF-Auswertung, Upload), werden hier ersetzt — geprüft wird ausschließlich
 * der Lebenszyklus der Klasse selbst.
 *
 * Warum es diesen Test überhaupt gibt: `analyzed` ist die einzige Quelle, aus
 * der das Positions-Panel „wird gerade ausgewertet" von „dieses Foto hat kein
 * GPS" unterscheidet (positionPanelState.ts → `photoStatus`). Bisher war nur die
 * reine Regel über handgebaute Literale getestet; ob das Flag im echten Objekt
 * jemals umspringt, prüfte niemand.
 */
const analyzeClientFile = vi.hoisted(() => vi.fn<(file: File) => Promise<BrowserFileMetadata>>());
const uploadFileDirect = vi.hoisted(() => vi.fn<() => Promise<UploadedFileInfo>>());

vi.mock('$lib/utils/client/fileAnalysis', () => ({ analyzeClientFile }));
vi.mock('$lib/utils/uploadUtils', () => ({ uploadFileDirect }));

const { MediaFile } = await import('./MediaFile');

function imageFile(): File {
	return new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
}

function metadata(exifData: BrowserFileMetadata['exifData'] = {}): BrowserFileMetadata {
	return {
		fileName: 'foto.jpg',
		size: 1,
		mimeType: 'image/jpeg',
		exifData
	} as BrowserFileMetadata;
}

function uploadedFileInfo(): UploadedFileInfo {
	return {
		uid: 'uid-1',
		fileName: 'foto.jpg',
		originalName: 'foto.jpg',
		filePath: 'ref/foto.jpg',
		size: 1,
		mimeType: 'image/jpeg',
		exifData: {}
	} as unknown as UploadedFileInfo;
}

beforeEach(() => {
	vi.clearAllMocks();
	uploadFileDirect.mockReturnValue(new Promise<UploadedFileInfo>(() => {}));
});

describe('MediaFile — Lebenszyklus von `analyzed`', () => {
	it('gilt direkt nach dem Anlegen als NICHT ausgewertet', () => {
		analyzeClientFile.mockResolvedValue(metadata());

		const mediaFile = MediaFile.createMediaFile('ref', imageFile(), true);

		expect(mediaFile.isAnalyzed()).toBe(false);
	});

	it('gilt nach dem Auflösen der Metadaten als ausgewertet', async () => {
		analyzeClientFile.mockResolvedValue(metadata());

		const mediaFile = MediaFile.createMediaFile('ref', imageFile(), true);
		await mediaFile.metadata;

		expect(mediaFile.isAnalyzed()).toBe(true);
	});

	/**
	 * Der Zustand, für den das Flag existiert: Zwischen Drop und aufgelöster
	 * Promise meldet `hasPosition()` `false`, obwohl das Foto GPS trägt. Ohne
	 * `analyzed` wäre dieser Moment von „kein GPS" nicht zu unterscheiden.
	 */
	it('meldet vor der Auswertung noch kein GPS, danach schon', async () => {
		analyzeClientFile.mockResolvedValue(metadata({ latitude: 54.31, longitude: 12.09 }));

		const mediaFile = MediaFile.createMediaFile('ref', imageFile(), true);
		expect(mediaFile.hasPosition()).toBe(false);
		expect(mediaFile.isAnalyzed()).toBe(false);

		await mediaFile.metadata;

		expect(mediaFile.hasPosition()).toBe(true);
		expect(mediaFile.isAnalyzed()).toBe(true);
	});

	/**
	 * Eine wiederhergestellte Datei darf nicht durch `'analyzing'` flackern: Die
	 * EXIF-Auswertung liegt bereits hinter ihr, `fileInfo` trägt das Ergebnis.
	 */
	it('gilt bei einer wiederhergestellten Datei sofort als ausgewertet', () => {
		const mediaFile = MediaFile.fromUploadedFile(uploadedFileInfo(), 'ref');

		expect(mediaFile.isAnalyzed()).toBe(true);
	});
});

/**
 * `isFromPositionStep` grenzt ein, über welche Dateien das Positions-Panel
 * urteilt (positionPanelState.ts → `photoStatus`). Nach einem Reload werden die
 * Dateien aus `$form.uploadedFiles` neu aufgebaut — ginge die Markierung dabei
 * verloren, verschwände der Hinweis „kein GPS im Foto" beim Neuladen der Seite.
 */
describe('MediaFile — Markierung des Positions-Schritts', () => {
	it('merkt sich die Herkunft einer frisch abgelegten Datei', () => {
		analyzeClientFile.mockResolvedValue(metadata());

		expect(MediaFile.createMediaFile('ref', imageFile(), true).isFromPositionStep).toBe(true);
		expect(MediaFile.createMediaFile('ref', imageFile(), false).isFromPositionStep).toBe(false);
	});

	it('übernimmt die Herkunft auch für eine wiederhergestellte Datei', () => {
		expect(MediaFile.fromUploadedFile(uploadedFileInfo(), 'ref', true).isFromPositionStep).toBe(
			true
		);
	});

	it('bleibt ohne Angabe beim Medien-Schritt — Aufrufer ohne Positionsbezug ändern sich nicht', () => {
		expect(MediaFile.fromUploadedFile(uploadedFileInfo(), 'ref').isFromPositionStep).toBe(false);
	});

	/**
	 * Die Zusage gehört dem Konstruktor, nicht den Factories: Ein direkt
	 * erzeugtes `MediaFile` bliebe sonst für immer „in Auswertung" — und ein
	 * Panel, das darauf wartet, dauerhaft stumm.
	 */
	it('setzt das Flag auch bei direkter Konstruktion, ohne Factory', async () => {
		const metadataPromise = Promise.resolve(metadata());
		const mediaFile = new MediaFile(
			'uid-2',
			'foto.jpg',
			'ref',
			new Promise<UploadedFileInfo>(() => {}),
			metadataPromise
		);

		expect(mediaFile.isAnalyzed()).toBe(false);

		await metadataPromise;

		expect(mediaFile.isAnalyzed()).toBe(true);
	});

	/**
	 * Die Auswertung ist auch dann durch, wenn sie gescheitert ist — „fehlgeschlagen"
	 * ist ein Ergebnis, kein Dauerzustand. Bliebe das Flag hier `false`, hinge das
	 * Positions-Panel für immer in `analyzing`: kein GPS-Hinweis, kein Ausweg, keine
	 * Fehlermeldung.
	 *
	 * `metadata` ist eine in den Konstruktor injizierte Promise. Dass der heutige
	 * Aufrufer `analyzeClientFile` übergibt, das jeden Fehler selbst schluckt, ist
	 * deshalb keine Zusicherung dieser Klasse — jeder andere Aufrufer darf eine
	 * ablehnende Promise übergeben.
	 */
	it('setzt das Flag auch, wenn die Metadaten-Auswertung ablehnt', async () => {
		const metadataPromise = Promise.reject(new Error('exif kaputt'));
		const mediaFile = new MediaFile(
			'uid-3',
			'foto.jpg',
			'ref',
			new Promise<UploadedFileInfo>(() => {}),
			metadataPromise
		);

		expect(mediaFile.isAnalyzed()).toBe(false);

		await expect(metadataPromise).rejects.toThrow('exif kaputt');
		// Eine Mikrotask weiter — der Handler des Konstruktors hängt an derselben
		// Promise und läuft direkt nach dem hiesigen `await`.
		await Promise.resolve();

		expect(mediaFile.isAnalyzed()).toBe(true);
	});
});
