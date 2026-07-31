import { createHash, randomBytes } from 'node:crypto';

/**
 * Erzeugung und Hashing des Session-Tokens (Issue #635).
 *
 * Bewusst klein und rein gehalten: Die Zusage „der Klartext-Token landet nie in der
 * Datenbank" ist nur dann prüfbar, wenn Erzeugung und Hashing getrennt von allem SQL
 * stehen.
 */

/**
 * Länge des Zufalls-Tokens in Byte.
 *
 * OWASP verlangt für Session-IDs mindestens 128 Bit Länge und 64 Bit Entropie; 32 Byte
 * aus `randomBytes` liefern 256 Bit und damit deutlichen Abstand nach oben.
 */
export const SESSION_TOKEN_BYTES = 32;

/**
 * Erzeugt ein neues, opakes Session-Token für das Cookie.
 *
 * base64url, weil der Wert unverändert in einen Cookie geschrieben wird: Das
 * Standard-base64-Alphabet enthält `+` und `/`, die dort auslegungsbedürftig wären.
 */
export function createSessionToken(): string {
	return randomBytes(SESSION_TOKEN_BYTES).toString('base64url');
}

/**
 * Bildet den Datenbank-Schlüssel zu einem Cookie-Wert.
 *
 * **Ungesalzenes SHA-256 ist hier die richtige Wahl, keine Nachlässigkeit.** Der Token ist
 * 256 Bit Zufall, kein geratener Wert — es gibt kein Wörterbuch, gegen das ein Angreifer
 * den Hash prüfen könnte, und damit nichts, was ein absichtlich langsames Verfahren
 * (bcrypt, Argon2) erschweren würde. Ein KDF kostete hier pro Request messbare Zeit ohne
 * Gegenwert.
 *
 * Ungesalzen ist zusätzlich Voraussetzung dafür, dass der Hash überhaupt als
 * Lookup-Schlüssel taugt: Ein zufälliges Salz pro Zeile würde einen Index-Zugriff
 * unmöglich machen.
 */
export function hashSessionToken(token: string): string {
	return createHash('sha256').update(token, 'utf8').digest('hex');
}
