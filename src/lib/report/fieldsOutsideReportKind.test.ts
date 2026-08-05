import { describe, expect, it } from 'vitest';
import { formStepsConfig, getFormSteps } from './formConfig';
import { fieldsOutsideReportKind } from './fieldsOutsideReportKind';

/**
 * Task 8, korrigierte Fassung: Es gibt keinen „vorherigen Zweig" mehr, gegen
 * den ein Wechsel erkennbar wäre (`changeKind()` entfernt `isDead` aus den
 * gespeicherten `FORM_DATA`, siehe reportKind.ts). Maßgeblich ist deshalb
 * ausschließlich, was NICHT in den Zweig gehört, in dem das Formular JETZT
 * startet — unabhängig davon, ob und wie oft vorher gewechselt wurde, und auch
 * für zweigfremde Daten aus einer älteren Sitzung im localStorage.
 */
describe('fieldsOutsideReportKind', () => {
	it('nennt für den Zweig "alive" die Totfund-Felder, die dort nicht hingehören', () => {
		expect(fieldsOutsideReportKind('alive')).toEqual(
			expect.arrayContaining(['deadCondition', 'deadSize', 'deadPhoneContact'])
		);
	});

	it('nennt für den Zweig "dead" die Verhaltensfelder, die dort nicht hingehören', () => {
		expect(fieldsOutsideReportKind('dead')).toEqual(
			expect.arrayContaining(['behavior', 'behaviorText', 'reaction'])
		);
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
	 * Cross-Check gegen `getFormSteps`: Für den Totfund-Zweig blendet
	 * `getFormSteps({ isDead: true })` genau die Verhaltensfelder aus. Der Test
	 * vergleicht gegen diese einzige Quelle, statt eine zweite, von Hand
	 * gepflegte Liste zu unterstellen — zwei Quellen sind hier die eigentliche
	 * Gefahr, nicht das Verhalten selbst.
	 */
	it('deckt sich für den Totfund-Zweig mit dem, was getFormSteps dort tatsächlich entfernt', () => {
		const allFields = formStepsConfig.flatMap((step) => step.fields);
		const keptWhenDead = new Set(getFormSteps({ isDead: true }).flatMap((step) => step.fields));
		const removedWhenDead = allFields.filter((field) => !keptWhenDead.has(field));

		expect([...fieldsOutsideReportKind('dead')].sort()).toEqual(removedWhenDead.sort());
	});

	it('ist rein — zweimaliger Aufruf mit demselben Zweig liefert dieselbe Liste', () => {
		expect(fieldsOutsideReportKind('alive')).toEqual(fieldsOutsideReportKind('alive'));
	});
});
