/**
 * Sammelt den deutschen Ist-Zustand des Formular-Schemas und der
 * Domänen-Labels ein — Grundlage für den eingecheckten Schnappschuss
 * `germanBaseline.json` (Aufgabe i18n-t2 2.1).
 *
 * Nicht Teil dieser Aufgabe: Validierungsmeldungen (kommen in 2.2 über
 * echtes Validieren dazu) und der große Bestimmungshilfe-Fließtext in
 * `speciesIdentification.ts` (Name/Beschreibung je Art) — das ist Fließtext,
 * keine Beschriftung/kein Label, und bläht den Schnappschuss unnötig auf.
 */
import type { CustomSchemaMetadata, SchemaDescription } from 'yup';
import { sightingSchema } from './sightingSchema';

import {
	getAnimalBehaviorLabel,
	getAnimalBehaviorOptions
} from '$lib/report/formOptions/animalBehavior';
import {
	getAnimalConditionLabel,
	getAnimalConditionOptions
} from '$lib/report/formOptions/animalCondition';
import { getBoatDriveLabel, getBoatDriveOptions } from '$lib/report/formOptions/boatDrive';
import { getBoatTypeLabel, getBoatTypeOptions } from '$lib/report/formOptions/boatType';
import { getDistanceLabel, getDistanceOptions } from '$lib/report/formOptions/distance';
import { getDistributionLabel, getDistributionOptions } from '$lib/report/formOptions/distribution';
import { getEntryChannelLabel, getEntryChannelOptions } from '$lib/report/formOptions/entryChannel';
import { getMediaTypeLabel, getMediaTypeOptions } from '$lib/report/formOptions/mediaType';
import {
	getReactionToBoatLabel,
	getReactionToBoatOptions
} from '$lib/report/formOptions/reactionToBoat';
import { getSeaStateLabel, getSeaStateOptions } from '$lib/report/formOptions/seaState';
import { getSexLabel, getSexOptions } from '$lib/report/formOptions/sex';
import { getSightingFromLabel, getSightingFromOptions } from '$lib/report/formOptions/sightingFrom';
import { getSpeciesLabel, getSpeciesOptions, speciesGroups } from '$lib/report/formOptions/species';
import {
	frequencyLabels,
	observabilityLabels
} from '$lib/report/formOptions/speciesIdentification';
import { getVisibilityLabel, getVisibilityOptions } from '$lib/report/formOptions/visibility';
import {
	getWindDirectionLabel,
	getWindDirectionOptions
} from '$lib/report/formOptions/windDirection';
import { getWindStrengthLabel, getWindStrengthOptions } from '$lib/report/formOptions/windStrength';

// -----------------------------------------------------------------------
// Schicht A: Schema-Beschriftungen und meta
// -----------------------------------------------------------------------

/** Nur die nutzersichtbaren `meta`-Felder — `icon`/`options`/`autocomplete`/`step` bleiben draußen. */
export interface FieldMetaSnapshot {
	type?: string;
	placeholder?: string;
	helpText?: string;
	valueText?: string;
}

export interface FieldShapeSnapshot {
	label?: string;
	meta: FieldMetaSnapshot;
}

export type SchemaShapeSnapshot = Record<string, FieldShapeSnapshot>;

function collectFieldMeta(meta: CustomSchemaMetadata | undefined): FieldMetaSnapshot {
	const snapshot: FieldMetaSnapshot = {};
	if (meta?.type !== undefined) snapshot.type = meta.type;
	if (meta?.placeholder !== undefined) snapshot.placeholder = meta.placeholder;
	if (meta?.helpText !== undefined) snapshot.helpText = meta.helpText;
	if (meta?.valueText !== undefined) snapshot.valueText = meta.valueText;
	return snapshot;
}

/**
 * Liest `sightingSchema.describe().fields` und gibt je Feld Beschriftung und
 * die nutzersichtbaren `meta`-Felder zurück, alphabetisch nach Feldname
 * sortiert (deterministisch für den Schnappschuss).
 */
export function collectSchemaShape(): SchemaShapeSnapshot {
	const fields = sightingSchema.describe().fields as Record<string, SchemaDescription>;
	const result: SchemaShapeSnapshot = {};

	const sortedEntries = Object.entries(fields).sort(([a], [b]) => a.localeCompare(b));
	for (const [key, field] of sortedEntries) {
		const entry: FieldShapeSnapshot = { meta: collectFieldMeta(field.meta) };
		if (field.label !== undefined) entry.label = field.label;
		result[key] = entry;
	}

	return result;
}

