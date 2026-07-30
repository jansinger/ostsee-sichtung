import { AnimalBehaviorEnum } from '$lib/report/formOptions/animalBehavior';
import { BoatDriveEnum } from '$lib/report/formOptions/boatDrive';
import { DistributionEnum } from '$lib/report/formOptions/distribution';
import { SightingFromEnum } from '$lib/report/formOptions/sightingFrom';
import { SpeciesEnum } from '$lib/report/formOptions/species';
import { describe, expect, it } from 'vitest';
import { mapLegacyToCurrentSchema } from './field-mapping';
import type { LegacySightingRequest } from './types';

/**
 * Der Legacy-Adapter ist die Vertragsgrenze: Was die PDF-Spezifikation als
 * Default zusagt, wird hier gesetzt — und nur das.
 *
 * Für `vonwo`, `verteilung`, `verhalten` und `bootsantrieb` sagt die Spec
 * **keinen** Default zu (Spalte "Required" = No, ohne Default-Angabe). Ein
 * `|| 0` an dieser Stelle war deshalb kein Vertrag, sondern derselbe
 * Falsy-Fehler wie im Schreibpfad: Es machte aus "nicht übermittelt" die
 * aktive Aussage "Sonstiges" bzw. "Sonstiger Bootsantrieb".
 *
 * Einzige Ausnahme: `tierart` ist ausdrücklich als "No, Default = 0"
 * dokumentiert — dieser Default bleibt.
 */
const minimalRequest = (): LegacySightingRequest =>
	({
		sichtungsdatum: '2024-01-15 14:30',
		anzahl_gesamt: 1,
		vorname: 'Test',
		name: 'User',
		email: 'test@example.com'
	}) as LegacySightingRequest;

describe('mapLegacyToCurrentSchema — fehlende Auswahlfelder', () => {
	it('macht aus fehlendem vonwo kein "Sonstiges"', () => {
		const result = mapLegacyToCurrentSchema(minimalRequest());

		expect(result.sightingFrom).toBe(SightingFromEnum.UNKNOWN);
		expect(result.sightingFrom).not.toBe(SightingFromEnum.OTHER);
	});

	it('macht aus fehlender verteilung keine "Sonstige Verteilung"', () => {
		const result = mapLegacyToCurrentSchema(minimalRequest());

		expect(result.distribution).toBe(DistributionEnum.UNKNOWN);
		expect(result.distribution).not.toBe(DistributionEnum.OTHER);
	});

	it('macht aus fehlendem verhalten kein "Sonstiges Verhalten"', () => {
		const result = mapLegacyToCurrentSchema(minimalRequest());

		expect(result.behavior).toBe(AnimalBehaviorEnum.UNKNOWN);
		expect(result.behavior).not.toBe(AnimalBehaviorEnum.OTHER);
	});

	it('macht aus fehlendem bootsantrieb keinen "Sonstigen Bootsantrieb"', () => {
		const result = mapLegacyToCurrentSchema(minimalRequest());

		expect(result.boatDrive).toBe(BoatDriveEnum.NONE);
		expect(result.boatDrive).not.toBe(BoatDriveEnum.OTHER);
	});

	it('hält den dokumentierten Default für tierart ein (Spec: "Default = 0")', () => {
		const result = mapLegacyToCurrentSchema(minimalRequest());

		expect(result.species).toBe(SpeciesEnum.HARBOR_PORPOISE);
	});
});

describe('mapLegacyToCurrentSchema — explizite Nullen bleiben erhalten', () => {
	it('behandelt eine aktiv übermittelte 0 nicht als fehlende Angabe', () => {
		// Das ist der Kern: `|| 0` und `?? 0` unterscheiden sich hier nicht,
		// wohl aber `|| SENTINEL` und `?? SENTINEL`. Eine gemeldete 0 ist eine
		// echte Auswahl ("Sonstiges") und darf nicht zum Sentinel werden.
		const request = {
			...minimalRequest(),
			vonwo: 0,
			verteilung: 0,
			verhalten: 0,
			bootsantrieb: 0
		} as LegacySightingRequest;

		const result = mapLegacyToCurrentSchema(request);

		expect(result.sightingFrom).toBe(SightingFromEnum.OTHER);
		expect(result.distribution).toBe(DistributionEnum.OTHER);
		expect(result.behavior).toBe(AnimalBehaviorEnum.OTHER);
		expect(result.boatDrive).toBe(BoatDriveEnum.OTHER);
	});

	it('reicht übrige Werte unverändert durch', () => {
		const request = {
			...minimalRequest(),
			vonwo: SightingFromEnum.LAND,
			verteilung: DistributionEnum.SCHOOLS,
			verhalten: AnimalBehaviorEnum.VARYING_COURSE,
			bootsantrieb: BoatDriveEnum.SAIL,
			tierart: SpeciesEnum.GREY_SEAL
		} as LegacySightingRequest;

		const result = mapLegacyToCurrentSchema(request);

		expect(result.sightingFrom).toBe(SightingFromEnum.LAND);
		expect(result.distribution).toBe(DistributionEnum.SCHOOLS);
		expect(result.behavior).toBe(AnimalBehaviorEnum.VARYING_COURSE);
		expect(result.boatDrive).toBe(BoatDriveEnum.SAIL);
		expect(result.species).toBe(SpeciesEnum.GREY_SEAL);
	});
});

