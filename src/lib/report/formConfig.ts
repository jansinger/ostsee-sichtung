/**
 * Modern whale sighting form configuration
 * Richtlinien: docs/DESIGN_GUIDE.md, verbindliche Regeln: .claude/rules/design-system.md
 */

import { sightingSchema } from '$lib/form/validation/sightingSchema';
import { SightingFromEnum } from './formOptions/sightingFrom';
import type { FormStep, SightingFormData } from './types';
// Typ-Import, kein Laufzeit-Import — der Zyklus formConfig.ts →
// components/sections/boatDriveReset.ts → formOptions/sightingFrom.ts bleibt
// damit unkritisch: `boatDriveReset.ts` importiert nichts, das seinerseits
// formConfig.ts lädt, und ein reiner Typ-Import wird beim Bundling ohnehin
// vollständig entfernt.
import type { SightingFromValue } from './components/sections/boatDriveReset';

export const sightingSchemaDescription = sightingSchema.describe();

export const initialFormState: SightingFormData =
	sightingSchemaDescription.default as SightingFormData;
export const sightingSchemaFields = sightingSchemaDescription.fields;

/**
 * Multi-step form structure following UX best practices
 * Step 1: Location & Time (position and temporal data)
 * Step 2: Sighting Details (species, count, circumstances)
 * Step 3: Behavioral observations (optional details)
 * Step 4: Observer information (contact data)
 */
/**
 * Contact field names that are persisted/restored between sessions.
 * Used by FormActions and Step4Contact to clear saved contact data
 * without a page reload.
 */
/**
 * Straße, PLZ und Ort werden seit dem Wegfall der Adressabfrage NICHT mehr
 * gespeichert (`UserContactData`), stehen hier aber weiterhin: „Kontaktdaten
 * löschen" soll auch einen Wert aufräumen, den ein früherer Besuch noch in den
 * Formular-State gespiegelt hat.
 */
export const USER_CONTACT_FIELDS = [
	'firstName',
	'lastName',
	'email',
	'phone',
	'street',
	'zipCode',
	'city',
	'shipName',
	'homePort',
	'boatType',
	'nameConsent',
	'shipNameConsent',
	'persistentDataConsent'
] as const;

