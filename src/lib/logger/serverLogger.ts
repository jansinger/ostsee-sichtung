import { env } from '$env/dynamic/private';
import pino from 'pino';
import { LOG_SERIALIZERS } from './serializers';

const VALID_PINO_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'] as const;

function resolveLogLevel(value: string | undefined): pino.Level {
	if (value && (VALID_PINO_LEVELS as readonly string[]).includes(value)) {
		return value as pino.Level;
	}
	return 'info';
}

export const createServerLogger = (context: string) => {
	return pino({
		level: resolveLogLevel(env.LOG_LEVEL),
		base: { pid: process.pid, context },
		// Ohne diese Zeile fällt `logger.error({ error }, ...)` auf die
		// aufzählbaren Eigenschaften zusammen und verliert `message` und
		// `stack` — siehe `serializers.ts`.
		serializers: LOG_SERIALIZERS,
		// Globale Redaction: personenbezogene/geheime Felder werden aus allen Logs
		// entfernt (Defense-in-Depth gegen versehentliches Loggen von PII/Secrets).
		// `*.<feld>` deckt jeweils eine Verschachtelungsebene ab (z.B. { data: { email } }).
		// Die PII-Felder (name, vorname, strasse, plz, ort, ...) stammen aus der
		// Legacy-API-Spezifikation (docs/LEGACY_API_SPECIFICATION.md) und dürfen niemals
		// in Logs erscheinen.
		redact: {
			paths: [
				'email',
				'*.email',
				'phone',
				'*.phone',
				'telefon',
				'*.telefon',
				'password',
				'*.password',
				'token',
				'*.token',
				// Personenbezogene Namensfelder (Legacy-API + moderne Form)
				'name',
				'*.name',
				'vorname',
				'*.vorname',
				'firstName',
				'*.firstName',
				'lastName',
				'*.lastName',
				// Anschrift
				'strasse',
				'*.strasse',
				'plz',
				'*.plz',
				'ort',
				'*.ort',
				'address',
				'*.address'
			],
			remove: true
		}
	});
};
