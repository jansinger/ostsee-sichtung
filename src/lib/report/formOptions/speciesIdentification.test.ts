import { describe, expect, it } from 'vitest';
import { SpeciesEnum, getSpeciesLabel, speciesGroups } from './species';
import {
	getFrequencyLabels,
	getObservabilityLabels,
	speciesIdentification,
	type Observability
} from './speciesIdentification';

const allSpecies = Object.values(SpeciesEnum).filter(
	(v): v is SpeciesEnum => typeof v === 'number'
);

/**
 * „Unbekannte Walart" und „Unbekannte Robbenart" sind keine Arten, sondern das
 * Eingeständnis, keine bestimmt zu haben. Mehrere Zusicherungen unten nehmen
 * sie deshalb aus — die Liste steht hier einmal statt in jedem Test neu.
 */
const PLACEHOLDERS: SpeciesEnum[] = [SpeciesEnum.UNKNOWN_WHALE, SpeciesEnum.UNKNOWN_SEAL];

describe('speciesIdentification', () => {
	it('deckt jede Tierart des Formulars ab', () => {
		for (const species of allSpecies) {
			expect(speciesIdentification[species], `fehlt für ${getSpeciesLabel(species)}`).toBeDefined();
		}
	});

	it('enthält keine Einträge für unbekannte Tierarten', () => {
		for (const key of Object.keys(speciesIdentification)) {
			expect(allSpecies).toContain(Number(key));
		}
	});

	it('verwendet dieselben Namen wie die Auswahlliste', () => {
		for (const species of allSpecies) {
			expect(speciesIdentification[species].name).toBe(getSpeciesLabel(species));
		}
	});

	it('ist über die UI-Gruppierung vollständig erreichbar', () => {
		const grouped = Object.values(speciesGroups).flat();
		expect(grouped.sort()).toEqual(allSpecies.sort());
	});
});

describe('Merkmale', () => {
	it('kennzeichnet jedes Merkmal mit einer gültigen Beobachtbarkeit', () => {
		const valid: Observability[] = ['distance', 'closeup', 'background'];
		for (const species of allSpecies) {
			for (const feature of speciesIdentification[species].distinguishing) {
				expect(valid).toContain(feature.observability);
				expect(feature.text.trim().length).toBeGreaterThan(0);
			}
		}
	});

	it('nennt für jede real bestimmbare Art mindestens ein auf Distanz erkennbares Merkmal', () => {
		for (const species of allSpecies.filter((s) => !PLACEHOLDERS.includes(s))) {
			const onDistance = speciesIdentification[species].distinguishing.filter(
				(f) => f.observability === 'distance'
			);
			expect(onDistance.length, `${getSpeciesLabel(species)} hat kein Fernmerkmal`).toBeGreaterThan(
				0
			);
		}
	});

	it('beschreibt für jede Art das Erscheinungsbild an der Oberfläche', () => {
		for (const species of allSpecies) {
			expect(speciesIdentification[species].surfacing.length).toBeGreaterThan(0);
		}
	});

	/**
	 * Die beiden Platzhalter sind ausgenommen — dieselbe Ausnahme wie beim
	 * Fernmerkmal-Test darüber, und aus demselben Grund: Sie bezeichnen keine
	 * Art, sondern deren Abwesenheit.
	 *
	 * Das Meeresmuseum hat das am 2026-08-13 angemerkt: „Unbekannte Walart"
	 * trug in der Bestimmungshilfe dasselbe grüne Abzeichen **Heimisch** wie
	 * der Schweinswal. Wer nicht weiß, welche Art er gesehen hat, weiß erst
	 * recht nicht, ob sie hier heimisch ist.
	 *
	 * Bewusst KEINE neue Stufe „unbekannt": Auch die wäre eine Einordnung, wo
	 * es keine gibt. Der erklärende Text (`frequency.text`) bleibt und trägt
	 * die Aussage weiterhin.
	 */
	it('ordnet jede real bestimmbare Art nach Häufigkeit ein', () => {
		for (const species of allSpecies.filter((s) => !PLACEHOLDERS.includes(s))) {
			const { level, text } = speciesIdentification[species].frequency;
			expect(Object.keys(getFrequencyLabels())).toContain(level);
			expect(text.trim().length).toBeGreaterThan(0);
		}
	});

	it('ordnet die beiden Platzhalter NICHT nach Häufigkeit ein', () => {
		for (const species of PLACEHOLDERS) {
			const { level, text } = speciesIdentification[species].frequency;
			expect(level, `${getSpeciesLabel(species)} trägt eine Häufigkeitsstufe`).toBeUndefined();
			// Der Hinweistext bleibt: Er erklärt, wann man den Platzhalter wählt.
			expect(text.trim().length).toBeGreaterThan(0);
		}
	});

	it('hat für jede Beobachtbarkeitsstufe ein Label', () => {
		expect(Object.keys(getObservabilityLabels()).sort()).toEqual(
			['background', 'closeup', 'distance'].sort()
		);
	});
});