export const formStepsConfig: FormStep[] = [
	{
		id: 'location-time',
		title: 'Position & Zeitpunkt',
		description: 'Wo und wann haben Sie die Sichtung gemacht?',
		fields: [
			'hasPosition',
			'latitude',
			'longitude',
			// `seaMark` steht hier bewusst NICHT mehr: Die Ortsbeschreibung ist seit
			// A2.4 ein einziges Freitextfeld (`waterway`). Schema-Eintrag und
			// DB-Spalte `seezeichen` bleiben — die Admin-Maske und die Legacy-API
			// schreiben es weiter.
			'waterway',
			'sightingDate',
			'sightingTime'
		]
	},
	{
		id: 'sighting-details',
		title: 'Angaben zum Tier',
		description: 'Was haben Sie genau beobachtet?',
		fields: [
			// Die Medien-Felder stehen seit dem 2026-08-04 hier und VOR den
			// Tierangaben (Wunsch des Museums: „Foto hochladen als erste Abfrage noch
			// vor Tierinformation"). Der Grund wiegt schwerer als die Reihenfolge: Auf
			// Schritt 3 stand der Upload unter dem prominenten „Schritt
			// überspringen"-Knopf und blieb damit für jeden unsichtbar, der ihn
			// benutzte — obwohl Aufnahmen die wertvollste Einzelangabe der Meldung
			// sind. Schritt 2 ist Pflichtschritt.
			//
			// Die Reihenfolge in dieser Liste ist nicht kosmetisch: `findStepForErrors`
			// läuft sie ab, um zum ersten fehlerhaften Feld zu springen.
			'mediaFile',
			'mediaUpload',
			'mediaConsent',
			'species',
			'totalCount',
			'juvenileCount',
			'distance',
			'sightingFrom',
			'sightingFromText',
			'boatDrive',
			// `boatDriveText` steht hier bewusst NICHT mehr: Es hängt an
			// `BoatDriveEnum.OTHER`, und das Meldeformular bietet seit dem 2026-08-04
			// nur noch "Motor lief"/"Motor lief nicht" an (PR 4). Schema-Eintrag und
			// DB-Spalte `bootsantrieb_text` bleiben — die Admin-Maske schreibt es weiter.
			//
			// `isDead` steht hier bewusst NICHT mehr: Die Einstiegsseite („Was
			// möchten Sie melden?") beantwortet Sichtung/Totfund bereits vor dem
			// Formular und schreibt den Wert über `initialIsDead` in den State
			// (Task 6/7). Der Schalter auf Schritt 2 ist im Meldeformular durch eine
			// Rückmeldung ersetzt (`AnimalInfo.svelte`) — ein Feld, das dort nicht
			// mehr bedient wird, braucht auch keine Schritt-Validierung. Schema-
			// Eintrag und DB-Spalte `totfund` bleiben — die Admin-Maske zeigt den
			// Schalter weiterhin und schreibt ihn.
			'deadCondition',
			// `deadSex` steht hier bewusst NICHT mehr: Das Museum hat das Geschlecht
			// beim Totfund am 2026-08-04 aus dem Meldeformular abbestellt (C4) —
			// Laien können es am Strand kaum bestimmen. Schema-Eintrag und DB-Spalte
			// `totfund_geschlecht` bleiben — die Admin-Maske schreibt es weiter.
			'deadSize',
			'deadPhoneContact'
		]
	},
	{
		id: 'observations',
		title: 'Weitere Informationen',
		description: 'Details zu Verhalten und Umweltbedingungen',
		fields: [
			// `distribution`/`distributionText` stehen hier bewusst NICHT mehr: Das
			// Museum hat das Feld am 2026-08-04 aus dem Meldeformular abbestellt —
			// es lässt sich aus der Anzahl der Tiere erschließen. Schema-Eintrag und
			// DB-Spalte `verteilung` bleiben — die Admin-Maske schreibt es weiter.
			'behavior',
			'behaviorText',
			'reaction',
			'shipCount',
			'seaState',
			'visibility',
			'windForce',
			'shipName',
			'homePort',
			'boatType'
			// `mediaFile`/`mediaUpload`/`mediaConsent` stehen seit dem 2026-08-04 im
			// Schritt „sighting-details" — Begründung dort.
		],
		isOptional: true
	},
	{
		id: 'contact',
		title: 'Kontaktdaten',
		description: 'Ihre Informationen für Rückfragen',
		fields: [
			'firstName',
			'lastName',
			'email',
			'phone',
			'nameConsent',
			'shipNameConsent',
			'notes',
			'privacyConsent',
			'persistentDataConsent'
		]
	}
];

/**
 * Eingabe für `getFormSteps`. Bewusst das Formularobjekt statt einzelner Flags:
 * Kommt eine dritte Bedingung dazu, ändert sich die Signatur nicht mehr.
 */
export type FormStepsInput = {
	isDead?: boolean | number | string | null;
	// `| undefined` steht explizit dabei (nicht nur implizit über `?:`): Das
	// Projekt fährt `exactOptionalPropertyTypes: true` — ohne den expliziten
	// Zusatz lässt sich `undefined` einem Objektliteral nicht als Wert
	// zuweisen, nur weglassen. `getFormSteps({ sightingFrom: undefined })`
	// kommt so aber tatsächlich vor (Admin-Maske vor dem Laden eines
	// Datensatzes) und muss zuweisbar bleiben.
	sightingFrom?: number | string | null | undefined;
};

