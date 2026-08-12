import { describe, expect, it } from 'vitest';
import {
	collectDomainLabels,
	collectSchemaShape,
	collectValidationMessages,
	UNPROVOKABLE_MESSAGES
} from './germanBaseline.testutil';
import { collectSchemaSites } from '../../../tools/i18n-extract/collect';
import { createKeyRegistry } from '../../../tools/i18n-extract/messageKey';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import baseline from './germanBaseline.json';

describe('collectSchemaShape', () => {
	it('erfasst alle 56 Felder mit Beschriftung und meta', () => {
		const shape = collectSchemaShape();
		expect(Object.keys(shape).length).toBe(56);
		expect(shape.latitude).toEqual({
			label: 'Breitengrad',
			meta: {
				type: 'number',
				placeholder: 'z.B. 54.123456',
				helpText: 'Nördliche Position (N) - je mehr Nachkommastellen, desto genauer',
				valueText: 'GPS-Präzision: 6 Nachkommastellen = 11cm Genauigkeit'
			}
		});
	});

	// `icon` traegt einen Bezeichner, keinen Anzeigetext, und wuerde den
	// Schnappschuss bei jedem Icon-Wechsel rot machen, ohne dass sich ein
	// einziges sichtbares Wort geaendert haette.
	it('nimmt icon nicht in den Schnappschuss auf', () => {
		const shape = collectSchemaShape();
		expect(shape.latitude?.meta).not.toHaveProperty('icon');
	});
});

describe('collectDomainLabels', () => {
	it('erfasst je formOptions-Datei die Optionen in Reihenfolge', () => {
		const labels = collectDomainLabels();
		expect(labels['species'].options).toEqual([
			{ value: '0', label: 'Schweinswal' },
			{ value: '1', label: 'Kegelrobbe' },
			{ value: '2', label: 'Seehund' },
			{ value: '3', label: 'Delfin' },
			{ value: '4', label: 'Beluga' },
			{ value: '5', label: 'Zwergwal' },
			{ value: '6', label: 'Finnwal' },
			{ value: '7', label: 'Buckelwal' },
			{ value: '8', label: 'Unbekannte Walart' },
			{ value: '9', label: 'Ringelrobbe' },
			{ value: '10', label: 'Unbekannte Robbenart' }
		]);
	});

	// Die Rueckfaelle sind nutzersichtbar und stehen ausserhalb des
	// Record<Enum, string>-Musters — der Extraktor meldet sie als nicht
	// getroffen. Der Schnappschuss deckt sie trotzdem ab, damit Aufgabe 3 sie
	// nicht unbemerkt veraendert.
	it('erfasst die Rückfalltexte der getXLabel-Funktionen', () => {
		const labels = collectDomainLabels();
		expect(labels['species'].fallbacks).toEqual({
			nullish: 'Nicht angegeben',
			unknown: 'Unbekannt'
		});
	});

	it('erfasst die Gruppennamen der Artauswahl', () => {
		const labels = collectDomainLabels();
		expect(labels['species'].groups).toEqual(['Kleinwale', 'Großwale', 'Robben']);
	});

	// Befund A (2.1-Review): speciesIdentification.ts trägt neben den beiden
	// schmalen Label-Sets auch elf vollständige Artdatensätze mit deutschem
	// Fließtext (name, scientificName, size, weight, frequency.text, surfacing,
	// distinguishing, behavior, confusion, fieldTip, images.alt). Dieser Test
	// markiert die Ausschlussgrenze ausdrücklich: der Schnappschuss deckt davon
	// GENAU die zwei Label-Sets ab, nicht die Artdatensätze — die gehören zu
	// einer eigenen, späteren Etappe (Schicht E). Wer das ändern will, muss
	// diesen Test anfassen, nicht nur `germanBaseline.testutil.ts`.
	// Befund aus dem Review: Die Sortierung in `collectDomainLabels()` war
	// ungetestet — entfernt man `.sort(...)` dort, blieben bislang alle Tests
	// grün, weil die Quelltext-Reihenfolge zufällig schon alphabetisch war.
	// Dieser Test prüft die Sortierung direkt an der Ausgabe, unabhängig
	// davon, in welcher Reihenfolge die Quelltext-Einträge stehen (siehe
	// `windStrength` ganz oben im Quelltext von `collectDomainLabels()`).
	it('sortiert die Ausgabe unabhängig von der Quelltext-Reihenfolge', () => {
		const labels = collectDomainLabels();
		const keys = Object.keys(labels);
		const expectedSortedKeys = [...keys].sort((a, b) => a.localeCompare(b));

		expect(keys).toEqual(expectedSortedKeys);
		// `windStrength` steht im Quelltext ganz vorn, muss aber alphabetisch
		// ganz hinten in der Ausgabe stehen — nur die Sortierlogik kann das leisten.
		expect(keys[keys.length - 1]).toBe('windStrength');
	});

	it('markiert die Ausschlussgrenze der Artdatensätze in speciesIdentification', () => {
		const labels = collectDomainLabels();
		const speciesIdentification = labels['speciesIdentification'];

		expect(speciesIdentification.labelSets?.map((set) => set.name)).toEqual([
			'observability',
			'frequency'
		]);
		// Die Artdatensätze (name/scientificName/size/... je Art) laufen nicht
		// über `options` oder `fallbacks` — beide bleiben für diese Datei leer.
		expect(speciesIdentification.options).toEqual([]);
		expect(speciesIdentification.fallbacks).toBeNull();
	});
});

