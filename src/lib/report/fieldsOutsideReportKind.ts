import { getFormSteps } from '$lib/report/formConfig';
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
 * statt einer zweiten, von Hand gepflegten Liste.
 *
 * Abschlussreview B4: Der Vergleich läuft bewusst gegen `getFormSteps({ isDead: false })`
 * und NICHT gegen `formStepsConfig` direkt. `getFormSteps` bildet mittlerweile
 * drei Achsen ab — Totfund (`isDead`), Beobachtungsort (`sightingFrom`) und
 * Medien-Upload (`uploadedFiles`, über `hasUploadedMedia`) — und diese Funktion
 * darf ausschließlich die erste beantworten. Ein Diff gegen `formStepsConfig`
 * zieht JEDE Bedingung mit herein, die `getFormSteps` unabhängig von `isDead`
 * anwendet: Beide Aufrufe unten lassen `sightingFrom` und `uploadedFiles`
 * bewusst weg (bleiben `undefined`), sodass `mediaConsent` — hier `hasUploadedMedia(undefined)`
 * ist `false` — in BEIDEN Aufrufen gleichermaßen fehlt und sich beim Differenzbilden
 * gegenseitig aufhebt, statt fälschlich als „gehört nicht in den Totfund-Zweig" zu erscheinen.
 * Genau das war der Fehler: Der vorherige Vergleich gegen `formStepsConfig` (das
 * `mediaConsent` uneingeschränkt führt) ließ `getFormSteps({ isDead: true })`s
 * Medien-bedingtes Entfernen von `mediaConsent` wie eine Totfund-Bedingung aussehen.
 * Eine künftige vierte Achse in `getFormSteps` bleibt aus demselben Grund automatisch
 * außen vor, solange sie nicht von `isDead` abhängt — keine Anpassung hier nötig.
 */
export function fieldsOutsideReportKind(kind: ReportKind): (keyof SightingFormData)[] {
	if (kind === 'alive') {
		return [...FOREIGN_TO_ALIVE];
	}

	const keptWhenAlive = getFormSteps({ isDead: false }).flatMap((step) => step.fields);
	const keptWhenDead = new Set(getFormSteps({ isDead: true }).flatMap((step) => step.fields));
	return keptWhenAlive.filter((field) => !keptWhenDead.has(field)) as (keyof SightingFormData)[];
}

/**
 * Was der Melder darüber erfahren soll, dass `fieldsOutsideReportKind`
 * tatsächlich etwas geräumt hat — oder `null`, wenn nichts zu melden ist.
 *
 * UX-Review (2026-08-06, Punkt 3): Der Wechsel über „Ändern" nahm die Felder
 * des verlassenen Zweigs kommentarlos mit. Sichtbar wird das erst Schritte
 * später, und ohne Erklärung liegt die Vermutung nahe, dass auch Position,
 * Datum und Fotos betroffen sind — genau die teuersten Eingaben. Der zweite
 * Halbsatz beantwortet das mit.
 *
 * `clearedCount` statt der Feldliste: Welche Felder es einzeln waren, ist für
 * den Melder ohne Belang — er hat sie unter „Angaben zum Totfund" bzw.
 * „Verhalten" ausgefüllt, nicht unter `deadPhoneContact`. Gebraucht wird nur
 * die Unterscheidung „es wurde etwas geräumt" von „es war nichts da": Eine
 * Meldung über eine Änderung, die nicht stattgefunden hat, ist schlimmer als
 * keine — und dieser Fall ist der häufigere (jeder gewöhnliche Formularstart,
 * und der Wechsel zurück in denselben Zweig).
 */
export function reportKindClearedNotice(kind: ReportKind, clearedCount: number): string | null {
	if (clearedCount === 0) {
		return null;
	}

	const removed = kind === 'alive' ? 'zum Totfund' : 'zum Verhalten der Tiere';
	return `Ihre Angaben ${removed} wurden entfernt, alles Übrige bleibt erhalten.`;
}