/**
 * Der neu gebaute iOS-Client (OstSeeTiere/8) sendet `totfund: 1` zusammen mit
 * einem `anzahl_gesamt` > 0 (beobachtet: 1, 2, 3, 7). Die alte Prüfung las nur
 * `anzahl_gesamt === 0` und klassifizierte solche Totfunde als lebende
 * Sichtungen — bei gleichzeitig gesetzten `deadCondition`/`deadSex`/`deadSize`
 * ein in sich widersprüchlicher Datensatz. `totfund` ersetzt die
 * `anzahl_gesamt === 0`-Konvention nicht, sondern ergänzt sie: beide bleiben
 * gültige Wege zu einem Totfund.
 */
describe('mapLegacyToCurrentSchema — Totfund-Erkennung', () => {
	it('erkennt einen Totfund über totfund=1, auch bei anzahl_gesamt > 0', () => {
		const request = {
			...minimalRequest(),
			anzahl_gesamt: 3,
			totfund: 1
		} as LegacySightingRequest;

		const result = mapLegacyToCurrentSchema(request);

		expect(result.isDead).toBe(true);
	});

	it('erkennt einen Totfund weiterhin über anzahl_gesamt=0, auch ohne totfund (Bestandsverhalten)', () => {
		const request = {
			...minimalRequest(),
			anzahl_gesamt: 0
		} as LegacySightingRequest;
		delete (request as { totfund?: number }).totfund;

		const result = mapLegacyToCurrentSchema(request);

		expect(result.isDead).toBe(true);
	});

	it('erkennt keinen Totfund, wenn weder totfund noch anzahl_gesamt=0 vorliegen', () => {
		const request = {
			...minimalRequest(),
			anzahl_gesamt: 2
		} as LegacySightingRequest;

		const result = mapLegacyToCurrentSchema(request);

		expect(result.isDead).toBe(false);
	});
});

/**
 * Der neu gebaute Client sendet englische Windrichtungs-Abkürzungen. Deutsch
 * und Englisch unterscheiden sich in genau drei Fällen (NO/NE, O/E, SO/SE);
 * `N`, `S`, `W`, `NW`, `SW` sind identisch. Die alte Prüfung akzeptierte nur
 * die deutsche Liste und machte aus jedem englischen Wert `''` — die
 * Windrichtung ging verloren.
 */
describe('mapLegacyToCurrentSchema — Windrichtung: englische Abkürzungen', () => {
	it.each([
		['NE', 'NO'],
		['E', 'O'],
		['SE', 'SO']
	])('normalisiert die englische Abkürzung %s zu %s', (input, expected) => {
		const request = { ...minimalRequest(), windrichtung: input } as LegacySightingRequest;

		const result = mapLegacyToCurrentSchema(request);

		expect(result.windDirection).toBe(expected);
	});

	it.each(['', 'N', 'NW', 'W', 'SW', 'S', 'SO', 'O', 'NO'])(
		'lässt den deutschen Wert %s unverändert',
		(value) => {
			const request = { ...minimalRequest(), windrichtung: value } as LegacySightingRequest;

			const result = mapLegacyToCurrentSchema(request);

			expect(result.windDirection).toBe(value);
		}
	);

	it.each(['SW', 'NW'])('lässt %s unverändert, weil in beiden Sprachen identisch', (value) => {
		const request = { ...minimalRequest(), windrichtung: value } as LegacySightingRequest;

		const result = mapLegacyToCurrentSchema(request);

		expect(result.windDirection).toBe(value);
	});

	it('macht aus einem unbekannten Wert einen leeren String', () => {
		const request = { ...minimalRequest(), windrichtung: 'XX' } as LegacySightingRequest;

		const result = mapLegacyToCurrentSchema(request);

		expect(result.windDirection).toBe('');
	});

	it('macht aus fehlender Windrichtung einen leeren String', () => {
		const result = mapLegacyToCurrentSchema(minimalRequest());

		expect(result.windDirection).toBe('');
	});
});

/**
 * `windstaerke` ist mit `0` (Windstille) ein reales Beaufort-Maß, das der neue
 * Client tatsächlich sendet (beobachtet in fünf Einreichungen). `0 ? … :
 * undefined` behandelte die aktiv gemeldete `0` wie ein fehlendes Feld. Das
 * Feld kommt als Zahl aus JSON und als String aus Formular-Encoding — beides
 * muss funktionieren.
 */
describe('mapLegacyToCurrentSchema — Windstärke 0 bleibt erhalten', () => {
	it('übernimmt die Zahl 0', () => {
		const request = { ...minimalRequest(), windstaerke: 0 } as LegacySightingRequest;

		const result = mapLegacyToCurrentSchema(request);

		expect(result.windForce).toBe(0);
	});

	it('übernimmt den String "0" und wandelt ihn in eine Zahl', () => {
		const request = { ...minimalRequest(), windstaerke: '0' } as LegacySightingRequest;

		const result = mapLegacyToCurrentSchema(request);

		expect(result.windForce).toBe(0);
	});

	it('übernimmt 12', () => {
		const request = { ...minimalRequest(), windstaerke: 12 } as LegacySightingRequest;

		const result = mapLegacyToCurrentSchema(request);

		expect(result.windForce).toBe(12);
	});

	it('macht aus fehlendem windstaerke undefined', () => {
		const result = mapLegacyToCurrentSchema(minimalRequest());

		expect(result.windForce).toBeUndefined();
	});

	it('macht aus null undefined', () => {
		const request = { ...minimalRequest(), windstaerke: null } as LegacySightingRequest;

		const result = mapLegacyToCurrentSchema(request);

		expect(result.windForce).toBeUndefined();
	});

	it('macht aus leerem String undefined', () => {
		const request = { ...minimalRequest(), windstaerke: '' } as LegacySightingRequest;

		const result = mapLegacyToCurrentSchema(request);

		expect(result.windForce).toBeUndefined();
	});
});