/**
 * Normalisiert `isDead` aus allen Quellen, in denen es auftaucht: Boolean aus dem
 * Formular, `0`/`1` aus der Datenbank, String aus dem localStorage.
 *
 * Einzige Definition im Projekt — auch `wording.ts` importiert sie für die
 * Totfund-Ansprache auf Schritt 2, statt eine eigene Kopie zu pflegen. Genau
 * das war vorher nicht der Fall: Eine zweite, enger rechnende Kopie in
 * `wording.ts` prüfte Strings nur gegen `'true'` und wertete den DB-Wert
 * `'1'` fälschlich als Sichtung — das Formular hätte dann die
 * Verhaltensfelder ausgeblendet, während die Überschrift weiter „Was haben
 * Sie beobachtet?" fragte.
 *
 * Für den Totfund-Schalter selbst liefert `createForm.handleChange` einen
 * echten Boolean (`target.checked`); der String-Fall entsteht dort nicht.
 * `undefined` kommt trotzdem vor: Die Admin-Maske füllt das Formular aus
 * einem geladenen Datensatz. Ein String an einer solchen Stelle war in
 * dieser Codebasis schon einmal ein echter Fehler (`BaseRadio` verglich
 * strikt gegen Zahlen, im State lag der String aus dem DOM-Event — PR 4).
 *
 * Nimmt `unknown` an (nicht nur `FormStepsInput['isDead']`), weil
 * `wording.ts`s öffentliche Funktionen `isDead` ebenfalls als `unknown`
 * führen — der Wert kommt dort teils direkt aus reaktivem Formular-State.
 */
export function isDeadFinding(value: unknown): boolean {
	return value === true || value === 1 || value === '1' || value === 'true';
}

/**
 * Felder, die beim Totfund entfallen. Ein totes Tier zeigt kein Verhalten und
 * reagiert nicht — die Angaben wären für den Melder unbeantwortbar.
 *
 * WICHTIG: Diese Liste ist die halbe Miete, nicht die ganze. Sie steuert
 * ausschließlich die Validierung — gelesen wird sie nur von `stepValidation`,
 * gerendert wird aus ihr nichts. Wer ein Feld nur hier entfernt, bekommt ein
 * sichtbares, aber unvalidiertes Feld, dessen Wert trotzdem mit ans Backend
 * geht. Wer es nur im Markup versteckt, bekommt die Umkehrung: ein unsichtbares
 * Feld, das weiter validiert wird, und einen Melder in einer Sackgasse ohne
 * sichtbare Fehlermeldung.
 *
 * Beides gehört deshalb zusammen entschieden: Eintrag hier UND eine Bedingung
 * an der Aufrufstelle im Markup, beide über `isDeadFinding` — nie eine zweite,
 * eigene Regel daneben. Für diese drei Felder sitzt die Markup-Seite in
 * `steps/Step3Observations.svelte`.
 */
const HIDDEN_WHEN_DEAD = ['behavior', 'behaviorText', 'reaction'] as const;

