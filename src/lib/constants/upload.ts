/**
 * Centralized upload constants and configuration
 * Single source of truth for all upload-related settings
 */

import { MEDIA_FALLBACK_EMAIL } from '$lib/constants/contact';
import { isVideoFile } from '$lib/utils/file/fileType';

// File size limits (in bytes)
export const UPLOAD_LIMITS = {
	/** Maximum file size for regular uploads (50MB) */
	MAX_FILE_SIZE: 50 * 1024 * 1024,

	/** Maximum video file size when no runtime configuration is available (100MB) */
	MAX_VIDEO_FILE_SIZE: 100 * 1024 * 1024,

	/** Maximum file size for GPS photos in position step (10MB) */
	PHOTO_GPS_MAX_SIZE: 10 * 1024 * 1024,

	/** Maximum number of files per upload session */
	MAX_FILES: 20,

	/**
	 * Offline-Fallback für die Gesamtgröße einer Meldung. Im Normalbetrieb
	 * entscheidet `security.maxTotalUploadSize` auf dem Server; dieser Wert
	 * greift nur, solange die Konfiguration nicht geladen ist, und muss
	 * deshalb ≤ deren Vorbelegung bleiben.
	 */
	MAX_TOTAL_SIZE: 250 * 1024 * 1024
} as const;

// Allowed MIME types
export const ALLOWED_MIME_TYPES = {
	IMAGES: [
		'image/jpeg',
		'image/jpg',
		'image/png',
		'image/gif',
		'image/webp',
		'image/bmp'
		// Note: image/svg+xml excluded for security reasons
	],

	// Nur MIME-Typen, die Browser tatsächlich melden. `video/mov`, `video/avi`,
	// `video/mkv`, `video/wmv` und `video/flv` standen hier, kommen aber aus
	// keinem Browser — die richtigen Schreibweisen sind video/quicktime,
	// video/x-msvideo, video/x-matroska, video/x-ms-wmv und video/x-flv.
	VIDEOS: ['video/mp4', 'video/quicktime', 'video/webm', 'video/m4v'],

	get MEDIA() {
		return [...this.IMAGES, ...this.VIDEOS];
	},

	get ALL() {
		return this.MEDIA;
	}
} as const;

// File validation presets for different upload contexts
export const FILE_VALIDATION_PRESETS = {
	/** Standard media upload (images and videos) */
	MEDIA: {
		allowedTypes: ALLOWED_MIME_TYPES.MEDIA,
		maxFileSize: UPLOAD_LIMITS.MAX_FILE_SIZE,
		maxVideoFileSize: UPLOAD_LIMITS.MAX_VIDEO_FILE_SIZE,
		maxFiles: UPLOAD_LIMITS.MAX_FILES,
		accept: 'image/*,video/*'
	},

	/** GPS photo upload (images only, smaller size limit) */
	GPS_PHOTO: {
		allowedTypes: ALLOWED_MIME_TYPES.IMAGES,
		maxFileSize: UPLOAD_LIMITS.PHOTO_GPS_MAX_SIZE,
		maxVideoFileSize: UPLOAD_LIMITS.PHOTO_GPS_MAX_SIZE,
		maxFiles: 1,
		accept: 'image/*'
	},

	/** Images only upload */
	IMAGES_ONLY: {
		allowedTypes: ALLOWED_MIME_TYPES.IMAGES,
		maxFileSize: UPLOAD_LIMITS.MAX_FILE_SIZE,
		maxVideoFileSize: UPLOAD_LIMITS.MAX_FILE_SIZE,
		maxFiles: UPLOAD_LIMITS.MAX_FILES,
		accept: 'image/*'
	}
} as const;

/**
 * "image/jpeg, video/mp4" → "JPG, MP4"
 *
 * Zweite Ableitung von MIME-Typ zu Formatname neben `getFileTypeDescription`
 * (`$lib/utils/validation/fileValidation.ts`) — bewusst, nicht aus Versehen:
 * `fileValidation.ts` importiert bereits Werte aus dieser Datei
 * (`UPLOAD_ERROR_MESSAGES`, `ALLOWED_MIME_TYPES`, `UPLOAD_LIMITS`). Ein
 * Re-Import von `getFileTypeDescription` hier würde daraus einen echten
 * Value-Zyklus machen (nicht nur einen Typ-Zyklus), mit der üblichen Gefahr
 * unfertiger Bindings je nach Modul-Ladereihenfolge. Die Sonderfälle sind
 * deshalb dupliziert, nicht neu erfunden — dieselbe Tabelle wie dort, damit
 * "JPG"/"MOV"/"AVI"/"MKV" für dieselben Eingaben identisch herauskommen
 * (siehe `getFileTypeDescription`-Tests in `fileValidation.test.ts`).
 */
function describeFormats(allowedTypes: readonly string[]): string {
	const FORMAT_NAMES: Record<string, string> = {
		'image/jpeg': 'JPG',
		'video/quicktime': 'MOV',
		'video/x-msvideo': 'AVI',
		'video/x-matroska': 'MKV'
	};

	const names = allowedTypes.map(
		(type) => FORMAT_NAMES[type] ?? type.split('/')[1]?.toUpperCase() ?? type
	);
	return [...new Set(names)].join(', ');
}

// Error messages for upload validation
//
// Die Texte nennen bewusst die IST-Größe und einen Ausweg. „Datei zu groß.
// Maximum: 10MB" sagt dem Melder nicht, wie weit er daneben liegt, und rohe
// MIME-Typen („image/jpeg, image/png") sind für ihn keine Formatangabe.
export const UPLOAD_ERROR_MESSAGES = {
	FILE_TOO_LARGE: (
		fileName: string,
		maxSize: number,
		actualSize: number,
		mimeType: string
	): string => {
		const actualMB = Math.round(actualSize / 1024 / 1024);
		const maxMB = Math.round(maxSize / 1024 / 1024);
		// Der MIME-Typ kommt von der Aufrufstelle, nicht aus dem Dateinamen:
		// Ein „.mov" mit HEVC und ein „.mp4" melden sich unterschiedlich, und
		// eine Endung ist ohnehin frei wählbar.
		const hint = isVideoFile(mimeType)
			? ` Nehmen Sie das Video in geringerer Auflösung auf oder kürzen Sie es — oder senden Sie es an ${MEDIA_FALLBACK_EMAIL}.`
			: '';
		return `${fileName}: zu groß mit ${actualMB} MB (erlaubt sind ${maxMB} MB).${hint}`;
	},

	INVALID_TYPE: (fileName: string, allowedTypes: readonly string[]) =>
		`${fileName}: Dieses Format können wir nicht annehmen. Möglich sind ${describeFormats(allowedTypes)}.`,

	TOO_MANY_FILES: (maxFiles: number) => `Zu viele Dateien. Maximum: ${maxFiles}`,

	TOTAL_SIZE_EXCEEDED: (maxSize: number) =>
		`Gesamtgröße überschritten. Maximum: ${Math.round(maxSize / 1024 / 1024)}MB`,

	EMPTY_FILE: (fileName: string) => `${fileName}: Datei ist leer`,

	INVALID_NAME: (fileName: string) => `${fileName}: Unsicherer Dateiname`,

	NO_FILE: 'Keine Datei ausgewählt',

	UPLOAD_FAILED: 'Upload fehlgeschlagen. Versuchen Sie es erneut.'
} as const;
