/**
 * Ansprache im Meldeformular: Sichtung oder Totfund.
 *
 * Das Museum will für den Totfund eigene Formulierungen — „Was haben Sie
 * gefunden?" statt „Was haben Sie beobachtet?", „Funddetails" statt
 * „Sichtungsdetails". Vorgesehen sind dafür zwei getrennte Formulare hinter
 * einer Einstiegsseite; die gibt es noch nicht.
 *
 * Bis dahin trägt der Totfund-Schalter die Unterscheidung: Er ist das erste Feld
 * der Karte „Tierinformationen" auf Schritt 2 — seit dem Umzug des Medien-Uploads
 * steht diese Karte allerdings nicht mehr ganz oben, sondern hinter dem
 * Upload-Abschnitt. Für die Ansprache reicht das: Der Schalter steht weiterhin
 * vor allem, was auf ihn reagiert (Artfrage, Detail-Karte), und der Schritt-Kopf
 * darüber wird von Svelte ohnehin reaktiv nachgezogen. Das deckt
 * genau die Stellen ab, die das Dokument für Seite 2 nennt — die Totfund-Texte
 * für Seite 1 („Funddatum", die umgedrehte Marker-Erklärung) bleiben offen,
 * weil `isDead` dort noch nicht beantwortet ist.
 *
 * Die Zuordnung steht hier an EINER Stelle statt als Ternär in drei
 * Komponenten: Sie wird beim Bau der getrennten Formulare wieder gebraucht, und
 * drei Kopien liefen bis dahin auseinander.
 */

/**
 * `isDead` als Wahrheitswert — ohne die klassische String-Falle.
 *
 * Für den Schalter selbst liefert `createForm.handleChange` einen echten
 * Boolean (`target.checked`). `undefined` kommt trotzdem vor: Die Admin-Maske
 * füllt das Formular aus einem geladenen Datensatz. Und ein String an einer
 * solchen Stelle war in dieser Codebasis schon einmal ein echter Fehler
 * (`BaseRadio` verglich strikt gegen Zahlen, im State lag der String aus dem
 * DOM-Event — PR 4).
 */
function isDeadFinding(isDead: unknown): boolean {
	if (typeof isDead === 'string') return isDead === 'true';
	return Boolean(isDead);
}

/** Beschriftung des Artfeldes auf Schritt 2. */
export function speciesQuestion(isDead: unknown): string {
	return isDeadFinding(isDead)
		? 'Welche Tierart haben Sie gefunden?'
		: 'Welche Tierart haben Sie gesehen?';
}

/** Einleitungsfrage im Kopf von Schritt 2. */
export function observationQuestion(isDead: unknown): string {
	return isDeadFinding(isDead) ? 'Was haben Sie gefunden?' : 'Was haben Sie beobachtet?';
}

/** Titel der Karte unter den Tierangaben auf Schritt 2. */
export function detailsSectionTitle(isDead: unknown): string {
	return isDeadFinding(isDead) ? 'Funddetails' : 'Sichtungsdetails';
}
