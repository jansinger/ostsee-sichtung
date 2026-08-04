import { describe, expect, it } from 'vitest';
import type * as yup from 'yup';
import { formStepsConfig, sightingSchemaFields } from './formConfig';

/**
 * Die Ortsbeschreibung im **Meldeformular** ist seit dem Wunsch des Deutschen
 * Meeresmuseums (A2.4) genau ein Freitextfeld: `waterway`. `seaMark` ist nur aus
 * dem Melde-Schritt genommen — Schema-Eintrag und DB-Spalte `seezeichen` bleiben,
 * weil die Admin-Maske (`sections/Location.svelte`) den Altbestand weiter
 * anzeigen und korrigieren können muss und die Legacy-API `seezeichen` weiterhin
 * entgegennimmt.
 *
 * Die Tests hier halten beide Hälften zusammen: Was aus dem Schritt verschwindet,
 * darf nicht aus dem Schema verschwinden.
 */
const step1Fields = formStepsConfig[0]?.fields ?? [];

function describeField(name: string): yup.SchemaDescription {
	const field = sightingSchemaFields[name] as yup.SchemaDescription | undefined;
	if (!field) throw new Error(`Feld "${name}" fehlt im Schema`);
	return field;
}

function meta(name: string): Record<string, unknown> {
	return (describeField(name).meta ?? {}) as Record<string, unknown>;
}

describe('formStepsConfig — Ortsbeschreibung in Schritt 1', () => {
	it('führt waterway als Feld des Melde-Schritts', () => {
		expect(step1Fields).toContain('waterway');
	});

	// Über ALLE Schritte geprüft, nicht nur über Schritt 1: Ein Feld, das aus dem
	// Melde-Schritt genommen und versehentlich anderswo einsortiert wird, wäre
	// weiterhin im Formular — nur an der falschen Stelle.
	it('führt seaMark in keinem Schritt mehr', () => {
		expect(formStepsConfig.flatMap((step) => step.fields)).not.toContain('seaMark');
	});
});

describe('sightingSchema — seaMark bleibt erhalten', () => {
	it('kennt seaMark weiterhin, damit Admin-Maske und Legacy-API es schreiben können', () => {
		expect(sightingSchemaFields.seaMark).toBeDefined();
	});

	it('hält seaMark bedienbar: Label und Feld-Meta bleiben gepflegt', () => {
		// Ohne `meta` wirft `FormField` — die Admin-Maske könnte das Feld dann
		// nicht mehr rendern, und der Altbestand wäre nicht korrigierbar.
		expect(meta('seaMark')).not.toEqual({});
	});

	/**
	 * `seaMark` steht nur noch in der Admin-Maske — dort direkt unter `waterway`,
	 * dessen Hilfetext ebenfalls Orientierungspunkte nennt. Ohne einen Hinweis auf
	 * den Altbestand beanspruchen beide Felder sichtbar dasselbe, und wer den
	 * Datensatz korrigiert, weiß nicht, in welches der beiden er schreiben soll.
	 */
	it('weist seaMark als Altbestands-Feld aus', () => {
		const copy = [describeField('seaMark').label, meta('seaMark').helpText].join(' ').toLowerCase();

		expect(copy).toContain('altbestand');
	});
});

/**
 * Der Wortlaut muss **beide** bisherigen Felder abdecken. Fiele er auf die alte
 * Fahrwasser-Beschriftung zurück, verlöre das zusammengelegte Feld genau den
 * Aspekt, für den `seaMark` da war — die Orientierungspunkte.
 */
/**
 * `distribution` (Verteilung der Tiere) bleibt nur in der Admin-Maske —
 * `sections/OptionalSightingDetails.svelte` zeigt das Feld dort ausschließlich
 * hinter `adminMode` (wie schon `shipCount`). Schema-Eintrag, DB-Spalte
 * (`verteilung`) und `formOptions/distribution.ts` bleiben unverändert; hier
 * wird nur geprüft, dass der Melde-Schritt das Feld nicht mehr führt.
 */
describe('formStepsConfig — Verteilung nur in der Admin-Maske', () => {
	const observationsStep = formStepsConfig.find((step) => step.id === 'observations');

	it('führt distribution nicht mehr im Schritt "observations"', () => {
		expect(observationsStep?.fields).not.toContain('distribution');
	});

	it('führt distributionText nicht mehr im Schritt "observations"', () => {
		expect(observationsStep?.fields).not.toContain('distributionText');
	});
});

/**
 * `deadSex` (Geschlecht beim Totfund) bleibt nur in der Admin-Maske —
 * `sections/DeadAnimal.svelte` zeigt das Feld dort ausschließlich hinter
 * `adminMode` (PR 2, Teil b — Analyse-Punkt C4, Museum am 2026-08-04
 * abbestellt). Schema-Eintrag, DB-Spalte (`totfund_geschlecht`) und
 * `formOptions/sex.ts` bleiben unverändert; hier wird nur geprüft, dass der
 * Melde-Schritt "sighting-details" das Feld nicht mehr führt.
 */
describe('formStepsConfig — Geschlecht beim Totfund nur in der Admin-Maske', () => {
	const sightingDetailsStep = formStepsConfig.find((step) => step.id === 'sighting-details');

	it('führt deadSex nicht mehr im Schritt "sighting-details"', () => {
		expect(sightingDetailsStep?.fields).not.toContain('deadSex');
	});

	// Gegenprobe: Nur `deadSex` verschwindet, die übrigen Totfund-Felder
	// bleiben Teil des Melde-Schritts.
	it.each(['isDead', 'deadCondition', 'deadSize', 'deadPhoneContact'])(
		'behält %s im Schritt "sighting-details"',
		(name) => {
			expect(sightingDetailsStep?.fields).toContain(name);
		}
	);

	it('kennt deadSex im Schema weiterhin, damit die Admin-Maske es schreiben kann', () => {
		expect(sightingSchemaFields.deadSex).toBeDefined();
	});
});

