import { describe, expect, it } from 'vitest';
import {
	getFileExtension,
	getFileIconName,
	getMimeTypeFromExtension,
	isImageFile,
	isMediaFile,
	isVideoFile
} from './fileType';

describe('fileType', () => {
	describe('isImageFile()', () => {
		it('erkennt JPEG als Bild', () => {
			expect(isImageFile('image/jpeg')).toBe(true);
		});

		it('erkennt PNG als Bild', () => {
			expect(isImageFile('image/png')).toBe(true);
		});

		it('erkennt GIF als Bild', () => {
			expect(isImageFile('image/gif')).toBe(true);
		});

		it('erkennt WebP als Bild', () => {
			expect(isImageFile('image/webp')).toBe(true);
		});

		it('blockiert SVG (nicht erlaubt)', () => {
			expect(isImageFile('image/svg+xml')).toBe(false);
		});

		it('erkennt Video nicht als Bild', () => {
			expect(isImageFile('video/mp4')).toBe(false);
		});

		it('erkennt PDF nicht als Bild', () => {
			expect(isImageFile('application/pdf')).toBe(false);
		});
	});

	describe('isVideoFile()', () => {
		it('erkennt MP4 als Video', () => {
			expect(isVideoFile('video/mp4')).toBe(true);
		});

		it('erkennt WebM als Video', () => {
			expect(isVideoFile('video/webm')).toBe(true);
		});

		it('erkennt AVI als Video', () => {
			expect(isVideoFile('video/avi')).toBe(true);
		});

		it('erkennt Bild nicht als Video', () => {
			expect(isVideoFile('image/jpeg')).toBe(false);
		});
	});

	describe('isMediaFile()', () => {
		it('erkennt Bild als Mediendatei', () => {
			expect(isMediaFile('image/jpeg')).toBe(true);
		});

		it('erkennt Video als Mediendatei', () => {
			expect(isMediaFile('video/mp4')).toBe(true);
		});

		it('erkennt PDF nicht als Mediendatei', () => {
			expect(isMediaFile('application/pdf')).toBe(false);
		});
	});

	describe('getFileIconName()', () => {
		it('gibt Bild-Icon für JPEG zurück', () => {
			expect(getFileIconName('image/jpeg')).toBe('lucide:images');
		});

		it('gibt Video-Icon für MP4 zurück', () => {
			expect(getFileIconName('video/mp4')).toBe('lucide:video');
		});

		it('gibt Text-Icon für PDF zurück', () => {
			expect(getFileIconName('application/pdf')).toBe('lucide:file-text');
		});

		it('gibt Musik-Icon für Audio zurück', () => {
			expect(getFileIconName('audio/mpeg')).toBe('lucide:music');
		});

		it('gibt Text-Icon für Textdateien zurück', () => {
			expect(getFileIconName('text/plain')).toBe('lucide:file-text');
		});

		it('gibt Archiv-Icon für ZIP zurück', () => {
			expect(getFileIconName('application/zip')).toBe('lucide:archive');
		});

		it('gibt generisches Datei-Icon für unbekannte Typen zurück', () => {
			expect(getFileIconName('application/octet-stream')).toBe('lucide:file');
		});
	});

	describe('getFileExtension()', () => {
		it('gibt .jpg für image/jpeg zurück', () => {
			expect(getFileExtension('image/jpeg')).toBe('.jpg');
		});

		it('gibt .png für image/png zurück', () => {
			expect(getFileExtension('image/png')).toBe('.png');
		});

		it('gibt .mp4 für video/mp4 zurück', () => {
			expect(getFileExtension('video/mp4')).toBe('.mp4');
		});

		it('gibt .pdf für application/pdf zurück', () => {
			expect(getFileExtension('application/pdf')).toBe('.pdf');
		});

		it('gibt leeren String für unbekannten MIME-Typ zurück', () => {
			expect(getFileExtension('application/unknown')).toBe('');
		});

		it('extrahiert Erweiterung aus Dateinamen', () => {
			expect(getFileExtension('foto.jpg')).toBe('.jpg');
		});

		it('extrahiert Erweiterung aus Dateinamen mit Punkt in Name', () => {
			expect(getFileExtension('mein.foto.png')).toBe('.png');
		});

		it('gibt leeren String für Dateinamen ohne Erweiterung zurück', () => {
			expect(getFileExtension('dateiohneendung')).toBe('');
		});
	});

	describe('getMimeTypeFromExtension()', () => {
		it('gibt image/jpeg für .jpg zurück', () => {
			expect(getMimeTypeFromExtension('.jpg')).toBe('image/jpeg');
		});

		it('gibt image/jpeg auch für .jpeg zurück', () => {
			expect(getMimeTypeFromExtension('.jpeg')).toBe('image/jpeg');
		});

		it('gibt image/png für .png zurück', () => {
			expect(getMimeTypeFromExtension('.png')).toBe('image/png');
		});

		it('gibt video/mp4 für .mp4 zurück', () => {
			expect(getMimeTypeFromExtension('.mp4')).toBe('video/mp4');
		});

		it('akzeptiert Erweiterung ohne führenden Punkt', () => {
			expect(getMimeTypeFromExtension('jpg')).toBe('image/jpeg');
		});

		it('gibt application/octet-stream für unbekannte Erweiterung zurück', () => {
			expect(getMimeTypeFromExtension('.unknown')).toBe('application/octet-stream');
		});

		it('ist case-insensitive', () => {
			expect(getMimeTypeFromExtension('.JPG')).toBe('image/jpeg');
		});
	});
});
