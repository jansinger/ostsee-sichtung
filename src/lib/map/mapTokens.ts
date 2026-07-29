/**
 * mapTokens.ts — Theme-Brücke zum OpenLayers-Canvas
 *
 * OpenLayers zeichnet auf ein <canvas> und kann keine CSS-Variablen lesen.
 * Hex-Werte sind dort deshalb notwendig, nicht nachlässig. Was bisher fehlte,
 * war ein einziger Ort für sie: LocationControl.ts, openLayersHelpers.ts,
 * optimizedMapController.ts und mapStyles.css führten je eigene Werte
 * (#3b82f6, #2563eb, #6b7280, #f9fafb …) — keiner davon aus dem Theme.
 *
 * Die Werte hier sind die sRGB-Entsprechungen der oklch()-Tokens aus
 * src/css/tokens.css. Sie sind NICHT frei wählbar: e2e/design-tokens.spec.ts
 * liest die berechneten Theme-Farben im Browser aus und vergleicht sie mit
 * diesen Konstanten. Ändert sich ein Theme-Wert, schlägt der Test fehl und
 * zeigt, dass diese Datei nachzuziehen ist.
 *
 * Die MARKER-Palette bleibt bewusst außerhalb: sie folgt der Wong-Palette
 * (farbfehlsichtigkeits-sicher) und steht in styleUtils.ts. Marker-Farben
 * sind Datenkodierung, keine Markenfarben — sie dürfen sich nicht mit dem
 * Theme mitbewegen.
 */

/** sRGB-Entsprechungen der Theme-Tokens (siehe src/css/tokens.css). */
export const MAP_THEME = {
	/** --color-primary — Auswahl, aktive Steuerelemente */
	primary: '#004062',
	/** --color-primary-content */
	primaryContent: '#ffffff',
	/** --color-base-100 — Popup-Fläche */
	surface: '#e6ecf2',
	/** --color-base-300 — Rahmen, Trennlinien */
	border: '#bdc5ce',
	/** --color-base-content — Popup-Text */
	text: '#050c14',
	/** --color-base-content bei 70 % auf base-100 (6,96:1) — Sekundärtext */
	textMuted: '#4a5158',
	/** --color-error — Fehlermeldung, Totfund-Markierung */
	error: '#ac1922',
	/** --color-warning-strong — Hinweis (die Flächenvariante #bb8500 erreicht
	 *  als Textfarbe nur 2,74:1) */
	warning: '#865100'
} as const;

export type MapThemeColor = keyof typeof MAP_THEME;
