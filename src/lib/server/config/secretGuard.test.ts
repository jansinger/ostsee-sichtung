import { describe, expect, it } from 'vitest';
import {
	MIN_SESSION_SECRET_LENGTH,
	PUBLIC_SESSION_SECRETS,
	validateSessionSecret
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
