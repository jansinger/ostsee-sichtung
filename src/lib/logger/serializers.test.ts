/**
 * Unit Tests für die Pino-Serializer.
 *
 * Hintergrund (2026-08-19): Beim Debuggen des SMTP-Versands stand im Log nur
 * `{"level":50,"context":"emailService","error":{"code":"ESOCKET","command":"CONN"},...}`.
 * Die eigentliche Ursache — `unable to get local issuer certificate` — steht in
 * `error.message`, und die ist auf einem `Error` **nicht aufzählbar**: Pino
 * serialisiert das Objekt ohne sie. Der Fehler sah dadurch wie ein
 * Netzwerkproblem aus, und die Suche ging über Port, DNS und Firewall.
 *
 * Der Codebestand loggt durchgängig unter dem Schlüssel `error`, nicht `err` —
 * Pinos eingebauter Standard-Serializer greift nur bei `err` und lief deshalb
 * ins Leere.
 */
import { describe, expect, it } from 'vitest';
import { LOG_SERIALIZERS } from './serializers';

describe('LOG_SERIALIZERS', () => {
	it('behält die Fehlermeldung, die Pino sonst verliert', () => {
		const serialized = LOG_SERIALIZERS.error(new Error('unable to get local issuer certificate'));

		expect(serialized.message).toBe('unable to get local issuer certificate');
		expect(serialized.stack).toBeTruthy();
	});

	it('behält angehängte Eigenschaften wie code und command', () => {
		// Genau die Form, die nodemailer wirft.
		const error = Object.assign(new Error('unable to get local issuer certificate'), {
			code: 'ESOCKET',
			command: 'CONN'
		});

		const serialized = LOG_SERIALIZERS.error(error);

		expect(serialized.code).toBe('ESOCKET');
		expect(serialized.command).toBe('CONN');
		expect(serialized.message).toBe('unable to get local issuer certificate');
	});

	it('greift unter beiden Schlüsseln — der Bestand nutzt `error`, Pino erwartet `err`', () => {
		expect(LOG_SERIALIZERS.err).toBe(LOG_SERIALIZERS.error);
	});

	it('lässt Nicht-Fehler unverändert durch', () => {
		// `logger.error({ error: 'text' }, ...)` kommt im Bestand vor und darf
		// nicht zu einem leeren Objekt zerfallen.
		expect(LOG_SERIALIZERS.error('schlichter Text' as unknown as Error)).toBe('schlichter Text');
	});
});
