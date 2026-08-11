import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
	createKeyRegistry,
	formOptionsMessageKey,
	resolveFieldName,
	schemaMessageKey
} from './messageKey';

/** Findet den ersten String-Literal-Knoten mit dem gegebenen Text. */
function findLiteral(sourceFile: ts.SourceFile, text: string): ts.Node {
	let found: ts.Node | undefined;
	const visit = (node: ts.Node): void => {
		if (ts.isStringLiteralLike(node) && node.text === text) {
			found = found ?? node;
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
	if (!found) {
		throw new Error(`Literal ${JSON.stringify(text)} nicht gefunden`);
	}
	return found;
}

function parse(source: string): ts.SourceFile {
	return ts.createSourceFile('probe.ts', source, ts.ScriptTarget.Latest, true);
}

describe('resolveFieldName', () => {
	it('liest den Feldnamen an der direkten shape()-Eigenschaft', () => {
		const sf = parse(`
			const s = yup.object().shape({
				waterway: yup.string().max(255, 'zu lang')
			});
		`);
		expect(resolveFieldName(findLiteral(sf, 'zu lang'), sf)).toBe('waterway');
	});

	// Der Fehler aus dem Bestand: findEnclosingFieldName (i18n-inventory.ts:589)
	// liefert hier 'then'. Sechs verschiedene Meldungen kollabierten dadurch auf
	// den Schlüssel sighting_then_required.
	it('steigt durch when()/then hindurch bis zum echten Feld', () => {
		const sf = parse(`
			const s = yup.object().shape({
				latitude: yup.number().when('hasPosition', {
					is: true,
					then: (schema) => schema.required('Breitengrad ist erforderlich')
				})
			});
		`);
		expect(resolveFieldName(findLiteral(sf, 'Breitengrad ist erforderlich'), sf)).toBe('latitude');
	});

	it('steigt durch meta() hindurch bis zum echten Feld', () => {
		const sf = parse(`
			const s = yup.object().shape({
				sightingTime: yup.string().meta({ helpText: 'Wann ungefähr?' })
			});
		`);
		expect(resolveFieldName(findLiteral(sf, 'Wann ungefähr?'), sf)).toBe('sightingTime');
	});

	it('liest auch aus einem nachgelagerten shape() (adminSightingSchema)', () => {
		const sf = parse(`
			const admin = base.shape({
				totalCount: field.min(0, 'nicht negativ')
			});
		`);
		expect(resolveFieldName(findLiteral(sf, 'nicht negativ'), sf)).toBe('totalCount');
	});

	it('liefert undefined außerhalb jedes shape()', () => {
		const sf = parse(`const x = { foo: 'frei stehend' };`);
		expect(resolveFieldName(findLiteral(sf, 'frei stehend'), sf)).toBeUndefined();
	});
});

describe('schemaMessageKey', () => {
	it('baut sighting_<feld>_<aspekt>', () => {
		const taken = createKeyRegistry();
		expect(schemaMessageKey('latitude', 'label', taken)).toBe('sighting_latitude_label');
		expect(schemaMessageKey('latitude', 'meta.helpText', taken)).toBe(
			'sighting_latitude_meta_helptext'
		);
	});

	it('hängt ein Zählsuffix an, wenn ein Feld dieselbe Regel zweimal trägt', () => {
		const taken = createKeyRegistry();
		expect(schemaMessageKey('latitude', 'max', taken)).toBe('sighting_latitude_max');
		expect(schemaMessageKey('latitude', 'max', taken)).toBe('sighting_latitude_max_2');
		expect(schemaMessageKey('latitude', 'max', taken)).toBe('sighting_latitude_max_3');
	});
});

describe('formOptionsMessageKey', () => {
	it('baut formoptions_<datei>_<enumschlüssel> ohne Enum-Präfix', () => {
		const taken = createKeyRegistry();
		expect(formOptionsMessageKey('species', 'SpeciesEnum.HARBOR_PORPOISE', taken)).toBe(
			'formoptions_species_harbor_porpoise'
		);
	});

	it('verträgt einen Leerstring-Schlüssel (WindDirectionEnum.NONE)', () => {
		const taken = createKeyRegistry();
		expect(formOptionsMessageKey('windDirection', 'WindDirectionEnum.NONE', taken)).toBe(
			'formoptions_winddirection_none'
		);
	});
});
