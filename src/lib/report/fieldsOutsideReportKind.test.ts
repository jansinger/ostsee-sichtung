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
	 * Seit dem 2026-08-06 gibt es die handgepflegte `FOREIGN_TO_ALIVE`-Liste
	 * nicht mehr: `getFormSteps` entfernt die Totfund-Felder über
	 * `HIDDEN_WHEN_ALIVE` selbst aus dem Lebend-Zweig, und beide Richtungen
	 * fallen hier aus derselben Quelle an. Die Erwartungswerte oben bleiben
	 * trotzdem feste Literale (B4) — nachgerechnet mit der Formel der
	 * Implementierung könnten sie per Konstruktion nie rot werden.
	 *
	 * Diese Prüfung bleibt als billige Zusatzabsicherung: Was hier
	 * herausfällt, muss in beiden Richtungen ein Feld sein, das in der
	 * Schritt-Konfiguration überhaupt vorkommt. Ein Tippfehler in einer der
	 * `HIDDEN_WHEN_*`-Listen — die `getFormSteps` still ignorieren würde, weil
	 * sie nur filtert — fällt damit auf.
	 */
	it.each(['alive', 'dead'] as const)(
		'jedes im Zweig "%s" ausgeblendete Feld existiert tatsächlich in der Schritt-Konfiguration',
		(kind) => {
			const allFields = new Set(formStepsConfig.flatMap((step) => step.fields));
			const foreign = fieldsOutsideReportKind(kind);

			expect(foreign.length).toBeGreaterThan(0);
			for (const field of foreign) {
				expect(allFields.has(field)).toBe(true);
			}
		}
	);

	it('ist rein — zweimaliger Aufruf mit demselben Zweig liefert dieselbe Liste', () => {
		expect(fieldsOutsideReportKind('alive')).toEqual(fieldsOutsideReportKind('alive'));
	});
});
