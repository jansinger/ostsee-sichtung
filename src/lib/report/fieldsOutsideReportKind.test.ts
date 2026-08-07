import { describe, expect, it } from 'vitest';
import { formStepsConfig } from './formConfig';
import { fieldsOutsideReportKind, reportKindClearedNotice } from './fieldsOutsideReportKind';

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

	/**
	 * Seit dem UX-Review 2026-08-07 steht `distance` mit in der Liste: Die
	 * Entfernung zum Tier entfällt im Totfund-Zweig (`HIDDEN_WHEN_DEAD`), und
	 * die Reihenfolge folgt der Schritt-Konfiguration — `distance` steht auf
	 * Schritt 2 und damit vor den Verhaltensfeldern auf Schritt 3.
	 *
	 * Praktisch heißt das: Wer im Lebend-Zweig eine Entfernung gewählt hat und
	 * danach im Totfund-Zweig startet, findet den Wert nicht mehr im
	 * Formular-Zustand — er ginge sonst unvalidiert und unsichtbar mit ans
	 * Backend.
	 */
	it('nennt für den Zweig "dead" die Entfernung und die drei Verhaltensfelder', () => {
		expect(fieldsOutsideReportKind('dead')).toEqual([
			'distance',
			'behavior',
			'behaviorText',
			'reaction'
		]);
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

/**
 * UX-Review (2026-08-06, Punkt 3): Der Zweigwechsel über „Ändern" räumt die
 * Felder des verlassenen Zweigs aus dem Formular-Zustand — bis dahin still.
 * Wer auf Schritt 2 „Zustand des Tieres" und „Größe" ausgefüllt hatte und
 * zurück auf „lebendes Tier" wechselt, findet sie danach kommentarlos nicht
 * mehr vor und kann nicht wissen, ob auch Position, Datum und Fotos betroffen
 * sind. Genau diese Sorge beantwortet der zweite Halbsatz.
 *
 * Die Meldung hängt an dem Zweig, in dem das Formular JETZT steht — sie sagt,
 * was WEG ist, nicht was bleibt: Im Lebend-Zweig sind das die Totfund-Angaben,
 * im Totfund-Zweig die Verhaltensangaben. Dieselbe Blickrichtung wie
 * `fieldsOutsideReportKind` oben.
 */
describe('reportKindClearedNotice', () => {
	it('nennt im Lebend-Zweig die entfernten Totfund-Angaben', () => {
		expect(reportKindClearedNotice('alive', 2)).toBe(
			'Ihre Angaben zum Totfund wurden entfernt, alles Übrige bleibt erhalten.'
		);
	});

	it('nennt im Totfund-Zweig die entfernten Verhaltens- und Entfernungsangaben', () => {
		// Seit `distance` beim Totfund entfällt (UX-Review 2026-08-07), räumt der
		// Start im Totfund-Zweig auch die Entfernung — der Text muss beides nennen.
		expect(reportKindClearedNotice('dead', 1)).toBe(
			'Ihre Angaben zu Verhalten und Entfernung wurden entfernt, alles Übrige bleibt erhalten.'
		);
	});

	/**
	 * Der wichtigste Fall: Ohne diese Bedingung meldete JEDER Start des
	 * Formulars eine Entfernung — auch der allererste, bei dem es nichts zu
	 * entfernen gab, und der Wechsel zurück in denselben Zweig. Eine Meldung
	 * über eine Änderung, die nicht stattgefunden hat, ist schlimmer als keine.
	 */
	it('schweigt, wenn tatsächlich nichts entfernt wurde', () => {
		expect(reportKindClearedNotice('alive', 0)).toBeNull();
		expect(reportKindClearedNotice('dead', 0)).toBeNull();
	});
});
