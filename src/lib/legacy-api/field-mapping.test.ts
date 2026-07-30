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
 * Das Originaldokument (`docs/archive/Sichtungsdb-Web-Schnittstelle.pdf`, Zeile
 * „sonstige_auffaelligkeiten … Auffälligkeiten … Text … Nein") und
 * `docs/LEGACY_API_SPECIFICATION.md` nennen das Feld ohne Umlaut. Die
 * Implementierung las bis 2026-07-30 ausschließlich `sonstige_auffälligkeiten`
 * — ein spec-konformer Client verlor seinen Freitext deshalb kommentarlos.
 *
 * Beide Schreibweisen werden angenommen, die Vertragsform hat Vorrang.
 */
describe('mapLegacyToCurrentSchema — sonstige_auffaelligkeiten', () => {
	it('übernimmt die Vertragsschreibweise mit ae', () => {
		const result = mapLegacyToCurrentSchema({
			...minimalRequest(),
			sonstige_auffaelligkeiten: 'Tier war deutlich verletzt'
		} as LegacySightingRequest);

		expect(result.otherObservations).toBe('Tier war deutlich verletzt');
	});

	it('übernimmt weiterhin die bestehende Umlaut-Schreibweise', () => {
		const result = mapLegacyToCurrentSchema({
			...minimalRequest(),
			sonstige_auffälligkeiten: 'Tier war deutlich verletzt'
		} as LegacySightingRequest);

		expect(result.otherObservations).toBe('Tier war deutlich verletzt');
	});

	it('gibt der Vertragsschreibweise den Vorrang, wenn beide gefüllt sind', () => {
		const result = mapLegacyToCurrentSchema({
			...minimalRequest(),
			sonstige_auffaelligkeiten: 'Vertragsform',
			sonstige_auffälligkeiten: 'Umlautform'
		} as LegacySightingRequest);

		expect(result.otherObservations).toBe('Vertragsform');
	});

	it('rettet den Umlaut-Text, wenn der Vertragsname leer mitgesendet wird', () => {
		// Bewusst `||` und nicht `??`: Ein Serializer, der abwesende Felder als
		// "" ausgibt, würde mit `??` den vorhandenen Text verwerfen — genau der
		// stille Datenverlust, den diese Änderung behebt. Vorrang gilt deshalb
		// unter gefüllten Werten, nicht gegen einen leeren gegen einen gefüllten.
		const result = mapLegacyToCurrentSchema({
			...minimalRequest(),
			sonstige_auffaelligkeiten: '',
			sonstige_auffälligkeiten: 'Tier war deutlich verletzt'
		} as LegacySightingRequest);

		expect(result.otherObservations).toBe('Tier war deutlich verletzt');
	});

	it('bleibt ohne Angabe ein leerer String', () => {
		const result = mapLegacyToCurrentSchema(minimalRequest());

		expect(result.otherObservations).toBe('');
	});
});

/**
 * `fax` steht als optionales Feld in der Spezifikation und wurde von
 * `yup-validation.ts` auch validiert — nur landete der Wert nirgends. Die
 * DB-Spalte `fax` existiert seit immer, `SightingFormData` kannte das Feld
 * jedoch nicht, also verwarf der Adapter es stillschweigend.
 */
describe('mapLegacyToCurrentSchema — fax', () => {
	it('übernimmt die Faxnummer', () => {
		const result = mapLegacyToCurrentSchema({
			...minimalRequest(),
			fax: '+49 431 123456'
		} as LegacySightingRequest);

		expect(result.fax).toBe('+49 431 123456');
	});

	it('bleibt ohne Angabe ein leerer String', () => {
		expect(mapLegacyToCurrentSchema(minimalRequest()).fax).toBe('');
	});
});

/**
 * Die Spezifikation führt `totfund` als eigenes 0/1-Feld — zusätzlich zur
 * Regel „`anzahl_gesamt = 0` wird als Totfund interpretiert". Der Adapter
 * leitete `isDead` bis 2026-07-30 ausschließlich aus dem Zähler ab; ein
 * explizites `totfund: 1` bei `anzahl_gesamt > 0` verschwand.
 *
 * Beide Wege müssen außerdem den Formulardaten-Pfad überleben: dort kommt
 * `Object.fromEntries(formData.entries())` an, also **Strings**. `'0' === 0`
 * ist false, `!!'0'` ist true — deshalb wird numerisch verglichen.
 */
describe('mapLegacyToCurrentSchema — totfund', () => {
	it('erkennt einen explizit gemeldeten Totfund trotz anzahl_gesamt > 0', () => {
		const result = mapLegacyToCurrentSchema({
			...minimalRequest(),
			anzahl_gesamt: 3,
			totfund: 1
		} as LegacySightingRequest);

		expect(result.isDead).toBe(true);
	});

	it('erkennt einen Totfund weiterhin an anzahl_gesamt = 0', () => {
		const result = mapLegacyToCurrentSchema({
			...minimalRequest(),
			anzahl_gesamt: 0
		} as LegacySightingRequest);

		expect(result.isDead).toBe(true);
	});

	it('bleibt bei totfund = 0 und anzahl_gesamt > 0 ein Lebendfund', () => {
		const result = mapLegacyToCurrentSchema({
			...minimalRequest(),
			anzahl_gesamt: 2,
			totfund: 0
		} as LegacySightingRequest);

		expect(result.isDead).toBe(false);
	});

	it.each([
		['totfund', { totfund: '1', anzahl_gesamt: '2' }, true],
		['anzahl_gesamt', { anzahl_gesamt: '0' }, true],
		['keins von beiden', { totfund: '0', anzahl_gesamt: '2' }, false]
	])('wertet Strings aus dem Formulardaten-Pfad aus (%s)', (_label, overrides, expected) => {
		const result = mapLegacyToCurrentSchema({
			...minimalRequest(),
			...overrides
		} as unknown as LegacySightingRequest);

		expect(result.isDead).toBe(expected);
	});
});
