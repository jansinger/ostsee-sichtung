import { describe, expect, it } from 'vitest';
import { formStepsConfig } from './formConfig';
import { fieldsOutsideReportKind } from './fieldsOutsideReportKind';

/**
 * Task 8, korrigierte Fassung: Es gibt keinen „vorherigen Zweig" mehr, gegen
 * den ein Wechsel erkennbar wäre (`changeKind()` entfernt `isDead` aus den
 * gespeicherten `FORM_DATA`, siehe reportKind.ts). Maßgeblich ist deshalb
 * ausschließlich, was NICHT in den Zweig gehört, in dem das Formular JETZT
 * startet — unabhängig davon, ob und wie oft vorher gewechselt wurde, und auch
 * für zweigfremde Daten aus einer älteren Sitzung im localStorage.
 *
 * Abschlussreview B4: Die Erwartungswerte stehen hier als feste Literale, statt
 * mit derselben Formel wie die Implementierung nachgerechnet zu werden. Ein
 * Test, der `fieldsOutsideReportKind('dead')` gegen `getFormSteps({ isDead: true })`
 * abgleicht — mit exakt dem Ausdruck aus `fieldsOutsideReportKind.ts` —, kann per
 * Konstruktion nie rot werden, auch wenn eine dritte, formfremde Achse (Medien-
 * Upload) sich mit einschleicht. Genau das ist hier passiert: `mediaConsent`
 * wurde mitgerissen, weil `getFormSteps({ isDead: true })` ohne `uploadedFiles`
 * aufgerufen wurde und deshalb zusätzlich `mediaConsent` entfernte.
 */
describe('fieldsOutsideReportKind', () => {
	it('nennt für den Zweig "alive" genau die drei Totfund-Felder, die dort nicht hingehören', () => {
		expect(fieldsOutsideReportKind('alive')).toEqual([
			'deadCondition',
			'deadSize',
			'deadPhoneContact'
		]);
	});

	it('nennt für den Zweig "dead" genau die drei Verhaltensfelder, die dort nicht hingehören', () => {
		expect(fieldsOutsideReportKind('dead')).toEqual(['behavior', 'behaviorText', 'reaction']);
	});

	/**
	 * B4: `mediaConsent` ist eine dritte, von Zweig und Beobachtungsort
	 * unabhängige Achse (Medien-Upload) — siehe `hasUploadedMedia` in
	 * `formConfig.ts`. Es gehört deshalb in KEINER der beiden Richtungen in
	 * diese Liste; ob es sichtbar ist, entscheidet ausschließlich, ob eine
	 * Aufnahme hochgeladen wurde (`Step4Contact.svelte`, `ModernReportForm.svelte`).
	 * Vermischte diese Funktion die Achsen, würde `mediaConsent` bei jedem Start
	 * im Totfund-Zweig aus dem Formular-Zustand geräumt — auch dann, wenn der
	 * Melder es zuvor bewusst gesetzt hatte.
	 */
	it('rührt mediaConsent in keiner Richtung an — das ist eine dritte, unabhängige Achse (Medien-Upload)', () => {
		expect(fieldsOutsideReportKind('alive')).not.toContain('mediaConsent');
		expect(fieldsOutsideReportKind('dead')).not.toContain('mediaConsent');
	});

	it('rührt die teuren gemeinsamen Felder in keiner Richtung an', () => {
		// Position, Datum, Tierart und Medien sind der aufwendigste Teil der
		// Eingabe — sie dürfen unter keinem der beiden Zweige verschwinden.
		const alle = [...fieldsOutsideReportKind('alive'), ...fieldsOutsideReportKind('dead')];
		for (const feld of ['latitude', 'longitude', 'sightingDate', 'species', 'mediaFile', 'email']) {
			expect(alle).not.toContain(feld);
		}
	});

	/**
	 * Kein Vollständigkeits-Cross-Check über `getFormSteps` für die `'alive'`-
	 * Richtung: `FOREIGN_TO_ALIVE` ist eine handgepflegte Liste, weil
	 * `getFormSteps` die Totfund-Felder in keinem Zweig aus der Schritt-
	 * Konfiguration entfernt (Begründung im Kopf von `fieldsOutsideReportKind.ts`)
	 * — es gibt dort keine einzige Quelle, gegen die sich das ohne Umbau von
	 * `formConfig.ts` prüfen ließe. Diese Prüfung ist deshalb die billigere,
	 * erreichbare Absicherung: Jedes Feld aus der handgepflegten Liste muss
	 * wenigstens ein echtes Schema-Feld sein, das in der Schritt-Konfiguration
	 * auch tatsächlich vorkommt — ein Tippfehler oder eine spätere Umbenennung
	 * in `formConfig.ts` fällt damit auf. Eine Aussage über VOLLSTÄNDIGKEIT
	 * (fehlt dort ein Feld, das eigentlich dazugehört) trifft sie nicht.
	 */
	it('jedes im Lebend-Zweig ausgeblendete Feld existiert tatsächlich in der Schritt-Konfiguration', () => {
		const allFields = new Set(formStepsConfig.flatMap((step) => step.fields));
		for (const field of fieldsOutsideReportKind('alive')) {
			expect(allFields.has(field)).toBe(true);
		}
	});

	it('ist rein — zweimaliger Aufruf mit demselben Zweig liefert dieselbe Liste', () => {
		expect(fieldsOutsideReportKind('alive')).toEqual(fieldsOutsideReportKind('alive'));
	});
});
