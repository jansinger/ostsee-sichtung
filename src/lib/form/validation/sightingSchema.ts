/**
 * @fileoverview Yup-Validierungsschema für Sichtungsformulare
 *
 * Dieses Modul definiert das zentrale Validierungsschema für alle Sichtungsformulare
 * in der Ostsee-Tiere-Anwendung. Es nutzt Yup für typsichere Validierung und
 * umfasst alle Felder vom GPS-Koordinaten bis zu Kontaktdaten.
 *
 * Das Schema ist in logische Abschnitte unterteilt und bietet sowohl Frontend-
 * als auch Backend-Validierung mit detaillierten Fehlermeldungen und Metadaten
 * für die automatische UI-Generierung.
 *
 * @author Ostsee-Tiere Team
 * @since 1.0.0
 */

import {
	getAnimalBehaviorOptions,
	isValidAnimalBehavior
} from '$lib/report/formOptions/animalBehavior';
import {
	getAnimalConditionOptions,
	isValidAnimalCondition
} from '$lib/report/formOptions/animalCondition';
import { getBoatDriveOptions, isValidBoatDrive } from '$lib/report/formOptions/boatDrive';
import {
	DISTANCE_UNSPECIFIED,
	getDistanceOptions,
	isValidDistance
} from '$lib/report/formOptions/distance';
import { getDistributionOptions, isValidDistribution } from '$lib/report/formOptions/distribution';
import { getEntryChannelOptions, isValidEntryChannel } from '$lib/report/formOptions/entryChannel';
import { getSeaStateOptions, isValidSeaState } from '$lib/report/formOptions/seaState';
import { getSexOptions, isValidSex } from '$lib/report/formOptions/sex';
import {
	getSightingFromOptions,
	isValidSightingFrom,
	SightingFromEnum
} from '$lib/report/formOptions/sightingFrom';
import { getSpeciesOptions, isValidSpecies } from '$lib/report/formOptions/species';
import { getVisibilityOptions, isValidVisibility } from '$lib/report/formOptions/visibility';
import { getWindDirectionOptions } from '$lib/report/formOptions/windDirection';
import { getWindStrengthOptions } from '$lib/report/formOptions/windStrength';
import * as yup from 'yup';

/**
 * Heutiger Kalendertag in Deutschland als "YYYY-MM-DD".
 *
 * Der Sichtungstag ist fachlich immer Berlin-Ortszeit. Über UTC gerechnet
 * (`toISOString()`) wäre der Tag zwischen 00:00 und 02:00 deutscher Zeit noch
 * der Vortag — heutige Sichtungen gälten dann als „Zukunft".
 *
 * Diese Datei läuft auch im Browser: Die Zone wird deshalb explizit angegeben
 * und nicht der Geräte-Zeitzone überlassen. `sv-SE` liefert die ISO-Reihenfolge.
 */
function berlinToday(): string {
	return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
}

/**
 * Reduziert eine Datumseingabe auf ihren Kalendertag "YYYY-MM-DD".
 *
 * Akzeptiert sowohl das Formularformat als auch einen ISO-Zeitstempel (so
 * liefert die Legacy-API). Der Vergleich läuft anschließend als String — bei
 * ISO-Datum ist die lexikalische Ordnung die chronologische, und damit hängt
 * das Urteil an keiner Zeitzone.
 *
 * @returns Der Kalendertag oder `null`, wenn die Eingabe kein gültiges Datum ist
 */
function toCalendarDay(value: string | undefined): string | null {
	const match = typeof value === 'string' ? /^(\d{4}-\d{2}-\d{2})/.exec(value) : null;
	if (!match) {
		return null;
	}

	const calendarDay = match[1] as string;
	// Fängt Angaben wie "2026-13-45" ab, die zwar zum Muster passen, aber keinen Tag benennen.
	const parsed = new Date(`${calendarDay}T00:00:00.000Z`);
	if (isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== calendarDay) {
		return null;
	}

	return calendarDay;
}

// Icon names for the schema - using unplugin-icons format with lucide: prefix
// These will be mapped to actual icon components in the UI layer
const icons = {
	Activity: 'lucide:activity',
	AddressIcon: 'lucide:map-pin',
	Anchor: 'lucide:anchor',
	Archive: 'lucide:archive',
	Baby: 'lucide:baby',
	Calendar: 'lucide:calendar',
	Camera: 'lucide:camera',
	Car: 'lucide:car',
	Check: 'lucide:check',
	Clock: 'lucide:clock',
	CloudRain: 'lucide:cloud-rain',
	CountIcon: 'lucide:hash',
	Eye: 'lucide:eye',
	FileText: 'lucide:file-text',
	Globe: 'lucide:globe',
	Hash: 'lucide:hash',
	Mail: 'lucide:mail',
	MapPin: 'lucide:map-pin',
	MessageCircle: 'lucide:message-circle',
	MousePointer: 'lucide:mouse-pointer',
	Move: 'lucide:move',
	Navigation: 'lucide:navigation',
	Navigation2: 'lucide:navigation-2',
	Phone: 'lucide:phone',
	Porpoise: 'custom:porpoise',
	ShieldCheck: 'lucide:shield-check',
	Ship: 'lucide:ship',
	Skull: 'lucide:skull',
	ToggleLeft: 'lucide:toggle-left',
	Upload: 'lucide:upload',
	User: 'lucide:user',
	UserCheck: 'lucide:user-check',
	Users: 'lucide:users',
	Waves: 'lucide:waves',
	Wind: 'lucide:wind',
	Zap: 'lucide:zap'
};

// Extract icon constants for use in the schema
const {
	Activity,
	AddressIcon,
	Anchor,
	Archive,
	Baby,
	Calendar,
	Camera,
	Car,
	Check,
	Clock,
	CloudRain,
	CountIcon,
	Eye,
	FileText,
	Globe,
	Hash,
	Mail,
	MapPin,
	MessageCircle,
	MousePointer,
	Move,
	Navigation,
	Navigation2,
	Phone,
	Porpoise,
	ShieldCheck,
	Ship,
	Skull,
	ToggleLeft,
	Upload,
	User,
	UserCheck,
	Users,
	Waves,
	Wind,
	Zap
} = icons;

/**
 * Basis-Validierungsschema für Sichtungsformulare
 *
 * Definiert alle Validierungsregeln für die Erfassung von Meerestier-Sichtungen
 * mit umfassender Abdeckung von GPS-Daten, Umweltbedingungen, Tier-Details
 * und Kontaktinformationen. Jedes Feld enthält Metadaten für automatische
 * UI-Generierung und mehrsprachige Fehlermeldungen.
 *
 * Yup-Schema mit allen Sichtungsfeldern
 */
