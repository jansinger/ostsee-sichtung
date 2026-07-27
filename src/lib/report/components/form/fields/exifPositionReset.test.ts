import { describe, expect, it } from 'vitest';
import { shouldResetExifPosition } from './exifPositionReset';

/**
 * Regressionstest: `DropzoneEnhanced.svelte` behauptete in einem Doc-Kommentar,
 * beim Entfernen des GPS-Fotos würden die daraus abgeleiteten Positionsdaten
 * zurückgesetzt — tatsächlich passierte das nicht (`handleClear`/
 * `handleFileRemoved` setzten `latitude`/`longitude`/`hasPosition` nie zurück).
 *
 * `shouldResetExifPosition` entscheidet, ob ein Reset beim Entfernen des Fotos
 * sicher ist: nur wenn die aktuellen Formular-Koordinaten noch EXAKT den
 * zuletzt aus EXIF übernommenen Werten entsprechen. Hat der Nutzer die Position
 * inzwischen manuell überschrieben (z.B. über die Karte), bleibt sie erhalten.
 */
describe('shouldResetExifPosition', () => {
	it('erlaubt den Reset, wenn die aktuellen Koordinaten noch exakt aus EXIF stammen', () => {
		const applied = { latitude: '54.5000', longitude: '13.2000' };
		expect(shouldResetExifPosition({ latitude: '54.5000', longitude: '13.2000' }, applied)).toBe(
			true
		);
	});

	it('verweigert den Reset, wenn der Nutzer die Breite inzwischen manuell geändert hat', () => {
		const applied = { latitude: '54.5000', longitude: '13.2000' };
		expect(shouldResetExifPosition({ latitude: '55.0000', longitude: '13.2000' }, applied)).toBe(
			false
		);
	});

	it('verweigert den Reset, wenn der Nutzer die Länge inzwischen manuell geändert hat', () => {
		const applied = { latitude: '54.5000', longitude: '13.2000' };
		expect(shouldResetExifPosition({ latitude: '54.5000', longitude: '14.0000' }, applied)).toBe(
			false
		);
	});

	it('verweigert den Reset, wenn noch nie eine EXIF-Position übernommen wurde (null)', () => {
		expect(shouldResetExifPosition({ latitude: '54.5000', longitude: '13.2000' }, null)).toBe(
			false
		);
	});

	it('verweigert den Reset, wenn die Koordinaten inzwischen gelöscht/leer sind', () => {
		const applied = { latitude: '54.5000', longitude: '13.2000' };
		expect(shouldResetExifPosition({ latitude: undefined, longitude: undefined }, applied)).toBe(
			false
		);
	});
});
