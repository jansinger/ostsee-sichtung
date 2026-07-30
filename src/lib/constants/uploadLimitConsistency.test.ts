/**
 * Die öffentliche Upload-Konfiguration und das serverseitige Limit für anonyme
 * Uploads müssen denselben Wert nennen.
 *
 * `uploadDefaults.ts` formuliert diese Invariante selbst: Weichen die Werte ab,
 * akzeptiert die Dropzone Dateien, die der Server anschließend mit 413 ablehnt.
 * Genau das war der Fall — Client 10 MB, Server 5 MB.
 *
 * Siehe docs/archive/MEDIENEINWILLIGUNG_ANALYSE_2026-07-28.md, Abschnitt 9.1.
 */
import { describe, expect, it } from 'vitest';
import {
	ANONYMOUS_UPLOAD_MAX_SIZE_BYTES,
	PUBLIC_UPLOAD_MAX_FILE_SIZE_BYTES
} from './uploadDefaults';

describe('Upload-Grenzen', () => {
	it('verspricht anonymen Meldern nicht mehr, als der Server annimmt', () => {
		expect(PUBLIC_UPLOAD_MAX_FILE_SIZE_BYTES).toBeLessThanOrEqual(ANONYMOUS_UPLOAD_MAX_SIZE_BYTES);
	});

	it('hält die beiden Werte in einer einzigen Quelle zusammen', () => {
		expect(ANONYMOUS_UPLOAD_MAX_SIZE_BYTES).toBe(PUBLIC_UPLOAD_MAX_FILE_SIZE_BYTES);
	});
});