export const sightingSchemaBase = yup.object().shape({
	/**
	 * Eindeutige Referenz-ID für die Sichtung
	 * Wird automatisch generiert zur internen Nachverfolgung
	 */
	referenceId: yup.string().required().label('Referenz-ID'),

	/**
	 * Array der hochgeladenen Mediendateien mit Metadaten
	 * Enthält Pfade, EXIF-Daten und Dateiermaße für Fotos/Videos
	 */
	uploadedFiles: yup
		.array()
		.of(
			yup.object().shape({
				uid: yup.string().required(), // Eindeutige ID des Clients
				filePath: yup.string().required(), // Dateipfad im Storage
				originalName: yup.string().required(), // Ursprünglicher Dateiname
				fileName: yup.string().optional(), // Interner Dateiname
				mimeType: yup.string().required(), // MIME-Type (image/jpeg, etc.)
				size: yup.number().required(), // Dateigröße in Bytes
				url: yup.string().optional(), // Öffentliche URL
				uploadedAt: yup.string().optional(), // Upload-Zeitstempel
				exifData: yup.object().optional().nullable() // EXIF-Metadaten als JSONB
			})
		)
		.optional()
		.default([]),

	//----------------------------------------------------------------------
	// Position (Positionsangabe)
	//----------------------------------------------------------------------

	/**
	 * Gibt an, ob GPS-Koordinaten verfügbar sind
	 */
	hasPosition: yup
		.boolean()
		.label('Position verfügbar')
		.meta({
			type: 'toggle',
			helpText: 'Wissen Sie die genaue GPS-Position oder haben Sie ein Bild mit GPS Daten?',
			valueText: 'Falls nein, können Sie das Gebiet beschreiben',
			icon: ToggleLeft
		})
		.default(false),

	//----------------------------------------------------------------------
	// Location (Standort)
	//----------------------------------------------------------------------

	/**
	 * Breitengrad der Sichtung (GPS-Koordinate)
	 * Erforderlich, wenn kein Fahrwasser angegeben ist
	 * Wird in Dezimalgrad gespeichert (z.B. 54.5)
	 */
	latitude: yup
		.number()
		.when('hasPosition', {
			is: true,
			then: (schema) =>
				schema
					.required('GPS-Position: Breitengrad ist erforderlich')
					.min(-90, 'Der Breitengrad muss zwischen -90° und 90° liegen')
					.max(90, 'Der Breitengrad muss zwischen -90° und 90° liegen'),
			otherwise: (schema) => schema.notRequired()
		})
		.label('Breitengrad')
		.meta({
			type: 'number',
			placeholder: 'z.B. 54.123456',
			helpText: 'Nördliche Position (N) - je mehr Nachkommastellen, desto genauer',
			valueText: 'GPS-Präzision: 6 Nachkommastellen = 11cm Genauigkeit',
			icon: Navigation
		}),

	/**
	 * Längengrad der Sichtung (GPS-Koordinate)
	 * Erforderlich, wenn kein Fahrwasser angegeben ist
	 * Wird in Dezimalgrad gespeichert (z.B. 13.5)
	 */
	longitude: yup
		.number()
		.when('hasPosition', {
			is: true,
			then: (schema) =>
				schema
					.required('GPS-Position: Längengrad ist erforderlich')
					.min(-180, 'Der Längengrad muss zwischen -180° und 180° liegen')
					.max(180, 'Der Längengrad muss zwischen -180° und 180° liegen'),
			otherwise: (schema) => schema.notRequired()
		})
		.label('Längengrad')
		.meta({
			type: 'number',
			placeholder: 'z.B. 13.456789',
			helpText: 'Östliche Position (E) - je mehr Nachkommastellen, desto genauer',
			valueText: 'Ihre GPS-Koordinaten werden mit anderen Sichtungen verglichen',
			icon: Navigation2
		}),

	/**
	 * Ortsbeschreibung in Freitext — Seegebiet, Fahrwasser oder Orientierungspunkte.
	 * Alternative zur GPS-Position: erforderlich, wenn keine GPS-Position vorliegt
	 * (hasPosition !== true), damit ein leeres Formular Schritt 1 nicht passieren kann.
	 *
	 * **Deckt seit A2.4 auch `seaMark` mit ab.** Das Meldeformular zeigt die
	 * Ortsbeschreibung als EIN Freitextfeld (Wunsch des Deutschen Meeresmuseums:
	 * „User beschreibt im Freitext"); `seaMark` ist dort nur aus `formStepsConfig`
	 * und dem Markup genommen. Beschriftung, Hilfetext und Platzhalter müssen
	 * deshalb beide Aspekte nennen — sonst verliert das Formular die
	 * Orientierungspunkte. Abgesichert in `src/lib/report/formConfig.test.ts`.
	 */
	waterway: yup
		.string()
		.max(255, 'Die Ortsbeschreibung ist zu lang (maximal 255 Zeichen)')
		.label('Wo ungefähr?')
		.meta({
			placeholder: 'z. B. Kieler Bucht, Fehmarnbelt, vor Leuchtturm Dahmeshöved',
			helpText: 'Seegebiet, Fahrwasser oder Orientierungspunkte in der Nähe',
			valueText:
				'Gewässerbezeichnungen und Orientierungspunkte helfen bei der regionalen Populationsverteilung - auch ungefähre Angaben sind wissenschaftlich wertvoll',
			icon: Waves
		})
		.when('hasPosition', {
			is: (value: unknown) => value !== true,
			then: (schema) =>
				schema.required('Bitte beschreiben Sie den Ort oder wählen Sie eine GPS-Position'),
			otherwise: (schema) => schema.notRequired()
		}),

	/**
	 * Seezeichen in der Nähe der Sichtung
	 * Optionale Zusatzinformation zur genaueren Ortsbestimmung
	 *
	 * **Nur noch in der Admin-Maske** (`sections/Location.svelte`) und über die
	 * Legacy-API (`seezeichen`) erreichbar — im Meldeformular ist der Aspekt in
	 * `waterway` aufgegangen (A2.4). Feld und DB-Spalte bleiben, damit der
	 * Altbestand angezeigt und korrigiert werden kann; `meta` deshalb NICHT
	 * entfernen — `FormField` wirft ohne.
	 */
	seaMark: yup
		.string()
		.max(255, 'Der Name des Seezeichens ist zu lang (maximal 255 Zeichen)')
		.label('Seezeichen (nur Altbestand)')
		.meta({
			placeholder: 'z.B. Leuchtturm Dahmeshöved, Tonne 14, Ansteuerungstonne',
			helpText:
				'Wird im Meldeformular nicht mehr erfasst — neue Meldungen beschreiben den Ort im Feld darüber. Bleibt für Altmeldungen und die Legacy-Schnittstelle bearbeitbar.',
			valueText:
				'Seezeichen helfen Wissenschaftlern bei der Positionsverifizierung und schaffen Vertrauen in die Datenqualität',
			icon: Anchor
		})
		.notRequired(),

	//----------------------------------------------------------------------
	// Date and Time (Datum und Zeit)
	//----------------------------------------------------------------------

	/**
	 * Datum der Sichtung
	 * Pflichtfeld, darf nicht in der Zukunft liegen
	 */
	sightingDate: yup
		.string()
		.required('Das Datum ist erforderlich')
		.test('is-valid-date', 'Das Datum liegt in der Zukunft - bitte korrigieren Sie es', (value) => {
			const calendarDay = toCalendarDay(value);
			return calendarDay !== null && calendarDay <= berlinToday();
		})
		.label('Sichtungsdatum')
		.meta({
			helpText: 'An welchem Tag war die Sichtung?',
			valueText: 'Hilft bei der saisonalen Zuordnung',
			type: 'date',
			icon: Calendar
		})
		.default(() => berlinToday()), // Standard auf heute setzen

	/**
	 * Uhrzeit der Sichtung im Format HH:MM
	 * Optional, wenn nicht bekannt
	 */
	sightingTime: yup
		.string()
		.matches(
			/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
			'Ungültige Uhrzeit - bitte Format 14:30 verwenden'
		)
		.label('Uhrzeit')
		.meta({
			placeholder: 'z.B. 14:30 oder 09:15',
			helpText: 'Zu welchem Zeitpunkt ungefähr? (optional)',
			valueText:
				'Uhrzeitangaben helfen dabei, Tagesrhythmen der Tiere zu erkennen - auch eine grobe Schätzung ist wertvoll',
			type: 'time',
			icon: Clock
		})
		.notRequired(),

	//----------------------------------------------------------------------
	// Animal (Tierangaben)
	//----------------------------------------------------------------------

	/**
	 * Art des gesichteten Tieres
	 * Pflichtfeld, muss einer gültigen Tierart entsprechen
	 */
	species: yup
		.number()
		.transform((value) => (isNaN(value) ? undefined : value))
		.required('Bitte wählen Sie eine Tierart aus')
		.test('is-valid-species', 'Diese Tierart ist nicht verfügbar', (value) =>
			isValidSpecies(String(value))
		)
		.label('Welche Tierart haben Sie gesehen?')
		.meta({
			helpText:
				'Bei Unsicherheit wählen Sie "Unbekannte Walart" bzw. "Unbekannte Robbenart" statt zu raten',
			valueText: 'Artbestimmung hilft beim Populationsmonitoring',
			type: 'select',
			options: getSpeciesOptions(true),
			icon: Porpoise
		}),

	/**
	 * Gesamtanzahl der gesichteten Tiere
	 * Pflichtfeld, muss eine positive ganze Zahl sein
	 *
	 * Untergrenze 1: Eine Sichtung ohne Tier ist keine Sichtung. Die Grenze
	 * gehört bewusst NUR hierher — in der Legacy-API kennzeichnet
	 * `anzahl_gesamt = 0` einen Totfund (`docs/LEGACY_API_SPECIFICATION.md`),
	 * dort bleibt `min(0)` stehen.
	 */
	totalCount: yup
		.number()
		.transform((value) => (isNaN(value) ? undefined : value))
		.integer('Bitte nur ganze Zahlen eingeben')
		.min(1, 'Bitte geben Sie mindestens 1 Tier an')
		.max(15, 'Bei mehr als 15 Tieren bitte 15 eintragen')
		.required('Wie viele Tiere haben Sie gesehen?')
		.label('Anzahl Tiere')
		.meta({
			placeholder: '1',
			helpText: 'Schätzen Sie die Gesamtzahl',
			valueText: 'Die Gruppengröße ist wichtig für Populationsanalysen',
			step: 1,
			icon: Hash
		})
		.default(1),

	/**
	 * Anzahl der Jungtiere unter den gesichteten Tieren
	 * Optional, muss eine positive ganze Zahl sein
	 *
	 * Jungtiere sind eine Teilmenge von `totalCount`, keine zusätzliche
	 * Gruppe — mehr Jungtiere als Tiere insgesamt kann es nicht geben.
	 * Beide Felder sind bei 15 gekappt; die Regel greift deshalb auch an
	 * der Kappungsgrenze (15/15 gültig, 15 von 10 nicht).
	 */
	juvenileCount: yup
		.number()
		.transform((value) => (isNaN(value) ? undefined : value))
		.integer('Bitte nur ganze Zahlen eingeben')
		.min(0, 'Die Anzahl muss 0 oder höher sein')
		.max(15, 'Bei mehr als 15 bitte 15 eintragen')
		.test(
			'juveniles-within-total',
			'Es können nicht mehr Jungtiere als Tiere insgesamt sein',
			function (value) {
				// Ohne Angabe greift die Regel nicht — das Feld bleibt optional.
				if (value === undefined || value === null) return true;

				// Fehlt oder taugt `totalCount` nicht, meldet dessen eigene
				// Validierung den Fehler. Hier zusätzlich anzuschlagen würde
				// denselben Sachverhalt zweimal anzeigen.
				const total = this.parent?.totalCount;
				if (typeof total !== 'number' || Number.isNaN(total)) return true;

				return value <= total;
			}
		)
		.label('Davon Jungtiere')
		.meta({
			placeholder: '0',
			helpText: 'Waren junge Tiere dabei? Bitte geben Sie die Anzahl ein.',
			valueText: 'Nachwuchsrate zeigt Gesundheit der Population',
			icon: Baby
		})
		.notRequired()
		.default(0),

	/**
	 * Gibt an, ob es sich um einen Totfund handelt
	 * Pflichtfeld, Boolean-Wert
	 */
	isDead: yup
		.boolean()
		.label('Handelt es sich um einen Totfund?')
		.meta({
			helpText: 'Handelte es sich um lebende Tiere oder einen Totfund?',
			valueText: 'Totfunde liefern wichtige Informationen über Todesursachen',
			icon: Skull
		})
		.default(false),

	/**
	 * Zustand des toten Tieres
	 * Erforderlich, wenn isDead = true
	 */
	deadCondition: yup
		.number()
		.transform((value) => (isNaN(value) ? undefined : value))
		.when('isDead', {
			is: true,
			then: (schema) =>
				schema
					.required('Bitte geben Sie den Zustand des toten Tieres an.')
					.test('is-valid-dead-condition', 'Bitte wählen Sie einen gültigen Zustand.', (value) =>
						isValidAnimalCondition(String(value))
					),
			otherwise: (schema) => schema.notRequired()
		})
		.label('Zustand des toten Tieres')
		.meta({
			helpText: 'Beschreibung des Erhaltungszustands',
			valueText: 'Der Zustand hilft bei der wissenschaftlichen Auswertung',
			type: 'select',
			options: getAnimalConditionOptions(),
			icon: Archive
		}),

	/**
	 * Geschlecht des toten Tieres
	 * Das Museum hat das Geschlecht am 2026-08-04 aus dem Meldeformular abbestellt
	 * (Analyse-Punkt C4): Laien können es am Strand kaum bestimmen, das Feld
	 * lieferte überwiegend „Unbekannt". Die Pflicht musste dabei zwingend mit weg —
	 * sonst wäre nach dem Entfernen des Markups keine Totfund-Meldung mehr
	 * absendbar gewesen. Das Feld bleibt optional für die Admin-Maske im Schema.
	 */
	deadSex: yup
		.number()
		.transform((value) => (isNaN(value) ? undefined : value))
		.test('is-valid-dead-sex', 'Bitte wählen Sie ein gültiges Geschlecht.', (value) =>
			value === undefined ? true : isValidSex(String(value))
		)
		.label('Geschlecht (Totfund)')
		.meta({
			helpText: 'Falls erkennbar',
			valueText: 'Die Geschlechtsverteilung ist wichtig für Populationsstruktur',
			type: 'select',
			options: getSexOptions(),
			icon: Users
		}),

	/**
	 * Größe des toten Tieres in cm
	 *
	 * **Optional und nullable, in beiden Zweigen** — anders als `deadCondition`
	 * darüber. Eine am Strand geschätzte Körperlänge ist eine Zusatzangabe, keine
	 * Bedingung für die Meldung.
	 *
	 * Das `.nullable()` ist nicht kosmetisch: `totfund_groesse` ist in der DB
	 * nullable und bei jeder Nicht-Totfund-Sichtung tatsächlich `NULL`. Die
	 * Admin-Maske lädt diesen Wert in den Formular-Zustand; ohne `nullable()`
	 * scheitert dort die Validierung mit „deadSize cannot be null", und ein
	 * Bestandsdatensatz ließe sich nicht mehr speichern.
	 *
	 * Bis zum 2026-08-06 stand hier statt `.nullable()` ein `when('isDead')` mit
	 * `notRequired()` in beiden Zweigen. Das sah wie ein No-op aus und war keines:
	 * In yup 1.x hebt `notRequired()` auch die Null-Sperre auf, die Nullbarkeit
	 * hing also unsichtbar an einer Verzweigung, die sonst nichts tat. Ersetzt
	 * durch das explizite `.nullable()` — identisches Verhalten in allen
	 * geprüften Fällen, aber dort lesbar, wo es gilt. Die Null-Fälle stehen
	 * seitdem in `sightingSchemaWhen.test.ts`; sie fehlten vorher und genau
	 * deshalb fiel die Änderung erst in den Admin-E2E-Tests auf.
	 */
	deadSize: yup
		.number()
		.integer('Bitte geben Sie eine ganze Zahl ein.')
		.transform((value) => (isNaN(value) ? undefined : value))
		.min(0, 'Die Größe muss positiv sein.')
		.max(300, 'Die Größe darf 300 nicht überschreiten.')
		.nullable()
		.label('Körperlänge (cm)')
		.meta({
			placeholder: 'z.B. 150',
			helpText: 'Geschätzte oder gemessene Länge',
			valueText: 'Die Körpergröße hilft bei Altersbestimmung',
			icon: Move
		}),

	/**
	 * Gibt an, ob bei einem Totfund bereits telefonisch Kontakt aufgenommen wurde
	 * Optional, Boolean-Wert
	 */
	deadPhoneContact: yup
		.boolean()
		.label('Meeresmuseum informiert')
		.meta({
			helpText: 'Wurde das Meeresmuseum bereits über den Totfund benachrichtigt?',
			valueText: 'Vermeidet Doppelmeldungen und koordiniert Bergung',
			icon: UserCheck
		})
		.default(false),

	//----------------------------------------------------------------------
	// Sighting Details (Sichtungsdetails)
	//----------------------------------------------------------------------

	/**
	 * Von wo aus wurde die Sichtung gemacht
	 * Pflichtfeld, muss einer gültigen Option entsprechen
	 */
	sightingFrom: yup
		.number()
		.required('Bitte geben Sie an, von wo die Sichtung erfolgte.')
		.test('is-valid-sighting-from', 'Bitte wählen Sie eine gültige Option.', (value) =>
			isValidSightingFrom(String(value))
		)
		.label('Von wo aus wurde die Sichtung gemacht?')
		.meta({
			helpText: 'Wählen Sie Ihre Beobachtungsposition',
			valueText:
				'Ob vom Boot oder von Land aus beobachtet wurde, bestimmt mit, welcher Bereich überhaupt einsehbar war - das ist für die Einordnung der Meldung wichtig',
			type: 'select',
			options: getSightingFromOptions(),
			icon: MapPin
		}),

	/**
	 * Genauere Beschreibung des Sichtungsortes
	 * Erforderlich, wenn sightingFrom = 0 (Sonstiges).
	 * NICHT 5 — das ist seit 2026-07-29 `SightingFromEnum.UNKNOWN` ("Keine Angabe").
	 */
	sightingFromText: yup
		.string()
		.max(255, 'Die Angabe darf nicht länger als 255 Zeichen sein.')
		.when('sightingFrom', {
			is: (v: unknown) => v === SightingFromEnum.OTHER || v === String(SightingFromEnum.OTHER),
			then: (schema) => schema.required('Bitte geben Sie an, von wo die Sichtung erfolgte.'),
			otherwise: (schema) => schema.notRequired()
		})
		.label('Sonstiger Ort')
		.meta({
			placeholder: 'z.B. Brücke, Balkon, Strand...',
			helpText: 'Beschreiben Sie Ihren Standort genauer',
			icon: Globe
		}),

	/**
	 * Entfernung zum gesichteten Tier
	 * Pflichtfeld, muss einer gültigen Entfernungskategorie entsprechen
	 */
	distance: yup
		.number()
		.required('Bitte geben Sie eine Entfernung an.')
		.test(
			'is-valid-distance',
			'Bitte wählen Sie eine gültige Entfernungskategorie.',
			(value) => value === undefined || isValidDistance(String(value))
		)
		.label('Entfernung zum Tier')
		.meta({
			helpText: 'Wie weit waren die Tiere entfernt? (Schätzung)',
			valueText:
				'Je geringer die Entfernung, desto verlässlicher lassen sich Art und Anzahl bestimmen - die Angabe hilft, Beobachtungen zu gewichten',
			type: 'select',
			options: getDistanceOptions(),
			icon: Eye
		}),
	/**
	 * Verteilung der Tiere
	 * Optional, muss einer gültigen Verteilungskategorie entsprechen
	 */
	distribution: yup
		.number()
		.transform((value) => (isNaN(value) ? undefined : value))
		.test(
			'is-valid-distribution',
			'Bitte geben Sie eine gültige Verteilung an.',
			(value) => value === undefined || isValidDistribution(String(value))
		)
		.label('Verteilung der Tiere')
		.meta({
			helpText: 'Wie waren die Tiere räumlich angeordnet?',
			valueText:
				'Gruppenformationen verraten Familienstrukturen - Mutter-Kalb-Paare schwimmen dicht beieinander, Männchen oft einzeln',
			type: 'select',
			options: getDistributionOptions(),
			icon: Users
		})
		.notRequired(),

	/**
	 * Genauere Beschreibung der Verteilung (optional, auch bei Sonstiges)
	 */
	distributionText: yup
		.string()
		.max(255, 'Die Beschreibung darf nicht länger als 255 Zeichen sein.')
		.nullable()
		.notRequired()
		.label('Sonstige Verteilung')
		.meta({
			placeholder: 'z.B. V-Formation, kreisförmig, entlang der Küstenlinie',
			helpText: 'Besondere Gruppenformationen geben Hinweise auf Sozialverhalten',
			valueText: 'Ungewöhnliche Formationen könnten Jagdstrategien oder Schutzverhalten zeigen',
			icon: FileText
		}),

	/**
	 * Verhalten des Tieres
	 * Optional, muss einer gültigen Verhaltenskategorie entsprechen
	 */
	behavior: yup
		.number()
		.transform((value) => (isNaN(value) ? undefined : value))
		.test(
			'is-valid-behavior',
			'Bitte geben Sie eine gültige Verhaltenskategorie an.',
			(value) => value === undefined || isValidAnimalBehavior(value)
		)
		.label('Verhalten der Tiere')
		.meta({
			helpText:
				'Beschreiben Sie das Verhalten der Tiere - Tipp: "Schwimmen in eine Richtung" = konstanter Kurs',
			valueText:
				'Verhaltensbeobachtungen zeigen Stresslevel und Nahrungssuche - entscheidend für Schutzgebietsplanung',
			type: 'select',
			options: getAnimalBehaviorOptions(),
			icon: Activity
		})
		.notRequired(),

	/**
	 * Genauere Beschreibung des Verhaltens (optional, auch bei Sonstiges)
	 */
	behaviorText: yup
		.string()
		.max(255, 'Die Beschreibung darf nicht länger als 255 Zeichen sein.')
		.nullable()
		.notRequired()
		.label('Sonstiges Verhalten')
		.meta({
			placeholder: 'z.B. Spielverhalten, Jagd, Paarung, Interaktion mit Booten',
			helpText: 'Beschreiben Sie das Verhalten in eigenen Worten',
			valueText:
				'Freitext erfasst auch Verhalten, für das es in der Auswahlliste keine Kategorie gibt',
			icon: MessageCircle
		}),

	/**
	 * Reaktion des Tieres
	 * Optional
	 */
	reaction: yup
		.string()
		.max(1000, 'Die Reaktion darf nicht länger als 1000 Zeichen sein.')
		.label('Reaktion auf Ihr Boot')
		.meta({
			placeholder: 'z.B. neugierig genähert, geflohen, ignoriert...',
			helpText: 'Wie haben die Tiere auf Ihre Anwesenheit reagiert?',
			valueText:
				'Reaktionen auf Boote zeigen Störungsgrad - "Flucht" deutet auf Stress hin und beeinflusst Schutzgebietsgrößen',
			icon: MousePointer
		})
		.notRequired(),

	//----------------------------------------------------------------------
	// Environmental Conditions (Umweltbedingungen)
	//----------------------------------------------------------------------

	/**
	 * Seegang zum Zeitpunkt der Sichtung
	 * Optional, muss einer gültigen Seegang-Kategorie entsprechen
	 */
	seaState: yup
		.number()
		.transform((value) => (isNaN(value) ? undefined : value))
		.test(
			'is-valid-sea-state',
			'Bitte geben Sie einen gültigen Seegang an.',
			(value) => value === undefined || isValidSeaState(value)
		)
		.label('Seegang')
		.meta({
			helpText: 'Wie war die Beschaffenheit der Meeresoberfläche?',
			valueText:
				'Bei unruhiger See schrumpft der Streifen Meer, den Beobachter verlässlich absuchen können, um rund ein Drittel (Ostsee-Erfassung SCANS 2023) - deshalb hilft Ihre Angabe, Sichtungszahlen richtig einzuordnen',
			type: 'select',
			options: getSeaStateOptions(),
			icon: Waves
		})
		.notRequired(),

	/**
	 * Sichtweite zum Zeitpunkt der Sichtung
	 * Optional, muss einer gültigen Sichtweitenkategorie entsprechen
	 */
	visibility: yup
		.number()
		.transform((value) => (isNaN(value) ? undefined : value))
		.test(
			'is-valid-visibility',
			'Bitte geben Sie eine gültige Sichtweiten-Kategorie an.',
			(value) => value === undefined || isValidVisibility(value)
		)
		.label('Sichtbedingungen')
		.meta({
			helpText: 'Wie weit konnten Sie sehen?',
			valueText:
				'Die Sichtweite bestimmt mit, welcher Bereich überhaupt einsehbar war - auch eine grobe Schätzung hilft bei der Auswertung',
			type: 'select',
			options: getVisibilityOptions(),
			icon: Eye
		})
		.notRequired(),

	/**
	 * Windrichtung zum Zeitpunkt der Sichtung
	 * Optional, muss einer gültigen Himmelsrichtung entsprechen
	 */
	windDirection: yup
		.string()
		.oneOf(
			['', 'N', 'NW', 'W', 'SW', 'S', 'SO', 'O', 'NO'],
			'Bitte geben Sie eine gültige Windrichtung an.'
		)
		.label('Windrichtung')
		.meta({
			helpText: 'Aus welcher Richtung kam der Wind?',
			valueText:
				'Wind beeinflusst Seegang und Sichtbedingungen - Ihre Wetterangaben vervollständigen das ökologische Bild',
			type: 'select',
			options: getWindDirectionOptions(),
			icon: Wind
		})
		.notRequired(),

	/**
	 * Windstärke zum Zeitpunkt der Sichtung
	 * Optional, muss zwischen 0 und 12 (Beaufort) liegen
	 */
	windForce: yup
		.number()
		.transform((value) => (isNaN(value) ? undefined : value))
		.min(0, 'Bitte geben Sie eine gültige Windstärke zwischen 0 und 12 an.')
		.max(12, 'Bitte geben Sie eine gültige Windstärke zwischen 0 und 12 an.')
		.label('Windstärke (Beaufort)')
		.meta({
			placeholder: 'z.B. 3',
			helpText: 'Welche Windstärke wurde beobachtet?',
			valueText:
				'Bei höherer Windstärke sind auftauchende Tiere zwischen den Wellen schwerer zu erkennen - das hilft, Sichtungszahlen einzuordnen',
			type: 'select',
			options: getWindStrengthOptions(),
			icon: CloudRain
		})
		.notRequired(),

	/**
	 * Wetterdaten von der Weather API (Issue #110)
	 * Optional, enthält die vollständigen Wetterdaten als JSON
	 */
	weatherData: yup
		.mixed()
		.nullable()
		.label('API-Wetterdaten')
		.meta({
			helpText: 'Automatisch geladene Wetterdaten von Open-Meteo API',
			valueText: 'Ergänzt manuelle Wetterangaben mit präzisen API-Daten',
			type: 'hidden'
		})
		.notRequired(),

	//----------------------------------------------------------------------
	// Media (Medien)
	//----------------------------------------------------------------------

	/**
	 * Beschreibung der vorhandenen Foto- oder Videoaufnahmen
	 * Optional, Freitextfeld
	 */
	mediaFile: yup
		.string()
		.max(255, 'Der Pfad/Name darf nicht länger als 255 Zeichen sein.')
		.label('Foto-/Videobeschreibung')
		.meta({
			placeholder: 'z.B. 3 Fotos Schweinswal-Gruppe, 1 Video springender Wal',
			helpText: 'Jedes Foto ist wertvoll - auch unscharfe Aufnahmen helfen bei der Identifikation',
			valueText:
				'Aufnahmen machen Artbestimmung und Verhalten nachträglich überprüfbar - das erhöht den Wert Ihrer Meldung erheblich',
			icon: Camera
		})
		.notRequired(),

	/**
	 * Gibt an, ob der Benutzer Medien hochladen möchte
	 * Optional, Boolean-Wert
	 */
	mediaUpload: yup
		.boolean()
		.label('Medien hochladen')
		.meta({
			helpText: 'Möchten Sie Fotos oder Videos hochladen?',
			valueText: 'Medien erhöhen Qualität der Dokumentation',
			icon: Upload
		})
		.default(false),

	/**
	 * Einwilligung zur Verwendung der Medien
	 * Optional, Boolean-Wert
	 */
	mediaConsent: yup
		.boolean()
		.label('Veröffentlichung meiner Aufnahmen')
		.meta({
			helpText:
				'Dürfen wir Ihre Aufnahmen veröffentlichen — etwa auf der Sichtungskarte oder in der Öffentlichkeitsarbeit des Meeresmuseums?',
			valueText:
				'Ohne Ihre Zustimmung dienen die Aufnahmen ausschließlich der Prüfung Ihrer Meldung',
			icon: Check
		})
		.default(false),

	//----------------------------------------------------------------------
	// Ship/Boat Information (Schiffsangaben)
	//----------------------------------------------------------------------

	/**
	 * Name des Schiffes, von dem aus die Sichtung erfolgte
	 * Optional, Freitextfeld
	 */
	shipName: yup
		.string()
		.max(64, 'Der Schiffsname darf nicht länger als 64 Zeichen sein.')
		.label('Schiffsname')
		.meta({
			placeholder: 'z.B. MS Seelöwe, SY Nordwind, FFK Seeadler',
			helpText: 'Name Ihres Bootes/Schiffes (optional)',
			valueText:
				'Schiffsnamen ermöglichen Langzeitauswertungen - einzelne Schiffe melden laut unserer Sichtungsdatenbank seit über 20 Jahren immer wieder Sichtungen',
			icon: Ship
		})
		.notRequired(),

	/**
	 * Heimathafen des Schiffes
	 * Optional, Freitextfeld
	 */
	homePort: yup
		.string()
		.max(64, 'Der Heimathafen darf nicht länger als 64 Zeichen sein.')
		.label('Heimathafen')
		.meta({
			placeholder: 'z.B. Heiligenhafen, Kiel, Rostock, Stralsund',
			helpText: 'Wo ist Ihr Boot registriert? (optional)',
			valueText: 'Heimathäfen zeigen regionale Beobachtungsnetzwerke - Baltic Sea Citizen Science',
			icon: MapPin
		})
		.notRequired(),

	/**
	 * Typ des Bootes/Schiffes
	 * Optional, Freitextfeld
	 */
	boatType: yup
		.string()
		.max(64, 'Der Bootstyp darf nicht länger als 64 Zeichen sein.')
		.label('Bootstyp')
		.meta({
			placeholder: 'z.B. Segelboot, Motoryacht, Kajak, Fischkutter',
			helpText: 'Art Ihres Wasserfahrzeugs (optional)',
			valueText:
				'Segelboote ermöglichen leiseste Annäherung - Kajaks erreichen flachste Gewässer für einzigartige Beobachtungen',
			icon: Anchor
		})
		.notRequired(),

	/**
	 * Anzahl der Schiffe in der Umgebung
	 * Optional, muss eine positive ganze Zahl sein
	 */
	shipCount: yup
		.number()
		.integer('Bitte geben Sie eine ganze Zahl ein.')
		.transform((value) => (isNaN(value) ? undefined : value))
		.min(0, 'Die Anzahl der Schiffe muss positiv sein.')
		.max(15, 'Die Anzahl der Schiffe darf 15 nicht überschreiten.')
		.label('Anzahl anderer Schiffe in näherer Umgebung')
		.meta({
			placeholder: 'z.B. 2',
			helpText: 'Wie viele andere Boote waren in der Nähe?',
			valueText:
				'Die Anzahl umliegender Schiffe hilft, den Einfluss von Unterwasserlärm einzuordnen. Auch "0 Schiffe" ist eine wichtige Information',
			icon: CountIcon
		})
		.notRequired(),

	/**
	 * Art des Bootsantriebs
	 * Nur erforderlich, wenn die Sichtung von einem Segelschiff oder Motorboot
	 * aus gemacht wurde (sightingFrom). Bei Land, Fähre, Sonstiges oder nicht
	 * gesetztem sightingFrom ist das Feld optional/nullable — wer kein Boot hat,
	 * kann keinen Bootsantrieb angeben.
	 */
	boatDrive: yup
		.number()
		.nullable()
		.test(
			'is-valid-boat-drive',
			'Bitte wählen Sie einen gültigen Bootsantrieb aus.',
			(value) => value === undefined || value === null || isValidBoatDrive(value)
		)
		.label('Bootsantrieb')
		.meta({
			helpText: 'Welcher Antrieb wurde während der Sichtung verwendet?',
			valueText:
				'Die Antriebsart bestimmt den Unterwasserlärm und damit, wie stark Tiere gestört werden',
			type: 'select',
			options: getBoatDriveOptions(),
			icon: Zap
		})
		.when('sightingFrom', {
			is: (v: unknown) =>
				v === SightingFromEnum.SAILBOAT ||
				v === String(SightingFromEnum.SAILBOAT) ||
				v === SightingFromEnum.MOTORBOAT ||
				v === String(SightingFromEnum.MOTORBOAT),
			then: (schema) => schema.required('Bitte wählen Sie den Bootsantrieb aus.'),
			otherwise: (schema) => schema.notRequired()
		}),

	/**
	 * Genauere Beschreibung des Bootsantriebs (optional, auch bei Sonstiges)
	 */
	boatDriveText: yup
		.string()
		.max(255, 'Die Beschreibung darf nicht länger als 255 Zeichen sein.')
		.nullable()
		.notRequired()
		.label('Sonstiger Antrieb')
		.meta({
			placeholder: 'z.B. Hybridantrieb, Wasserstoff, Solar-Elektro',
			helpText: 'Innovative Antriebe interessieren besonders für Lärmstudien',
			valueText: 'Neue Antriebstechnologien könnten Wildtierbeobachtungen revolutionieren',
			icon: Car
		}),

	/**
	 * Einwilligung zur Nennung des Schiffsnamens
	 * Optional, Boolean-Wert
	 */
	shipNameConsent: yup
		.boolean()
		.label('Schiffsname veröffentlichen')
		.meta({
			helpText:
				'Ich stimme zu, dass der Schiffsname öffentlich auf der Karte angezeigt wird und in Berichten genannt werden darf.',
			valueText: 'Ermöglicht die Würdigung der Beobachtenden in Publikationen',
			icon: Ship,
			type: 'checkbox'
		})
		.default(false),

	//----------------------------------------------------------------------
	// Contact Information (Kontaktdaten)
	//----------------------------------------------------------------------

	/**
	 * Vorname der meldenden Person
	 * Pflichtfeld, Freitextfeld
	 */
	firstName: yup
		.string()
		.max(64, 'Der Vorname darf nicht länger als 64 Zeichen sein.')
		.required('Vorname erforderlich')
		.label('Vorname')
		.meta({
			placeholder: 'Max',
			helpText: 'Wie dürfen wir Sie ansprechen?',
			valueText: 'Für die persönliche Kontaktaufnahme',
			autocomplete: 'given-name',
			icon: User
		}),

	/**
	 * Nachname der meldenden Person
	 * Pflichtfeld, Freitextfeld
	 */
	lastName: yup
		.string()
		.max(64, 'Der Name darf nicht länger als 64 Zeichen sein.')
		.required('Nachname erforderlich')
		.label('Nachname')
		.meta({
			placeholder: 'Mustermann',
			helpText: 'Ihr Familienname',
			valueText: 'Zur eindeutigen Zuordnung der Meldung',
			autocomplete: 'family-name',
			icon: User
		}),

	/**
	 * E-Mail-Adresse für Rückfragen
	 * Pflichtfeld, muss ein gültiges E-Mail-Format haben
	 */
	email: yup
		.string()
		.email('Bitte geben Sie eine gültige E-Mail-Adresse ein.')
		.required('Die E-Mail-Adresse ist erforderlich.')
		.max(64, 'Die E-Mail-Adresse darf nicht länger als 64 Zeichen sein.')
		.label('E-Mail-Adresse')
		.meta({
			placeholder: 'max.mustermann@email.de',
			helpText: 'Wie können wir Sie erreichen?',
			valueText: 'Für Rückfragen und zur Bestätigung der Sichtung',
			type: 'email',
			autocomplete: 'email',
			icon: Mail
		}),

	/**
	 * Telefonnummer für Rückfragen
	 * Optional, Freitextfeld
	 */
	/**
	 * Faxnummer
	 *
	 * Ausschließlich für die Legacy-REST-API: `docs/LEGACY_API_SPECIFICATION.md`
	 * führt `fax` als optionales Feld, und die DB-Spalte existiert seit immer —
	 * nur fehlte das Feld hier, weshalb der Legacy-Adapter den Wert bis
	 * 2026-07-30 stillschweigend verwarf.
	 *
	 * **Bewusst ohne `.meta()`**: Das Formular rendert seine Felder aus den
	 * expliziten Listen in `formConfig.ts`, nicht aus dem Schema. Ohne Metadaten
	 * bleibt `fax` damit ein reines Datenfeld und taucht in keinem Schritt auf.
	 */
	fax: yup
		.string()
		.max(64, 'Die Faxnummer darf nicht länger als 64 Zeichen sein.')
		.label('Faxnummer')
		.notRequired(),

	phone: yup
		.string()
		.max(64, 'Die Telefonnummer darf nicht länger als 64 Zeichen sein.')
		.label('Telefonnummer')
		.meta({
			placeholder: '+49 123 456789',
			helpText: 'Falls wir Sie anrufen dürfen (optional)',
			valueText: 'Für schnelle Klärung bei unklaren Angaben',
			type: 'tel',
			autocomplete: 'tel',
			icon: Phone
		})
		.notRequired(),

	/**
	 * Straße und Hausnummer
	 * Optional, Freitextfeld
	 */
	street: yup
		.string()
		.max(64, 'Die Straße darf nicht länger als 64 Zeichen sein.')
		.label('Straße und Hausnummer')
		.meta({
			placeholder: 'Musterstraße 123',
			helpText: 'Ihre Adresse (optional)',
			valueText: 'Ermöglicht lokale Zuordnung der Beobachter',
			autocomplete: 'street-address',
			icon: AddressIcon
		})
		.notRequired(),

	/**
	 * Postleitzahl
	 * Optional, maximal 5 Zeichen
	 */
	zipCode: yup
		.string()
		.max(5, 'Die Postleitzahl darf nicht länger als 5 Zeichen sein.')
		.label('Postleitzahl')
		.meta({
			placeholder: '12345',
			helpText: 'Ihre PLZ (optional)',
			valueText: 'Geografische Zuordnung der Beobachter',
			autocomplete: 'postal-code',
			icon: Hash
		})
		.notRequired(),

	/**
	 * Wohnort
	 * Optional, Freitextfeld
	 */
	city: yup
		.string()
		.max(64, 'Der Ort darf nicht länger als 64 Zeichen sein.')
		.label('Wohnort')
		.meta({
			placeholder: 'Musterstadt',
			helpText: 'Ihr Wohnort (optional)',
			valueText: 'Regionale Verteilung der Beobachter',
			autocomplete: 'address-level2',
			icon: MapPin
		})
		.notRequired(),

	/**
	 * Einwilligung zur Nennung des Namens
	 * Optional, Boolean-Wert
	 */
	nameConsent: yup
		.boolean()
		.label('Namen veröffentlichen')
		.meta({
			helpText:
				'Ich stimme zu, dass mein Name (Vor- und Nachname) öffentlich auf der Karte angezeigt wird und in Berichten genannt werden darf.',
			valueText: 'Ermöglicht die Würdigung der Beobachter in Publikationen',
			icon: UserCheck,
			type: 'checkbox'
		})
		.default(false),

	//----------------------------------------------------------------------
	// Additional Information (Zusätzliche Informationen)
	//----------------------------------------------------------------------

	/**
	 * Allgemeine Bemerkungen zur Sichtung
	 * Optional, Freitextfeld
	 */
	notes: yup
		.string()
		.max(1000, 'Die Bemerkungen dürfen nicht länger als 1000 Zeichen sein.')
		.label('Bemerkungen')
		.meta({
			placeholder: 'Zusätzliche Beobachtungen, Besonderheiten...',
			helpText: 'Was möchten Sie noch mitteilen?',
			valueText:
				'Das Deutsche Meeresmuseum gibt die Sichtungsdaten direkt an die internationalen Gremien für den Schutz der Ostsee-Schweinswale weiter (HELCOM und ASCOBANS)',
			type: 'textarea',
			icon: FileText
		})
		.notRequired(),

	/**
	 * Sonstige Beobachtungen oder Auffälligkeiten
	 * Optional, Freitextfeld
	 */
	otherObservations: yup
		.string()
		.max(1000, 'Die sonstigen Auffälligkeiten dürfen nicht länger als 1000 Zeichen sein.')
		.label('Sonstige Auffälligkeiten')
		.meta({
			placeholder: 'Klimawandel-Effekte, Plastikverschmutzung, andere Meerestiere...',
			helpText: 'Verhaltensänderungen zeigen Klimawandel-Einfluss auf Meerestiere',
			valueText:
				'Auffälligkeiten am Lebensraum helfen, Sichtungen in ihren Umweltkontext einzuordnen',
			icon: MessageCircle
		})
		.notRequired(),

	privacyConsent: yup
		.boolean()
		.required('Sie müssen den Datenschutzbedingungen zustimmen, um Ihre Sichtung zu melden')
		.label('Einverständniserklärung')
		.meta({
			helpText:
				'Ich stimme zu, dass meine Sichtungsdaten (Datum, Position, Tierart, Anzahl) öffentlich auf der Karte angezeigt und wissenschaftlich ausgewertet werden. Von mir hochgeladene Aufnahmen werden übertragen und zur fachlichen Prüfung meiner Meldung verwendet; über eine Veröffentlichung entscheide ich gesondert. Meine Kontaktdaten werden nur für Rückfragen verwendet. Ich bestätige die Richtigkeit meiner Angaben.',
			valueText: 'Ermöglicht Datenverarbeitung für Wissenschaft und öffentliche Darstellung',
			icon: ShieldCheck,
			type: 'checkbox'
		}),

	/**
	 * Einwilligung zur dauerhaften Speicherung der Kontaktdaten
	 * Optional, Boolean-Wert
	 */
	persistentDataConsent: yup
		.boolean()
		.label('Kontaktdaten dauerhaft speichern')
		.meta({
			helpText:
				'Ich stimme zu, dass meine Kontaktdaten dauerhaft auf diesem Gerät gespeichert werden, um sie bei zukünftigen Meldungen automatisch zu verwenden. Ohne diese Zustimmung werden die Daten beim Schließen des Browsers gelöscht.',
			valueText: 'Ermöglicht automatisches Ausfüllen bei zukünftigen Meldungen',
			icon: Archive,
			type: 'checkbox'
		})
		.default(false)
});