/** Die Aspekte, unter denen der Extraktor eine Validierungsmeldung fuehrt. */
const MESSAGE_ASPECTS = ['max', 'min', 'required', 'matches', 'oneOf', 'email', 'test'];

describe('collectValidationMessages', () => {
	it('provoziert jede Meldung mindestens einmal', async () => {
		const harvested = await collectValidationMessages();
		expect(harvested.length).toBeGreaterThan(0);
		expect(new Set(harvested).size).toBe(harvested.length);
	});

	// Die Kreuzpruefung: Der Extraktor aus Aufgabe 1 weiss, WELCHE Meldungen im
	// Quelltext stehen. Dieser Test haelt dagegen, welche davon im Betrieb
	// ueberhaupt erscheinen koennen. Was in keiner der beiden Mengen fehlt, ist
	// belegt; was nur der Extraktor kennt, ist toter Text oder eine Luecke in
	// der Batterie — beides muss benannt sein, nicht uebergangen.
	it('deckt jede vom Extraktor gefundene Validierungsmeldung ab', async () => {
		const path = 'src/lib/form/validation/sightingSchema.ts';
		const { sites } = collectSchemaSites(
			readFileSync(resolve(process.cwd(), path), 'utf-8'),
			path,
			createKeyRegistry()
		);
		const inSource = sites.filter((s) => MESSAGE_ASPECTS.includes(s.aspect)).map((s) => s.text);

		const harvested = new Set(await collectValidationMessages());
		const missing = inSource.filter(
			(text) => !harvested.has(text) && !UNPROVOKABLE_MESSAGES.includes(text)
		);

		expect(missing, `nicht provozierbar und nicht begründet: ${missing.join(' | ')}`).toEqual([]);
	});

	// Eine Ausnahmeliste ohne Pflege verrottet: Steht dort eine Meldung, die
	// inzwischen provozierbar ist, verdeckt der Eintrag kuenftig eine echte Luecke.
	it('führt keine Ausnahme, die inzwischen provozierbar ist', async () => {
		const harvested = new Set(await collectValidationMessages());
		const stale = UNPROVOKABLE_MESSAGES.filter((text) => harvested.has(text));
		expect(stale).toEqual([]);
	});
});

describe('germanBaseline.json', () => {
	// Bewusst KEIN toMatchSnapshot(): Vitest-Snapshots werden mit -u beiläufig
	// überschrieben — ein vergessenes Review-Auge reicht dann, um eine
	// Wortlaut-Änderung durchrutschen zu lassen. Eine eingecheckte JSON-Datei
	// zwingt jede Änderung stattdessen in den `git diff` und damit ins Review.
	// Das ist der eigentliche Zweck von Aufgabe i18n-t2 2.3: Extraktor und
	// Validierungs-Batterie leiten beide live aus sightingSchema.ts ab und
	// bewegen sich deshalb gemeinsam mit — nur ein eingefrorener, aus einem
	// früheren Lauf stammender Wortlaut deckt eine Verschiebung auf.
	it('hält Schema, Labels und Meldungen unverändert gegenüber dem eingecheckten Schnappschuss', async () => {
		const current = {
			schema: collectSchemaShape(),
			labels: collectDomainLabels(),
			messages: await collectValidationMessages()
		};

		expect(current).toEqual(baseline);
	});
});