/**
 * `boatDriveText` (Beschreibung eines "sonstigen" Antriebs) hängt an
 * `BoatDriveEnum.OTHER`, das im Meldeformular nach PR 4 (Museum, 2026-08-04)
 * nicht mehr wählbar ist — dort gibt es nur noch "Motor an" (`MOTOR = 1`) und
 * "Motor aus" (`MOTOR_OFF = 6`). Schema-Eintrag und DB-Spalte bleiben
 * unverändert — die Admin-Maske zeigt weiterhin den vollen Bootsantrieb
 * inklusive `boatDriveText`; hier wird nur geprüft, dass der Melde-Schritt
 * "sighting-details" das Feld nicht mehr führt.
 */
describe('formStepsConfig — boatDriveText nur in der Admin-Maske (PR 4)', () => {
	const sightingDetailsStep = formStepsConfig.find((step) => step.id === 'sighting-details');

	it('führt boatDriveText nicht mehr im Schritt "sighting-details"', () => {
		expect(sightingDetailsStep?.fields).not.toContain('boatDriveText');
	});

	it('behält boatDrive im Schritt "sighting-details" — nur die Textbeschreibung entfällt', () => {
		expect(sightingDetailsStep?.fields).toContain('boatDrive');
	});

	it('kennt boatDriveText im Schema weiterhin, damit die Admin-Maske es schreiben kann', () => {
		expect(sightingSchemaFields.boatDriveText).toBeDefined();
	});
});

/**
 * Der Medien-Upload steht seit dem 2026-08-04 auf Schritt 2 (Wunsch des
 * Museums: „Foto hochladen als erste Abfrage noch vor Tierinformation").
 *
 * Der Grund wiegt schwerer als die Reihenfolge: Schritt 3 trägt ganz oben einen
 * prominenten „Schritt überspringen"-Knopf, der direkt zu den Kontaktdaten
 * springt — der Upload stand darunter. Wer den Knopf nutzte, bekam die
 * Foto-Frage nie zu sehen, obwohl Aufnahmen die wertvollste Einzelangabe der
 * Meldung sind. Schritt 2 ist Pflichtschritt und nicht überspringbar.
 *
 * Geprüft wird die Zuordnung in `formStepsConfig`, nicht nur das Markup: An ihr
 * hängen Schritt-Validierung (`validateStep`) und Fehler-Navigation
 * (`findStepForErrors`). Stünde das Feld im Markup auf Schritt 2, in der Config
 * aber auf Schritt 3, spränge die Fehlernavigation auf den falschen Schritt.
 */
describe('formStepsConfig — Medien-Upload auf Schritt 2', () => {
	const sightingDetailsStep = formStepsConfig.find((step) => step.id === 'sighting-details');
	const observationsStep = formStepsConfig.find((step) => step.id === 'observations');

	it.each(['mediaFile', 'mediaUpload', 'mediaConsent'])(
		'führt %s im Schritt "sighting-details"',
		(name) => {
			expect(sightingDetailsStep?.fields).toContain(name);
		}
	);

	it.each(['mediaFile', 'mediaUpload', 'mediaConsent'])(
		'führt %s nicht mehr im Schritt "observations"',
		(name) => {
			expect(observationsStep?.fields).not.toContain(name);
		}
	);

	// Der Upload steht VOR den Tierangaben: Wer unsicher ist, welche Art er
	// gesehen hat, soll das Bild hochladen können, statt zu raten. Die
	// Reihenfolge im Markup prüft `Step2SightingDetails.svelte.test.ts`; hier
	// zählt, dass die Config dieselbe Geschichte erzählt — sie bestimmt die
	// Reihenfolge, in der `findStepForErrors` Felder abläuft.
	it('listet die Medien-Felder vor species', () => {
		const fields = sightingDetailsStep?.fields ?? [];
		const mediaIndex = fields.indexOf('mediaConsent');
		const speciesIndex = fields.indexOf('species');

		// Beide Fundstellen ausdrücklich absichern: `indexOf` liefert für ein
		// fehlendes Feld -1, und -1 ist kleiner als jeder gültige Index — der
		// Vergleich allein liefe grün durch, gerade wenn das Feld ganz fehlt.
		expect(mediaIndex).toBeGreaterThanOrEqual(0);
		expect(speciesIndex).toBeGreaterThanOrEqual(0);
		expect(mediaIndex).toBeLessThan(speciesIndex);
	});
});

describe('waterway — Beschriftung deckt beide bisherigen Felder ab', () => {
	const waterwayMeta = meta('waterway');
	const copy = [describeField('waterway').label, waterwayMeta.helpText, waterwayMeta.placeholder]
		.join(' ')
		.toLowerCase();

	it('nennt das Seegebiet', () => {
		expect(copy).toContain('seegebiet');
	});

	it('nennt das Fahrwasser', () => {
		expect(copy).toContain('fahrwasser');
	});

	it('nennt Orientierungspunkte — den Aspekt des entfallenen Seezeichen-Feldes', () => {
		expect(copy).toContain('orientierungspunkt');
	});

	it('bietet im Platzhalter ein Beispiel für einen Orientierungspunkt', () => {
		expect(String(waterwayMeta.placeholder).toLowerCase()).toContain('leuchtturm');
	});
});
