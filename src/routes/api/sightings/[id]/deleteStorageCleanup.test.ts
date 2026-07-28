/**
 * Regressionstests: Beim Löschen einer Sichtung müssen auch die Dateien im
 * Storage verschwinden.
 *
 * Der Fremdschlüssel `sichtungen_dateien.sichtung_id` hat `onDelete: 'cascade'`
 * — die DB-Zeilen verschwinden also von selbst. Ohne expliziten Storage-Aufruf
 * bleiben die Dateien im Upload-Verzeichnis als verwaiste Objekte zurück.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSchema, mockSelect, mockDelete, mockStorage, callOrder } = vi.hoisted(() => ({
	mockSchema: {
		sightings: { id: 'sichtungen.id' },
		sightingFiles: { sightingId: 'sichtungen_dateien.sichtung_id', filePath: 'datei_pfad' }
	},
	mockSelect: vi.fn(),
	mockDelete: vi.fn(),
	mockStorage: { delete: vi.fn().mockResolvedValue(undefined) },
	callOrder: [] as string[]
}));

vi.mock('$lib/server/db', () => ({
	db: { select: mockSelect, delete: mockDelete }
}));

vi.mock('$lib/server/db/schema', () => mockSchema);

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a, b) => ({ a, b }))
}));

vi.mock('$lib/server/storage/factory', () => ({
	getStorageProvider: vi.fn(() => mockStorage)
}));

vi.mock('$lib/server/auth/auth', () => ({
	requireUserRole: vi.fn()
}));

vi.mock('$lib/server/audit/auditService', () => ({
	logAuditEvent: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/logger.server', () => ({
	createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

vi.mock('$lib/logger', () => ({
	createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

import { DELETE } from './+server';

/**
 * Baut den Select-Mock so, dass die Existenzprüfung eine Sichtung findet und
 * die Datei-Abfrage die übergebenen Pfade liefert.
 */
function mockDbWithFiles(filePaths: string[]) {
	mockSelect.mockImplementation(() => ({
		from: (table: unknown) => ({
			where: () => {
				if (table === mockSchema.sightings) {
					return { limit: () => Promise.resolve([{ id: 123 }]) };
				}
				callOrder.push('select:files');
				return Promise.resolve(filePaths.map((filePath) => ({ filePath })));
			}
		})
	}));

	mockDelete.mockImplementation(() => ({
		where: () => {
			callOrder.push('delete:sighting');
			return Promise.resolve();
		}
	}));
}

function makeEvent(id = '123') {
	return {
		params: { id },
		locals: { user: { email: 'admin@test.com', roles: ['admin'] } },
		url: new URL(`http://localhost/api/sightings/${id}`),
		request: new Request(`http://localhost/api/sightings/${id}`, { method: 'DELETE' }),
		getClientAddress: () => '127.0.0.1'
	} as never;
}

describe('DELETE /api/sightings/[id] — Storage-Aufräumen', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		callOrder.length = 0;
		mockStorage.delete.mockResolvedValue(undefined);
	});

	it('löscht die zugehörigen Dateien aus dem Storage', async () => {
		mockDbWithFiles(['uploads/a.jpg', 'uploads/b.png']);

		const response = await DELETE(makeEvent());

		expect(response.status).toBe(200);
		expect(mockStorage.delete).toHaveBeenCalledTimes(2);
		expect(mockStorage.delete).toHaveBeenCalledWith('uploads/a.jpg');
		expect(mockStorage.delete).toHaveBeenCalledWith('uploads/b.png');
	});

	it('liest die Dateipfade vor dem Löschen der Sichtung und löscht die Dateien danach', async () => {
		mockDbWithFiles(['uploads/a.jpg']);
		mockStorage.delete.mockImplementation(async () => {
			callOrder.push('storage:delete');
		});

		await DELETE(makeEvent());

		expect(callOrder).toEqual(['select:files', 'delete:sighting', 'storage:delete']);
	});

	it('ruft den Storage nicht auf, wenn keine Dateien verknüpft sind', async () => {
		mockDbWithFiles([]);

		await DELETE(makeEvent());

		expect(mockStorage.delete).not.toHaveBeenCalled();
	});

	it('meldet Erfolg, auch wenn eine Datei nicht aus dem Storage entfernt werden kann', async () => {
		mockDbWithFiles(['uploads/a.jpg', 'uploads/b.png']);
		mockStorage.delete.mockRejectedValueOnce(new Error('ENOENT'));

		const response = await DELETE(makeEvent());

		// Die Sichtung ist weg — eine liegengebliebene Datei ist folgenlos, weil
		// keine DB-Zeile mehr auf sie zeigt, und kein Grund für einen 500er.
		expect(response.status).toBe(200);
		expect(mockStorage.delete).toHaveBeenCalledTimes(2);
	});
});