// -----------------------------------------------------------------------
// Schicht B: Domänen-Labels aus src/lib/report/formOptions/
// -----------------------------------------------------------------------

export interface DomainOptionEntry {
	value: string | number;
	label: string;
}

export interface DomainLabelFallbacks {
	nullish: string;
	unknown: string;
}

/** Benannte Zusatz-Labelmengen für Dateien ohne get*Options/get*Label-Paar (siehe speciesIdentification). */
export interface DomainLabelSet {
	name: string;
	options: DomainOptionEntry[];
}

export interface DomainFileSnapshot {
	options: DomainOptionEntry[];
	fallbacks: DomainLabelFallbacks | null;
	groups: string[] | null;
	labelSets: DomainLabelSet[] | null;
}

/**
 * Feste Schlüsselmenge statt `Record<string, DomainFileSnapshot>` — genau die
 * 17 Dateien unter `src/lib/report/formOptions/`, namentlich als
 * Interface-Properties statt als Index-Signatur. Das macht `labels['species']`
 * zu einem bekannten Property-Zugriff (kein `| undefined` durch
 * `noUncheckedIndexedAccess`).
 *
 * Was das NICHT leistet: Eine neue, 18. Datei bricht hier gar nichts von
 * selbst — `collectDomainLabels()` unten muss den neuen Eintrag erst
 * ausdrücklich zurückgeben, sonst bleibt sie unbemerkt draußen. Was das
 * Interface tatsächlich erzwingt: Fehlt im Rückgabeobjekt von
 * `collectDomainLabels()` eine der 17 HIER benannten Eigenschaften, bricht
 * der Typ-Check — das schützt vor einem versehentlich ausgelassenen
 * bekannten Eintrag, nicht vor einer vergessenen neuen Datei.
 */
export interface DomainLabelSnapshot {
	animalBehavior: DomainFileSnapshot;
	animalCondition: DomainFileSnapshot;
	boatDrive: DomainFileSnapshot;
	boatType: DomainFileSnapshot;
	distance: DomainFileSnapshot;
	distribution: DomainFileSnapshot;
	entryChannel: DomainFileSnapshot;
	mediaType: DomainFileSnapshot;
	reactionToBoat: DomainFileSnapshot;
	seaState: DomainFileSnapshot;
	sex: DomainFileSnapshot;
	sightingFrom: DomainFileSnapshot;
	species: DomainFileSnapshot;
	speciesIdentification: DomainFileSnapshot;
	visibility: DomainFileSnapshot;
	windDirection: DomainFileSnapshot;
	windStrength: DomainFileSnapshot;
}

/** Ein mit Sicherheit ungültiger numerischer Enum-Wert für den `unknown`-Rückfall. */
const INVALID_NUMERIC_VALUE = 4242;
/** Dasselbe für den string-wertigen `windDirection`-Enum. */
const INVALID_STRING_VALUE = 'INVALID_4242';

function standardFile(
	options: DomainOptionEntry[],
	nullish: string,
	unknown: string
): DomainFileSnapshot {
	return {
		options,
		fallbacks: { nullish, unknown },
		groups: null,
		labelSets: null
	};
}

/**
 * Deckt alle 17 Dateien unter `src/lib/report/formOptions/` ab — namentlich
 * aufgeführt statt zur Laufzeit gelistet, damit eine neue Datei diesen Test
 * bricht, statt still mitzulaufen.
 *
 * Die Reihenfolge unten im Quelltext ist von Hand alphabetisch gepflegt —
 * das ist Handdisziplin, kein Determinismus. Damit ein künftiger, unsortiert
 * eingetragener Eintrag nicht unbemerkt Diff-Rauschen in den Schnappschuss
 * bringt, sortiert die Rückgabe hier programmatisch nach Schlüssel, genau
 * wie `collectSchemaShape()` es für die Feld-Reihenfolge bereits tut.
 */
