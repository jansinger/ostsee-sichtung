import { BoatDriveEnum } from '$lib/report/formOptions/boatDrive';
import { EntryChannelEnum } from '$lib/report/formOptions/entryChannel';
import { SightingFromEnum } from '$lib/report/formOptions/sightingFrom';
import type { SightingFormData } from '$lib/report/types';
import type { SightingFormValues } from '$lib/types/Form';
import { TEST_TIME_ZONES, withTimeZone } from '$lib/server/datetime/withTimeZone.testutil';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mapFormToSighting } from './mapFormToSighting';

// Mock der Geo-Validierung
vi.mock('../geo/checkBalticSeaFile', () => ({
	checkBalticSeaFile: vi.fn()
}));

// Mock von drizzle-orm sql
vi.mock('drizzle-orm', () => ({
	sql: vi.fn((strings: TemplateStringsArray, ...values: any[]) => ({
		type: 'sql',
		strings,
		values
	}))
}));

import { sql } from 'drizzle-orm';
import { checkBalticSeaFile } from '../geo/checkBalticSeaFile';

describe('mapFormToSighting', () => {
	// Mock für konsistente Zeitzone-Tests
	const originalTimeZone = process.env.TZ;

	beforeEach(() => {
		// Setze Zeitzone für Tests
		process.env.TZ = 'UTC';

		vi.clearAllMocks();
		// Standard-Mock für Baltic Sea Check
		vi.mocked(checkBalticSeaFile).mockReturnValue({
			inBaltic: true,
			inChartArea: true,
			longitude: 13.2,
			latitude: 54.5
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		// Stelle ursprüngliche Zeitzone wieder her
		if (originalTimeZone !== undefined) {
			process.env.TZ = originalTimeZone;
		} else {
			delete process.env.TZ;
		}
	});

	/**
	 * Hilfsfunktion: Erstellt minimale Testdaten
	 */
	const createMinimalFormData = (): SightingFormData => ({
		referenceId: 'test-ref-123',
		uploadedFiles: [],
		hasPosition: true,
		latitude: 54.5,
		longitude: 13.2,
		waterway: undefined,
		seaMark: undefined,
		sightingDate: '2024-01-15',
		sightingTime: undefined,
		species: 0,
		totalCount: 1,
		juvenileCount: 0,
		isDead: false,
		deadCondition: undefined,
		deadSex: undefined,
		deadSize: undefined,
		sightingFrom: 1,
		sightingFromText: undefined,
		distance: 1,
		distribution: 1,
		distributionText: undefined,
		behavior: undefined,
		behaviorText: undefined,
		reaction: undefined,
		seaState: 1,
		visibility: 1,
		windForce: undefined,
		windDirection: undefined,
		mediaUpload: false,
		mediaFile: undefined,
		mediaConsent: false,
		shipName: undefined,
		homePort: undefined,
		boatType: undefined,
		shipCount: undefined,
		boatDrive: 1,
		boatDriveText: undefined,
		firstName: 'Test',
		lastName: 'User',
		email: 'test@example.com',
		phone: undefined,
		street: undefined,
		zipCode: undefined,
		city: undefined,
		shipNameConsent: false,
		nameConsent: false,
		privacyConsent: false,
		persistentDataConsent: false,
		entryChannel: 0,
		verified: false,
		deadPhoneContact: false,
		notes: undefined,
		otherObservations: undefined
	});

	/**
	 * Hilfsfunktion: Erstellt vollständige Testdaten
	 */
	const createCompleteFormData = (): SightingFormData => ({
		referenceId: 'test-ref-456',
		uploadedFiles: [
			{
				uid: 'file1-uid',
				originalName: 'file1.jpg',
				filePath: '/uploads/file1.jpg',
				mimeType: 'image/jpeg',
				size: 1024,
				fileName: 'file1.jpg',
				url: 'https://example.com/file1.jpg',
				uploadedAt: '2024-01-15T14:30:00Z',
				exifData: null
			},
			{
				uid: 'file2-uid',
				originalName: 'file2.jpg',
				filePath: '/uploads/file2.jpg',
				mimeType: 'image/jpeg',
				size: 2048,
				fileName: 'file2.jpg',
				url: 'https://example.com/file2.jpg',
				uploadedAt: '2024-01-15T14:30:00Z',
				exifData: null
			}
		],
		hasPosition: true,
		latitude: 54.5,
		longitude: 13.2,
		waterway: 'Greifswalder Bodden',
		seaMark: 'Leuchtturm Warnemünde',
		sightingDate: '2024-01-15',
		sightingTime: '14:30',
		species: 1,
		totalCount: 3,
		juvenileCount: 1,
		isDead: false,
		deadCondition: undefined,
		deadSex: undefined,
		deadSize: undefined,
		sightingFrom: 2,
		sightingFromText: 'Segelboot',
		distance: 3,
		distribution: 1,
		distributionText: 'Gruppe schwimmend',
		behavior: 2,
		behaviorText: 'Spielverhalten',
		reaction: 'Neugierig',
		seaState: 2,
		visibility: 3,
		windForce: undefined,
		windDirection: 'NW',
		mediaUpload: true,
		mediaFile: 'https://example.com/photo.jpg',
		mediaConsent: true,
		shipName: 'Meeresforschung I',
		homePort: 'Rostock',
		boatType: 'Segelboot',
		shipCount: 2,
		boatDrive: 1,
		boatDriveText: 'Elektromotor',
		firstName: 'Max',
		lastName: 'Mustermann',
		email: 'max@example.com',
		phone: '+49 123 456789',
		street: 'Musterstraße 1',
		zipCode: '18055',
		city: 'Rostock',
		shipNameConsent: true,
		nameConsent: true,
		privacyConsent: true,
		persistentDataConsent: true,
		entryChannel: 0,
		verified: false,
		deadPhoneContact: false,
		notes: 'Admin-Notiz',
		otherObservations: 'Weitere Beobachtungen'
	});

	describe('Grundfunktionalität', () => {
		it('sollte minimale Formulardaten korrekt konvertieren', () => {
			const formData = createMinimalFormData();
			const result = mapFormToSighting(formData);

			// Basis-Felder prüfen
			expect(result.referenceId).toBe('test-ref-123');
			expect(result.created).toBeDefined();
			expect(new Date(result.created)).toBeInstanceOf(Date);

			// Standardwerte prüfen
			expect(result.entryChannel).toBe(Number(EntryChannelEnum.WEB));
			expect(result.verified).toBe(0);
			expect(result.mediaUpload).toBe(0); // Keine Dateien hochgeladen
			expect(result.isDead).toBe(0);
			expect(result.shipNameConsent).toBe(0);
			expect(result.nameConsent).toBe(0);
			expect(result.privacyConsent).toBe(0);
			expect(result.deadPhoneContact).toBe(0);
		});

		it('sollte vollständige Formulardaten korrekt konvertieren', () => {
			const formData = createCompleteFormData();
			const result = mapFormToSighting(formData);

			// Metadaten
			expect(result.referenceId).toBe('test-ref-456');
			expect(result.created).toBeDefined();

			// Geografische Daten
			expect(result.latitude).toBe('54.5');
			expect(result.longitude).toBe('13.2');
			expect(result.waterway).toBe('Greifswalder Bodden');
			expect(result.seaMark).toBe('Leuchtturm Warnemünde');

			// Tierbeobachtung
			expect(result.species).toBe(1);
			expect(result.totalCount).toBe(3);
			expect(result.juvenileCount).toBe(1);

			// Umweltbedingungen
			expect(result.seaState).toBe(2);
			expect(result.visibility).toBe(3);
			expect(result.windForce).toBeNull();
			expect(result.windDirection).toBe('NW');

			// Kontaktdaten
			expect(result.firstName).toBe('Max');
			expect(result.lastName).toBe('Mustermann');
			expect(result.email).toBe('max@example.com');

			// Einwilligungen (boolean zu int)
			expect(result.shipNameConsent).toBe(1);
			expect(result.nameConsent).toBe(1);
			expect(result.privacyConsent).toBe(1);

			// Medien
			expect(result.mediaUpload).toBe(1); // Dateien vorhanden
			expect(result.mediaFile).toBe('https://example.com/photo.jpg');
		});
	});

	describe('Geografische Verarbeitung', () => {
		it('sollte PostGIS-Geometrie für gültige Koordinaten erstellen', () => {
			const formData = createMinimalFormData();
			formData.latitude = 54.5;
			formData.longitude = 13.2;

			const result = mapFormToSighting(formData);

			// PostGIS SQL sollte aufgerufen werden
			expect(sql).toHaveBeenCalledWith(
				expect.arrayContaining(['ST_SetSRID(ST_MakePoint(', ', ', '), 4326)']),
				13.2,
				54.5
			);
			expect(result.location).toBeDefined();
			expect(result.latitude).toBe('54.5');
			expect(result.longitude).toBe('13.2');
		});

		it('sollte Baltic Sea Validierung für gültige Koordinaten durchführen', () => {
			const formData = createMinimalFormData();
			formData.latitude = 54.5;
			formData.longitude = 13.2;

			vi.mocked(checkBalticSeaFile).mockReturnValue({
				inBaltic: true,
				inChartArea: false,
				longitude: 13.2,
				latitude: 54.5
			});

			const result = mapFormToSighting(formData);

			expect(checkBalticSeaFile).toHaveBeenCalledWith(13.2, 54.5);
			expect(result.inBalticSea).toBe(1);
			expect(result.inBalticSeaGeo).toBe(0);
		});

		it('sollte ungültige Koordinaten ignorieren', () => {
			const formData = createMinimalFormData();
			formData.latitude = NaN;
			formData.longitude = 13.2;

			const result = mapFormToSighting(formData);

			// Die Funktion prüft isNaN(), daher wird location null
			// formData.latitude ist NaN, formData.latitude ? String(formData.latitude) : null -> null
			expect(result.location).toBeNull();
			expect(result.latitude).toBeNull(); // NaN ist falsy, daher null
			expect(result.longitude).toBe('13.2');
			expect(result.inBalticSea).toBe(0);
			expect(result.inBalticSeaGeo).toBe(0);
			expect(checkBalticSeaFile).not.toHaveBeenCalled();
		});

		it('sollte fehlende Koordinaten handhaben', () => {
			const formData = createMinimalFormData();
			// latitude und longitude explizit auf null setzen
			formData.latitude = null as any;
			formData.longitude = null as any;

			const result = mapFormToSighting(formData);

			expect(result.location).toBeNull();
			expect(result.latitude).toBeNull();
			expect(result.longitude).toBeNull();
			expect(checkBalticSeaFile).not.toHaveBeenCalled();
		});
	});

	describe('Datum/Zeit-Verarbeitung', () => {
		it('sollte Datum und Zeit korrekt kombinieren', () => {
			const formData = createMinimalFormData();
			formData.sightingDate = '2024-01-15';
			formData.sightingTime = '14:30';

			const result = mapFormToSighting(formData);
			const parsedDate = new Date(result.sightingDate);

			// correctCestOffsetUTC zieht 1h ab (Januar = CET = UTC+1),
			// sodass 14:30 Ortszeit als 13:30 UTC gespeichert wird.
			// UTC-Accessor verwenden, damit der Test timezone-unabhängig läuft.
			expect(parsedDate.getUTCFullYear()).toBe(2024);
			expect(parsedDate.getUTCMonth()).toBe(0); // Januar = 0
			expect(parsedDate.getUTCDate()).toBe(15);
			expect(parsedDate.getUTCHours()).toBe(13);
			expect(parsedDate.getUTCMinutes()).toBe(30);
			expect(parsedDate.getUTCSeconds()).toBe(0);
		});

		it('sollte nur Datum verwenden wenn Zeit fehlt', () => {
			const formData = createMinimalFormData();
			formData.sightingDate = '2024-01-15';
			// sightingTime bleibt null

			const result = mapFormToSighting(formData);

			// Sollte aktuelles Datum verwenden, da Zeit fehlt
			const now = new Date(formData.sightingDate);
			const parsedDate = new Date(result.sightingDate);

			// Prüfe dass es das aktuelle Datum ist (grober Check)
			expect(Math.abs(parsedDate.getTime() - now.getTime())).toBeLessThan(2 * 60 * 60 * 1000 + 100); // 2 Stunden Toleranz
		});

		it('sollte aktuelles Datum verwenden wenn beides fehlt', () => {
			const formData = createMinimalFormData();
			formData.sightingDate = '';
			formData.sightingTime = undefined;

			const result = mapFormToSighting(formData);

			const now = new Date();
			const parsedDate = new Date(result.sightingDate);

			expect(Math.abs(parsedDate.getTime() - now.getTime())).toBeLessThan(2 * 60 * 60 * 1000 + 100);
		});

		it('sollte ungültiges Zeitformat robust behandeln', () => {
			const formData = createMinimalFormData();
			formData.sightingDate = '2024-01-15';
			formData.sightingTime = 'invalid-time';

			const result = mapFormToSighting(formData);

			// Ungültiges Zeitformat passt nicht auf /^\d{2}:\d{2}$/ →
			// combineToDate gibt midnight UTC zurück (new Date('2024-01-15') = 2024-01-15T00:00:00Z).
			// correctCestOffsetUTC zieht 1h ab (Januar = CET) → 2024-01-14T23:00:00Z.
			// UTC-Accessor verwenden für timezone-unabhängige Prüfung.
			const parsedDate = new Date(result.sightingDate);
			expect(parsedDate.getUTCDate()).toBe(14); // Überlauf auf Vortag durch CET-Korrektur
			expect(parsedDate.getUTCHours()).toBe(23); // midnight - 1h = 23:00 UTC
			expect(parsedDate.getUTCMinutes()).toBe(0);
		});
	});

	describe('Zeitzonen-Robustheit (K1)', () => {
		it('ignoriert ein mitgeschicktes sightingDatetime und kombiniert Sommerzeit selbst', () => {
			const formData = createMinimalFormData();
			formData.sightingDate = '2026-07-15';
			formData.sightingTime = '14:30';
			// Ein Client könnte (mit seiner eigenen Zeitzone) einen abweichenden
			// Instant mitschicken — der Server darf ihn nicht übernehmen.
			(formData as Record<string, unknown>).sightingDatetime = new Date('2026-07-15T20:30:00.000Z');

			const result = mapFormToSighting(formData as SightingFormValues);

			// Berlin ist im Juli MESZ (UTC+2): 14:30 Wanduhr → 12:30 UTC
			expect(new Date(result.sightingDate).toISOString()).toBe('2026-07-15T12:30:00.000Z');
		});

		it('ignoriert ein mitgeschicktes sightingDatetime und kombiniert Winterzeit selbst', () => {
			const formData = createMinimalFormData();
			formData.sightingDate = '2026-01-15';
			formData.sightingTime = '14:30';
			(formData as Record<string, unknown>).sightingDatetime = new Date('2026-01-15T20:30:00.000Z');

			const result = mapFormToSighting(formData as SightingFormValues);

			// Berlin ist im Januar MEZ (UTC+1): 14:30 Wanduhr → 13:30 UTC
			expect(new Date(result.sightingDate).toISOString()).toBe('2026-01-15T13:30:00.000Z');
		});

		it('liefert in jeder Prozess-Zeitzone denselben Instant', () => {
			const results = TEST_TIME_ZONES.map((timeZone) =>
				withTimeZone(timeZone, () => {
					const formData = createMinimalFormData();
					formData.sightingDate = '2026-07-15';
					formData.sightingTime = '14:30';
					return new Date(mapFormToSighting(formData).sightingDate).toISOString();
				})
			);

			expect(results).toEqual(TEST_TIME_ZONES.map(() => '2026-07-15T12:30:00.000Z'));
		});
	});

	describe('String-zu-Number-Konvertierungen', () => {
		it('sollte numerische Strings korrekt konvertieren', () => {
			const formData = createMinimalFormData();
			formData.species = 5;
			formData.totalCount = 12;
			formData.juvenileCount = 3;
			formData.distance = 2;
			formData.seaState = 4;
			formData.visibility = 1;

			const result = mapFormToSighting(formData);

			expect(result.species).toBe(5);
			expect(result.totalCount).toBe(12);
			expect(result.juvenileCount).toBe(3);
			expect(result.distance).toBe(2);
			expect(result.seaState).toBe(4);
			expect(result.visibility).toBe(1);
		});

		it('sollte leere Strings als 0 behandeln', () => {
			const formData = createMinimalFormData();
			formData.species = 0;
			formData.totalCount = 0;

			const result = mapFormToSighting(formData);

			expect(result.species).toBe(0);
			expect(result.totalCount).toBe(0);
		});

		it('sollte ungültige numerische Werte korrekt behandeln', () => {
			const formData = createMinimalFormData();
			formData.species = NaN;
			formData.totalCount = NaN;

			const result = mapFormToSighting(formData);

			// NaN wird zu 0 konvertiert (da isNaN(NaN) || 0 = 0)
			expect(result.species).toBe(0);
			expect(result.totalCount).toBe(0);
		});
	});

	describe('Boolean-zu-Integer-Konvertierungen', () => {
		it('sollte true-Werte zu 1 konvertieren', () => {
			const formData = createMinimalFormData();
			formData.isDead = true;
			formData.shipNameConsent = true;
			formData.nameConsent = true;
			formData.privacyConsent = true;
			formData.verified = true;
			formData.deadPhoneContact = true;

			const result = mapFormToSighting(formData);

			expect(result.isDead).toBe(1);
			expect(result.shipNameConsent).toBe(1);
			expect(result.nameConsent).toBe(1);
			expect(result.privacyConsent).toBe(1);
			expect(result.verified).toBe(1);
			expect(result.deadPhoneContact).toBe(1);
		});

		it('sollte false-Werte zu 0 konvertieren', () => {
			const formData = createMinimalFormData();
			// Alle boolean-Felder sind bereits false in createMinimalFormData

			const result = mapFormToSighting(formData);

			expect(result.isDead).toBe(0);
			expect(result.shipNameConsent).toBe(0);
			expect(result.nameConsent).toBe(0);
			expect(result.privacyConsent).toBe(0);
			expect(result.verified).toBe(0);
			expect(result.deadPhoneContact).toBe(0);
		});
	});

	describe('Media-Upload-Behandlung', () => {
		it('sollte mediaUpload=1 setzen wenn Dateien vorhanden', () => {
			const formData = { ...createMinimalFormData(), mediaUpload: true };
			formData.uploadedFiles = [
				{
					uid: 'file1-uid',
					originalName: 'file1.jpg',
					filePath: '/uploads/file1.jpg',
					mimeType: 'image/jpeg',
					size: 1024,
					fileName: 'file1.jpg',
					url: 'https://example.com/file1.jpg',
					uploadedAt: '2024-01-15T14:30:00Z',
					exifData: null
				}
			];

			const result = mapFormToSighting(formData);

			expect(result.mediaUpload).toBe(1);
		});

		it('sollte mediaUpload=0 setzen wenn keine Dateien vorhanden', () => {
			const formData = createMinimalFormData();
			formData.uploadedFiles = [];

			const result = mapFormToSighting(formData);

			expect(result.mediaUpload).toBe(0);
		});
	});

	describe('Totfund-Spezifische Felder', () => {
		it('sollte Totfund-Felder korrekt behandeln', () => {
			const formData = createMinimalFormData();
			formData.isDead = true;
			formData.deadCondition = 2;
			formData.deadSex = 1;
			formData.deadSize = 150;
			formData.deadPhoneContact = true;

			const result = mapFormToSighting(formData);

			expect(result.isDead).toBe(1);
			expect(result.deadCondition).toBe(2);
			expect(result.deadSex).toBe(1);
			expect(result.deadSize).toBe(150);
			expect(result.deadPhoneContact).toBe(1);
		});

		it('sollte null-Werte bei Totfund-Feldern handhaben', () => {
			const formData = createMinimalFormData();
			formData.isDead = true;
			// Andere Totfund-Felder bleiben null

			const result = mapFormToSighting(formData);

			expect(result.isDead).toBe(1);
			expect(result.deadCondition).toBe(0);
			expect(result.deadSex).toBe(0);
			expect(result.deadSize).toBeNull(); // deadSize kann null sein
		});
	});

	describe('Entry Channel Standard', () => {
		it('sollte Standard Entry Channel setzen wenn nicht angegeben', () => {
			const formData = createMinimalFormData();
			// entryChannel bleibt null

			const result = mapFormToSighting(formData);

			expect(result.entryChannel).toBe(Number(EntryChannelEnum.WEB));
		});

		it('sollte angegebenen Entry Channel verwenden', () => {
			const formData = createMinimalFormData();
			formData.entryChannel = 2; // Mobile App

			const result = mapFormToSighting(formData);

			expect(result.entryChannel).toBe(2);
		});
	});

	describe('Edge Cases und Robustheit', () => {
		it('sollte sehr große Zahlen handhaben', () => {
			const formData = createMinimalFormData();
			formData.totalCount = 999999;
			formData.shipCount = 50;

			const result = mapFormToSighting(formData);

			expect(result.totalCount).toBe(999999);
			expect(result.shipCount).toBe(50);
		});

		it('sollte leere Strings als null behandeln für optionale Felder', () => {
			const formData = createMinimalFormData();
			formData.waterway = '';
			formData.firstName = '';
			formData.notes = '';

			const result = mapFormToSighting(formData);

			expect(result.waterway).toBe('');
			expect(result.firstName).toBe('');
			expect(result.notes).toBe('');
		});

		it('sollte Sonderzeichen in Text-Feldern handhaben', () => {
			const formData = createMinimalFormData();
			formData.behaviorText = 'Äöü ß & < > " \' 🐋';
			formData.otherObservations = 'Line 1\\nLine 2\\tTabbed';

			const result = mapFormToSighting(formData);

			expect(result.behaviorText).toBe('Äöü ß & < > " \' 🐋');
			expect(result.otherObservations).toBe('Line 1\\nLine 2\\tTabbed');
		});
	});

	describe('Bootsantrieb bei Land-Sichtungen', () => {
		/**
		 * Die Spalte `bootsantrieb` ist `integer default(0) notNull` und `0`
		 * bedeutet "Sonstiger Bootsantrieb". Ohne expliziten Wert trug jede
		 * Land-Sichtung damit die aktive Behauptung, es habe ein Boot mit
		 * ungewöhnlichem Antrieb gegeben. `NONE` macht "kein Boot" eindeutig.
		 */
		it('speichert NONE statt OTHER, wenn von Land beobachtet wurde', () => {
			const formData = createMinimalFormData();
			formData.sightingFrom = SightingFromEnum.LAND;
			formData.boatDrive = undefined;

			const result = mapFormToSighting(formData);

			expect(result.boatDrive).toBe(BoatDriveEnum.NONE);
			expect(result.boatDrive).not.toBe(BoatDriveEnum.OTHER);
		});

		it('speichert NONE auch, wenn sightingFrom als String ankommt (HTML-Select)', () => {
			const formData = createMinimalFormData();
			formData.sightingFrom = String(SightingFromEnum.LAND) as unknown as number;
			formData.boatDrive = undefined;

			const result = mapFormToSighting(formData);

			expect(result.boatDrive).toBe(BoatDriveEnum.NONE);
		});

		it('überschreibt einen vorhandenen Antrieb bei Land NICHT', () => {
			// Admin-Edit einer Alt-Sichtung: der gespeicherte Wert darf nicht
			// still verloren gehen (76 solcher Zeilen im Bestand).
			const formData = createMinimalFormData();
			formData.sightingFrom = SightingFromEnum.LAND;
			formData.boatDrive = BoatDriveEnum.ANCHORED;

			const result = mapFormToSighting(formData);

			expect(result.boatDrive).toBe(BoatDriveEnum.ANCHORED);
		});

		it('lässt Boot-Sichtungen unverändert bei OTHER, wenn nichts gewählt wurde', () => {
			// Bei Segelschiff/Motorboot ist der Antrieb Pflicht; fehlt er
			// trotzdem, bleibt es beim bisherigen Verhalten (0 = Sonstiger).
			const formData = createMinimalFormData();
			formData.sightingFrom = SightingFromEnum.SAILBOAT;
			formData.boatDrive = undefined;

			const result = mapFormToSighting(formData);

			expect(result.boatDrive).toBe(BoatDriveEnum.OTHER);
		});

		it('lässt Fähre und Sonstiges unverändert (dort ist ein Boot im Spiel)', () => {
			for (const from of [SightingFromEnum.FERRY, SightingFromEnum.OTHER]) {
				const formData = createMinimalFormData();
				formData.sightingFrom = from;
				formData.boatDrive = undefined;

				expect(mapFormToSighting(formData).boatDrive).toBe(BoatDriveEnum.OTHER);
			}
		});

		it('erhält eine explizite Auswahl "Sonstiger Antrieb" auf einem Boot', () => {
			const formData = createMinimalFormData();
			formData.sightingFrom = SightingFromEnum.MOTORBOAT;
			formData.boatDrive = BoatDriveEnum.OTHER;

			expect(mapFormToSighting(formData).boatDrive).toBe(BoatDriveEnum.OTHER);
		});
	});

	describe('Beobachtungsort ohne Angabe', () => {
		/**
		 * `vonwo` ist `integer default(0) notNull` und `0` bedeutet "Sonstiges"
		 * — eine echte Kategorie. Ohne Angabe entstand bisher trotzdem eine `0`
		 * und damit eine Antwort, die nie gegeben wurde.
		 */
		it('speichert UNKNOWN, wenn nichts angegeben wurde', () => {
			const formData = createMinimalFormData();
			formData.sightingFrom = undefined as unknown as number;

			expect(mapFormToSighting(formData).sightingFrom).toBe(SightingFromEnum.UNKNOWN);
		});

		it('speichert UNKNOWN auch bei null', () => {
			const formData = createMinimalFormData();
			formData.sightingFrom = null as unknown as number;

			expect(mapFormToSighting(formData).sightingFrom).toBe(SightingFromEnum.UNKNOWN);
		});

		it('speichert UNKNOWN bei leerem String (Select ohne Auswahl)', () => {
			const formData = createMinimalFormData();
			formData.sightingFrom = '' as unknown as number;

			expect(mapFormToSighting(formData).sightingFrom).toBe(SightingFromEnum.UNKNOWN);
		});

		it('erhält eine aktive Auswahl "Sonstiges" (0) — das ist keine fehlende Angabe', () => {
			const formData = createMinimalFormData();
			formData.sightingFrom = SightingFromEnum.OTHER;

			expect(mapFormToSighting(formData).sightingFrom).toBe(SightingFromEnum.OTHER);
		});

		it('reicht alle übrigen Werte unverändert durch, auch als String', () => {
			for (const from of [
				SightingFromEnum.SAILBOAT,
				SightingFromEnum.MOTORBOAT,
				SightingFromEnum.LAND,
				SightingFromEnum.FERRY
			]) {
				const numeric = createMinimalFormData();
				numeric.sightingFrom = from;
				expect(mapFormToSighting(numeric).sightingFrom).toBe(from);

				const asString = createMinimalFormData();
				asString.sightingFrom = String(from) as unknown as number;
				expect(mapFormToSighting(asString).sightingFrom).toBe(from);
			}
		});
	});

	describe('Integration mit checkBalticSeaFile', () => {
		it('sollte verschiedene Baltic Sea Validierungsergebnisse handhaben', () => {
			const testCases = [
				{ inBaltic: true, inChartArea: true, expectedBaltic: 1, expectedGeo: 1 },
				{ inBaltic: true, inChartArea: false, expectedBaltic: 1, expectedGeo: 0 },
				{ inBaltic: false, inChartArea: true, expectedBaltic: 0, expectedGeo: 1 },
				{ inBaltic: false, inChartArea: false, expectedBaltic: 0, expectedGeo: 0 }
			];

			testCases.forEach(({ inBaltic, inChartArea, expectedBaltic, expectedGeo }) => {
				vi.mocked(checkBalticSeaFile).mockReturnValue({
					inBaltic,
					inChartArea,
					longitude: 13.2,
					latitude: 54.5
				});

				const formData = createMinimalFormData();
				formData.latitude = 54.5;
				formData.longitude = 13.2;

				const result = mapFormToSighting(formData);

				expect(result.inBalticSea).toBe(expectedBaltic);
				expect(result.inBalticSeaGeo).toBe(expectedGeo);
			});
		});
	});
});
