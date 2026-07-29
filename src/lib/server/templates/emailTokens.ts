/**
 * emailTokens.ts — Farbpalette für E-Mail-Templates
 *
 * Warum eine eigene Datei und nicht die CSS-Variablen: E-Mail-Clients
 * (Outlook, Gmail-Web, Apple Mail) unterstützen weder oklch() noch
 * color-mix() noch CSS-Variablen zuverlässig. E-Mail braucht sRGB-Hex,
 * inline gesetzt.
 *
 * Was diese Datei ersetzt: rund 40 hartcodierte Hex-Werte in
 * sightingNotificationTemplate.html und configInitializer.ts, die aus der
 * Tailwind-Default-Palette stammten (#0ea5e9 als Kopffarbe, #1d4ed8 als
 * Button, #f59e0b, #10b981, #dc2626) — das Meeresmuseum-Blau kam in keiner
 * E-Mail vor. Ebenfalls entfallen: zwei linear-gradient-Flächen, die dem
 * --depth: 1 / --noise: 0-Charakter der App widersprechen.
 *
 * Die Werte sind die sRGB-Entsprechungen von src/css/tokens.css und werden
 * von e2e/design-tokens.spec.ts gegen das Theme geprüft.
 */

export const EMAIL_COLORS = {
	/** Kopfbereich, Buttons — --color-primary. Weiß darauf: 10,98:1 */
	brand: '#004062',
	brandContent: '#ffffff',

	/** Seitenhintergrund — --color-base-200 */
	page: '#d1d8df',
	/** Karten-/Abschnittsfläche — --color-base-100 */
	surface: '#e6ecf2',
	/** Rahmen, Trennlinien — --color-base-300 */
	border: '#bdc5ce',

	/** Fließtext — --color-base-content. 16,53:1 auf surface */
	text: '#050c14',
	/** Sekundärtext — base-content bei 70 %. 6,96:1 auf surface */
	textMuted: '#4a5158',

	/* Status. -surface ist die Fläche, -strong die Text-/Icon-Farbe.
	   Auf einer Tint-Fläche gehört der Text in text, nicht in die
	   Statusfarbe — dieselbe Regel wie in der App. */
	infoSurface: '#dbe6ec',
	infoStrong: '#00648f',
	successSurface: '#dbe8dd',
	successStrong: '#006d09',
	warningSurface: '#efe4cc',
	warningStrong: '#865100',
	errorSurface: '#eddcdd',
	errorStrong: '#ac1922'
} as const;

/**
 * Handlebars-Helper-Kontext. In den Templates dann {{colors.brand}} statt
 * eines Literals — damit ist die E-Mail erstmals an das System gebunden.
 */
export function emailColorContext() {
	return { colors: EMAIL_COLORS };
}