export const sightingSchema = yup
	.object()
	.shape({
		/**
		 * Gibt an, ob die Sichtung bestätigt wurde
		 * Optional, Boolean-Wert
		 */
		verified: yup
			.boolean()
			.label('Sichtung bestätigt')
			.meta({
				helpText: 'Wurde die Sichtung durch einen Administrator verifiziert?',
				valueText: 'Kennzeichnet qualitätsgeprüfte Sichtungen',
				icon: Check
			})
			.default(false),

		internalComment: yup
			.string()
			.max(1000, 'Die interne Kommentare dürfen nicht länger als 1000 Zeichen sein.')
			.label('Interne Kommentare')
			.meta({
				placeholder: 'Interne Notizen zur Sichtung...',
				helpText: 'Kommentare für interne Verwaltung',
				valueText: 'Hilft bei der Datenqualitätssicherung',
				icon: FileText,
				type: 'textarea'
			})
			.notRequired(),

		entryChannel: yup
			.number()
			.required('Bitte wählen Sie einen Eingangskanal aus.')
			.test(
				'is-valid-entry-channel',
				'Bitte wählen Sie einen gültigen Eingangskanal aus.',
				(value) => isValidEntryChannel(String(value))
			)
			.label('Eingangskanal')
			.meta({
				helpText: 'Über welchen Kanal wurde die Sichtung gemeldet?',
				valueText: 'Bestimmt den Ursprung der Meldung für statistische Auswertungen',
				type: 'select',
				options: getEntryChannelOptions(),
				icon: Navigation
			})
			.default(0)
	})
	.concat(sightingSchemaBase);

