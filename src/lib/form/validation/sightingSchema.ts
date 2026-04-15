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
import { getDistanceOptions, isValidDistance } from '$lib/report/formOptions/distance';
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
import { BALTIC_SEA_BBOX } from '$lib/utils/geo/checkBalticSea';
import * as yup from 'yup';

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
	Fish: 'lucide:fish',
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
	Fish,
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
		.default(true),

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
					.min(
						BALTIC_SEA_BBOX.minLatitude,
						`Der Wert muss zwischen ${BALTIC_SEA_BBOX.minLatitude}° und ${BALTIC_SEA_BBOX.maxLatitude}° liegen (Ostseebereich)`
					)
					.max(
						BALTIC_SEA_BBOX.maxLatitude,
						`Der Wert muss zwischen ${BALTIC_SEA_BBOX.minLatitude}° und ${BALTIC_SEA_BBOX.maxLatitude}° liegen (Ostseebereich)`
					),
			otherwise: (schema) => schema.notRequired()
		})
		.label('Breitengrad')
		.meta({
			type: 'number',
			placeholder: 'z.B. 54.123456',
			helpText: 'Nördliche Position (N) - je mehr Nachkommastellen, desto genauer',
			valueText: 'GPS-Präzision: 6 Nachkommastellen = 11cm Genauigkeit',
			icon: Navigation
		})
		.default(54.5),

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
					.min(
						BALTIC_SEA_BBOX.minLongitude,
						`Der Wert muss zwischen ${BALTIC_SEA_BBOX.minLongitude}° und ${BALTIC_SEA_BBOX.maxLongitude}° liegen (Ostseebereich)`
					)
					.max(
						BALTIC_SEA_BBOX.maxLongitude,
						`Der Wert muss zwischen ${BALTIC_SEA_BBOX.minLongitude}° und ${BALTIC_SEA_BBOX.maxLongitude}° liegen (Ostseebereich)`
					),
			otherwise: (schema) => schema.notRequired()
		})
		.label('Längengrad')
		.meta({
			type: 'number',
			placeholder: 'z.B. 13.456789',
			helpText: 'Östliche Position (E) - je mehr Nachkommastellen, desto genauer',
			valueText: 'Ihre GPS-Koordinaten werden mit 2.847 anderen Sichtungen verglichen',
			icon: Navigation2
		})
		.default(13.5),

	/**
	 * Fahrwasser oder Meeresgebiet, in dem die Sichtung erfolgte
	 * Alternative zur GPS-Position
	 */
	waterway: yup
		.string()
		.max(255, 'Der Name des Fahrwassers/Seegebiets ist zu lang (maximal 255 Zeichen)')
		.label('Fahrwasser/Seegebiet')
		.meta({
			placeholder: 'z.B. Kieler Bucht, Fehmarnbelt, Greifswalder Bodden',
			helpText: 'In welchem Gewässer oder Gebiet befanden Sie sich?',
			valueText:
				'Gewässerbezeichnungen helfen bei der regionalen Populationsverteilung - auch ungefähre Angaben sind wissenschaftlich wertvoll',
			icon: Waves
		})
		.notRequired(),

	/**
	 * Seezeichen in der Nähe der Sichtung
	 * Optionale Zusatzinformation zur genaueren Ortsbestimmung
	 */
	seaMark: yup
		.string()
		.max(255, 'Der Name des Seezeichensist zu lang (maximal 255 Zeichen)')
		.label('Seezeichen in der Nähe')
		.meta({
			placeholder: 'z.B. Leuchtturm Dahmeshöved, Tonne 14, Ansteuerungstonne',
			helpText: 'Gab es markante Orientierungspunkte in der Nähe?',
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
			const date = new Date(value);
			return !isNaN(date.getTime()) && date <= new Date();
		})
		.label('Sichtungsdatum')
		.meta({
			helpText: 'An welchem Tag war die Sichtung?',
			valueText: 'Hilft bei der saisonalen Zuordnung',
			type: 'date',
			icon: Calendar
		})
		.default(new Date().toISOString().split('T')[0]), // Standard auf heute setzen

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
				'Uhrzeitangaben decken Tagesrhythmen auf - 73% der Schweinswalsichtungen erfolgen morgens zwischen 6-10 Uhr',
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
		.required('Bitte wählen Sie eine Tierart aus')
		.test('is-valid-species', 'Diese Tierart ist nicht verfügbar', (value) =>
			isValidSpecies(String(value))
		)
		.label('Welche Tierart haben Sie gesehen?')
		.meta({
			helpText: 'Bei Unsicherheit wählen Sie "Unbekannte Wal- oder Robbenart"',
			valueText: 'Artbestimmung hilft beim Populationsmonitoring',
			type: 'select',
			options: getSpeciesOptions(true),
			icon: Fish
		})
		.default(0),

	/**
	 * Gesamtanzahl der gesichteten Tiere
	 * Pflichtfeld, muss eine positive ganze Zahl sein
	 */
	totalCount: yup
		.number()
		.transform((value) => (isNaN(value) ? undefined : value))
		.integer('Bitte nur ganze Zahlen eingeben')
		.min(0, 'Die Anzahl muss 0 oder höher sein')
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
	 */
	juvenileCount: yup
		.number()
		.transform((value) => (isNaN(value) ? undefined : value))
		.integer('Bitte nur ganze Zahlen eingeben')
		.min(0, 'Die Anzahl muss 0 oder höher sein')
		.max(15, 'Bei mehr als 15 bitte 15 eintragen')
		.label('Davon Jungtiere')
		.meta({
			placeholder: '0',
			helpText: 'Waren Junge Tiere dabei? Bitte geben Sie die Anzahl ein.',
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
			helpText: 'Handeltete es sich um Lebende Tiere oder einen Totfund?',
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
	 * Erforderlich, wenn isDead = true
	 */
	deadSex: yup
		.number()
		.transform((value) => (isNaN(value) ? undefined : value))
		.when('isDead', {
			is: true,
			then: (schema) =>
				schema
					.required('Bitte geben Sie das Geschlecht des toten Tieres an.')
					.test('is-valid-dead-sex', 'Bitte wählen Sie ein gültiges Geschlecht.', (value) =>
						isValidSex(String(value))
					),
			otherwise: (schema) => schema.notRequired()
		})
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
	 * Erforderlich, wenn isDead = true
	 */
	deadSize: yup
		.number()
		.integer('Bitte geben Sie eine ganze Zahl ein.')
		.transform((value) => (isNaN(value) ? undefined : value))
		.min(0, 'Die Größe muss positiv sein.')
		.max(300, 'Die Größe darf 300 nicht überschreiten.')
		.when('isDead', {
			is: true,
			then: (schema) => schema.notRequired(),
			otherwise: (schema) => schema.notRequired()
		})
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
				'Boot-Beobachtungen haben 3x höhere Entdeckungsrate als Landbeobachtungen - Ihr Standort hilft bei Populationsschätzungen',
			type: 'select',
			options: getSightingFromOptions(),
			icon: MapPin
		}),

	/**
	 * Genauere Beschreibung des Sichtungsortes
	 * Erforderlich, wenn sightingFrom = 5 (Sonstiges)
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
			helpText:
				'Wie weit waren die Tiere entfernt? (Schätzung) - Tipp: Größe einer Münze = 50m, Streichholz = 200m',
			valueText:
				'Entfernungsangaben helfen Forschern, Beobachtungen zu gewichten - Nahsichtungen unter 100m haben höchste wissenschaftliche Aussagekraft',
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
			helpText: 'Ihre Beobachtung könnte eine noch unbekannte Verhaltensweise dokumentieren',
			valueText: 'Neue Verhaltensbeobachtungen werden in wissenschaftlichen Journalen publiziert',
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
				'Bei ruhiger See werden 5x mehr Tiere entdeckt - Ihre Seegangsangabe hilft bei der korrekten Populationsschätzung. 89% erfahrener Beobachter geben diese Information an',
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
		.label('Sichtweite')
		.meta({
			helpText: 'Wie weit konnten Sie sehen?',
			valueText:
				'Sichtweitenangaben ermöglichen "Distance Sampling" - die präziseste Methode für Populationsschätzungen. Auch Schätzungen sind wertvoll',
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
				'Windrichtung korreliert mit Walwanderungen - Nordwinde erhöhen Sichtungswahrscheinlichkeit um 40%. Ihre Wetterangaben vervollständigen das ökologische Bild',
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
				'Windstärke korreliert mit Tauchverhalten - bei starkem Wind tauchen Wale länger und seltener auf',
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
				'Sichtungsfotos haben bereits 47 neue Verhaltensweisen dokumentiert und fließen in internationale Datenbanken ein',
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
		.label('Einverständnis zur Mediennutzung')
		.meta({
			helpText: 'Stimmen Sie der wissenschaftlichen Nutzung der Aufnahmen zu?',
			valueText:
				'Ihre Fotos werden in wissenschaftlichen Publikationen verwendet und helfen bei der Öffentlichkeitsarbeit für den Meeresschutz - Sichtungsphotos überzeugen Politik und Gesellschaft',
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
				'Schiffsnamen ermöglichen Langzeitstudien - einige Schiffe melden seit 15 Jahren regelmäßig Sichtungen',
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
		.label('Anzahl anderer Schiffe')
		.meta({
			placeholder: 'z.B. 2',
			helpText: 'Wie viele andere Boote waren in der Nähe?',
			valueText:
				'Schiffsverkehr-Daten sind Gold wert - sie zeigen Lärmeinfluss auf Meerestiere. Auch "0 Schiffe" ist eine wichtige Information',
			icon: CountIcon
		})
		.notRequired(),

	/**
	 * Art des Bootsantriebs
	 * Optional, muss einer gültigen Antriebskategorie entsprechen
	 */
	boatDrive: yup
		.number()
		.test(
			'is-valid-boat-drive',
			'Bitte wählen Sie einen gültigen Bootsantrieb aus.',
			(value) => value === undefined || isValidBoatDrive(value)
		)
		.label('Bootsantrieb')
		.meta({
			helpText: 'Welcher Antrieb wurde während der Sichtung verwendet?',
			valueText:
				'Motor-Typ bestimmt Unterwasserlärm - Elektromotoren ermöglichen 60% mehr Sichtungen durch geringere Störung',
			type: 'select',
			options: getBoatDriveOptions(),
			icon: Zap
		})
		.required(),

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
			icon: Mail
		}),

	/**
	 * Telefonnummer für Rückfragen
	 * Optional, Freitextfeld
	 */
	phone: yup
		.string()
		.max(64, 'Die Telefonnummer darf nicht länger als 64 Zeichen sein.')
		.label('Telefonnummer')
		.meta({
			placeholder: '+49 123 456789',
			helpText: 'Falls wir Sie anrufen dürfen (optional)',
			valueText: 'Für schnelle Klärung bei unklaren Angaben',
			type: 'tel',
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
				'Diese Daten fließen in EU-Meeresschutzrichtlinien ein - Ihre Beobachtungen beeinflussen maritime Politikentscheidungen',
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
			valueText: 'Ihre Umweltbeobachtungen werden für den IPCC-Meeresspiegel-Report verwendet',
			icon: MessageCircle
		})
		.notRequired(),

	privacyConsent: yup
		.boolean()
		.required('Sie müssen den Datenschutzbedingungen zustimmen, um Ihre Sichtung zu melden')
		.label('Einverständniserklärung')
		.meta({
			helpText:
				'Ich stimme zu, dass meine Sichtungsdaten (Datum, Position, Tierart, Anzahl) öffentlich auf der Karte angezeigt und wissenschaftlich ausgewertet werden. Meine Kontaktdaten werden nur für Rückfragen verwendet. Ich bestätige die Richtigkeit meiner Angaben.',
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
				'Ich stimme zu, dass meine Kontaktdaten dauerhaft auf diesem Gerät gespeichert werden, um sie bei zukünftigen Sichtungsmeldungen automatisch zu verwenden. Ohne diese Zustimmung werden die Daten beim Schließen des Browsers gelöscht.',
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
