/**
 * @fileoverview Geometrie der SVG-Balkendiagramme
 *
 * **Warum handgebautes SVG und keine Chart-Bibliothek.** Das Projekt hatte bis
 * hierher keine Chart-Abhängigkeit, und die zwei benötigten Diagramme sind
 * beide dieselbe Form: kategoriale Balken über einer linearen Achse. Chart.js
 * (~60 kB gzip), ApexCharts (~130 kB) oder LayerChart (zieht d3-Module nach)
 * wären damit die größte Einzelabhängigkeit im Bundle — für eine Admin-Seite,
 * die nur Angemeldete sehen, aber im selben Build liegt. Drei weitere Gründe
 * gaben den Ausschlag:
 *
 * - **Theme-Tokens statt Canvas.** Die Bibliotheken zeichnen überwiegend auf
 *   Canvas und brauchen Farben als Zeichenketten — genau der Fall, für den
 *   `mapTokens.ts` bei OpenLayers Hex-Werte am Theme vorbei pflegen muss
 *   (`.claude/rules/design-system.md`, „Randbereiche"). SVG-Elemente tragen
 *   Utility-Klassen und damit dieselben Tokens wie der Rest der Seite.
 * - **Serverseitig gerendert.** Das Markup entsteht im SSR-Durchlauf; ohne
 *   JavaScript ist das Diagramm da. Eine Canvas-Bibliothek zeichnet erst nach
 *   der Hydration.
 * - **Textalternative aus denselben Daten.** WCAG 2.1 verlangt für ein
 *   Diagramm eine Alternative (1.1.1). Hier ist sie dieselbe Datenreihe als
 *   Tabelle; bei einer Bibliothek wäre sie eine zweite, driftende Quelle.
 *
 * Die Rechnung steht bewusst hier und nicht in der Komponente: Ein `NaN` in
 * einem `height`-Attribut rendert stumm falsch — im DOM steht dann ein Balken
 * ohne Höhe, ununterscheidbar von „Wert ist 0". Als reine Funktion ist derselbe
 * Fall eine Assertion (`barChartScale.test.ts`).
 */

/** Ein Datenpunkt der Reihe. */
export interface BarDatum {
	/** Beschriftung an der Achse, z. B. „Mai" oder „2024". */
	readonly label: string;
	readonly value: number;
	/** Hebt den Balken hervor (z. B. das gewählte Jahr). */
	readonly highlighted?: boolean;
}

/** Ein fertig platzierter Balken in Koordinaten der Zeichenfläche. */
export interface BarGeometry extends BarDatum {
	readonly highlighted: boolean;
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	/** Bekommt dieser Balken eine Achsenbeschriftung? */
	readonly showLabel: boolean;
}

export interface BarChartLayoutOptions {
	/** Breite der Zeichenfläche in viewBox-Einheiten. */
	readonly width: number;
	/** Höhe der Zeichenfläche in viewBox-Einheiten (= Wert der Achsenobergrenze). */
	readonly height: number;
	/** Abstand zwischen zwei Balken. */
	readonly gap: number;
	/** Höchstzahl an Achsenbeschriftungen; darüber wird ausgedünnt. */
	readonly maxLabels?: number;
}

export interface BarChartLayout {
	readonly bars: readonly BarGeometry[];
	/** Wert am oberen Rand der Zeichenfläche. */
	readonly axisMax: number;
}

/**
 * Vielfache, auf die eine Achsenobergrenze aufgerundet wird.
 *
 * Fein genug, dass über dem größten Wert höchstens 50 % Luft bleiben (sonst
 * drückt die Achse alle Balken flach), und grob genug, dass die Beschriftung
 * eine runde Zahl bleibt.
 */
const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10] as const;

/**
 * Rundet den größten Wert auf eine lesbare Achsenobergrenze auf.
 *
 * Liefert für eine leere Datenlage bewusst `1` und nie `0` — jede Skalierung
 * teilt durch diesen Wert.
 */
export function niceAxisMax(rawMax: number): number {
	if (!Number.isFinite(rawMax) || rawMax <= 0) return 1;

	const exponent = 10 ** Math.floor(Math.log10(rawMax));
	const mantisse = rawMax / exponent;
	const stufe = NICE_STEPS.find((kandidat) => kandidat >= mantisse - 1e-9) ?? 10;

	return stufe * exponent;
}

/**
 * Platziert die Datenreihe als Balken auf einer gemeinsamen Grundlinie.
 *
 * Die Balken teilen sich die Breite gleichmäßig; die Höhe skaliert linear auf
 * `axisMax`. Ein Wert von 0 ergibt einen Balken der Höhe 0 — sichtbar bleibt
 * dort die Grundlinie, was die ehrlichere Darstellung ist als ein Mindestbalken.
 */
export function layoutBars(
	data: readonly BarDatum[],
	{ width, height, gap, maxLabels = Number.POSITIVE_INFINITY }: BarChartLayoutOptions
): BarChartLayout {
	const axisMax = niceAxisMax(Math.max(0, ...data.map((datum) => datum.value)));
	if (data.length === 0) return { bars: [], axisMax };

	const slot = width / data.length;
	// Der Zwischenraum darf den Balken nicht auffressen: bei vielen Kategorien
	// (24 Jahre auf 600 Einheiten) ist ein fester Abstand schnell breiter als
	// der Balken selbst.
	const barWidth = Math.max(slot * 0.35, slot - gap);
	const labelStep = Math.ceil(data.length / maxLabels);

	const bars = data.map((datum, index) => {
		const sicher = Number.isFinite(datum.value) ? Math.max(0, datum.value) : 0;
		const barHeight = (sicher / axisMax) * height;

		return {
			...datum,
			highlighted: datum.highlighted === true,
			x: index * slot + (slot - barWidth) / 2,
			y: height - barHeight,
			width: barWidth,
			height: barHeight,
			showLabel: index % labelStep === 0
		};
	});

	return { bars, axisMax };
}
