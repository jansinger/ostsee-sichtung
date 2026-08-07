import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Zeit-Token gegen Formular-Bots.
 *
 * Beim Laden der Meldeseite stellt der Server ein signiertes Token
 * `<timestampMs>.<hmacHex>` aus; der Client schickt es beim Absenden mit.
 * Der Server kann daraus ablesen, wie lange das Formular offen war.
 * Ein fehlendes/ungültiges Token oder ein Absenden nach wenigen Sekunden
 * ist ein Spam-Indikator — es blockiert bewusst NICHT (nur Score).
 */

export type FormTokenCheck =
	{ status: 'missing' } | { status: 'invalid' } | { status: 'valid'; ageSeconds: number };

export interface FormTokenOptions {
	now?: number | undefined;
	secret?: string | undefined;
}

// Fallback pro Prozess: Nach einem Neustart werden alte Tokens ungültig —
// das kostet nur Score-Punkte, blockiert aber nichts. Wer Tokens über
// Neustarts hinweg gültig halten will, setzt FORM_TOKEN_SECRET.
const processSecret = randomBytes(32).toString('hex');

function getSecret(override?: string): string {
	return override ?? (process.env.FORM_TOKEN_SECRET || processSecret);
}

function sign(payload: string, secret: string): string {
	return createHmac('sha256', secret).update(payload).digest('hex');
}

/** Stellt ein signiertes Zeit-Token aus. */
export function issueFormToken(options: FormTokenOptions = {}): string {
	const now = options.now ?? Date.now();
	const payload = String(now);
	return `${payload}.${sign(payload, getSecret(options.secret))}`;
}

// Mehr als 60 s „in der Zukunft" ausgestellt kann ein echtes Token nicht sein —
// kleinere Abweichungen sind Clock-Skew und werden auf Alter 0 geklemmt.
const MAX_CLOCK_SKEW_MS = 60_000;

/** Prüft ein Zeit-Token und liefert das Formular-Alter in Sekunden. */
export function verifyFormToken(token: unknown, options: FormTokenOptions = {}): FormTokenCheck {
	if (token === undefined || token === null || token === '') {
		return { status: 'missing' };
	}
	if (typeof token !== 'string') {
		return { status: 'invalid' };
	}

	const separator = token.indexOf('.');
	if (separator <= 0) {
		return { status: 'invalid' };
	}
	const payload = token.slice(0, separator);
	const signature = token.slice(separator + 1);
	if (!/^\d{1,15}$/.test(payload) || !/^[0-9a-f]{64}$/.test(signature)) {
		return { status: 'invalid' };
	}

	const expected = Buffer.from(sign(payload, getSecret(options.secret)), 'hex');
	const given = Buffer.from(signature, 'hex');
	if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
		return { status: 'invalid' };
	}

	const now = options.now ?? Date.now();
	const ageMs = now - Number(payload);
	if (ageMs < -MAX_CLOCK_SKEW_MS) {
		return { status: 'invalid' };
	}

	return { status: 'valid', ageSeconds: Math.max(0, Math.floor(ageMs / 1000)) };
}
