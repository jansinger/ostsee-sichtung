import { describe, expect, it } from 'vitest';
import {
	MIN_SESSION_SECRET_LENGTH,
	PUBLIC_SESSION_SECRETS,
	validateSessionSecret,
	ENCRYPTION_KEY_LENGTH,
	PLACEHOLDER_ENCRYPTION_KEY,
	validateEncryptionKey,
	assertProductionSecrets
} from '$lib/server/config/secretGuard';

describe('validateSessionSecret', () => {
	it('akzeptiert ein ausreichend langes, unbekanntes Secret', () => {
		expect(validateSessionSecret('a'.repeat(48))).toBeNull();
	});

	it('lehnt einen leeren Wert ab', () => {
		expect(validateSessionSecret('')).toMatch(/SESSION_SECRET/);
	});

	it('lehnt einen zu kurzen Wert ab', () => {
		const tooShort = 'x'.repeat(MIN_SESSION_SECRET_LENGTH - 1);
		expect(validateSessionSecret(tooShort)).toMatch(/32/);
	});

	it('lehnt den Platzhalter aus .env.example ab', () => {
		expect(validateSessionSecret('your-secret-key-here-min-32-chars')).toMatch(/öffentlich/);
	});

	it('lehnt den Beispielwert aus docs/ENVIRONMENT.md ab', () => {
		expect(validateSessionSecret('8K7h3L9mN2pQ4rS6tU8vW0xY2zA4bC6dE')).toMatch(/öffentlich/);
	});

	/* Ein Leerzeichen oder Zeilenumbruch um den Platzhalter darf die Prüfung nicht
	   aushebeln — sonst ist der Guard still wirkungslos. */
	it('lehnt den Platzhalter auch mit Leerraum drumherum ab', () => {
		expect(validateSessionSecret('  your-secret-key-here-min-32-chars\n')).toMatch(/öffentlich/);
	});

	it('lehnt einen Wert ab, der nur aus Leerraum besteht', () => {
		expect(validateSessionSecret('   ')).toMatch(/erforderlich/);
	});

	/* Der Kern des Befunds aus #635: Beide öffentlich bekannten Werte sind 33 Zeichen lang
	   und bestehen jede reine Längenprüfung. Ohne diesen Test ist die naheliegende
	   Implementierung (nur `>= 32`) grün und trotzdem falsch. */
	it('erkennt, dass die öffentlichen Werte die Längenprüfung bestehen würden', () => {
		for (const known of PUBLIC_SESSION_SECRETS) {
			expect(known.length).toBeGreaterThanOrEqual(MIN_SESSION_SECRET_LENGTH);
			expect(validateSessionSecret(known)).not.toBeNull();
		}
	});
});

describe('validateEncryptionKey', () => {
	const valid = 'a3f1'.repeat(16); // 64 Hex-Zeichen = 32 Byte

	it('akzeptiert 64 Hex-Zeichen', () => {
		expect(valid).toHaveLength(ENCRYPTION_KEY_LENGTH);
		expect(validateEncryptionKey(valid)).toBeNull();
	});

	it('akzeptiert Grossbuchstaben in der Hex-Darstellung', () => {
		expect(validateEncryptionKey(valid.toUpperCase())).toBeNull();
	});

	it('lehnt einen leeren Wert ab', () => {
		expect(validateEncryptionKey('')).toMatch(/ENCRYPTION_KEY/);
	});

	it('lehnt den Platzhalter aus .env.example ab', () => {
		expect(validateEncryptionKey(PLACEHOLDER_ENCRYPTION_KEY)).toMatch(/Platzhalter/);
	});

	/* Der neue Fall: aes-256-gcm braucht 32 Byte. Ein 32-stelliger Hex-Wert sind 16 Byte
	   und liess createCipheriv bisher erst beim ersten Login werfen. */
	it('lehnt einen zu kurzen Hex-Wert ab, der bisher durchkam', () => {
		expect(validateEncryptionKey('a3f1'.repeat(8))).toMatch(/64/);
	});

	it('lehnt Nicht-Hex-Zeichen ab', () => {
		expect(validateEncryptionKey('z'.repeat(64))).toMatch(/hexadezimal/);
	});

	/* Ohne Trimmen erkennt die Längenprüfung den Platzhalter nicht als Platzhalter, sondern
	   als "66 statt 64 Zeichen" — eine irreführende Fehlermeldung, analog zu
	   validateSessionSecret oben. */
	it('lehnt den Platzhalter auch mit Leerraum drumherum ab', () => {
		expect(validateEncryptionKey(`  ${PLACEHOLDER_ENCRYPTION_KEY}\n`)).toMatch(/Platzhalter/);
	});
});

describe('assertProductionSecrets', () => {
	const good = { SESSION_SECRET: 'a'.repeat(48), ENCRYPTION_KEY: 'a3f1'.repeat(16) };

	it('wirft nicht ausserhalb von production', () => {
		expect(() =>
			assertProductionSecrets({
				NODE_ENV: 'development',
				SESSION_SECRET: 'your-secret-key-here-min-32-chars',
				ENCRYPTION_KEY: '0'.repeat(64)
			})
		).not.toThrow();
	});

	it('wirft nicht bei gültiger Produktionskonfiguration', () => {
		expect(() => assertProductionSecrets({ NODE_ENV: 'production', ...good })).not.toThrow();
	});

	it('wirft in production bei öffentlich bekanntem SESSION_SECRET', () => {
		expect(() =>
			assertProductionSecrets({
				NODE_ENV: 'production',
				...good,
				SESSION_SECRET: 'your-secret-key-here-min-32-chars'
			})
		).toThrow(/öffentlich bekannter Beispielwert/);
	});

	it('wirft in production bei zu kurzem ENCRYPTION_KEY', () => {
		expect(() =>
			assertProductionSecrets({
				NODE_ENV: 'production',
				...good,
				ENCRYPTION_KEY: 'a3f1'.repeat(8)
			})
		).toThrow(/64 Zeichen/);
	});

	/* Beide Fehler zusammen: Die Meldung muss beide nennen, damit ein Betreiber nicht
	   zweimal deployen muss, um beide zu finden. */
	it('nennt beide Fehler in einer Meldung', () => {
		let message = '';
		try {
			assertProductionSecrets({
				NODE_ENV: 'production',
				SESSION_SECRET: '',
				ENCRYPTION_KEY: ''
			});
		} catch (error) {
			message = error instanceof Error ? error.message : String(error);
		}
		expect(message).toMatch(/SESSION_SECRET/);
		expect(message).toMatch(/ENCRYPTION_KEY/);
	});
});
