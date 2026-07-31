/**
 * Bindet die Fassungskennungen an die tatsächlichen Einwilligungstexte.
 *
 * Die Kennung ist der zweite Teil des Nachweises nach Art. 7 Abs. 1 DSGVO: Der
 * Zeitstempel sagt **wann**, die Kennung sagt **wozu** eingewilligt wurde. Sie
 * taugt dafür aber nur, solange sie sich mit dem Text ändert — eine Kennung, die
 * beim Umformulieren stehen bleibt, weist der Einwilligung rückwirkend einen
 * Text zu, den die Meldenden nie gesehen haben.
 *
 * Ein Kommentar allein trägt diese Zusicherung nicht. Deshalb pinnt dieser Test
 * den Hash jedes Textes — wie `notificationEmailDefault.test.ts` es für die
 * E-Mail-Vorlage tut.
 *
 * **Geltungsbereich — bewusst enger, als es zunächst wirkt:** Gepinnt wird
 * ausschließlich `meta.helpText` aus `sightingSchema.ts`. **Nicht** erfasst sind
 * `.label()` und der gesamte umgebende Text in
 * `src/lib/report/components/form/RequiredConsent.svelte` — Überschrift,
 * Verarbeitungs-Kacheln, Widerrufshinweis, Verweis auf die
 * Datenschutzerklärung. Gerade bei `privacyConsent` ist das ein erheblicher Teil
 * dessen, was die meldende Person tatsächlich liest: Wer dort umformuliert,
 * lässt diesen Test grün.
 *
 * Der Hash über die gerenderte Einwilligungsfläche zu ziehen wäre die
 * vollständige Lösung; sie braucht einen Browser-Test und ist hier bewusst
 * nicht gebaut. Bis dahin gilt: **Eine Änderung an `RequiredConsent.svelte`
 * erfordert die Fassungskennung genauso wie eine am `helpText`** — nur erinnert
 * daran kein Test.
 *
 * **Schlägt der Test fehl, wurde ein Einwilligungstext geändert. Dann beides tun:**
 *   1. die Fassungskennung in `consentVersions.ts` bzw. `mediaConsentVersion.ts`
 *      auf das Datum der Änderung setzen,
 *   2. den neuen Hash aus der Fehlermeldung hier eintragen.
 *
 * Wer nur (2) macht, hat den Nachweis entwertet: Alle Altbestände tragen dann
 * eine Kennung, hinter der ein anderer Wortlaut steht.
 */
import { createHash } from 'crypto';
import { describe, expect, it } from 'vitest';
import { sightingSchema } from '$lib/form/validation/sightingSchema';
import { MEDIA_CONSENT_VERSION } from './mediaConsentVersion';
import {
	NAME_CONSENT_VERSION,
	PRIVACY_CONSENT_VERSION,
	SHIP_NAME_CONSENT_VERSION
} from './consentVersions';

function helpTextOf(field: string): string {
	const described = sightingSchema.describe().fields[field];
	if (!described || !('meta' in described)) {
		throw new Error(`Feld ${field} hat keine Beschreibung`);
	}
	const helpText = ((described.meta ?? {}) as { helpText?: string }).helpText;
	if (!helpText) {
		throw new Error(`Feld ${field} hat keinen Einwilligungstext`);
	}
	return helpText;
}

const PINNED_CONSENT_TEXTS = [
	{
		field: 'nameConsent',
		version: NAME_CONSENT_VERSION,
		hash: 'eb46f8a140808245a3f8de9a65917a69452ae212a80a738339405e091b0210d1'
	},
	{
		field: 'shipNameConsent',
		version: SHIP_NAME_CONSENT_VERSION,
		hash: 'ad612652de32e9a21b272fd878dfc2509a5ae96308a1dd05365e484c5ff256b6'
	},
	{
		field: 'privacyConsent',
		version: PRIVACY_CONSENT_VERSION,
		hash: '73445d9c1ac5e29d803efe505d830951dd296cbeff21ccc0042a223003527c01'
	},
	{
		field: 'mediaConsent',
		version: MEDIA_CONSENT_VERSION,
		hash: '55294e0730f56023ef0e4eb3a3c907bf799996ddffecdaaa3af07e72ff4847f9'
	}
] as const;

describe('Fassungskennungen der Einwilligungstexte', () => {
	it.each(PINNED_CONSENT_TEXTS)(
		'$field entspricht dem gepinnten Hash der Fassung $version',
		({ field, hash }) => {
			const actual = createHash('sha256').update(helpTextOf(field), 'utf8').digest('hex');

			expect(actual).toBe(hash);
		}
	);

	it.each(PINNED_CONSENT_TEXTS)(
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
		for (const { field, version } of PINNED_CONSENT_TEXTS) {
			expect(version <= today, `${field}: ${version} liegt in der Zukunft`).toBe(true);
		}
	});
});