/**
 * Schema der Admin-Maske: dasselbe Formular, aber ohne die Eingabegrenzen, die
 * nur für **neue** Meldungen gelten.
 *
 * Die Grenzen in `sightingSchema` sind Eingaberegeln am Meldeformular —
 * mindestens ein Tier, höchstens 15, Jungtiere nicht mehr als Tiere insgesamt,
 * eine Entfernungskategorie, ein Freitext zu „Sonstiges". Auf den Bestand
 * angewendet sperren sie die Korrektur genau der Datensätze, die eine Korrektur
 * am ehesten brauchen (Messung 2026-08-02, 19.881 Zeilen):
 *
 * | Bedingung                             | Zeilen | Herkunft                        |
 * | ------------------------------------- | -----: | ------------------------------- |
 * | `anzahl_gesamt = 0`                   |      5 | Legacy-Konvention „0 = Totfund" |
 * | `anzahl_jung > anzahl_gesamt`         |      8 | Altbestand                      |
 * | `anzahl_gesamt > 15`                  |     22 | Altbestand, Kappung kam später  |
 * | `entfernung = 0`                      |    282 | Sentinel „nicht angegeben"      |
 * | `vonwo = 0` ohne `vonwo_text`         |  1.120 | Altbestand ohne Nachfrage       |
 *
 * Ohne diese Lockerung könnte ein Admin eine solche Zeile nicht mehr speichern
 * — auch dann nicht, wenn er an einem ganz anderen Feld etwas richtigstellt.
 * Beim Melden bleibt jede dieser Regeln unverändert in Kraft.
 *
 * Abgeleitet statt neu geschrieben: `.min()`/`.max()` und ein `.test()` mit
 * gleichem Namen ersetzen in Yup den vorhandenen Eintrag. Label und `meta`
 * bleiben damit erhalten — die Feld-Pipeline (`FieldRenderer`) liest sie aus
 * `describe()`, eine Kopie würde beim nächsten Textwechsel auseinanderlaufen.
 *
 * Nur `sightingFromText` geht diesen Weg nicht: Seine Pflicht steckt in einem
 * `when()`, und Yup kennt keinen Weg, eine gesetzte Bedingung wieder zu
 * entfernen — sie wird bei jedem Lauf **nach** allem angewandt, was hier
 * überschrieben würde. Das Feld wird deshalb neu aufgebaut, holt Beschriftung
 * und `meta` aber ausdrücklich aus dem Basis-Schema, damit die Texte weiterhin
 * an genau einer Stelle stehen (abgesichert in `adminSightingSchemaLegacy.test.ts`).
 */
