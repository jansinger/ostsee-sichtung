import { formStepsConfig, getFormSteps } from '$lib/report/formConfig';
import type { ReportKind } from '$lib/report/reportKind';
import type { SightingFormData } from '$lib/types';

/**
 * Totfund-Felder, die im Lebend-Zweig nicht hingehören.
 *
 * Ohne Gegenstück in `getFormSteps`: Die Felder werden dort in keinem Zweig
 * aus der Schritt-Konfiguration entfernt — im Meldeformular blendet einzig
 * `AnimalInfo.svelte` den `DeadAnimal`-Block per
 * `{#if isDeadFinding($form.isDead)}` optisch aus. Eine einzige Quelle für
 * beide Richtungen (siehe unten) ist deshalb hier nicht möglich, ohne
 * `getFormSteps` mit anzufassen — das wäre eine Änderung an der
 * Schritt-Validierung, die dieser Task nicht verlangt.
 */
const FOREIGN_TO_ALIVE: (keyof SightingFormData)[] = [
	'deadCondition',
	'deadSize',
	'deadPhoneContact'
];

/**
 * Felder, die NICHT in den angegebenen Zweig gehören — unabhängig davon, ob
 * und wie oft vorher gewechselt wurde. Ein `behavior`, das im Formularzustand
 * steht, während der Melder im Totfund-Zweig ist, ginge beim Absenden mit ans
 * Backend — und die Schritt-Validierung prüft es nicht mehr, weil es aus
 * `getFormSteps()` verschwunden ist. Umgekehrt genauso mit `deadCondition` im
 * Lebend-Zweig.
 *
 * Bewusst nicht als „beim Wechsel zu leerende Felder" formuliert: Seit
 * `changeKind()` (`reportKind.ts`) `isDead` aus den gespeicherten `FORM_DATA`
 * entfernt, ist ein vorheriger Zweig beim erneuten Betreten des Formulars
 * nicht mehr rekonstruierbar — dort steht dann nur noch der Schema-Default.
 * Die Funktion beantwortet deshalb ausschließlich „was gehört nicht in den
 * Zweig, in dem ich JETZT bin" — das deckt zusätzlich den Fall ab, dass
 * zweigfremde Daten aus einer älteren Sitzung im localStorage liegen, den ein
 * Wechsel-Vergleich nie sähe, und ist idempotent.
 *
 * Für den Totfund-Zweig aus `getFormSteps` abgeleitet (einzige Quelle: genau
 * die Felder, die dort beim Totfund aus der Schritt-Konfiguration verschwinden)
 * statt einer zweiten, von Hand gepflegten Liste — siehe den Cross-Check in
 * `fieldsOutsideReportKind.test.ts`.
 */
export function fieldsOutsideReportKind(kind: ReportKind): (keyof SightingFormData)[] {
	if (kind === 'alive') {
		return [...FOREIGN_TO_ALIVE];
	}

	const allFields = formStepsConfig.flatMap((step) => step.fields);
	const keptWhenDead = new Set(getFormSteps({ isDead: true }).flatMap((step) => step.fields));
	return allFields.filter((field) => !keptWhenDead.has(field)) as (keyof SightingFormData)[];
}
