/**
 * Pure Anzeige-Logik für den Validierungs-Alert in StepNavigation.svelte.
 *
 * Ziel: Fehler werden NICHT sofort beim Betreten eines Schritts angezeigt
 * (premature errors), sondern erst nachdem der Nutzer aktiv versucht hat,
 * mit einem invaliden Schritt fortzufahren ("Weiter"/"Absenden" geklickt).
 *
 * `attemptedStep` (Schrittnummer oder `null`) wird als schlichter `$state` in
 * StepNavigation.svelte selbst verwaltet — die Initialisierung (`null`),
 * das Markieren (`= currentStep`) und das Zurücksetzen (`= null`) sind triviale
 * Zuweisungen ohne eigene Logik und werden dort direkt inline vorgenommen.
 * Hier verbleibt nur die tatsächliche Entscheidungslogik.
 */

/** Schrittnummer des zuletzt versuchten (aber ggf. gescheiterten) "Weiter", oder `null` */
export type StepAttemptMarker = number | null;

/**
 * Entscheidet, ob der Inline-Validierungs-Alert sichtbar sein soll:
 * Nur wenn der Versuch GENAU zum aktuellen Schritt gehört (kein veralteter
 * Versuch eines verlassenen Schritts) UND dieser Schritt (weiterhin) invalide ist.
 */
export function shouldShowStepAlert(
	attemptedStep: StepAttemptMarker,
	currentStep: number,
	canGoNext: boolean
): boolean {
	return attemptedStep === currentStep && !canGoNext;
}

/** Eine Fehlermeldung eines Schritts, zusammen mit dem auslösenden Feldnamen. */
export interface StepAlertMessage {
	field: string;
	message: string;
}

/**
 * Liefert alle nicht-leeren Fehlermeldungen eines Schritts inkl. Feldname.
 *
 * Der Feldname bleibt erhalten, damit `{#each}` in StepNavigation.svelte einen
 * eindeutigen Key hat: Zwei verschiedene Felder können denselben Meldungstext
 * teilen (z.B. `sightingFrom`/`sightingFromText`), ein Keying nur auf den Text
 * würde dann mit `each_key_duplicate` kollidieren.
 */
export function getStepAlertMessages(errors: Record<string, string>): StepAlertMessage[] {
	return Object.entries(errors)
		.filter((entry): entry is [string, string] => Boolean(entry[1]))
		.map(([field, message]) => ({ field, message }));
}