const sightingFromTextBase = sightingSchema.fields.sightingFromText as yup.StringSchema;

export const adminSightingSchema = sightingSchema.shape({
	totalCount: (sightingSchema.fields.totalCount as yup.NumberSchema)
		.min(0, 'Die Anzahl darf nicht negativ sein')
		.max(9999, 'Bitte eine plausible Anzahl eintragen'),
	juvenileCount: (sightingSchema.fields.juvenileCount as yup.NumberSchema)
		.max(9999, 'Bitte eine plausible Anzahl eintragen')
		// Hebt die Teilmengen-Regel für den Bestand auf, statt sie zu duplizieren.
		// `exclusive: true` ist dabei nicht schmückend: Yup entfernt einen
		// gleichnamigen Test nur dann, wenn der neue exklusiv ist oder dieselbe
		// Funktionsreferenz trägt (`Schema.test()`) — ohne das Flag liefen beide
		// Tests, und der alte würde weiterhin greifen.
		.test({
			name: 'juveniles-within-total',
			exclusive: true,
			message: '',
			test: () => true
		}),

	// Lässt den Sentinel `0` ("nicht angegeben") zu, ohne die Kategorien
	// aufzuweichen: Ein erfundener Wert wie 99 fällt weiterhin durch.
	distance: (sightingSchema.fields.distance as yup.NumberSchema).test({
		name: 'is-valid-distance',
		exclusive: true,
		message: 'Bitte wählen Sie eine gültige Entfernungskategorie.',
		test: (value) =>
			value === undefined || value === DISTANCE_UNSPECIFIED || isValidDistance(String(value))
	}),

	// Der Freitext bleibt begrenzt, aber nicht mehr Pflicht — siehe oben.
	sightingFromText: yup
		.string()
		.max(255, 'Die Angabe darf nicht länger als 255 Zeichen sein.')
		.label(sightingFromTextBase.spec.label ?? 'Sonstiger Ort')
		.meta(sightingFromTextBase.spec.meta ?? {})
		.notRequired()
});