describe('Abgleich mit den DMM-Artensteckbriefen', () => {
	// Quelle: https://www.deutsches-meeresmuseum.de/wissenschaft/infothek/artensteckbriefe/schweinswale
	const schweinswal = speciesIdentification[SpeciesEnum.HARBOR_PORPOISE];

	it('nennt Durchschnitts- und Maximallänge des Schweinswals wie das Meeresmuseum', () => {
		expect(schweinswal.size).toContain('1,60 m');
		expect(schweinswal.size).toContain('1,85 m');
		// Ohne "sehr selten auch 2 m" wirkt ein größerer Totfund nach dem Text unmöglich.
		expect(schweinswal.size).toMatch(/selten\s+2 m/);
	});

	it('nennt die Kälbergröße des Meeresmuseums (65–90 cm)', () => {
		expect(schweinswal.size).toContain('65–90 cm');
	});

	it('gibt beim Schweinswal nur die belegte Gewichtsspanne an', () => {
		// "Ostsee-Tiere meist 45–60 kg" steht in keinem Steckbrief.
		expect(schweinswal.weight).toBe('40–90 kg');
	});

	it('führt den Größendimorphismus des Schweinswals als Hintergrundwissen', () => {
		const dimorphismus = schweinswal.distinguishing.find(
			(f) => f.text.includes('Weibchen') && f.text.includes('Männchen')
		);
		expect(dimorphismus, 'Merkmal zum Größenunterschied fehlt').toBeDefined();
		expect(dimorphismus?.observability).toBe('background');
	});
});

describe('Bilder', () => {
	it('hat für jede Tierart mindestens ein Bild', () => {
		for (const species of allSpecies) {
			expect(
				speciesIdentification[species].images.length,
				`kein Bild für ${getSpeciesLabel(species)}`
			).toBeGreaterThan(0);
		}
	});

	it('hat für jedes Bild einen nicht-leeren Alt-Text', () => {
		for (const species of allSpecies) {
			for (const image of speciesIdentification[species].images) {
				expect(image.alt.trim().length, `Alt-Text fehlt: ${image.src}`).toBeGreaterThan(0);
			}
		}
	});

	it('gibt Copyright entweder vollständig an oder gar nicht', () => {
		// Ein leerer String ist truthy im Template und würde als "© " gerendert.
		for (const species of allSpecies) {
			for (const image of speciesIdentification[species].images) {
				if (image.copyright !== null) {
					expect(image.copyright.trim().length, `leeres Copyright: ${image.src}`).toBeGreaterThan(
						3
					);
				}
			}
		}
	});

	it('verlinkt Quellen und Lizenzen ausschließlich über https', () => {
		// Die Seite läuft über HTTPS; http-Links lösen Mixed-Content-Warnungen aus.
		for (const species of allSpecies) {
			for (const image of speciesIdentification[species].images) {
				expect(image.copyright ?? '', `http-Link in Credit: ${image.src}`).not.toContain('http://');
			}
		}
	});

	it('verweist auf Bilder unterhalb von /species/', () => {
		for (const species of allSpecies) {
			for (const image of speciesIdentification[species].images) {
				expect(image.src.startsWith('/species/')).toBe(true);
			}
		}
	});
});
