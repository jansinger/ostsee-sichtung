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
 * darüber wird von Svelte ohnehin reaktiv nachgezogen. Das deckt die Stellen
 * ab, die das Dokument für Seite 2 nennt. Die Totfund-Texte für Seite 1
 * („Funddatum", die umgedrehte Marker-Erklärung, der entschärfte
 * Ostsee-Hinweis) stehen weiter unten in dieser Datei — `isDead` ist dort über
 * `initialIsDead` bereits auf Schritt 1 beantwortet.
 *
 * Die Zuordnung steht hier an EINER Stelle statt als Ternär in drei
 * Komponenten: Sie wird beim Bau der getrennten Formulare wieder gebraucht, und
 * drei Kopien liefen bis dahin auseinander.
 */

// `isDeadFinding` lebt in `formConfig.ts` — Begründung und Herkunft der Regel
// stehen dort an der Definition.
import { isDeadFinding } from '$lib/report/formConfig';

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

/**
 * Titel der Datumskarte auf Schritt 1.
 *
 * Verbindliche Entscheidung des Auftraggebers (Review Task 6, Befund 1): Der
 * Lebend-Zweig behält wörtlich „Datum und Uhrzeit" — der bestehende Weg für
 * Lebend-Melder darf sich durch die Totfund-Ansprache nicht sichtbar ändern.
 */
export function dateSectionTitle(isDead: unknown): string {
	return isDeadFinding(isDead) ? 'Funddatum' : 'Datum und Uhrzeit';
}

/**
 * Einleitungszeile über den Datumsfeldern. Die Karte hat heute keine
 * Einleitung — beim Lebend-Zweig bleibt es deshalb bei `null`, statt einen
 * Satz zu erfinden, der vorher nicht da war.
 */
export function dateSectionIntro(isDead: unknown): string | null {
	return isDeadFinding(isDead) ? 'An welchem Tag war der Fund?' : null;
}

/** Frage über der Positionsangabe auf Schritt 1. */
export function positionQuestion(isDead: unknown): string {
	return isDeadFinding(isDead)
		? 'Wo haben Sie das Tier gefunden?'
		: 'Wo haben Sie das Tier gesehen?';
}

/** Erklärtext unter der Karte auf Schritt 1: sagt, wofür der Marker steht. */
export function mapHint(isDead: unknown, hasPosition: boolean, enableGPS: boolean): string {
	const verb = isDeadFinding(isDead) ? 'gefunden haben' : 'gesehen haben';
	if (!hasPosition) {
		return `Noch keine Position gewählt. Tippen Sie auf die Karte, um die Stelle zu markieren, an der Sie das Tier ${verb}.`;
	}
	const base = `Tippen Sie auf die Karte oder ziehen Sie den Marker an die Stelle, an der Sie das Tier ${verb}.`;
	return enableGPS ? `${base} Der GPS-Button übernimmt Ihre aktuelle Position.` : base;
}

/**
 * Hinweistext, wenn die gewählte Position außerhalb der Ostsee liegt.
 *
 * Beim Totfund ist eine Position an Land der Normalfall (Strandfund) — der
 * strengere Sichtungs-Wortlaut würde dort ständig aufscheinen.
 */
export function outsideBalticNotice(isDead: unknown): string {
	return isDeadFinding(isDead)
		? 'Bitte prüfen Sie die Position. Totfunde werden meist an Stränden oder Küstenabschnitten gefunden.'
		: 'Die Koordinaten liegen scheinbar außerhalb der Ostsee. Bitte prüfen Sie die Position. Bei Sichtungen von Land und küstennahen Sichtungen kann dieser Hinweis erscheinen, die Daten werden trotzdem gespeichert.';
}

/** Dringlichkeit des Ostsee-Hinweises: beim Totfund niedriger (siehe oben). */
export function outsideBalticSeverity(isDead: unknown): 'warning' | 'info' {
	return isDeadFinding(isDead) ? 'info' : 'warning';
}
