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
