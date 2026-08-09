/**
 * Die konfigurierbaren Spalten der Sichtungstabelle: Startzustand und
 * Beschriftung.
 *
 * Kein Sortierschlüssel: Die Liste speiste bis zum Schnitt der Seite auch ein
 * `sortKey`-Feld, das nirgends gelesen wurde — sortierbar ist eine Spalte
 * dadurch, dass ihr Kopf in `SichtungenTable.svelte` über `sortableTh`
 * gerendert wird. Ein zweites, ungenutztes Feld daneben behauptete einen
 * Vertrag, den es nicht gibt.
 *
 * Als eigenes Modul und nicht inline in `+page.svelte`: Das Spalten-Dropdown
 * steht im Seitenkopf, die Spalten selbst in `SichtungenTable.svelte`, und
 * `loadColumnPreferences` merged einen gespeicherten Stand gegen genau diese
 * Defaults (`columnPreferences.ts`). Drei Aufrufstellen, eine Quelle.
 */

/**
 * `email`, `distance` und `distribution` starten aus: Mit ihnen war die Tabelle
 * in der Default-Auswahl 1456 px breit, und aus dem Viewport liefen ausgerechnet
 * Status und Aktionen — die Spalten, wegen derer man die Tabelle öffnet.
 * Abgeschaltet sind sie nicht weg, sondern eine Checkbox im „Spalten"-Dropdown
 * entfernt.
 *
 * `referenceId` startet seit 2026-08-09 ebenfalls aus (Entscheidung Jan). Die
 * ID selbst bleibt unverzichtbar — sie steht in der Team-Benachrichtigung, das
 * Suchfeld sucht sie, `/admin/ref/[refId]` löst sie auf, und alle 19.953 Zeilen
 * haben eine. Als **Spalte** trägt sie trotzdem wenig: Die echten Kennungen
 * sind 24-stellige Zufallsketten (`fr6j2uikz8zsldhktfez7x3n`; nur die
 * E2E-Testdaten sehen mit `E2E-024` handlich aus). Damit war sie die breiteste
 * Spalte der Tabelle für einen Wert, den man weder überfliegen noch vergleichen
 * kann — der Arbeitsweg ist „ID in die Suche einfügen und landen", und danach
 * ist es ohnehin die einzige Zeile.
 */
export const DEFAULT_COLUMN_VISIBILITY = {
	referenceId: false,
	sightingDate: true,
	created: true,
	email: false,
	species: true,
	distance: false,
	totalCount: true,
	juvenileCount: true,
	distribution: false,
	behavior: false,
	seaState: false,
	wind: false,
	visibility: false,
	mediaUpload: true,
	spamScore: true,
	balticSea: true,
	verified: true,
	actions: true
};

export type ColumnVisibility = typeof DEFAULT_COLUMN_VISIBILITY;

export const AVAILABLE_COLUMNS: { key: keyof ColumnVisibility; label: string }[] = [
	{ key: 'referenceId', label: 'Referenz-ID' },
	{ key: 'sightingDate', label: 'Sichtungsdatum' },
	{ key: 'created', label: 'Meldedatum' },
	{ key: 'email', label: 'E-Mail' },
	{ key: 'species', label: 'Tierart' },
	{ key: 'distance', label: 'Entfernung' },
	{ key: 'totalCount', label: 'Anzahl' },
	{ key: 'juvenileCount', label: 'Jung' },
	{ key: 'distribution', label: 'Verteilung' },
	{ key: 'behavior', label: 'Verhalten' },
	{ key: 'seaState', label: 'Seegang' },
	{ key: 'wind', label: 'Wind' },
	{ key: 'visibility', label: 'Sichtweite' },
	// Kein Eintrag für den Totfund: Seine Kennzeichnung steht in einer festen
	// Spalte ganz links und ist bewusst nicht abschaltbar — als „Totfund
	// (Ja/Nein)"-Spalte am rechten Rand war sie genau dann weg, wenn man viele
	// Spalten eingeschaltet hatte und am wenigsten hinsah.
	{ key: 'mediaUpload', label: 'Aufnahme' },
	{ key: 'spamScore', label: 'Spam' },
	{ key: 'balticSea', label: 'Ostsee' },
	{ key: 'verified', label: 'Status' },
	{ key: 'actions', label: 'Aktionen' }
];
