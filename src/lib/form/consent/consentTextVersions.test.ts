/**
 * Formregeln für die Fassungskennungen der Einwilligungstexte.
 *
 * Die Kennung ist der zweite Teil des Nachweises nach Art. 7 Abs. 1 DSGVO: Der
 * Zeitstempel sagt **wann**, die Kennung sagt **wozu** eingewilligt wurde.
 *
 * **Die Bindung an den Wortlaut steht nicht mehr hier, sondern in
 * `consentSurfaces.svelte.test.ts`.** Dieser Test pinnte bis zum 2026-08-06 den
 * Hash des `meta.helpText` aus `sightingSchema.ts` — und sagte in seinem eigenen
 * Kopfkommentar, dass der Geltungsbereich einer Kennung die gelesene
 * Einwilligungsfläche ist, also auch Überschrift und umgebender Text. Beides
 * zusammen ging nicht auf: In PR #773 wechselte die Überschrift über
 * `nameConsent`/`shipNameConsent`, und `mediaConsent` zog samt Erklärtext in
 * einen anderen Kontext zwei Schritte weiter — der Test blieb grün, die
 * Kennungen wurden erst nachträglich durch ein Review gehoben.
 *
 * Der Wortlaut wird deshalb jetzt an der gerenderten Fläche gepinnt (Browser-
 * Test, `npm run test:unit:client`); der Ankreuztext ist dort mitgehasht. Ein
 * zweiter Hash über denselben Text hätte nur doppelte Buchführung erzeugt.
 *
 * Was hier bleibt, braucht keinen Browser und läuft damit in `npm run
 * test:quick`: dass jede Kennung ein Datum im erwarteten Format trägt und keine
 * in der Zukunft liegt. **Die Wortlaut-Prüfung ist damit aber nicht mehr Teil
 * von `test:quick`** — wer an einem Einwilligungstext arbeitet, fährt zusätzlich
 * `npm run test:unit:client`.
 */
import { describe, expect, it } from 'vitest';
import { MEDIA_CONSENT_VERSION } from './mediaConsentVersion';
import {
	NAME_CONSENT_VERSION,
	PRIVACY_CONSENT_VERSION,
	SHIP_NAME_CONSENT_VERSION
} from './consentVersions';

/**
 * Die vier Einwilligungen mit Nachweisspalten (`…_am`/`…_version` in
 * `schema.ts`). `persistentDataConsent` steht bewusst nicht dabei: Diese
 * Zustimmung erlaubt das Speichern der Kontaktdaten im Browser des Melders und
 * wird nirgends serverseitig nachgewiesen — es gibt also keine Spalte, die eine
 * Fassung tragen könnte. Ihr Wortlaut ist trotzdem gepinnt
 * (`consentSurfaces.svelte.test.ts`).
 */
const CONSENT_VERSIONS = [
	{ field: 'nameConsent', version: NAME_CONSENT_VERSION },
	{ field: 'shipNameConsent', version: SHIP_NAME_CONSENT_VERSION },
	{ field: 'privacyConsent', version: PRIVACY_CONSENT_VERSION },
	{ field: 'mediaConsent', version: MEDIA_CONSENT_VERSION }
] as const;

describe('Fassungskennungen der Einwilligungstexte', () => {
	it.each(CONSENT_VERSIONS)(
		'$field trägt eine Fassungskennung im Format JJJJ-MM-TT',
		({ version }) => {
			expect(version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		}
	);

	it('vergibt keine Kennung, die in der Zukunft liegt', () => {
		// Eine Fassung kann nicht ab einem Datum gelten, das noch nicht erreicht
		// ist — das wäre kein Nachweis, sondern eine Ankündigung.
		//
		// Berliner Datum, nicht UTC: Zwischen 00:00 und 02:00 Ortszeit liegt das
		// UTC-Datum einen Tag zurück, und eine an diesem Tag korrekt vergebene
		// Kennung fiele als „Zukunft" durch. Konvention wie in `sqlTimeZone.ts`.
		const today = new Intl.DateTimeFormat('en-CA', {
			timeZone: 'Europe/Berlin',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		}).format(new Date());
		for (const { field, version } of CONSENT_VERSIONS) {
			expect(version <= today, `${field}: ${version} liegt in der Zukunft`).toBe(true);
		}
	});
});
