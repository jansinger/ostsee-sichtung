import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pruefeStartbedingungen, MINDEST_FREI_MB } from './startPruefung.js';

const protokolliere = vi.hoisted(() => vi.fn());
vi.mock('./logger.js', () => ({ protokolliere }));

const store = ({ beschreibbar = true, freiMB = 10_000 } = {}) => ({
	istBeschreibbar: async () => beschreibbar,
	freierPlatzBytes: async () => freiMB * 1024 * 1024
});

beforeEach(() => protokolliere.mockClear());

describe('pruefeStartbedingungen', () => {
	it('wirft mit dem Verzeichnisnamen, wenn nicht geschrieben werden kann', async () => {
		// mkdir(..., { recursive: true }) meldet auf einem vorhandenen, aber
		// nur lesbaren Verzeichnis Erfolg. Ohne diese Prüfung startet der
		// Dienst gesund aussehend und beantwortet jede Sichtung mit 500 —
		// ein Rechtefehler soll beim Deploy auffallen, nicht bei der ersten
		// echten Meldung (Entwurf, Abschnitt 5).
		await expect(
			pruefeStartbedingungen({ store: store({ beschreibbar: false }), datenVerzeichnis: '/daten' })
		).rejects.toThrow(/\/daten/);

		await expect(
			pruefeStartbedingungen({ store: store({ beschreibbar: false }), datenVerzeichnis: '/daten' })
		).rejects.toThrow(/nicht beschreibbar/);
	});

	it('meldet knappen Plattenplatz laut, verhindert den Start aber nicht', async () => {
		// Bei rund 1–2 KB je Umschlag sind 500 MB über 250.000 Sichtungen
		// Vorrat. Auf einer Plesk-Domain mit Kontingent nähme ein Abbruch den
		// Posteingang komplett vom Netz — jede eintreffende Sichtung wäre
		// verloren, ohne dass irgendetwas geschrieben würde. Das ist der
		// größere Bruch des Leitsatzes als der, den die Prüfung verhindert.
		await expect(
			pruefeStartbedingungen({ store: store({ freiMB: 12 }), datenVerzeichnis: '/daten' })
		).resolves.toMatchObject({ freiMB: 12 });

		expect(protokolliere).toHaveBeenCalledWith(
			'fehler',
			'plattenplatz_knapp',
			expect.objectContaining({ frei_mb: 12, schwelle_mb: MINDEST_FREI_MB })
		);
	});

	it('schweigt, wenn Verzeichnis und Platz in Ordnung sind', async () => {
		await expect(
			pruefeStartbedingungen({ store: store(), datenVerzeichnis: '/daten' })
		).resolves.toMatchObject({ freiMB: 10_000 });

		expect(protokolliere).not.toHaveBeenCalled();
	});
});
