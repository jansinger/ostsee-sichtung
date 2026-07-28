import type { BrowserFileMetadata, ExifData, UploadedFileInfo } from '$lib/types';
import { createId } from '@paralleldrive/cuid2';
import { analyzeClientFile } from '$lib/utils/client/fileAnalysis';
import { uploadFileDirect } from '$lib/utils/uploadUtils';

export class MediaFile {
	uid: string;
	referenceId: string;
	file: File | undefined;
	size: number = 0;
	thumbnail: string | undefined;
	fileName: string;
	exifData: ExifData | null | undefined = undefined;
	metadata: Promise<BrowserFileMetadata>;
	uploadedFile: Promise<UploadedFileInfo>;
	isFromPositionStep: boolean = false;
	isUploading: boolean = true;
	isDeleting: boolean = false;
	timestamp: Date | null = null;
	/**
	 * True, sobald die Metadaten-Auswertung durch ist. Nötig, weil `exifData` den
	 * Zustand nicht trägt: Es ist vor der Auswertung `undefined` und danach — bei
	 * einem Bild ganz ohne EXIF — ebenfalls ein leeres Objekt, das man von
	 * „noch nichts gelesen" nicht unterscheiden könnte.
	 */
	analyzed: boolean = false;

	constructor(
		uid: string,
		fileName: string,
		referenceId: string,
		uploadedFile: Promise<UploadedFileInfo>,
		metadata: Promise<BrowserFileMetadata>
	) {
		this.uid = uid;
		this.referenceId = referenceId;
		this.uploadedFile = uploadedFile;
		this.metadata = metadata;
		this.fileName = fileName;
		// Die Zusage „irgendwann ausgewertet" gehört an die injizierte Promise und
		// damit hierher — nicht in die Factories. Sonst bliebe ein direkt
		// konstruiertes MediaFile für immer „in Auswertung" (siehe MediaFile.test.ts).
		//
		// Reihenfolge unkritisch: Dieser Handler läuft vor dem der Factory, die
		// `exifData` setzt. `analyzed` ist ein gewöhnliches Klassenfeld — Svelte
		// proxyt Klasseninstanzen nicht, ein Schreibzugriff darauf weckt also
		// nichts. Das einzige reaktive Signal ist die Neuzuweisung von
		// `mediaStore.mediaFiles` in DropzoneEnhanced, deren Handler zuletzt
		// registriert wird und beide Felder gesetzt vorfindet.
		//
		// Beide Zweige setzen dasselbe Flag: „fehlgeschlagen" ist ein Ergebnis der
		// Auswertung, kein Dauerzustand. Der heutige Aufrufer übergibt
		// `analyzeClientFile`, das jeden Fehler selbst schluckt — aber `metadata`
		// ist ein Konstruktor-Parameter, und was diese Klasse zusichert, darf nicht
		// davon abhängen, wer sie gerade aufruft. Ohne den Rejection-Zweig hinge das
		// Positions-Panel für immer in `analyzing`.
		this.metadata.then(
			() => {
				this.analyzed = true;
			},
			() => {
				this.analyzed = true;
			}
		);
	}

	static createMediaFile(referenceId: string, file: File, isFromPositionStep?: boolean) {
		const uid = createId();
		const mediaFile = new MediaFile(
			uid,
			file.name,
			referenceId,
			uploadFileDirect(file, referenceId, uid),
			analyzeClientFile(file)
		);
		mediaFile.file = file;
		mediaFile.size = file.size;
		mediaFile.isFromPositionStep = isFromPositionStep ?? false;
		mediaFile.metadata.then((data) => {
			mediaFile.exifData = mediaFile.exifData ?? data.exifData;
			mediaFile.thumbnail = mediaFile.thumbnail ?? data.thumbnail;
			mediaFile.timestamp = data.exifData?.dateTimeOriginal ?? null;
		});
		mediaFile.uploadedFile.then((fileInfo) => {
			mediaFile.isUploading = false;
			mediaFile.exifData = mediaFile.exifData ?? fileInfo.exifData;
		});
		return mediaFile;
	}

	/**
	 * Baut eine bereits hochgeladene Datei wieder auf (Wiederherstellung nach
	 * Reload). `isFromPositionStep` muss der Aufrufer mitgeben — `fileInfo` trägt
	 * die Herkunft nicht, und ohne sie fiele die Datei aus der Betrachtung des
	 * Positions-Panels heraus (siehe `positionPanelState.ts`).
	 */
	static fromUploadedFile(
		fileInfo: UploadedFileInfo,
		referenceId: string,
		isFromPositionStep?: boolean
	) {
		const fileName = fileInfo.originalName ?? fileInfo.fileName;
		const mediaFile = new MediaFile(
			fileInfo.uid,
			fileName,
			referenceId,
			Promise.resolve(fileInfo),
			Promise.resolve({
				fileName: fileName,
				size: fileInfo.size,
				mimeType: fileInfo.mimeType,
				exifData: fileInfo.exifData
			})
		);
		const mockFile = new File([''], fileInfo.originalName, {
			type: fileInfo.mimeType
		});

		mediaFile.file = mockFile;
		mediaFile.size = fileInfo.size;
		mediaFile.isFromPositionStep = isFromPositionStep ?? false;
		mediaFile.exifData = fileInfo.exifData as ExifData | null | undefined;
		// Abgesicherte Media-Route statt direktem /uploads-Zugriff (Freigabe-/Admin-Prüfung)
		mediaFile.thumbnail = `/api/media/${fileInfo.filePath}`;
		mediaFile.timestamp = mediaFile.exifData?.dateTimeOriginal
			? new Date(mediaFile.exifData.dateTimeOriginal)
			: null;
		// Wiederhergestellte Datei: Die EXIF-Auswertung liegt bereits hinter uns,
		// `fileInfo` trägt das Ergebnis. Bewusst sofort und zusätzlich zum
		// Konstruktor-Handler — der liefe erst einen Microtask später, in dem die
		// Datei fälschlich als „wird ausgewertet" gälte.
		mediaFile.analyzed = true;
		return mediaFile;
	}

	hasPosition = (): boolean => {
		return !!(this.exifData?.latitude && this.exifData?.longitude);
	};

	/** Siehe `analyzed` — trennt „kein GPS im Foto" von „noch nicht ausgewertet". */
	isAnalyzed = (): boolean => {
		return this.analyzed;
	};
}

export type MediaStore = {
	mediaFiles: MediaFile[];
};
