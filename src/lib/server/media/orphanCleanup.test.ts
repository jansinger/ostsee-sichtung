/**
 * Verwaiste Uploads — Dateien, die hochgeladen, aber nie mit einer
 * abgeschickten Sichtung verknüpft wurden — dürfen nicht dauerhaft liegen
 * bleiben. Sie tragen keine Einwilligung, keinen Zweck und keinen Bezug zu
 * einer Person, über den ein Löschbegehren erfüllbar wäre.
 *
 * Siehe docs/MEDIENEINWILLIGUNG_ANALYSE_2026-07-28.md, Befund B6.
 */
import { describe, expect, it, vi } from 'vitest';
import { ORPHAN_RETENTION_HOURS, cleanupOrphanedFiles, orphanCutoff } from './orphanCleanup';

const NOW = new Date('2026-07-28T12:00:00.000Z');

function orphan(filePath: string) {
	return { filePath, uid: `uid-${filePath}` };
}

describe('orphanCutoff', () => {
	it('liegt die Aufbewahrungsfrist vor dem Bezugszeitpunkt', () => {
		expect(orphanCutoff(NOW, 24)).toEqual(new Date('2026-07-27T12:00:00.000Z'));
	});

	it('nutzt die Standardfrist, wenn keine angegeben ist', () => {
		expect(orphanCutoff(NOW)).toEqual(orphanCutoff(NOW, ORPHAN_RETENTION_HOURS));
	});

	it('gibt eine unangetastete Frist zurück — der Bezugszeitpunkt bleibt unverändert', () => {
		const now = new Date(NOW);
		orphanCutoff(now, 24);
		expect(now).toEqual(NOW);
	});
});

describe('cleanupOrphanedFiles', () => {
	function harness(orphans = [orphan('a.jpg'), orphan('b.jpg')]) {
		const calls: string[] = [];
		return {
			calls,
			listOrphans: vi.fn(async () => orphans),
			deleteFromStorage: vi.fn(async (p: string) => {
				calls.push(`storage:${p}`);
			}),
			deleteRow: vi.fn(async (p: string) => {
				calls.push(`row:${p}`);
			})
		};
	}

	it('fragt genau die Dateien ab, die älter als die Frist sind', async () => {
		const h = harness();
		await cleanupOrphanedFiles({ now: NOW, retentionHours: 24, ...h });

		expect(h.listOrphans).toHaveBeenCalledWith(new Date('2026-07-27T12:00:00.000Z'));
	});

	it('löscht die Datei aus dem Storage, bevor die Zeile verschwindet', async () => {
		// Andersherum wäre der Pfad verloren und die Datei bliebe für immer im
		// Storage liegen — unauffindbar, aber vorhanden.
		const h = harness([orphan('a.jpg')]);
		await cleanupOrphanedFiles({ now: NOW, ...h });

		expect(h.calls).toEqual(['storage:a.jpg', 'row:a.jpg']);
	});

	it('meldet, wie viele Dateien entfernt wurden', async () => {
		const h = harness();
		const result = await cleanupOrphanedFiles({ now: NOW, ...h });

		expect(result).toMatchObject({ deleted: 2, failed: 0 });
	});

	it('macht mit den übrigen Dateien weiter, wenn eine Löschung scheitert', async () => {
		const h = harness([orphan('kaputt.jpg'), orphan('ok.jpg')]);
		h.deleteFromStorage.mockImplementation(async (p: string) => {
			if (p === 'kaputt.jpg') throw new Error('storage weg');
			h.calls.push(`storage:${p}`);
		});

		const result = await cleanupOrphanedFiles({ now: NOW, ...h });

		expect(result).toMatchObject({ deleted: 1, failed: 1 });
		expect(h.calls).toContain('row:ok.jpg');
	});

	it('lässt die Zeile stehen, wenn die Datei nicht aus dem Storage entfernt werden konnte', async () => {
		const h = harness([orphan('kaputt.jpg')]);
		h.deleteFromStorage.mockRejectedValue(new Error('storage weg'));

		await cleanupOrphanedFiles({ now: NOW, ...h });

		expect(h.deleteRow).not.toHaveBeenCalled();
	});

	it('tut nichts, wenn es nichts aufzuräumen gibt', async () => {
		const h = harness([]);
		const result = await cleanupOrphanedFiles({ now: NOW, ...h });

		expect(result).toMatchObject({ deleted: 0, failed: 0 });
		expect(h.deleteFromStorage).not.toHaveBeenCalled();
	});
});
