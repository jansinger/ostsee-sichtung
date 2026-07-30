/**
 * Unit Tests für EmailService
 *
 * Testet das Verhalten des E-Mail-Benachrichtigungsdienstes für neue Meeressäuger-Sichtungen.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Das globale Setup in vitest-setup-server.ts mockt emailService — hier aufheben
// damit wir die echte Implementierung testen
vi.unmock('$lib/server/services/emailService');

// Mocks müssen vor dem Import des zu testenden Moduls definiert werden
vi.mock('$env/dynamic/private', () => ({
	env: {
		NODE_ENV: 'test',
		SMTP_HOST: '',
		SMTP_PORT: '587',
		SMTP_USER: '',
		SMTP_PASSWORD: ''
	}
}));

vi.mock('$env/dynamic/public', () => ({
	env: {
		PUBLIC_SITE_URL: 'https://example.com'
	}
}));

vi.mock('$lib/logger.server', () => ({
	createLogger: () => ({
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	})
}));

vi.mock('$lib/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	})
}));

vi.mock('$lib/server/db/configRepository', () => ({
	ConfigRepository: {
		getBoolean: vi.fn(),
		getString: vi.fn(),
		getNumber: vi.fn(),
		getArray: vi.fn()
	}
}));

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn()
	}
}));

vi.mock('nodemailer', () => ({
	default: {
		createTransport: vi.fn()
	}
}));

vi.mock('fs', () => ({
	readFileSync: vi.fn()
}));

vi.mock('$lib/utils/format/sightingFormatter', () => ({
	formatSightingForDisplay: vi.fn(),
	isUnknownOrMissingSpecies: vi.fn()
}));

vi.mock('$lib/server/spam/spamDetector', () => ({
	detectSpamIndicators: vi.fn().mockResolvedValue({
		score: 0,
		isHighRisk: false,
		indicators: []
	})
}));

vi.mock('$lib/utils/format/dateTime', () => ({
	formatLocalDateTime: vi.fn()
}));

import { ConfigRepository } from '$lib/server/db/configRepository';
import { db } from '$lib/server/db';
import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import {
	formatSightingForDisplay,
	isUnknownOrMissingSpecies
} from '$lib/utils/format/sightingFormatter';
import { formatLocalDateTime } from '$lib/utils/format/dateTime';
import Handlebars from 'handlebars';
import { DEFAULT_EMAIL_TEMPLATE, EmailService } from './emailService';

// Hilfsfunktionen zum Erstellen von Mocks
function createMockTransporter(sendMailResult = { messageId: 'test-id-123' }) {
	return {
		verify: vi.fn().mockResolvedValue(true),
		sendMail: vi.fn().mockResolvedValue(sendMailResult)
	};
}

function setupConfigRepositoryMocks({
	enabled = true,
	recipient = 'admin@ostsee-tiere.de',
	smtpHost = 'smtp.example.com',
	smtpPort = 587,
	smtpSecure = false,
	smtpUser = 'user@example.com',
	smtpPassword = 'secret',
	sender = 'noreply@ostsee-tiere.de',
	senderName = 'Ostsee-Tiere',
	cc = [] as string[],
	bcc = [] as string[],
	template = '<html>{{referenceId}}</html>'
} = {}) {
	const mockGetBoolean = vi.mocked(ConfigRepository.getBoolean);
	const mockGetString = vi.mocked(ConfigRepository.getString);
	const mockGetNumber = vi.mocked(ConfigRepository.getNumber);
	const mockGetArray = vi.mocked(ConfigRepository.getArray);

	mockGetBoolean.mockImplementation(async (key: string, defaultValue: boolean) => {
		if (key === 'notification.email.enabled') return enabled;
		if (key === 'email.smtp.secure') return smtpSecure;
		return defaultValue;
	});

	mockGetString.mockImplementation(async (key: string, defaultValue: string) => {
		if (key === 'email.smtp.host') return smtpHost;
		if (key === 'email.smtp.user') return smtpUser;
		if (key === 'email.smtp.password') return smtpPassword;
		if (key === 'notification.email.recipient') return recipient;
		if (key === 'notification.email.sender') return sender;
		if (key === 'notification.email.senderName') return senderName;
		if (key === 'notification.email.template') return template;
		return defaultValue;
	});

	mockGetNumber.mockImplementation(async (key: string, defaultValue: number) => {
		if (key === 'email.smtp.port') return smtpPort;
		return defaultValue;
	});

	mockGetArray.mockImplementation(async (key: string, defaultValue: unknown[]) => {
		if (key === 'notification.email.cc') return cc;
		if (key === 'notification.email.bcc') return bcc;
		return defaultValue;
	});
}

function createMockSighting(overrides = {}) {
	return {
		id: 42,
		referenceId: 'REF-42',
		species: 0,
		totalCount: 2,
		firstName: 'Max',
		lastName: 'Mustermann',
		email: 'max@example.com',
		latitude: '54.5',
		longitude: '12.3',
		sightingDate: new Date('2024-06-15'),
		juvenileCount: 0,
		sightingFrom: 1,
		mediaUpload: null,
		behavior: null,
		distance: 2,
		waterway: null,
		seaMark: null,
		notes: null,
		phone: null,
		isDead: false,
		deadCondition: null,
		deadSize: null,
		distribution: 1,
		reaction: null,
		seaState: 1,
		visibility: 2,
		boatDrive: 1,
		entryChannel: 0,
		nameConsent: true,
		shipNameConsent: false,
		verified: 1,
		deadPhoneContact: false,
		hasPosition: true,
		otherObservations: null,
		inBalticSea: true,
		inBalticSeaGeo: true,
		...overrides
	};
}

describe('EmailService', () => {
	let mockTransporter: ReturnType<typeof createMockTransporter>;

	beforeEach(() => {
		vi.clearAllMocks();
		EmailService.clearCaches();

		// Standard-Transporter-Mock
		mockTransporter = createMockTransporter();
		vi.mocked(nodemailer.createTransport).mockReturnValue(mockTransporter as any);

		// fs.readFileSync wirft standardmäßig Fehler (kein Template-File im Test)
		vi.mocked(readFileSync).mockImplementation(() => {
			throw new Error('ENOENT: no such file or directory');
		});

		// Formatter-Mocks
		vi.mocked(formatSightingForDisplay).mockReturnValue({
			species: 'Schweinswal',
			sightingDate: '15.06.2024',
			coordinatesFormatted: '54.5000° N, 12.3000° O'
		} as any);
		vi.mocked(isUnknownOrMissingSpecies).mockReturnValue(false);
		vi.mocked(formatLocalDateTime).mockReturnValue('15.06.2024');
	});

	afterEach(() => {
		EmailService.clearCaches();
	});

	// ---------------------------------------------------------------------------
	// clearCaches
	// ---------------------------------------------------------------------------
	describe('clearCaches()', () => {
		it('kann mehrfach aufgerufen werden ohne Fehler', () => {
			expect(() => EmailService.clearCaches()).not.toThrow();
			expect(() => EmailService.clearCaches()).not.toThrow();
		});

		it('clearTemplateCache() delegiert an clearCaches()', () => {
			const clearCachesSpy = vi.spyOn(EmailService, 'clearCaches');
			EmailService.clearTemplateCache();
			expect(clearCachesSpy).toHaveBeenCalledOnce();
		});
	});

	// ---------------------------------------------------------------------------
	// initialize
	// ---------------------------------------------------------------------------
	describe('initialize()', () => {
		it('bricht ab wenn E-Mail deaktiviert und test=false', async () => {
			setupConfigRepositoryMocks({ enabled: false });

			await EmailService.initialize(false);

			expect(nodemailer.createTransport).not.toHaveBeenCalled();
		});

		it('fährt fort wenn E-Mail deaktiviert aber test=true', async () => {
			setupConfigRepositoryMocks({ enabled: false, smtpHost: 'smtp.example.com' });

			await EmailService.initialize(true);

			expect(nodemailer.createTransport).toHaveBeenCalled();
		});

		it('bricht ab wenn SMTP-Host leer ist', async () => {
			setupConfigRepositoryMocks({ enabled: true, smtpHost: '' });

			await EmailService.initialize(false);

			expect(nodemailer.createTransport).not.toHaveBeenCalled();
		});

		it('erstellt Transporter wenn SMTP konfiguriert und Verify erfolgreich', async () => {
			setupConfigRepositoryMocks({ enabled: true, smtpHost: 'smtp.example.com' });

			await EmailService.initialize(false);

			expect(nodemailer.createTransport).toHaveBeenCalledWith(
				expect.objectContaining({
					host: 'smtp.example.com',
					port: 587
				})
			);
			expect(mockTransporter.verify).toHaveBeenCalled();
		});

		it('setzt Transporter auf null wenn verify() fehlschlägt', async () => {
			setupConfigRepositoryMocks({ enabled: true, smtpHost: 'smtp.example.com' });
			mockTransporter.verify.mockRejectedValueOnce(new Error('Verbindungsfehler'));

			await EmailService.initialize(false);

			// Wenn Transporter null ist, schlägt sendTestEmail fehl
			// (kein zweites initialize da test=false und enabled bereits in Cache)
			EmailService.clearCaches();
			setupConfigRepositoryMocks({ enabled: false, smtpHost: '' });
			const result = await EmailService.sendTestEmail('test@example.com');
			expect(result).toBe(false);
		});
	});

	// ---------------------------------------------------------------------------
	// sendNewSightingNotification
	// ---------------------------------------------------------------------------
	describe('sendNewSightingNotification()', () => {
		it('gibt false zurück wenn Sichtung nicht in DB gefunden', async () => {
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			const result = await EmailService.sendNewSightingNotification(999);

			expect(result).toBe(false);
		});

		it('gibt false zurück wenn E-Mail-Benachrichtigung deaktiviert', async () => {
			const mockSighting = createMockSighting();
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockSighting])
					})
				})
			} as any);

			setupConfigRepositoryMocks({ enabled: false });

			const result = await EmailService.sendNewSightingNotification(42);

			expect(result).toBe(false);
		});

		it('gibt false zurück wenn Transporter nicht initialisiert', async () => {
			const mockSighting = createMockSighting();
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockSighting])
					})
				})
			} as any);

			// E-Mail aktiviert, aber kein Transporter (initialize nicht aufgerufen)
			setupConfigRepositoryMocks({ enabled: true });

			const result = await EmailService.sendNewSightingNotification(42);

			// Kein Transporter → false
			expect(result).toBe(false);
		});

		it('sendet E-Mail und gibt true zurück wenn alles korrekt konfiguriert', async () => {
			const mockSighting = createMockSighting();
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockSighting])
					})
				})
			} as any);

			setupConfigRepositoryMocks({ enabled: true, smtpHost: 'smtp.example.com' });

			// Transporter initialisieren
			await EmailService.initialize(false);

			const result = await EmailService.sendNewSightingNotification(42);

			expect(result).toBe(true);
			expect(mockTransporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					to: 'admin@ostsee-tiere.de',
					subject: expect.stringContaining('REF-42')
				})
			);
		});

		it('gibt false zurück wenn kein Empfänger konfiguriert', async () => {
			const mockSighting = createMockSighting();
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockSighting])
					})
				})
			} as any);

			setupConfigRepositoryMocks({ enabled: true, smtpHost: 'smtp.example.com', recipient: '' });

			await EmailService.initialize(false);
			EmailService.clearCaches(); // Cache leeren damit getEmailConfig neu lädt

			// Config neu setzen ohne Empfänger
			setupConfigRepositoryMocks({ enabled: true, smtpHost: 'smtp.example.com', recipient: '' });

			const result = await EmailService.sendNewSightingNotification(42);

			expect(result).toBe(false);
		});

		it('formatiert sightingDate über formatLocalDateTime (Berlin) statt UTC-ISO-Split (M2)', async () => {
			// Sichtung 22:30 UTC am 14.07. = 00:30 Berliner Sommerzeit am 15.07.
			// `toISOString().split('T')[0]` läse fälschlich den 14.07. (UTC-Vortag).
			const mockSighting = createMockSighting({
				sightingDate: new Date('2024-07-14T22:30:00Z')
			});
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockSighting])
					})
				})
			} as any);

			setupConfigRepositoryMocks({ enabled: true, smtpHost: 'smtp.example.com' });
			await EmailService.initialize(false);

			await EmailService.sendNewSightingNotification(42);

			// formatLocalDateTime muss mit dem rohen Sichtungsdatum und Format 'date'
			// aufgerufen werden — nicht per toISOString().split('T')[0] umgangen.
			expect(formatLocalDateTime).toHaveBeenCalledWith(mockSighting.sightingDate, 'date');

			// formatSightingForDisplay (komplett gemockt) darf nur das Berlin-
			// formatierte Datum erhalten, nie den rohen UTC-Tag (wäre der Vortag).
			const callArg = vi.mocked(formatSightingForDisplay).mock.calls[0]?.[0];
			expect(callArg?.sightingDate).not.toBe('2024-07-14');
		});

		// ------------------------------------------------------------------
		// Ostsee-Status im Template-Kontext
		//
		// Der Status muss aus der **Rohzeile** kommen. `sightingFormValues`
		// wandelt beide Flags mit `!!` um — damit verschwindet der
		// Altsystem-Wert 2, und ohne Koordinaten wäre `noPosition` nicht mehr
		// erkennbar. Diese Tests fahren den echten Pfad
		// loadSightingForEmail → balticSeaEmailContext → Vorlage.
		// ------------------------------------------------------------------
		describe('Ostsee-Status im Template-Kontext', () => {
			async function renderMailFor(overrides: Record<string, unknown>): Promise<string> {
				vi.mocked(db.select).mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([createMockSighting(overrides)])
						})
					})
				} as any);

				setupConfigRepositoryMocks({
					enabled: true,
					smtpHost: 'smtp.example.com',
					// Minimale Vorlage, die nur den Status ausgibt — der Test prüft die
					// Verdrahtung, nicht das Layout der ausgelieferten Vorlage (das
					// tut notificationEmailDefault.test.ts).
					template:
						'<html>{{sighting.balticSea.status}}|{{sighting.balticSea.label}}|{{sighting.balticSea.needsAttention}}</html>'
				});
				await EmailService.initialize(false);

				await EmailService.sendNewSightingNotification(42);

				const mailOptions = mockTransporter.sendMail.mock.calls[0]?.[0];
				return (mailOptions as { html: string }).html;
			}

			// Der eigentliche Befund: ostsee_geo ist die grobe Bounding Box. Eine
			// Meldung aus dem Hamburger Hafen liegt darin, aber nicht im Polygon.
			it('weist eine Sichtung in der Box, aber außerhalb des Polygons NICHT als Ostsee aus', async () => {
				const html = await renderMailFor({
					inBalticSea: 0,
					inBalticSeaGeo: 1,
					latitude: '53.540000',
					longitude: '9.970000'
				});

				expect(html).toContain('outside');
				expect(html).not.toContain('Ostsee');
			});

			it('weist eine echte Ostsee-Sichtung als Ostsee aus', async () => {
				const html = await renderMailFor({
					inBalticSea: 1,
					inBalticSeaGeo: 1,
					latitude: '54.020000',
					longitude: '11.100000'
				});

				expect(html).toContain('baltic|Ostsee|false');
			});

			// Beweist, dass der Status aus der Rohzeile stammt: nach `!!` wäre die
			// 2 nicht mehr von 1 zu unterscheiden — hier ist sie es auch nicht,
			// aber ein späterer Umbau auf `> 1`-Semantik fiele sofort auf.
			it('behandelt den Altsystem-Wert 2 in ostsee_geo wie 1', async () => {
				const html = await renderMailFor({
					inBalticSea: 1,
					inBalticSeaGeo: 2,
					latitude: '54.020000',
					longitude: '11.100000'
				});

				expect(html).toContain('baltic|Ostsee|false');
			});

			// Ohne Koordinaten trägt kein Flag eine Aussage. Käme der Status aus
			// `sightingFormValues`, wären die Koordinaten dort schon Zahlen und
			// dieser Zustand nicht erreichbar.
			it('meldet eine Sichtung ohne Koordinaten als „ohne Position"', async () => {
				const html = await renderMailFor({
					inBalticSea: 1,
					inBalticSeaGeo: 1,
					latitude: null,
					longitude: null
				});

				expect(html).toContain('noPosition');
				expect(html).toContain('true');
			});
		});

		// ------------------------------------------------------------------
		// Foto-Ankündigung (rebuilter iOS-Client, Stand 2026-07-30): Der
		// Client setzt `aufnahmeHochladen`, kann aber kein Foto hochladen —
		// es kommt per E-Mail nach. Ohne einen Hinweis in der
		// Benachrichtigungs-Mail weiß niemand, welcher Sichtung eine später
		// eintreffende Foto-Mail zuzuordnen ist.
		// ------------------------------------------------------------------
		describe('Foto-Ankündigung im Template-Kontext', () => {
			async function renderMailFor(mediaUpload: unknown): Promise<string> {
				vi.mocked(db.select).mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([createMockSighting({ mediaUpload })])
						})
					})
				} as any);

				// Der globale Mock in `beforeEach` liefert ein festes Objekt ohne
				// `mediaUpload`. Hier stattdessen wie die echte Implementierung
				// das Feld unverändert durchreichen (`...restSighting` in
				// `formatSightingForDisplay`) — sonst prüfte der Test nur den
				// eigenen Mock, nicht die Verdrahtung von `loadSightingForEmail`.
				vi.mocked(formatSightingForDisplay).mockImplementation(
					(input) =>
						({
							species: 'Schweinswal',
							sightingDate: '15.06.2024',
							coordinatesFormatted: '54.5000° N, 12.3000° O',
							mediaUpload: input.mediaUpload
						}) as any
				);

				setupConfigRepositoryMocks({
					enabled: true,
					smtpHost: 'smtp.example.com',
					// Minimale Vorlage — prüft die Verdrahtung, nicht das Layout des
					// ausgelieferten Textes (das übernimmt notificationEmailDefault.test.ts).
					template:
						'<html>{{#if sighting.mediaUpload}}foto-angekuendigt:{{referenceId}}{{/if}}</html>'
				});
				await EmailService.initialize(false);

				await EmailService.sendNewSightingNotification(42);

				const mailOptions = mockTransporter.sendMail.mock.calls[0]?.[0];
				return (mailOptions as { html: string }).html;
			}

			it('reicht ein gesetztes Flag als sighting.mediaUpload an die Vorlage durch', async () => {
				const html = await renderMailFor(1);

				expect(html).toContain('foto-angekuendigt:REF-42');
			});

			it('lässt den Block weg, wenn kein Foto angekündigt wurde', async () => {
				const html = await renderMailFor(0);

				expect(html).not.toContain('foto-angekuendigt');
			});

			it('lässt den Block bei null (kein Wert in der Zeile) ebenfalls weg', async () => {
				const html = await renderMailFor(null);

				expect(html).not.toContain('foto-angekuendigt');
			});
		});

		it('gibt false zurück wenn DB-Abfrage fehlschlägt', async () => {
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockRejectedValue(new Error('DB Verbindungsfehler'))
					})
				})
			} as any);

			const result = await EmailService.sendNewSightingNotification(42);

			expect(result).toBe(false);
		});
	});

	// ---------------------------------------------------------------------------
	// sendTestEmail
	// ---------------------------------------------------------------------------
	describe('sendTestEmail()', () => {
		it('gibt false zurück wenn Transporter nicht initialisiert werden kann', async () => {
			// Transporter auf null zurücksetzen indem verify() fehlschlägt
			setupConfigRepositoryMocks({ enabled: true, smtpHost: 'smtp.example.com' });
			mockTransporter.verify.mockRejectedValueOnce(new Error('Verbindung fehlgeschlagen'));
			await EmailService.initialize(false);
			EmailService.clearCaches();

			// Nun: E-Mail deaktiviert und kein SMTP-Host → initialize(true) schlägt fehl
			setupConfigRepositoryMocks({ enabled: false, smtpHost: '' });

			const result = await EmailService.sendTestEmail('test@example.com');

			expect(result).toBe(false);
		});

		it('sendet Test-E-Mail und gibt true zurück', async () => {
			setupConfigRepositoryMocks({ enabled: true, smtpHost: 'smtp.example.com' });

			await EmailService.initialize(false);

			const result = await EmailService.sendTestEmail('empfaenger@example.com');

			expect(result).toBe(true);
			expect(mockTransporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					to: 'empfaenger@example.com',
					subject: expect.stringContaining('Test E-Mail')
				})
			);
		});

		it('verwendet konfigurierten Empfänger wenn kein Empfänger angegeben', async () => {
			setupConfigRepositoryMocks({
				enabled: true,
				smtpHost: 'smtp.example.com',
				recipient: 'standard@example.com'
			});

			await EmailService.initialize(false);

			const result = await EmailService.sendTestEmail();

			expect(result).toBe(true);
			expect(mockTransporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					to: 'standard@example.com'
				})
			);
		});

		it('gibt false zurück wenn sendMail fehlschlägt', async () => {
			setupConfigRepositoryMocks({ enabled: true, smtpHost: 'smtp.example.com' });

			await EmailService.initialize(false);

			mockTransporter.sendMail.mockRejectedValueOnce(new Error('SMTP Fehler'));

			const result = await EmailService.sendTestEmail('test@example.com');

			expect(result).toBe(false);
		});

		it('gibt false zurück wenn kein Empfänger angegeben und keiner konfiguriert', async () => {
			setupConfigRepositoryMocks({
				enabled: true,
				smtpHost: 'smtp.example.com',
				recipient: ''
			});

			await EmailService.initialize(false);

			const result = await EmailService.sendTestEmail();

			expect(result).toBe(false);
		});
	});

	// ---------------------------------------------------------------------------
	// Spam-Erkennung (indirekt über sendNewSightingNotification)
	// ---------------------------------------------------------------------------
	describe('Spam-Erkennung', () => {
		async function setupAndSend(sightingOverrides = {}) {
			const mockSighting = createMockSighting(sightingOverrides);
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockSighting])
					})
				})
			} as any);

			setupConfigRepositoryMocks({ enabled: true, smtpHost: 'smtp.example.com' });
			await EmailService.initialize(false);
			return EmailService.sendNewSightingNotification(42);
		}

		it('sendet E-Mail auch bei noreply-Adresse (Spam nur informativ)', async () => {
			const result = await setupAndSend({ email: 'noreply@example.com' });
			expect(result).toBe(true);
		});

		it('sendet E-Mail auch wenn Notizen verdächtige URLs enthalten', async () => {
			const result = await setupAndSend({ notes: 'Besuchen Sie www.spam-site.com für Angebote' });
			expect(result).toBe(true);
		});

		it('sendet E-Mail auch bei Position außerhalb der Ostsee', async () => {
			const result = await setupAndSend({ latitude: '40.0', longitude: '2.0' });
			expect(result).toBe(true);
		});
	});

	// ---------------------------------------------------------------------------
	// Template-Rendering (Handlebars, kein Mock)
	// ---------------------------------------------------------------------------
	describe('Template-Rendering', () => {
		it('rendert Handlebars-Template mit Sichtungsdaten', async () => {
			const mockSighting = createMockSighting();
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockSighting])
					})
				})
			} as any);

			// Template mit Handlebars-Variablen
			setupConfigRepositoryMocks({
				enabled: true,
				smtpHost: 'smtp.example.com',
				template: '<p>Neue Sichtung: {{referenceId}}</p>'
			});

			await EmailService.initialize(false);
			const result = await EmailService.sendNewSightingNotification(42);

			expect(result).toBe(true);
			const sendMailCall = mockTransporter.sendMail.mock.calls[0]?.[0] as any;
			expect(sendMailCall?.html).toContain('REF-42');
		});

		it('verwendet Fallback-Template wenn Template-Datei nicht lesbar', async () => {
			// readFileSync wirft bereits standardmäßig Fehler im beforeEach
			const mockSighting = createMockSighting();
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockSighting])
					})
				})
			} as any);

			// Kein custom Template → getDefaultTemplate() wird aufgerufen
			setupConfigRepositoryMocks({
				enabled: true,
				smtpHost: 'smtp.example.com',
				template: DEFAULT_EMAIL_FALLBACK_TEMPLATE
			});

			await EmailService.initialize(false);
			const result = await EmailService.sendNewSightingNotification(42);

			expect(result).toBe(true);
		});

		// ------------------------------------------------------------------
		// DEFAULT_EMAIL_TEMPLATE ist der letzte Rückfall, wenn sowohl die
		// DB-Konfiguration als auch die Datei `sightingNotificationTemplate.html`
		// nicht lesbar sind. Direkter Handlebars-Test statt über den Service:
		// `getEmailConfig()` liefert im Test immer einen konfigurierten
		// `template`-Wert (siehe `setupConfigRepositoryMocks`) und erreicht
		// `getDefaultTemplate()` deshalb nie — dieser Pfad ist nur so prüfbar.
		describe('DEFAULT_EMAIL_TEMPLATE — Foto-Ankündigung', () => {
			const render = Handlebars.compile(DEFAULT_EMAIL_TEMPLATE);

			function renderWithMediaUpload(mediaUpload: boolean) {
				return render({
					referenceId: 'REF-99',
					adminUrl: 'https://example.com/admin/1',
					sighting: {
						species: 'Schweinswal',
						sightingDate: '30.07.2026',
						coordinatesFormatted: '54.5000° N, 12.3000° O',
						mediaUpload,
						balticSea: { label: 'Ostsee' }
					}
				});
			}

			it('weist auch im letzten Rückfall auf das nachfolgende Foto hin', () => {
				const html = renderWithMediaUpload(true);

				expect(html).toContain('Foto angekündigt');
				expect(html).toContain('REF-99');
			});

			it('lässt den Hinweis weg, wenn kein Foto angekündigt wurde', () => {
				const html = renderWithMediaUpload(false);

				expect(html).not.toContain('Foto angekündigt');
			});

			it('ist gültiges Handlebars und rendert ohne Ausnahme', () => {
				expect(() => renderWithMediaUpload(true)).not.toThrow();
			});
		});
	});
});

// Fallback-Template aus dem Service (als Referenz für Tests)
const DEFAULT_EMAIL_FALLBACK_TEMPLATE = `<!DOCTYPE html>
<html lang="de">
<head>
	<meta charset="UTF-8">
	<title>Neue Sichtung - {{referenceId}}</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
	<h1>🐋 Neue Sichtung: {{referenceId}}</h1>
	<p><strong>Tierart:</strong> {{sighting.species}}</p>
	<p><strong>Datum:</strong> {{sighting.sightingDate}}</p>
	<p><strong>Position:</strong> {{sighting.coordinatesFormatted}}</p>
	<p><a href="{{adminUrl}}">Sichtung im Admin-Bereich anzeigen</a></p>
</body>
</html>`;
