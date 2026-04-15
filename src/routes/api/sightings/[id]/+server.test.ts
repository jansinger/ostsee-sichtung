import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external dependencies
vi.mock('$lib/server/auth/auth', () => ({
	requireUserRole: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn(),
		delete: vi.fn()
	}
}));

vi.mock('$lib/server/db/sightingRepository', () => ({
	updateSighting: vi.fn(),
	loadSightingFiles: vi.fn(),
	saveSightingFiles: vi.fn()
}));

vi.mock('$lib/server/audit/auditService', () => ({
	logAuditEvent: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/form/validation/sightingSchema', () => ({
	sightingSchema: {
		validate: vi.fn().mockResolvedValue(undefined)
	}
}));

vi.mock('$lib/logger', () => ({
	createLogger: vi.fn(() => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}))
}));

import { db } from '$lib/server/db';
import { updateSighting } from '$lib/server/db/sightingRepository';
import { logAuditEvent } from '$lib/server/audit/auditService';
import { PUT } from './+server';

/**
 * Erstellt einen minimalen Request-Mock für PUT-Anfragen
 */
function createPutRequest(body: Record<string, unknown>) {
	return {
		json: vi.fn().mockResolvedValue(body),
		headers: {
			get: vi.fn().mockReturnValue(null)
		}
	};
}

/**
 * Erstellt ein minimales Drizzle-förmiges Sichtungs-Objekt (DB-Shape)
 * mit Feldern im englischen Drizzle-Mapping-Format
 */
function createDrizzleSighting(overrides: Record<string, unknown> = {}) {
	return {
		id: 42,
		species: 0,
		totalCount: 1,
		juvenileCount: 0,
		sightingDate: new Date('2024-01-15T00:00:00.000Z'),
		latitude: '54.0',
		longitude: '12.0',
		waterway: null,
		seaMark: null,
		sightingFrom: 0,
		sightingFromText: null,
		distance: 0,
		shipCount: null,
		distribution: 0,
		distributionText: null,
		mediaFile: null,
		mediaUpload: 0,
		behavior: 0,
		behaviorText: null,
		reaction: null,
		otherObservations: null,
		seaState: 0,
		windDirection: null,
		windForce: null,
		visibility: 0,
		shipName: null,
		homePort: null,
		boatType: null,
		boatDrive: 0,
		boatDriveText: null,
		firstName: 'Max',
		lastName: 'Mustermann',
		street: null,
		zipCode: null,
		city: null,
		phone: null,
		fax: null,
		email: 'max@example.com',
		nameConsent: 0,
		shipNameConsent: 0,
		notes: null,
		created: new Date('2024-01-10T00:00:00.000Z'),
		entryChannel: 0,
		approvedAt: null,
		verified: 0,
		inBalticSea: 1,
		internalComment: null,
		location: null,
		inBalticSeaGeo: 1,
		referenceId: 'ref-123',
		isDead: 0,
		deadCondition: null,
		deadGender: null,
		deadSize: null,
		deadPhoneReport: null,
		weatherData: null,
		weatherFetchedAt: null,
		weatherProvider: null,
		weatherApiVersion: null,
		weatherDataType: null,
		...overrides
	};
}

describe('PUT /api/sightings/[id] - changedFields Audit-Diff', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('meldet nur geänderte Felder wenn species sich ändert (Drizzle-Shape Vergleich)', async () => {
		// Arrange: DB-Record vor dem Update (species = 0)
		const currentRecord = createDrizzleSighting({ species: 0 });

		// DB-Record nach dem Update (species = 1)
		const updatedRecord = createDrizzleSighting({ species: 1 });

		// DB-Mock: select() gibt currentRecord zurück
		const mockSelect = {
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue([currentRecord])
				})
			})
		};
		vi.mocked(db.select).mockReturnValue(mockSelect as unknown as ReturnType<typeof db.select>);

		// updateSighting gibt updatedRecord zurück (Drizzle-Shape)
		vi.mocked(updateSighting).mockResolvedValue(
			updatedRecord as unknown as Awaited<ReturnType<typeof updateSighting>>
		);

		// Minimal gültiger SightingFormData Request-Body (camelCase / SightingFormData Shape)
		const requestBody = {
			species: 1,
			totalCount: 1,
			date: '2024-01-15',
			time: '14:00',
			firstName: 'Max',
			lastName: 'Mustermann',
			email: 'max@example.com'
		};

		const mockRequest = createPutRequest(requestBody);
		const mockLocals = { user: { email: 'admin@example.com', roles: ['admin'] } };
		const mockUrl = new URL('http://localhost/api/sightings/42?preview=0');

		// Act
		await PUT({
			params: { id: '42' },
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals,
			url: mockUrl
		} as Parameters<typeof PUT>[0]);

		// Assert: logAuditEvent wurde aufgerufen
		expect(logAuditEvent).toHaveBeenCalled();

		const auditCall = vi.mocked(logAuditEvent).mock.calls[0]?.[0];
		const changedFields: string[] = auditCall?.details?.changedFields as string[];

		// Der Bug: changedFields enthält ALLE Felder weil formData vs currentRecord verglichen wird
		// Nach dem Fix: changedFields enthält NUR 'species'
		expect(changedFields).toContain('species');
		expect(changedFields).not.toContain('totalCount');
		expect(changedFields).not.toContain('sightingDate');
		expect(changedFields).not.toContain('firstName');
		expect(changedFields).not.toContain('lastName');
		expect(changedFields).not.toContain('email');
		expect(changedFields.length).toBe(1);
	});

	it('meldet keine geänderten Felder wenn sich nichts ändert', async () => {
		// Arrange: currentRecord und updatedRecord identisch
		const currentRecord = createDrizzleSighting({ species: 0 });
		const updatedRecord = createDrizzleSighting({ species: 0 });

		const mockSelect = {
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue([currentRecord])
				})
			})
		};
		vi.mocked(db.select).mockReturnValue(mockSelect as unknown as ReturnType<typeof db.select>);
		vi.mocked(updateSighting).mockResolvedValue(
			updatedRecord as unknown as Awaited<ReturnType<typeof updateSighting>>
		);

		const requestBody = {
			species: 0,
			totalCount: 1,
			date: '2024-01-15',
			time: '14:00',
			firstName: 'Max',
			lastName: 'Mustermann',
			email: 'max@example.com'
		};

		const mockRequest = createPutRequest(requestBody);
		const mockLocals = { user: { email: 'admin@example.com', roles: ['admin'] } };
		const mockUrl = new URL('http://localhost/api/sightings/42?preview=0');

		// Act
		await PUT({
			params: { id: '42' },
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals,
			url: mockUrl
		} as Parameters<typeof PUT>[0]);

		// Assert: changedFields ist leer
		expect(logAuditEvent).toHaveBeenCalled();
		const auditCall = vi.mocked(logAuditEvent).mock.calls[0]?.[0];
		const changedFields: string[] = auditCall?.details?.changedFields as string[];

		expect(changedFields.length).toBe(0);
	});
});