/**
 * Felder, die das EIGENE Wasserfahrzeug betreffen. Sie entfallen, wenn von Land
 * gemeldet wurde.
 *
 * `shipNameConsent` steht bewusst mit in der Liste: Eine Einwilligung zur
 * Veröffentlichung des Schiffsnamens ohne erhobenen Schiffsnamen ist eine Frage
 * ohne Bezugsgegenstand.
 *
 * NICHT enthalten: `shipCount` („Anzahl ANDERER Schiffe in näherer Umgebung" —
 * Störungskontext, von Land aus genauso beobachtbar) und `distance`
 * („Entfernung zum Tier" — auch vom Strand aus sinnvoll).
 *
 * Dieselbe „halbe Miete"-Warnung wie bei `HIDDEN_WHEN_DEAD` gilt hier genauso:
 * Eintrag hier UND eine Bedingung an der Aufrufstelle im Markup, beide über
 * `isFromLand` — nie eine zweite, eigene Regel daneben. Markup-Seite:
 * `sections/BoatInfo.svelte` (`shipName`, `homePort`, `boatType`),
 * `sections/Behavior.svelte` (`reaction`) und `steps/Step4Contact.svelte`
 * (`shipNameConsent`). `boatDrive` braucht dort KEINE eigene Bedingung —
 * `sections/SightingDetails.svelte` zeigt es ohnehin nur bei Segelschiff/
 * Motorboot (`isBoatSightingFrom`), eine Teilmenge von „nicht Land".
 *
 * **Exportiert**, weil `ModernReportForm.svelte` dieselbe Liste noch für eine
 * DRITTE Sache braucht (Review-Befund, Task 11, zweite Runde): Ausblenden
 * allein reicht nicht — ein ausgeblendetes Feld bleibt sonst unsichtbar, aber
 * weiter im `$form`-Zustand stehen und ginge beim Absenden mit ans Backend.
 *
 * Ein erster Versuch räumte dafür `$form` per `$effect` leer, sobald „Land"
 * galt — das löste GENAU DAS aus, was es verhindern sollte: `onSubmit`
 * baut aus denselben (jetzt geleerten) Werten auch die dauerhaft zu
 * speichernden Kontaktdaten (`shipName`/`homePort`/`boatType`/
 * `shipNameConsent`), und `saveUserContactDataWithConsent` überschreibt den
 * gespeicherten Datensatz vollständig, ohne Merge
 * (`src/lib/storage/localStorage.ts`). Ein wiederkehrender Melder, dessen
 * Bootsdaten gespeichert waren, verlor sie beim nächsten Land-Bericht.
 *
 * Der Fix sitzt deshalb NICHT im Formular-Zustand, sondern am Absende-Rand:
 * `ModernReportForm.svelte`s `onSubmit` entfernt dieselbe Liste (ohne
 * `boatDrive`, das einen eigenen, gezielteren Reset-Mechanismus hat —
 * Begründung dort) nur aus dem Objekt, das tatsächlich an den Server geht.
 * `$form` selbst bleibt unangetastet: Die persistierten Kontaktdaten werden
 * aus `values` (dem UNGEKÜRZTEN Submit-Objekt) gebaut und bleiben deshalb
 * unverändert stehen, und ein Melder, der versehentlich auf „Land" stellt und
 * zurückwechselt, findet seinen getippten Schiffsnamen noch vor.
 */
export const HIDDEN_WHEN_FROM_LAND = [
	'boatDrive',
	'boatType',
	'shipName',
	'homePort',
	'shipNameConsent',
	'reaction'
] as const;

/**
 * Nur ein ausdrückliches „Land" blendet aus.
 *
 * `sightingFrom` ist `integer default(0) notNull`, und `0` bedeutet
 * GLEICHZEITIG „noch nicht beantwortet" und „Sonstiges" (Kajak, SUP, Seebrücke).
 * Eine Regel „zeige nur bei Segelschiff/Motorboot/Fähre" würde die Felder
 * deshalb vor der Beantwortung ausblenden und für alle Sonstiges-Melder
 * dauerhaft.
 *
 * Nimmt `SightingFromValue` (aus `boatDriveReset.ts`) statt
 * `FormStepsInput['sightingFrom']` an: Drei Komponenten (`BoatInfo.svelte`,
 * `Behavior.svelte`, `Step4Contact.svelte`) rufen diese Funktion aus dem
 * Markup heraus mit `$form.sightingFrom` auf und haben mit `getFormSteps`s
 * Validierungs-Eingabe nichts zu tun — der Parametertyp sollte das nicht
 * vortäuschen. `SightingFromValue` beschreibt denselben Wertebereich (String
 * vom HTML-Select oder Number aus dem Yup-Schema), ist aber an der Stelle
 * definiert, die auch die Markup-Aufrufer schon kennen — kein Import-Zyklus,
 * da `boatDriveReset.ts` nichts importiert, das seinerseits `formConfig.ts`
 * lädt, und es sich hier um einen reinen Typ-Import handelt.
 */
export function isFromLand(value: SightingFromValue): boolean {
	return Number(value) === SightingFromEnum.LAND;
}

export function getFormSteps(data: FormStepsInput): FormStep[] {
	const hidden = new Set<string>();
	if (isDeadFinding(data.isDead)) {
		HIDDEN_WHEN_DEAD.forEach((field) => hidden.add(field));
	}
	if (isFromLand(data.sightingFrom)) {
		HIDDEN_WHEN_FROM_LAND.forEach((field) => hidden.add(field));
	}

	if (hidden.size === 0) {
		return formStepsConfig;
	}

	return formStepsConfig.map((step) => ({
		...step,
		fields: step.fields.filter((field) => !hidden.has(field))
	}));
}