export function collectDomainLabels(): DomainLabelSnapshot {
	const unsorted: DomainLabelSnapshot = {
		animalBehavior: standardFile(
			getAnimalBehaviorOptions(),
			getAnimalBehaviorLabel(null),
			getAnimalBehaviorLabel(INVALID_NUMERIC_VALUE)
		),
		animalCondition: standardFile(
			getAnimalConditionOptions(),
			getAnimalConditionLabel(null),
			getAnimalConditionLabel(INVALID_NUMERIC_VALUE)
		),
		boatDrive: standardFile(
			getBoatDriveOptions(),
			getBoatDriveLabel(null),
			getBoatDriveLabel(INVALID_NUMERIC_VALUE)
		),
		boatType: standardFile(
			getBoatTypeOptions(),
			getBoatTypeLabel(null),
			getBoatTypeLabel(INVALID_NUMERIC_VALUE)
		),
		distance: standardFile(
			getDistanceOptions(),
			getDistanceLabel(null),
			getDistanceLabel(INVALID_NUMERIC_VALUE)
		),
		distribution: standardFile(
			getDistributionOptions(),
			getDistributionLabel(null),
			getDistributionLabel(INVALID_NUMERIC_VALUE)
		),
		entryChannel: standardFile(
			getEntryChannelOptions(),
			getEntryChannelLabel(null),
			getEntryChannelLabel(INVALID_NUMERIC_VALUE)
		),
		mediaType: standardFile(
			getMediaTypeOptions(),
			getMediaTypeLabel(null),
			getMediaTypeLabel(INVALID_NUMERIC_VALUE)
		),
		reactionToBoat: standardFile(
			getReactionToBoatOptions(),
			getReactionToBoatLabel(null),
			getReactionToBoatLabel(INVALID_NUMERIC_VALUE)
		),
		seaState: standardFile(
			getSeaStateOptions(),
			getSeaStateLabel(null),
			getSeaStateLabel(INVALID_NUMERIC_VALUE)
		),
		sex: standardFile(getSexOptions(), getSexLabel(null), getSexLabel(INVALID_NUMERIC_VALUE)),
		sightingFrom: standardFile(
			getSightingFromOptions(),
			getSightingFromLabel(null),
			getSightingFromLabel(INVALID_NUMERIC_VALUE)
		),
		species: {
			options: getSpeciesOptions(),
			fallbacks: {
				nullish: getSpeciesLabel(null),
				unknown: getSpeciesLabel(INVALID_NUMERIC_VALUE)
			},
			groups: Object.keys(speciesGroups),
			labelSets: null
		},
		// Besonderheit: speciesIdentification.ts exportiert kein
		// get*Options()/get*Label()-Paar — anders als die restlichen 16
		// Dateien. Es traegt stattdessen zwei eigene Record<Enum, string>
		// direkt als Konstanten (observabilityLabels, frequencyLabels), ohne
		// Options-Generator und ohne Fallback-Funktion. Deshalb hier ueber
		// `labelSets` erfasst statt ueber `options`/`fallbacks`.
		//
		// AUSDRÜCKLICHE GRENZE: `labelSets` erfasst NUR diese zwei schmalen
		// Label-Records. Der `speciesIdentification`-Export selbst (elf
		// vollständige Artdatensätze: name, scientificName, size, weight,
		// frequency.text, surfacing[], distinguishing[].text, behavior[],
		// confusion[], fieldTip, images[].alt — rund 316 deutsche
		// String-Literale Fließtext) ist HIER NICHT erfasst. Das ist
		// beabsichtigt: Dieser Text ist Bestimmungshilfe-Fließtext (Schicht E),
		// keine Beschriftung/kein Label, und gehört zu einer eigenen, späteren
		// Migrations-Etappe, nicht zu diesem Schnappschuss. Woran man eine
		// Verschiebung dieser Grenze erkennt: der Test „markiert die
		// Ausschlussgrenze der Artdatensätze" in germanBaseline.test.ts hält
		// `labelSets` exakt auf die zwei Namen 'observability'/'frequency' fest
		// — wer die Artdatensätze hier mit aufnehmen will, muss diesen Test
		// anfassen, nicht nur diese Datei.
		speciesIdentification: {
			options: [],
			fallbacks: null,
			groups: null,
			labelSets: [
				{
					name: 'observability',
					options: Object.entries(observabilityLabels).map(([value, label]) => ({
						value,
						label
					}))
				},
				{
					name: 'frequency',
					options: Object.entries(frequencyLabels).map(([value, label]) => ({ value, label }))
				}
			]
		},
		visibility: standardFile(
			getVisibilityOptions(),
			getVisibilityLabel(null),
			getVisibilityLabel(INVALID_NUMERIC_VALUE)
		),
		windDirection: standardFile(
			getWindDirectionOptions(),
			getWindDirectionLabel(null),
			getWindDirectionLabel(INVALID_STRING_VALUE)
		),
		windStrength: standardFile(
			getWindStrengthOptions(),
			getWindStrengthLabel(null),
			getWindStrengthLabel(INVALID_NUMERIC_VALUE)
		)
	};

	const sortedEntries = Object.entries(unsorted).sort(([a], [b]) => a.localeCompare(b));
	return Object.fromEntries(sortedEntries) as DomainLabelSnapshot;
}
