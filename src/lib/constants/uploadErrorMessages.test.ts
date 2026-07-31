import { describe, expect, it } from 'vitest';
import { UPLOAD_ERROR_MESSAGES } from './upload';
import { MEDIA_FALLBACK_EMAIL } from './contact';

const MB = 1024 * 1024;

describe('UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE', () => {
	it('nennt die tatsächliche Größe, nicht nur die Grenze', () => {
		const message = UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE(
			'wal.mp4',
			100 * MB,
			137 * MB,
			'video/mp4'
		);

		expect(message).toContain('137 MB');
		expect(message).toContain('100 MB');
	});

	it('nennt bei einem Video einen Ausweg samt Adresse', () => {
		const message = UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE(
			'wal.mp4',
			100 * MB,
			137 * MB,
			'video/mp4'
		);

		expect(message).toMatch(/Auflösung|kürzen/);
		expect(message).toContain(MEDIA_FALLBACK_EMAIL);
	});

	it('nennt bei einem Bild keinen Video-Ausweg', () => {
		const message = UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE('wal.jpg', 10 * MB, 14 * MB, 'image/jpeg');

		expect(message).not.toMatch(/Auflösung/);
	});

	it('richtet sich nach dem MIME-Typ, nicht nach der (frei wählbaren) Dateiendung', () => {
		// Bild-Endung, aber Video-MIME-Typ: der Ausweg muss trotzdem erscheinen.
		const videoWithImageName = UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE(
			'wal.jpg',
			100 * MB,
			137 * MB,
			'video/mp4'
		);
		expect(videoWithImageName).toMatch(/Auflösung|kürzen/);

		// Video-Endung, aber Bild-MIME-Typ: der Ausweg darf nicht erscheinen.
		const imageWithVideoName = UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE(
			'wal.mp4',
			10 * MB,
			14 * MB,
			'image/jpeg'
		);
		expect(imageWithVideoName).not.toMatch(/Auflösung/);
	});
});

describe('UPLOAD_ERROR_MESSAGES.INVALID_TYPE', () => {
	it('nennt Formatnamen statt MIME-Typen', () => {
		const message = UPLOAD_ERROR_MESSAGES.INVALID_TYPE('doku.pdf', [
			'image/jpeg',
			'image/png',
			'video/mp4'
		]);

		expect(message).toContain('JPG');
		expect(message).toContain('MP4');
		expect(message).not.toContain('image/jpeg');
	});
});
